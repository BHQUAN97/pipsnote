# Scripts — PIPSNOTE (pipsnote)

Deploy / backup / restore / changelog / ops tooling cho pipsnote. Tat ca script viet bash + `set -euo pipefail`, dung chung `lib/_logging.sh`.

Tham khao kien truc tu `NoiThat2026/scripts`, dieu chinh theo spec PIPSNOTE (R2 thay Google Drive, openssl encrypt, shared-infra VPS voi `shared-mysql`/`shared-nginx`, Redis+Meilisearch la container rieng cua pipsnote).

## Muc luc

| Script | Muc dich |
|---|---|
| `lib/_logging.sh` | Helper dung chung: session id, log level, ERR/EXIT trap, file meta (size+sha256) |
| `backup-mysql.sh` | Dump `pipsnote` DB tren `shared-mysql` → gzip → ma hoa openssl → upload R2 → retention 7 ngay |
| `restore-mysql.sh` | Restore tu file `.sql.gz.enc` (local hoac tai tu R2), verify integrity truoc khi restore |
| `db-changelog.sh` | Flyway-style migration runner: `schema_changelog` table, scan `db/changelog/*/*.sql` |
| `deploy.sh` | Deploy full: build → db-changelog (**fatal**) → up -d --no-deps (zero-downtime) → health-check → prune |
| `quick-deploy.sh` | Deploy nhanh, bo qua db-changelog — chi dung cho hotfix khong doi schema |
| `setup-server.sh` | One-time VPS bootstrap: cai Docker, tao thu muc, `.env`, network, in SQL tao DB/user |
| `docker-cleanup.sh` | Prune Docker an toan (age-filter, khong dam vao resource vua deploy) |
| `monitor-disk.sh` | Canh bao disk usage, chong spam bang sentinel lock file |
| `crontab.example` | Mau cron: backup 2h sang, disk monitor moi 30p, cleanup chu nhat |

---

## 1. `backup-mysql.sh`

Dump DB `pipsnote` tu container `shared-mysql`, nen gzip, ma hoa AES-256-CBC (openssl, pbkdf2), verify integrity, upload Cloudflare R2, xoa file plaintext bang `shred -u`, giu 7 ngay local.

### Usage
```bash
# Chay tay (can .env hoac export truoc)
export MYSQL_BACKUP_PASSWORD='xxx'
export R2_ENDPOINT='https://<account>.r2.cloudflarestorage.com'
export R2_BUCKET='pipsnote-backups'
export BACKUP_ENC_KEY='xxx'
./scripts/backup-mysql.sh
```

### Env vars bat buoc
- `MYSQL_BACKUP_PASSWORD` (hoac doc tu `/opt/pipsnote/.env`)
- `R2_ENDPOINT`, `R2_BUCKET`, `BACKUP_ENC_KEY`

### Env vars tuy chinh
- `BACKUP_DIR` (default `/opt/pipsnote/backups/mysql`)
- `RETENTION_DAYS` (default `7`)
- `DB_CONTAINER` (default `shared-mysql`), `DB_NAME`/`DB_USER` (default `pipsnote`/`pipsnote_backup`)

### Output
- File: `${BACKUP_DIR}/pipsnote_YYYY-MM-DD_HH-MM.sql.gz.enc` (da ma hoa)
- R2: `s3://${R2_BUCKET}/db/pipsnote_YYYY-MM-DD_HH-MM.sql.gz.enc`
- Retention offsite (4 weekly + 3 monthly) do R2 lifecycle rule dam nhiem — xem `DEPLOY.md`.

---

## 2. `restore-mysql.sh`

```bash
# Restore ban gan nhat trong BACKUP_DIR (co hoi xac nhan)
./scripts/restore-mysql.sh latest

# Restore file cu the, tai tu R2 truoc
./scripts/restore-mysql.sh pipsnote_2026-07-01_02-00.sql.gz.enc --from-r2

# Bo qua confirm (CI/automation), chi verify khong restore that
./scripts/restore-mysql.sh latest --force
./scripts/restore-mysql.sh latest --dry-run
```

---

## 3. `db-changelog.sh`

Chay migration SQL trong `db/changelog/<batch>/<NNN_mo_ta>.sql` theo dung 1 lan (bang `schema_changelog` track version+filename+checksum). Xem `db/changelog/README.md` de biet convention dat ten.

```bash
./scripts/db-changelog.sh
```

Duoc goi tu dong boi `deploy.sh` (fatal — deploy dung neu changelog fail).

---

## 4. `deploy.sh` / `quick-deploy.sh`

```bash
# Deploy day du (co changelog gate) — dung mac dinh
./scripts/deploy.sh

# Deploy nhanh, bo qua changelog — CHI khi chac chan khong doi schema
./scripts/quick-deploy.sh
```

---

## Cron setup

Xem `scripts/crontab.example`. Cai dat:
```bash
sudo cp scripts/crontab.example /etc/cron.d/pipsnote
sudo chmod 644 /etc/cron.d/pipsnote
sudo systemctl restart cron
```

---

## Troubleshooting

### `MYSQL_BACKUP_PASSWORD rong` / `Khong tim thay DB_PASSWORD`
Export env var truoc, hoac dam bao `/opt/pipsnote/.env` co dong tuong ung.

### `Verify that bai — file backup bi hong`
Backup/restore bi loi giua chung (dump het dung luong dia, mat ket noi...). Chay lai `backup-mysql.sh`, kiem tra dung luong dia (`monitor-disk.sh`).

### `db-changelog.sh` FAIL giua chung deploy
Container app CU van dang chay binh thuong (deploy.sh dung truoc buoc `up -d`). Sua file SQL loi trong `db/changelog/`, khong sua truc tiep migration da PASS — them file moi de fix.

### Health-check that bai sau khi `up -d --no-deps`
Xem log: `docker logs pipsnote-app --tail 100`. Rollback thu cong bang tag image truoc do.
