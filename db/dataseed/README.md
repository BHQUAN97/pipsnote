# db/dataseed — Demo & Sample Data for pipsnote

Quản lý bởi `scripts/db-dataseed.sh`. **KHÁC VỚI** migration (`db/changelog/`):
- Migration = schema (DDL) + config seed → **BẮT BUỘC** chạy mọi môi trường
- Dataseed = demo content (posts, brokers) → **CHỈ CHẠY** khi `SEED_DEMO_DATA=true`

## Khi nào dùng dataseed vs migration seed?

| Loại dữ liệu | Nơi đặt | Lý do |
|--------------|---------|-------|
| `site_settings` defaults (theme colors, layout flags) | Migration (`db/changelog/002_settings/`) | Config hệ thống, cần thiết mọi môi trường |
| Initial admin user | Migration | Bảo mật, production cần |
| Demo posts, sample brokers, test comments | **Dataseed** (`db/dataseed/`) | Chỉ dev/staging, production KHÔNG cần |
| Currency/country master data | Migration (nếu ít) hoặc Dataseed (nếu nhiều) | Tùy kích thước |

## Quy ước đặt tên

```
db/dataseed/
├── 001_demo_content/
│   ├── 001_insert_sample_posts.sql
│   └── 002_insert_demo_brokers.sql
├── 002_test_comments/
│   └── 001_insert_comments.sql
└── README.md
```

- Tương tự migration: `NNN_batch/NNN_file.sql`
- Tracking table: `dataseed_version` (riêng với `schema_changelog`)

## Environment Control

### Development / Staging
```bash
# .env
SEED_DEMO_DATA=true
```
→ `scripts/deploy.sh` tự động chạy `db-dataseed.sh`

### Production
```bash
# .env
SEED_DEMO_DATA=false  # hoặc bỏ qua dòng này (default = false)
```
→ `db-dataseed.sh` skip ngay, không chạy SQL nào

## Force Re-seed (staging only)

Khi muốn refresh demo data (xóa cũ, insert lại mới):
```bash
FORCE_RESEED=true bash scripts/db-dataseed.sh
```

**CẢNH BÁO:** `--force-reseed` sẽ XÓA records tracking rồi chạy lại SQL → có thể gây duplicate nếu SQL không idempotent. Chỉ dùng trên staging/dev.

## Idempotent SQL Pattern

Nếu muốn re-run an toàn, dùng:
```sql
-- Insert demo post (idempotent via ON DUPLICATE KEY)
INSERT INTO posts (id, title, slug, content, published_at) VALUES
  (9001, 'Demo Post: EUR/USD Analysis', 'demo-eurusd-analysis', '...', NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Hoặc dùng INSERT IGNORE (nếu không cần update)
INSERT IGNORE INTO broker_links (id, name, url) VALUES
  (9001, 'Demo Broker A', 'https://demo.example.com/a');
```

## Chạy thủ công (dev)

```bash
# Chạy tất cả dataseed (skip nếu đã applied)
SEED_DEMO_DATA=true bash scripts/db-dataseed.sh

# Force re-seed (overwrite)
FORCE_RESEED=true bash scripts/db-dataseed.sh
```

## CI/CD Integration

Workflow `.github/workflows/deploy.yml` sẽ:
- Production (`main` branch): skip dataseed (vì `SEED_DEMO_DATA=false` trong `.env`)
- Staging (`staging` branch): chạy dataseed nếu set `SEED_DEMO_DATA=true`
