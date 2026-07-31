-- Repair double UTF-8 encoded Vietnamese text.
-- Root cause: scripts/db-changelog.sh applied earlier seed migrations (esp.
-- 006_business/003_seed_content.sql) through the mysql CLI without
-- --default-character-set=utf8mb4, so the client defaulted to latin1 and
-- re-encoded every non-ASCII byte on INSERT. This UPDATE reverses that by
-- reinterpreting the stored bytes as latin1 and re-decoding as utf8mb4.
-- Safe/idempotent for pure-ASCII values (no-op transform).

UPDATE categories
SET name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4),
    description = CONVERT(CAST(CONVERT(description USING latin1) AS BINARY) USING utf8mb4);

UPDATE posts
SET title = CONVERT(CAST(CONVERT(title USING latin1) AS BINARY) USING utf8mb4),
    excerpt = CONVERT(CAST(CONVERT(excerpt USING latin1) AS BINARY) USING utf8mb4),
    content = CONVERT(CAST(CONVERT(content USING latin1) AS BINARY) USING utf8mb4),
    seo_title = CONVERT(CAST(CONVERT(seo_title USING latin1) AS BINARY) USING utf8mb4),
    seo_desc = CONVERT(CAST(CONVERT(seo_desc USING latin1) AS BINARY) USING utf8mb4);

UPDATE brokers
SET name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4),
    description = CONVERT(CAST(CONVERT(description USING latin1) AS BINARY) USING utf8mb4),
    badge = CONVERT(CAST(CONVERT(badge USING latin1) AS BINARY) USING utf8mb4);
