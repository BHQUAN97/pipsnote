#!/bin/bash
# scripts/deploy.sh — Full deploy pipsnote-app (zero-downtime), chay TREN VPS
#
# git pull -> build -> db-changelog (FATAL) -> up -d --no-deps (zero-downtime) -> health-check -> prune
#
# Goi qua CI (.github/workflows/deploy.yml, SSH vao VPS) hoac chay tay:
#   ssh deploy@vps "bash /opt/pipsnote/scripts/deploy.sh"

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

APP_DIR="${APP_DIR:-$PROJECT_ROOT}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/docker-compose.prod.yml}"
APP_SERVICE="${APP_SERVICE:-pipsnote-app}"
APP_CONTAINER="${APP_CONTAINER:-pipsnote-app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5600/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-24}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

cd "$APP_DIR"

log_info "1/6 git pull"
git pull origin main

log_info "2/6 docker compose build ${APP_SERVICE}"
docker compose -f "$COMPOSE_FILE" build "$APP_SERVICE"

log_info "3/6 db-changelog (FATAL neu that bai — day la nguon migration duy nhat)"
if ! "${SCRIPT_DIR}/db-changelog.sh"; then
  log_error "db-changelog that bai — DUNG DEPLOY, container cu van dang chay binh thuong"
  exit 1
fi

log_info "4/6 dam bao network pipsnote_internal ton tai"
docker network create pipsnote_internal 2>/dev/null || true

log_info "5/6 up -d --no-deps ${APP_SERVICE} (zero-downtime: container cu van serve trong luc nay)"
docker compose -f "$COMPOSE_FILE" up -d --no-deps "$APP_SERVICE"

log_info "6/6 health-check ${HEALTH_URL} (toi da ${HEALTH_RETRIES} lan, moi lan cach ${HEALTH_INTERVAL}s)"
healthy=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=true
    log_info "Health-check OK (lan thu ${i})"
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

if [[ "$healthy" != true ]]; then
  log_error "Health-check THAT BAI sau ${HEALTH_RETRIES} lan — dump log de debug"
  docker logs "$APP_CONTAINER" --tail 100 || true
  docker inspect "$APP_CONTAINER" || true
  log_error "Rollback thu cong: giu tag image truoc do, chay lai 'docker compose up -d --no-deps ${APP_SERVICE}' voi tag cu"
  exit 1
fi

log_info "Deploy thanh cong — don image cu"
docker image prune -f

log_info "=== DEPLOY HOAN TAT ==="
