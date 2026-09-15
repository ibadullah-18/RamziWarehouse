#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
    echo "Xəta: Bu skript sudo ilə işlədilməlidir."
    echo "Nümunə:"
    echo "sudo ./ops/install-backup-timer.sh"
    exit 1
fi

PROJECT_ROOT="$(
    cd "$(dirname "${BASH_SOURCE[0]}")/.."
    pwd
)"

BACKUP_SCRIPT="${PROJECT_ROOT}/ops/backup-database.sh"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"

SERVICE_NAME="grandwall-backup.service"
TIMER_NAME="grandwall-backup.timer"

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"
TIMER_FILE="/etc/systemd/system/${TIMER_NAME}"

SERVICE_USER="${1:-${SUDO_USER:-root}}"

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
    echo "Xəta: Server istifadəçisi tapılmadı:"
    echo "${SERVICE_USER}"
    exit 1
fi

if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
    echo "Xəta: backup-database.sh tapılmadı."
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

chmod 750 "${BACKUP_SCRIPT}"

if [[ "${SERVICE_USER}" != "root" ]]; then
    if ! sudo -u "${SERVICE_USER}" \
        docker info >/dev/null 2>&1; then
        echo "Xəta: ${SERVICE_USER} istifadəçisinin Docker icazəsi yoxdur."
        echo
        echo "Bu əmrlə Docker qrupuna əlavə edə bilərsiniz:"
        echo "sudo usermod -aG docker ${SERVICE_USER}"
        echo
        echo "Sonra server hesabından çıxıb yenidən daxil olun."
        exit 1
    fi
fi

cat > "${SERVICE_FILE}" <<SERVICE
[Unit]
Description=GrandWall SQL Server daily backup
Requires=docker.service
After=docker.service network-online.target
ConditionPathExists=${ENV_FILE}
ConditionPathExists=${COMPOSE_FILE}

[Service]
Type=oneshot
User=${SERVICE_USER}
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${BACKUP_SCRIPT} 14
TimeoutStartSec=30min
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
SERVICE

cat > "${TIMER_FILE}" <<TIMER
[Unit]
Description=Run GrandWall backup every night

[Timer]
OnCalendar=*-*-* 02:30:00 Asia/Baku
Persistent=true
RandomizedDelaySec=5m
Unit=${SERVICE_NAME}

[Install]
WantedBy=timers.target
TIMER

chmod 644 \
    "${SERVICE_FILE}" \
    "${TIMER_FILE}"

systemctl daemon-reload

echo "Backup servisi bir dəfə test edilir..."

if ! systemctl start "${SERVICE_NAME}"; then
    echo "Xəta: İlk backup testi uğursuz oldu."
    echo
    systemctl status \
        "${SERVICE_NAME}" \
        --no-pager || true
    exit 1
fi

systemctl enable \
    --now \
    "${TIMER_NAME}"

echo
echo "Avtomatik backup sistemi uğurla quruldu."
echo "Vaxt: hər gecə Bakı vaxtı ilə 02:30"
echo "Backup saxlanması: 14 gün"
echo

systemctl list-timers \
    "${TIMER_NAME}" \
    --no-pager