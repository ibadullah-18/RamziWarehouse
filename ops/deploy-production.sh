#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(
    cd "$(dirname "${BASH_SOURCE[0]}")/.."
    pwd
)"

COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"
API_SERVICE_NAME="api"
SQL_SERVICE_NAME="sqlserver"

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

if grep --extended-regexp --quiet '(CHANGE_|YOUR_)' "${ENV_FILE}"; then
    echo "Xəta: .env.production daxilində nümunə dəyərlər qalıb."
    echo "CHANGE_ və YOUR_ ilə başlayan hissələri real dəyərlərlə əvəz edin."
    exit 1
fi

COMPOSE_COMMAND=(
    docker compose
    --env-file "${ENV_FILE}"
    --file "${COMPOSE_FILE}"
)

echo "Production konfiqurasiyası yoxlanılır..."
"${COMPOSE_COMMAND[@]}" config --quiet

SQL_CONTAINER_ID="$(
    "${COMPOSE_COMMAND[@]}" ps --quiet "${SQL_SERVICE_NAME}"
)"

if [[ -n "${SQL_CONTAINER_ID}" ]]; then
    SQL_STATUS="$(
        docker inspect --format '{{.State.Status}}' "${SQL_CONTAINER_ID}"
    )"

    if [[ "${SQL_STATUS}" == "running" ]]; then
        echo "Mövcud database-in təhlükəsizlik backup-u yaradılır..."
        "${PROJECT_ROOT}/ops/backup-database.sh" 14
    fi
fi

echo "GrandWall API image hazırlanır..."
"${COMPOSE_COMMAND[@]}" build --pull "${API_SERVICE_NAME}"

echo "GrandWall servisləri başladılır..."
"${COMPOSE_COMMAND[@]}" up --detach

API_CONTAINER_ID="$(
    "${COMPOSE_COMMAND[@]}" ps --quiet "${API_SERVICE_NAME}"
)"

if [[ -z "${API_CONTAINER_ID}" ]]; then
    echo "Xəta: GrandWall API konteyneri yaradılmadı."
    exit 1
fi

echo "API sağlamlıq yoxlaması gözlənilir..."

for attempt in {1..40}; do
    API_HEALTH_STATUS="$(
        docker inspect \
            --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
            "${API_CONTAINER_ID}"
    )"

    if [[ "${API_HEALTH_STATUS}" == "healthy" ]]; then
        echo
        echo "GrandWall production deployment uğurla tamamlandı."
        "${COMPOSE_COMMAND[@]}" ps
        exit 0
    fi

    if [[ "${API_HEALTH_STATUS}" == "unhealthy" ]]; then
        echo "Xəta: GrandWall API health-check uğursuz oldu."
        "${COMPOSE_COMMAND[@]}" logs --tail 150 "${API_SERVICE_NAME}"
        exit 1
    fi

    sleep 3
done

echo "Xəta: GrandWall API vaxtında healthy vəziyyətinə keçmədi."
"${COMPOSE_COMMAND[@]}" logs --tail 150 "${API_SERVICE_NAME}"
exit 1
