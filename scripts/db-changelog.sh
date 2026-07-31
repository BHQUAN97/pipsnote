#!/bin/bash
# scripts/db-changelog.sh — Flyway-style versioned SQL migration runner
#
# Adapt tu NoiThat2026/scripts/db-changelog.sh: cung 1 co che (bang schema_changelog,
# scan thu muc, skip-if-applied, sha256, PASS/SKIP/FAIL), doi ten DB/container cho pipsnote.
#
# QUAN TRONG: day la nguon migration DUY NHAT cua pipsnote (khong co ORM migration rieng).
# scripts/deploy.sh coi script nay la FATAL — fail thi KHONG duoc deploy tiep.
#
# Convention: db/changelog/<batch>/<NNN_mo_ta>.sql — xem db/changelog/README.md
# Thu muc bat dau bang "_" (vd _init) bi bo qua khi scan.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

DB_CONTAINER="${DB_CONTAINER:-shared-mysql}"
DB_NAME="${DB_NAME:-pipsnote}"
DB_USER="${DB_USER:-pipsnote_app}"
ENV_FILE="${ENV_FILE:-/opt/pipsnote/.env}"
CHANGELOG_DIR="${CHANGELOG_DIR:-${PROJECT_ROOT}/db/changelog}"
APPLIED_BY="${APPLIED_BY:-$(whoami 2>/dev/null || echo ci)}"

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
  # KHONG dung -i o day: docker exec -i giu stdin mo va se ke thua stdin cua
  # vong while (process substitution) dang goi ham nay, lam vong lap doc het
  # sau 1 file trong moi batch. Chi mysql_exec_file (pipe .sql vao) can -i.
  docker exec -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" "$@"
}

mysql_exec_file() {
  docker exec -i -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < "$1"
}

# 1. Dam bao bang tracking ton tai
mysql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_changelog (
  version      VARCHAR(50)  NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  description  VARCHAR(255) NOT NULL,
  checksum     VARCHAR(64)  NOT NULL,
  applied_by   VARCHAR(100) NOT NULL,
  applied_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version, filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

if [[ ! -d "$CHANGELOG_DIR" ]]; then
  log_warn "Khong co thu muc ${CHANGELOG_DIR} — bo qua (chua co migration nao)"
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

    # 4. Skip neu da applied
    already=$(mysql_exec -N -B -e \
      "SELECT COUNT(*) FROM schema_changelog WHERE version='${version}' AND filename='${filename}';" 2>/dev/null || echo "0")

    if [[ "$already" == "1" ]]; then
      log_info "SKIP  ${version}/${filename} (da applied)"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi

    log_info "APPLY ${version}/${filename} ..."
    if mysql_exec_file "$sql_file"; then
      checksum=$(sha256sum "$sql_file" | awk '{print $1}')
      description=$(echo "$filename" | sed -E 's/^[0-9]+_?//; s/\.sql$//; s/_/ /g')
      mysql_exec -e "INSERT INTO schema_changelog (version, filename, description, checksum, applied_by) \
        VALUES ('${version}', '${filename}', '${description}', '${checksum}', '${APPLIED_BY}');"
      log_info "PASS  ${version}/${filename}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log_error "FAIL  ${version}/${filename} — dung changelog ngay"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
      exit 1
    fi
  done < <(find "$batch_dir" -maxdepth 1 -name '*.sql' | sort)
done < <(find "$CHANGELOG_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
