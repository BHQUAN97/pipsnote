#!/bin/bash
# scripts/quick-deploy.sh — Deploy nhanh, BO QUA db-changelog
#
# !!! CANH BAO: chi dung khi CHAC CHAN commit khong doi schema DB (hotfix UI/logic thuan tuy).
# Neu commit co them file trong db/changelog/ -> PHAI dung scripts/deploy.sh (co changelog gate).

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

log_warn "quick-deploy.sh: BO QUA db-changelog. Chi dung cho hotfix khong doi schema."

cd "$APP_DIR"

log_info "1/4 git pull"
git pull origin main

log_info "2/4 docker compose build ${APP_SERVICE}"
docker compose -f "$COMPOSE_FILE" build "$APP_SERVICE"

log_info "3/4 up -d --no-deps ${APP_SERVICE}"
docker compose -f "$COMPOSE_FILE" up -d --no-deps "$APP_SERVICE"

log_info "4/4 health-check ${HEALTH_URL}"
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
  log_error "Health-check THAT BAI — dump log"
  docker logs "$APP_CONTAINER" --tail 100 || true
  exit 1
fi

docker image prune -f
log_info "=== QUICK-DEPLOY HOAN TAT ==="
