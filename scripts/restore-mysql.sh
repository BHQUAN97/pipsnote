#!/bin/bash
# scripts/restore-mysql.sh — Restore DB pipsnote tu file .sql.gz.enc (local hoac R2)
#
# Usage:
#   scripts/restore-mysql.sh latest [--force] [--dry-run]
#   scripts/restore-mysql.sh <ten-file.sql.gz.enc> [--from-r2] [--force] [--dry-run]
#
# Restore SE GHI DE toan bo DB pipsnote. Mac dinh hoi xac nhan, dung --force de bo qua (vd trong CI).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

BACKUP_DIR="${BACKUP_DIR:-/opt/pipsnote/backups/mysql}"
DB_CONTAINER="${DB_CONTAINER:-shared-mysql}"
DB_NAME="${DB_NAME:-pipsnote}"
DB_USER="${DB_USER:-pipsnote_backup}"
ENV_FILE="${ENV_FILE:-/opt/pipsnote/.env}"
R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_BUCKET="${R2_BUCKET:-}"
BACKUP_ENC_KEY="${BACKUP_ENC_KEY:-}"

FILE_ARG=""
FROM_R2=false
FORCE=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --from-r2) FROM_R2=true ;;
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
    *) FILE_ARG="$arg" ;;
  esac
done

if [[ -z "$FILE_ARG" ]]; then
  log_error "Usage: restore-mysql.sh <latest|ten-file.sql.gz.enc> [--from-r2] [--force] [--dry-run]"
  exit 1
fi

if [[ -n "${MYSQL_BACKUP_PASSWORD:-}" ]]; then
  DB_PASSWORD="$MYSQL_BACKUP_PASSWORD"
elif [[ -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(grep -E '^MYSQL_BACKUP_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi
if [[ -z "${DB_PASSWORD:-}" ]]; then
  log_error "Khong tim thay MYSQL_BACKUP_PASSWORD"
  exit 1
fi
if [[ -z "$BACKUP_ENC_KEY" ]]; then
  log_error "Thieu BACKUP_ENC_KEY"
  exit 1
fi

# --- Xac dinh file can restore ---
if [[ "$FILE_ARG" == "latest" ]]; then
  TARGET_FILE="$(find "$BACKUP_DIR" -name '*.sql.gz.enc' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  if [[ -z "$TARGET_FILE" ]]; then
    log_error "Khong co backup nao trong ${BACKUP_DIR}"
    exit 1
  fi
else
  TARGET_FILE="${BACKUP_DIR}/${FILE_ARG}"
fi

# --- Tai tu R2 neu can ---
if [[ "$FROM_R2" == true ]]; then
  [[ -z "$R2_ENDPOINT" || -z "$R2_BUCKET" ]] && { log_error "Thieu R2_ENDPOINT/R2_BUCKET de tai --from-r2"; exit 1; }
  mkdir -p "$BACKUP_DIR"
  TARGET_FILE="${BACKUP_DIR}/${FILE_ARG}"
  log_info "Tai tu R2: s3://${R2_BUCKET}/db/${FILE_ARG}"
  aws s3 cp "s3://${R2_BUCKET}/db/${FILE_ARG}" "$TARGET_FILE" --endpoint-url "$R2_ENDPOINT"
fi

if [[ ! -f "$TARGET_FILE" ]]; then
  log_error "File khong ton tai: ${TARGET_FILE}"
  exit 1
fi

log_info "Se restore tu: ${TARGET_FILE}"

# --- Verify integrity truoc khi restore ---
if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:${BACKUP_ENC_KEY}" -in "$TARGET_FILE" 2>/dev/null | gunzip -t 2>/dev/null; then
  log_error "Verify that bai — file backup bi hong, KHONG restore"
  exit 1
fi
log_info "Verify OK"

if [[ "$DRY_RUN" == true ]]; then
  log_info "[--dry-run] Da verify OK, dung o day (khong restore that)"
  exit 0
fi

if [[ "$FORCE" != true ]]; then
  echo "CANH BAO: restore se GHI DE toan bo DB '${DB_NAME}' tren container '${DB_CONTAINER}'."
  read -r -p "Go 'yes' de tiep tuc: " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    log_warn "Nguoi dung huy restore"
    exit 1
  fi
fi

log_info "Bat dau restore..."
openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:${BACKUP_ENC_KEY}" -in "$TARGET_FILE" \
  | gunzip \
  | docker exec -i -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
      mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" "$DB_NAME"

log_info "Restore hoan tat tu ${TARGET_FILE}"
