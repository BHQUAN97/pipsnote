#!/bin/bash
# scripts/docker-cleanup.sh — Prune image/container cu, co age-filter de tranh xoa nham
# resource vua tao boi 1 deploy dang chay (khac voi `docker system prune -f` tran lan).
#
# Cron: 0 3 * * 0 (chu nhat hang tuan — xem scripts/crontab.example)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

log_info "Prune container/image cu hon 7 ngay (until=168h)"
docker system prune -f --filter "until=168h"

log_info "Prune dangling image cu hon 24h (an toan hon voi deploy dang chay)"
docker image prune -f --filter "until=24h"

log_info "=== DOCKER-CLEANUP HOAN TAT ==="
