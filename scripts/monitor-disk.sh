#!/bin/bash
# scripts/monitor-disk.sh — Canh bao disk usage, chong spam bang sentinel lock file
#
# Cron: */30 * * * * (xem scripts/crontab.example)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

THRESHOLD_PCT="${THRESHOLD_PCT:-80}"
LOCK_FILE="${LOCK_FILE:-/tmp/pipsnote-disk-alert.lock}"
LOCK_TTL_HOURS="${LOCK_TTL_HOURS:-6}"
# TODO: dien webhook Telegram/email that khi co (de trong = chi log, khong gui gi)
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

usage_pct=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')

log_info "Disk usage hien tai: ${usage_pct}%"

if (( usage_pct < THRESHOLD_PCT )); then
  # Duoi nguong -> xoa lock cu (neu co) de lan sau vuot nguong lai duoc alert ngay
  rm -f "$LOCK_FILE" 2>/dev/null || true
  exit 0
fi

# Vuot nguong: kiem tra lock con hieu luc khong (chong spam alert lien tuc)
if [[ -f "$LOCK_FILE" ]]; then
  lock_age_sec=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
  lock_ttl_sec=$(( LOCK_TTL_HOURS * 3600 ))
  if (( lock_age_sec < lock_ttl_sec )); then
    log_info "Da alert gan day (con trong ${LOCK_TTL_HOURS}h), bo qua lan nay"
    exit 0
  fi
fi

log_warn "CANH BAO: disk usage ${usage_pct}% >= nguong ${THRESHOLD_PCT}%"
touch "$LOCK_FILE"

if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
  curl -sf -X POST "$ALERT_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"[pipsnote] Disk usage ${usage_pct}% (nguong ${THRESHOLD_PCT}%)\"}" \
    || log_warn "Gui alert webhook that bai (khong fatal)"
else
  log_warn "ALERT_WEBHOOK_URL chua duoc dien — chi log, chua gui alert that"
fi
