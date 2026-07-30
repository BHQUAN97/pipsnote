# DEPLOY.md — pipsnote

Kiến trúc hạ tầng, quy trình deploy/backup/restore/changelog cho PIPSNOTE. Tham khảo pattern từ `NoiThat2026`, điều chỉnh theo spec riêng (§10, §16.9 trong `spec (1).md`): shared-infra VPS, Cloudflare R2 thay Google Drive, openssl encrypt.

## Kiến trúc

```
VPS (shared voi NoiThat2026/VietNet2026)
├── shared-nginx     (dung chung — reverse proxy toi 127.0.0.1:5600)
├── shared-mysql     (dung chung — DB rieng "pipsnote" ben trong)
├── pipsnote-app     (rieng — Next.js, port noi bo 127.0.0.1:5600 → 3000)
├── pipsnote-redis   (rieng — internal-only, khong public port)
└── pipsnote-meilisearch (rieng — internal-only, khong public port)
```

Network: `webphoto_backend` (external, dung chung, cham toi shared-mysql) + `pipsnote_internal` (bridge, `internal: true`, chi app↔redis↔meili — không bao giờ ra internet dù VPS bị lộ port).

## Cài đặt lần đầu

1. SSH vào VPS, clone repo vào `/opt/pipsnote`.
2. Chạy `bash scripts/setup-server.sh` — cài Docker (nếu thiếu), tạo thư mục, tạo `.env` từ `.env.example`, tạo network `pipsnote_internal`.
3. Điền giá trị thật vào `/opt/pipsnote/.env` (chmod 600, không commit).
4. Chạy SQL tạo DB + user in ra từ bước 2 trên `shared-mysql` (cần root password MySQL).
5. Chạy `db/changelog/_init/001_initial_schema.sql` (nếu có) trực tiếp 1 lần — sau đó mọi thay đổi schema đi qua `db/changelog/` + `scripts/db-changelog.sh`.
6. Set GitHub Secrets (bảng dưới).
7. Cấu hình vhost `shared-nginx` proxy `127.0.0.1:5600` cho domain pipsnote (nằm ngoài repo này, cấu hình trực tiếp trên VPS/repo hạ tầng chung).
8. Cài crontab: `sudo cp scripts/crontab.example /etc/cron.d/pipsnote && sudo chmod 644 /etc/cron.d/pipsnote`.
9. Chạy thử `bash scripts/deploy.sh` thủ công 1 lần để xác nhận trước khi bật CI tự động (xem cảnh báo cuối file).

## GitHub Secrets

| Secret | Dùng cho |
|---|---|
| `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_KEY` | SSH vào VPS (khuyến nghị SSH key, không dùng password) |
| `PIPSNOTE_DB_PASSWORD` | Mật khẩu DB user `pipsnote_app` |
| `MYSQL_BACKUP_PASSWORD` | Mật khẩu DB user `pipsnote_backup` |
| `MYSQL_ROOT_PASSWORD` | Root password `shared-mysql` — dùng để ensure user idempotent trong `deploy.yml` |
| `REDIS_PASSWORD` | Redis container riêng của pipsnote |
| `MEILI_MASTER_KEY` | Meilisearch container riêng |
| `JWT_SECRET` | App auth |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Upload backup lên Cloudflare R2 |
| `BACKUP_ENC_KEY` | openssl passphrase mã hóa backup (AES-256-CBC, pbkdf2) |

## Deploy thường ngày

- Push lên `main` → `.github/workflows/deploy.yml` tự chạy: SSH → sync `.env` → `scripts/deploy.sh` (build → **db-changelog fatal** → `up -d --no-deps` zero-downtime → health-check → prune).
- Hotfix không đổi schema: chạy tay `scripts/quick-deploy.sh` (bỏ qua changelog — chỉ dùng khi chắc chắn).
- Rollback: giữ tag image build trước đó, `docker compose -f docker-compose.prod.yml up -d --no-deps pipsnote-app` với tag cũ; nếu đổi schema thì cần migration revert thủ công (chưa có tool tự động — ghi log vào `schema_changelog` thủ công nếu revert).

## Backup / Restore

- Tự động: `.github/workflows/backup.yml` chạy 1:30 sáng giờ VN hàng ngày, hoặc cron `0 2 * * *` trên VPS (`scripts/crontab.example`).
- Pipeline: `mysqldump` → gzip → `openssl enc -aes-256-cbc -pbkdf2` → verify (decrypt+gunzip test, fail-hard nếu hỏng) → upload R2 → giữ 7 ngày local → `shred -u` file plaintext tạm.
- **Cấu hình R2 lifecycle rule 1 lần** (Cloudflare dashboard) để tự động giữ thêm 4 bản weekly + 3 bản monthly ngoài 7 bản daily — script chỉ lo phần daily 7 ngày local + upload, phần retention dài hạn do R2 lifecycle đảm nhiệm (đúng thiết kế spec §16.9).
- Restore: `scripts/restore-mysql.sh latest` (interactive confirm) hoặc `--from-r2 --force` cho automation.
- **Restore test: bắt buộc hàng tháng** — không test = không có backup (spec §16.9). Ghi kết quả test vào `docs/dar/` nếu phát hiện vấn đề.

## Changelog / Migration

- Mọi thay đổi schema đi qua file SQL mới trong `db/changelog/<batch>/<NNN_mo_ta>.sql` — xem convention ở `db/changelog/README.md`.
- `scripts/db-changelog.sh` chạy tự động trong `deploy.sh`, **fail thì dừng deploy ngay** (không có ORM migration riêng, đây là nguồn migration duy nhất).
- Không sửa file changelog đã chạy (đã ghi vào bảng `schema_changelog`) — luôn thêm file mới để fix.

## Dataseed (Demo Content)

- **Khác với migration:** Dataseed = demo/sample content (posts, brokers) CHỈ chạy khi `SEED_DEMO_DATA=true` trong `.env`.
- File SQL: `db/dataseed/<batch>/<NNN_mo_ta>.sql` — xem `db/dataseed/README.md`.
- Script: `scripts/db-dataseed.sh` chạy **SAU** db-changelog trong deploy flow, **fail KHÔNG block deploy** (khác migration).
- Environment control:
  - **Production:** `SEED_DEMO_DATA=false` (default) → skip dataseed
  - **Staging/Dev:** `SEED_DEMO_DATA=true` → chạy dataseed
- Force re-seed (staging only): `FORCE_RESEED=true bash scripts/db-dataseed.sh` (xóa tracking + chạy lại)
- Tracking: bảng `dataseed_version` (riêng với `schema_changelog`)

## ⚠️ Trạng thái hiện tại

Bộ script/workflow này **chưa được test trên VPS thật** — VPS, R2 bucket, và GitHub Secrets thật chưa tồn tại tại thời điểm scaffold (2026-07-30). Trước khi bật CI tự động:
1. Setup VPS + R2 bucket thật.
2. Set toàn bộ Secrets ở bảng trên.
3. Chạy `scripts/setup-server.sh` → `scripts/deploy.sh` → `scripts/backup-mysql.sh` thủ công qua SSH 1 lần, xác nhận từng bước OK.
4. Chỉ sau đó mới nên để CI (`deploy.yml`/`backup.yml`) tự chạy không giám sát.
