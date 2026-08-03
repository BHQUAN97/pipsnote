#!/bin/bash
# scripts/refresh-market-data.sh — Goi endpoint refresh gia ticker (forex/crypto/commodity/stock)
#
# Cron: */15 * * * * (xem scripts/crontab.example)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

APP_URL="${APP_URL:-http://localhost:5601}"
ENV_FILE="${ENV_FILE:-/opt/pipsnote/.env}"

# --- Lay secret: uu tien env, fallback grep tu .env ---
if [[ -n "${MARKET_DATA_CRON_SECRET:-}" ]]; then
  CRON_SECRET="$MARKET_DATA_CRON_SECRET"
elif [[ -f "$ENV_FILE" ]]; then
  CRON_SECRET="$(grep -E '^MARKET_DATA_CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
else
  log_error "Khong tim thay MARKET_DATA_CRON_SECRET (env hoac ${ENV_FILE})"
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  log_error "MARKET_DATA_CRON_SECRET rong"
  exit 1
fi

log_info "Goi refresh market data -> ${APP_URL}/api/internal/market-data/refresh"

# -sf: fail-hard (exit != 0) neu HTTP status khong phai 2xx, khong nuot loi am tham
RESPONSE=$(curl -sf -X POST "${APP_URL}/api/internal/market-data/refresh" \
  -H "x-internal-secret: ${CRON_SECRET}")

log_info "Ket qua: ${RESPONSE}"
