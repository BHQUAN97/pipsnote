#!/bin/bash
# scripts/backup-mysql.sh — Backup DB pipsnote tren shared-mysql, ma hoa, upload R2
#
# Pipeline: mysqldump | gzip | openssl encrypt -> verify -> upload R2 -> shred plaintext -> retention 7 ngay local
# Dua theo spec (1).md §16.9, nang cap production-grade (logging, MYSQL_PWD, integrity check,
# fail-hard neu upload R2 loi thay vi coi backup la "xong" khi chua offsite).
#
# Cron: 0 2 * * * (xem scripts/crontab.example)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

# --- Config (override qua env neu can) ---
BACKUP_DIR="${BACKUP_DIR:-/opt/pipsnote/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_CONTAINER="${DB_CONTAINER:-shared-mysql}"
DB_NAME="${DB_NAME:-pipsnote}"
DB_USER="${DB_USER:-pipsnote_backup}"
ENV_FILE="${ENV_FILE:-/opt/pipsnote/.env}"
TMP_DIR="${TMP_DIR:-/tmp}"

# --- Lay password: uu tien env, fallback grep tu .env ---
if [[ -n "${MYSQL_BACKUP_PASSWORD:-}" ]]; then
  DB_PASSWORD="$MYSQL_BACKUP_PASSWORD"
elif [[ -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(grep -E '^MYSQL_BACKUP_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
else
  log_error "Khong tim thay MYSQL_BACKUP_PASSWORD (env hoac ${ENV_FILE})"
  exit 1
fi

if [[ -z "${DB_PASSWORD:-}" ]]; then
  log_error "MYSQL_BACKUP_PASSWORD rong"
  exit 1
fi

# --- R2 config (bat buoc de upload offsite) ---
R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_BUCKET="${R2_BUCKET:-}"
BACKUP_ENC_KEY="${BACKUP_ENC_KEY:-}"

if [[ -z "$R2_ENDPOINT" || -z "$R2_BUCKET" || -z "$BACKUP_ENC_KEY" ]]; then
  log_error "Thieu R2_ENDPOINT / R2_BUCKET / BACKUP_ENC_KEY — khong the upload offsite, dung lai"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M)
PLAIN_GZ="${TMP_DIR}/pipsnote_${DATE}.sql.gz"
ENC_FILE="${TMP_DIR}/pipsnote_${DATE}.sql.gz.enc"
FINAL_FILE="${BACKUP_DIR}/pipsnote_${DATE}.sql.gz.enc"

# Don dep file tam du thanh cong hay that bai (khong de plaintext lai tren disk)
cleanup_tmp() {
  [[ -f "$PLAIN_GZ" ]] && shred -u "$PLAIN_GZ" 2>/dev/null || true
  [[ -f "$ENC_FILE" && "$ENC_FILE" != "$FINAL_FILE" ]] && rm -f "$ENC_FILE" 2>/dev/null || true
}
trap cleanup_tmp EXIT

log_info "Bat dau backup DB=${DB_NAME} container=${DB_CONTAINER} -> ${FINAL_FILE}"

# 1. Dump + gzip. MYSQL_PWD (khong dung -p) de khong lo password qua `ps -ef`.
#    --protocol=tcp tranh lech grant user@localhost vs user@% khi exec vao container.
docker exec -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
  mysqldump --protocol=tcp -h 127.0.0.1 -u"$DB_USER" \
    --single-transaction --routines --triggers --events \
    --set-gtid-purged=OFF --no-tablespaces "$DB_NAME" \
  | gzip > "$PLAIN_GZ"

if [[ ! -s "$PLAIN_GZ" ]]; then
  log_error "File dump rong — mysqldump that bai"
  exit 1
fi

# 2. Encrypt
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass "pass:${BACKUP_ENC_KEY}" \
  -in "$PLAIN_GZ" -out "$ENC_FILE"

# 3. Verify integrity: giai ma + gunzip -t truoc khi coi la thanh cong
#    (khong bao gio public 1 backup hong)
if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:${BACKUP_ENC_KEY}" -in "$ENC_FILE" 2>/dev/null | gunzip -t 2>/dev/null; then
  log_error "Verify that bai — file ma hoa bi hong, KHONG upload"
  exit 1
fi
log_info "Verify OK — backup toan ven"

# 4. Upload R2 (bat buoc — fail hard neu loi, khong coi backup la "xong" khi chua offsite)
if command -v aws >/dev/null 2>&1; then
  aws s3 cp "$ENC_FILE" "s3://${R2_BUCKET}/db/" --endpoint-url "$R2_ENDPOINT"
elif command -v rclone >/dev/null 2>&1; then
  rclone copy "$ENC_FILE" "r2:${R2_BUCKET}/db/"
else
  log_error "Khong co aws-cli lan rclone de upload R2"
  exit 1
fi
log_info "Upload R2 thanh cong: s3://${R2_BUCKET}/db/$(basename "$ENC_FILE")"

# 5. Giu 1 ban offline gan nhat trong BACKUP_DIR (restore nhanh, khong can tai lai tu R2)
mv "$ENC_FILE" "$FINAL_FILE"
log_file_meta "$FINAL_FILE"

# 6. Retention: 7 ngay local (R2 lifecycle rule lo phan 4 weekly + 3 monthly — xem DEPLOY.md)
find "$BACKUP_DIR" -name "*.sql.gz.enc" -mtime "+${RETENTION_DAYS}" -print -delete | while read -r f; do
  log_info "Retention: xoa backup cu ${f}"
done

log_info "Backup hoan tat: ${FINAL_FILE}"
