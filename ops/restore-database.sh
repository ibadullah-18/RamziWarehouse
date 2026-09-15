#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(
    cd "$(dirname "${BASH_SOURCE[0]}")/.."
    pwd
)"

COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"
BACKUP_DIRECTORY="${PROJECT_ROOT}/backups"

DATABASE_NAME="GrandWall"
SQL_SERVICE_NAME="sqlserver"
API_SERVICE_NAME="api"

BACKUP_FILE_INPUT="${1:-}"

if [[ -z "${BACKUP_FILE_INPUT}" ]]; then
    echo "İstifadə qaydası:"
    echo "./ops/restore-database.sh backups/backup-fayli.bak"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Xəta: Docker tapılmadı."
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

if [[ ! -f "${BACKUP_FILE_INPUT}" ]]; then
    echo "Xəta: Backup faylı tapılmadı."
    exit 1
fi

if [[ "${BACKUP_FILE_INPUT}" != *.bak ]]; then
    echo "Xəta: Yalnız .bak faylı qəbul edilir."
    exit 1
fi

BACKUP_DIRECTORY_REAL="$(
    realpath "${BACKUP_DIRECTORY}"
)"

BACKUP_FILE="$(
    realpath "${BACKUP_FILE_INPUT}"
)"

case "${BACKUP_FILE}" in
    "${BACKUP_DIRECTORY_REAL}"/*)
        ;;
    *)
        echo "Xəta: Backup faylı backups qovluğunda olmalıdır."
        exit 1
        ;;
esac

CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [[ ! -f "${CHECKSUM_FILE}" ]]; then
    echo "Xəta: Backup checksum faylı tapılmadı:"
    echo "${CHECKSUM_FILE}"
    exit 1
fi

read -r EXPECTED_CHECKSUM _ < "${CHECKSUM_FILE}"

if ! [[ "${EXPECTED_CHECKSUM}" =~ ^[a-fA-F0-9]{64}$ ]]; then
    echo "Xəta: Checksum dəyəri düzgün deyil."
    exit 1
fi

ACTUAL_CHECKSUM="$(
    sha256sum "${BACKUP_FILE}" |
    awk '{print $1}'
)"

if [[ "${EXPECTED_CHECKSUM}" != "${ACTUAL_CHECKSUM}" ]]; then
    echo "Xəta: Backup faylının checksum dəyəri uyğun gəlmir."
    echo "Fayl zədələnmiş və ya dəyişdirilmiş ola bilər."
    exit 1
fi

echo "Checksum yoxlaması uğurludur."

COMPOSE_COMMAND=(
    docker compose
    --env-file "${ENV_FILE}"
    --file "${COMPOSE_FILE}"
)

SQL_CONTAINER_ID="$(
    "${COMPOSE_COMMAND[@]}" ps \
        --quiet \
        "${SQL_SERVICE_NAME}"
)"

if [[ -z "${SQL_CONTAINER_ID}" ]]; then
    echo "Xəta: SQL Server konteyneri tapılmadı."
    exit 1
fi

SQL_CONTAINER_STATUS="$(
    docker inspect \
        --format '{{.State.Status}}' \
        "${SQL_CONTAINER_ID}"
)"

if [[ "${SQL_CONTAINER_STATUS}" != "running" ]]; then
    echo "Xəta: SQL Server konteyneri işləmir."
    exit 1
fi

run_sql_query() {
    local sql_query="$1"

    docker exec \
        --env "GRANDWALL_SQL_QUERY=${sql_query}" \
        "${SQL_CONTAINER_ID}" \
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

            "${SQLCMD}" \
                -S localhost \
                -U sa \
                -P "${MSSQL_SA_PASSWORD}" \
                -C \
                -b \
                -Q "${GRANDWALL_SQL_QUERY}"
        '
}

RESTORE_TIMESTAMP="$(
    date -u '+%Y%m%dT%H%M%SZ'
)"

CONTAINER_RESTORE_PATH="/var/opt/mssql/backup/restore_${RESTORE_TIMESTAMP}.bak"

API_WAS_RUNNING="false"
API_RESTARTED="false"
RESTORE_STARTED="false"
RESTORE_SUCCEEDED="false"

API_CONTAINER_ID="$(
    "${COMPOSE_COMMAND[@]}" ps \
        --quiet \
        "${API_SERVICE_NAME}"
)"

if [[ -n "${API_CONTAINER_ID}" ]]; then
    API_CONTAINER_STATUS="$(
        docker inspect \
            --format '{{.State.Status}}' \
            "${API_CONTAINER_ID}"
    )"

    if [[ "${API_CONTAINER_STATUS}" == "running" ]]; then
        API_WAS_RUNNING="true"
    fi
fi

cleanup() {
    set +e

    docker exec \
        "${SQL_CONTAINER_ID}" \
        rm -f \
        "${CONTAINER_RESTORE_PATH}" \
        >/dev/null 2>&1 || true

    if [[
        "${RESTORE_STARTED}" == "true" &&
        "${RESTORE_SUCCEEDED}" != "true"
    ]]; then
        run_sql_query "
IF DB_ID(N'${DATABASE_NAME}') IS NOT NULL
BEGIN
    ALTER DATABASE [${DATABASE_NAME}]
    SET MULTI_USER;
END;
" >/dev/null 2>&1 || true
    fi

    if [[
        "${API_WAS_RUNNING}" == "true" &&
        "${API_RESTARTED}" != "true"
    ]]; then
        "${COMPOSE_COMMAND[@]}" up \
            --detach \
            "${API_SERVICE_NAME}" \
            >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

docker exec \
    "${SQL_CONTAINER_ID}" \
    mkdir -p \
    /var/opt/mssql/backup

echo "Backup faylı SQL Server konteynerinə köçürülür..."

docker cp \
    "${BACKUP_FILE}" \
    "${SQL_CONTAINER_ID}:${CONTAINER_RESTORE_PATH}"

echo "SQL Server backup faylını yoxlayır..."

run_sql_query "
RESTORE VERIFYONLY
FROM DISK = N'${CONTAINER_RESTORE_PATH}'
WITH CHECKSUM;
"

echo
echo "DİQQƏT!"
echo "Bu əməliyyat hazırkı database məlumatlarını dəyişdirəcək."
echo "Database: ${DATABASE_NAME}"
echo "Backup: ${BACKUP_FILE}"
echo
echo "Restore başlamazdan əvvəl hazırkı database-in"
echo "əlavə təhlükəsizlik backup-u yaradılacaq."
echo

read -r -p \
    "Davam etmək üçün RESTORE GrandWall yazın: " \
    CONFIRMATION

if [[ "${CONFIRMATION}" != "RESTORE GrandWall" ]]; then
    echo "Restore ləğv edildi."
    exit 0
fi

echo
echo "Hazırkı database-in təhlükəsizlik backup-u yaradılır..."

"${PROJECT_ROOT}/ops/backup-database.sh" 14

if [[ "${API_WAS_RUNNING}" == "true" ]]; then
    echo "API müvəqqəti dayandırılır..."

    "${COMPOSE_COMMAND[@]}" stop \
        "${API_SERVICE_NAME}"
fi

RESTORE_STARTED="true"

echo "Database restore başlanır..."

run_sql_query "
USE [master];

ALTER DATABASE [${DATABASE_NAME}]
SET SINGLE_USER
WITH ROLLBACK IMMEDIATE;

RESTORE DATABASE [${DATABASE_NAME}]
FROM DISK = N'${CONTAINER_RESTORE_PATH}'
WITH
    REPLACE,
    RECOVERY,
    CHECKSUM,
    STATS = 10;

ALTER DATABASE [${DATABASE_NAME}]
SET MULTI_USER;
"

RESTORE_SUCCEEDED="true"

if [[ "${API_WAS_RUNNING}" == "true" ]]; then
    echo "API yenidən başladılır..."

    "${COMPOSE_COMMAND[@]}" up \
        --detach \
        "${API_SERVICE_NAME}"

    API_RESTARTED="true"

    API_CONTAINER_ID="$(
        "${COMPOSE_COMMAND[@]}" ps \
            --quiet \
            "${API_SERVICE_NAME}"
    )"

    echo "API sağlamlıq yoxlaması gözlənilir..."

    API_HEALTH_STATUS="starting"

    for attempt in {1..30}; do
        API_HEALTH_STATUS="$(
            docker inspect \
                --format \
                '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
                "${API_CONTAINER_ID}"
        )"

        if [[ "${API_HEALTH_STATUS}" == "healthy" ]]; then
            break
        fi

        sleep 2
    done

    if [[ "${API_HEALTH_STATUS}" != "healthy" ]]; then
        echo "Xəbərdarlıq: API hələ healthy vəziyyətinə keçməyib."
        echo "Status: ${API_HEALTH_STATUS}"
        echo
        echo "Loglara baxmaq üçün:"
        echo "docker compose --env-file .env.production -f docker-compose.production.yml logs api"
        exit 1
    fi
fi

echo
echo "Database uğurla bərpa edildi."
echo "Database: ${DATABASE_NAME}"
echo "İstifadə edilən backup: ${BACKUP_FILE}"