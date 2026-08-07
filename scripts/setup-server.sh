#!/bin/bash
# scripts/setup-server.sh — One-time VPS bootstrap cho pipsnote
#
# Chay 1 lan duy nhat khi setup VPS moi (hoac lan dau join vao shared-infra da co san
# shared-mysql/shared-nginx tu NoiThat2026/VietNet2026).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

APP_DIR="${APP_DIR:-/opt/pipsnote}"

log_info "1/6 Kiem tra Docker"
if ! command -v docker >/dev/null 2>&1; then
  log_info "Docker chua co — cai dat tu apt repo chinh thuc"
  curl -fsSL https://get.docker.com | sh
else
  log_info "Docker da co san: $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
  log_error "Docker Compose plugin chua co. Cai: apt install docker-compose-plugin"
  exit 1
fi

log_info "2/6 Tao thu muc lam viec ${APP_DIR}"
mkdir -p "${APP_DIR}/backups/mysql" "${APP_DIR}/db/changelog"

log_info "3/6 Tao .env tu .env.example (neu chua co)"
if [[ ! -f "${APP_DIR}/.env" ]]; then
  if [[ -f "${PROJECT_ROOT}/.env.example" ]]; then
    cp "${PROJECT_ROOT}/.env.example" "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
    log_warn "Da tao ${APP_DIR}/.env tu .env.example — PHAI dien gia tri that truoc khi deploy"
  else
    log_error "Khong tim thay .env.example o ${PROJECT_ROOT}"
    exit 1
  fi
else
  log_info ".env da ton tai, khong ghi de"
fi

log_info "4/6 Tao network pipsnote_internal (idempotent)"
docker network create pipsnote_internal 2>/dev/null || log_info "Network pipsnote_internal da ton tai"

log_info "5/6 Cai cron jobs (backup/monitor/cleanup) tu scripts/crontab.example"
if [[ -f "${PROJECT_ROOT}/scripts/crontab.example" ]]; then
  cp "${PROJECT_ROOT}/scripts/crontab.example" /etc/cron.d/pipsnote
  chmod 644 /etc/cron.d/pipsnote
  systemctl reload cron 2>/dev/null || systemctl restart cron 2>/dev/null || log_warn "Khong reload duoc cron service — kiem tra tay (service ten khac tren distro nay?)"
  log_info "Da cai /etc/cron.d/pipsnote (nguon: scripts/crontab.example — sua file nay trong repo, khong sua truc tiep tren VPS)"
else
  log_warn "Khong tim thay scripts/crontab.example, bo qua cai cron"
fi

log_info "6/6 Nhac tao DB + user tren shared-mysql (chay tay, can root password):"
cat <<'SQL'

-- Chay lenh sau tren shared-mysql (vd: docker exec -it shared-mysql mysql -uroot -p)
CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pipsnote_app'@'%' IDENTIFIED BY '<mat_khau_app>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON pipsnote.* TO 'pipsnote_app'@'%';

-- Backup user: least privilege, chi doc + lock de mysqldump --single-transaction hoat dong
CREATE USER IF NOT EXISTS 'pipsnote_backup'@'%' IDENTIFIED BY '<mat_khau_backup>';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, PROCESS
  ON pipsnote.* TO 'pipsnote_backup'@'%';

FLUSH PRIVILEGES;
SQL

log_info "=== SETUP-SERVER HOAN TAT === (nho dien .env va chay SQL o tren truoc khi deploy)"
