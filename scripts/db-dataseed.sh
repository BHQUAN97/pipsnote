#!/bin/bash
# scripts/db-dataseed.sh — Demo/sample data seeder for pipsnote
#
# Chay SAU db-changelog.sh, chi khi SEED_DEMO_DATA=true (staging/dev only).
# Production nen set SEED_DEMO_DATA=false de tranh ghi de data that.
#
# Tracking: dataseed_version table (rieng voi schema_changelog)
# Convention: db/dataseed/<NNN_batch>/<NNN_description>.sql
# Khac voi migration: co the re-run voi --force-reseed de overwrite

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

DB_CONTAINER="${DB_CONTAINER:-shared-mysql}"
DB_NAME="${DB_NAME:-pipsnote}"
DB_USER="${DB_USER:-pipsnote_app}"
ENV_FILE="${ENV_FILE:-/opt/pipsnote/.env}"
DATASEED_DIR="${DATASEED_DIR:-${PROJECT_ROOT}/db/dataseed}"
APPLIED_BY="${APPLIED_BY:-$(whoami 2>/dev/null || echo ci)}"
FORCE_RESEED="${FORCE_RESEED:-false}"

# Check environment flag
SEED_DEMO_DATA="${SEED_DEMO_DATA:-false}"
if [[ "$SEED_DEMO_DATA" != "true" ]] && [[ "$FORCE_RESEED" != "true" ]]; then
  log_info "SEED_DEMO_DATA=false — bo qua dataseed (production mode)"
  exit 0
fi

if [[ -n "${DB_PASSWORD:-}" ]]; then
  : # da co san
elif [[ -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi
if [[ -z "${DB_PASSWORD:-}" ]]; then
  log_error "Khong tim thay DB_PASSWORD"
  exit 1
fi

mysql_exec() {
  docker exec -i -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" "$DB_NAME" "$@"
}

mysql_exec_file() {
  docker exec -i -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" "$DB_NAME" < "$1"
}

# 1. Dam bao bang tracking ton tai
mysql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS dataseed_version (
  version      VARCHAR(50)  NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  description  VARCHAR(255) NOT NULL,
  checksum     VARCHAR(64)  NOT NULL,
  applied_by   VARCHAR(100) NOT NULL,
  applied_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version, filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

if [[ ! -d "$DATASEED_DIR" ]]; then
  log_warn "Khong co thu muc ${DATASEED_DIR} — bo qua (chua co dataseed nao)"
  exit 0
fi

PASS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

# 2. Scan thu muc con (sort), bo qua thu muc bat dau bang "_"
while IFS= read -r batch_dir; do
  batch_name="$(basename "$batch_dir")"
  [[ "$batch_name" == _* ]] && continue

  # 3. Scan *.sql trong batch (sort)
  while IFS= read -r sql_file; do
    filename="$(basename "$sql_file")"
    version="$batch_name"

    # 4. Neu --force-reseed: xoa record cu truoc khi apply lai
    if [[ "$FORCE_RESEED" == "true" ]]; then
      mysql_exec -e "DELETE FROM dataseed_version WHERE version='${version}' AND filename='${filename}';" 2>/dev/null || true
      log_info "FORCE-RESEED: xoa record cu ${version}/${filename}"
    fi

    # 5. Skip neu da applied (va khong co --force-reseed)
    already=$(mysql_exec -N -B -e \
      "SELECT COUNT(*) FROM dataseed_version WHERE version='${version}' AND filename='${filename}';" 2>/dev/null || echo "0")

    if [[ "$already" == "1" ]]; then
      log_info "SKIP  ${version}/${filename} (da seeded)"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi

    log_info "SEED  ${version}/${filename} ..."
    if mysql_exec_file "$sql_file"; then
      checksum=$(sha256sum "$sql_file" | awk '{print $1}')
      description=$(echo "$filename" | sed -E 's/^[0-9]+_?//; s/\.sql$//; s/_/ /g')
      mysql_exec -e "INSERT INTO dataseed_version (version, filename, description, checksum, applied_by) \
        VALUES ('${version}', '${filename}', '${description}', '${checksum}', '${APPLIED_BY}');"
      log_info "PASS  ${version}/${filename}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log_error "FAIL  ${version}/${filename} — dataseed that bai"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
      # Dataseed fail KHONG block deploy (khac voi migration)
      log_warn "Dataseed fail khong block deploy — tiep tuc"
      break
    fi
  done < <(find "$batch_dir" -maxdepth 1 -name '*.sql' | sort)
done < <(find "$DATASEED_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
