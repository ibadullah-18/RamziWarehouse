#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(
    cd "$(dirname "${BASH_SOURCE[0]}")/.."
    pwd
)"

COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"
BACKUP_DIRECTORY="${PROJECT_ROOT}/backups"

DATABASE_NAME="RamziWarehouse"
SQL_SERVICE_NAME="sqlserver"
RETENTION_DAYS="${1:-14}"

if ! command -v docker >/dev/null 2>&1; then
    echo "Xəta: Docker tapılmadı."
    exit 1
fi

if ! [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
    echo "Xəta: Saxlanma müddəti rəqəm olmalıdır."
    exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "Xəta: docker-compose.production.yml tapılmadı."
    exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Xəta: .env.production tapılmadı."
    exit 1
fi

mkdir -p "${BACKUP_DIRECTORY}"

if [[ "${BACKUP_DIRECTORY}" == "/" ]]; then
    echo "Xəta: Backup qovluğu düzgün müəyyən edilmədi."
    exit 1
fi

chmod 700 "${BACKUP_DIRECTORY}" 2>/dev/null || true

COMPOSE_COMMAND=(
    docker compose
    --env-file "${ENV_FILE}"
    --file "${COMPOSE_FILE}"
)

CONTAINER_ID="$(
    "${COMPOSE_COMMAND[@]}" ps \
        --quiet \
        "${SQL_SERVICE_NAME}"
)"

if [[ -z "${CONTAINER_ID}" ]]; then
    echo "Xəta: SQL Server konteyneri tapılmadı."
    exit 1
fi

CONTAINER_STATUS="$(
    docker inspect \
        --format '{{.State.Status}}' \
        "${CONTAINER_ID}"
)"

if [[ "${CONTAINER_STATUS}" != "running" ]]; then
    echo "Xəta: SQL Server konteyneri işləmir."
    exit 1
fi

TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
BACKUP_FILE_NAME="${DATABASE_NAME}_${TIMESTAMP}.bak"

CONTAINER_BACKUP_PATH="/var/opt/mssql/backup/${BACKUP_FILE_NAME}"
HOST_BACKUP_PATH="${BACKUP_DIRECTORY}/${BACKUP_FILE_NAME}"

cleanup_container_backup() {
    docker exec \
        "${CONTAINER_ID}" \
        rm -f \
        "${CONTAINER_BACKUP_PATH}" \
        >/dev/null 2>&1 || true
}

trap cleanup_container_backup EXIT

echo "Database backup başlanır..."
echo "Database: ${DATABASE_NAME}"

"${COMPOSE_COMMAND[@]}" exec \
    --no-TTY \
    --env "RAMZI_BACKUP_PATH=${CONTAINER_BACKUP_PATH}" \
    "${SQL_SERVICE_NAME}" \
    bash -lc '
        set -Eeuo pipefail

        SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

        if [[ ! -x "${SQLCMD}" ]]; then
            SQLCMD="/opt/mssql-tools/bin/sqlcmd"
        fi

        if [[ ! -x "${SQLCMD}" ]]; then
            echo "Xəta: sqlcmd tapılmadı."
            exit 1
        fi

        mkdir -p "$(dirname "${RAMZI_BACKUP_PATH}")"

        SQL_QUERY="$(
            cat <<SQL
BACKUP DATABASE [RamziWarehouse]
TO DISK = N'${RAMZI_BACKUP_PATH}'
WITH
    COPY_ONLY,
    INIT,
    CHECKSUM,
    STATS = 10;

RESTORE VERIFYONLY
FROM DISK = N'${RAMZI_BACKUP_PATH}'
WITH CHECKSUM;
SQL
        )"

        "${SQLCMD}" \
            -S localhost \
            -U sa \
            -P "${MSSQL_SA_PASSWORD}" \
            -C \
            -b \
            -Q "${SQL_QUERY}"
    '

echo "Backup konteynerdən çıxarılır..."

docker cp \
    "${CONTAINER_ID}:${CONTAINER_BACKUP_PATH}" \
    "${HOST_BACKUP_PATH}"

if [[ ! -s "${HOST_BACKUP_PATH}" ]]; then
    echo "Xəta: Backup faylı boşdur və ya yaradılmayıb."
    exit 1
fi

sha256sum "${HOST_BACKUP_PATH}" \
    > "${HOST_BACKUP_PATH}.sha256"

chmod 600 \
    "${HOST_BACKUP_PATH}" \
    "${HOST_BACKUP_PATH}.sha256" \
    2>/dev/null || true

find "${BACKUP_DIRECTORY}" \
    -maxdepth 1 \
    -type f \
    -name "${DATABASE_NAME}_*.bak" \
    -mtime "+${RETENTION_DAYS}" \
    -delete

find "${BACKUP_DIRECTORY}" \
    -maxdepth 1 \
    -type f \
    -name "${DATABASE_NAME}_*.bak.sha256" \
    -mtime "+${RETENTION_DAYS}" \
    -delete

BACKUP_SIZE="$(
    du -h "${HOST_BACKUP_PATH}" |
    cut -f1
)"

echo
echo "Backup uğurla yaradıldı."
echo "Fayl: ${HOST_BACKUP_PATH}"
echo "Ölçü: ${BACKUP_SIZE}"
echo "Saxlanma müddəti: ${RETENTION_DAYS} gün"