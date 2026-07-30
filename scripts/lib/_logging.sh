#!/bin/bash
# lib/_logging.sh — Shared logging helper cho toan bo scripts/*.sh
# Nguon cam hung: NoiThat2026/scripts/lib (session id, ERR/EXIT trap, sha256/size log)
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/_logging.sh"

set -uo pipefail

# Session id dung chung cho moi log line trong 1 lan chay script
# (giup grep log tap trung theo 1 lan deploy/backup cu the)
SESSION_ID="${SESSION_ID:-$(date +%Y%m%d%H%M%S)-$$}"
SCRIPT_NAME="$(basename "${0:-unknown}")"

_log() {
  local level="$1"; shift
  printf '[%s] [%s] [%s] %s\n' "$SESSION_ID" "$level" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

log_info()  { _log "INFO"  "$SCRIPT_NAME: $*"; }
log_warn()  { _log "WARN"  "$SCRIPT_NAME: $*" >&2; }
log_error() { _log "ERROR" "$SCRIPT_NAME: $*" >&2; }

# In ra size + sha256 cua 1 file — dung de log backup/restore integrity
log_file_meta() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local size; size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo "?")
    local sha;  sha=$(sha256sum "$f" 2>/dev/null | awk '{print $1}')
    log_info "file=$f size=${size}B sha256=${sha}"
  else
    log_warn "log_file_meta: file khong ton tai: $f"
  fi
}

# ERR trap: log dong gay loi + exit code, khong nuot loi am tham
_on_err() {
  local exit_code=$?
  local line_no=${BASH_LINENO[0]:-?}
  log_error "that bai o dong ${line_no}, exit code ${exit_code}"
}

# EXIT trap: log ket thuc script (ca thanh cong lan that bai)
_on_exit() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    log_info "hoan tat, exit code 0"
  else
    log_error "ket thuc voi loi, exit code ${exit_code}"
  fi
}

trap _on_err ERR
trap _on_exit EXIT
