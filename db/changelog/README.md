# db/changelog — Quy uoc migration SQL cho pipsnote

Duoc chay boi `scripts/db-changelog.sh` (Flyway-style versioned runner). Day la **nguon migration DUY NHAT** cua pipsnote — khong dung ORM migration rieng.

## Quy uoc dat ten

```
db/changelog/
├── _init/                      # Bo qua khi scan (prefix "_") — schema khoi tao chay TAY 1 lan dau
│   └── 001_initial_schema.sql
├── 001_posts_and_brokers/       # Batch 1 — 1 thu muc = 1 "release batch"
│   ├── 001_create_posts.sql
│   └── 002_create_broker_links.sql
├── 002_admin_audit_log/         # Batch 2
│   └── 001_create_admin_audit_log.sql
└── ...
```

- Moi thu muc con la 1 **batch**, dat ten `NNN_ten_batch` (so thu tu 3 chu so, sort theo bang chu cai).
- Trong 1 batch, cac file `.sql` cung chay theo thu tu bang chu cai (`001_...`, `002_...`).
- Thu muc bat dau bang `_` (vi du `_init`) **bi bo qua** khi scan — dung cho schema khoi tao ban dau, chay tay 1 lan (`docker exec -i shared-mysql mysql -u... pipsnote < db/changelog/_init/001_initial_schema.sql`) truoc khi he thong changelog ton tai.
- Moi file chi chay **1 lan duy nhat** — bang `schema_changelog` (version=ten batch, filename=ten file) ghi lai da applied. Muon sua schema da chay → tao file MOI trong batch moi, KHONG sua file cu.
- File nen la SQL thuan (DDL/DML), khong dung bien template — `db-changelog.sh` chay truc tiep qua `mysql < file.sql`.

## Vi du 1 file migration

```sql
-- db/changelog/001_posts_and_brokers/001_create_posts.sql
CREATE TABLE IF NOT EXISTS posts (
  id           CHAR(26) PRIMARY KEY,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  title        VARCHAR(255) NOT NULL,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Chay thu cong

```bash
./scripts/db-changelog.sh
```

Duoc goi tu dong (fatal) boi `scripts/deploy.sh` truoc moi lan deploy.
