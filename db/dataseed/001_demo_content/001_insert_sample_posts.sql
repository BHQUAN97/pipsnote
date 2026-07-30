-- db/dataseed/001_demo_content/001_insert_sample_posts.sql
-- Demo posts cho staging/dev (KHONG chay production)
-- Idempotent: dung ON DUPLICATE KEY de co the re-run an toan

-- NOTE: Table posts chua ton tai (app chua build), file nay la template
-- Sau khi tao table posts trong migration, update SQL cho phu hop voi schema that

-- VD: Gia su posts table co cau truc:
-- CREATE TABLE posts (
--   id INT PRIMARY KEY,
--   title VARCHAR(255),
--   slug VARCHAR(255) UNIQUE,
--   content TEXT,
--   published_at TIMESTAMP
-- );

INSERT INTO posts (id, title, slug, content, published_at) VALUES
  (
    9001,
    'EUR/USD Weekly Analysis: Breaking Key Resistance',
    'demo-eurusd-weekly-analysis',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.',
    '2026-07-01 10:00:00'
  ),
  (
    9002,
    'Gold (XAU/USD) Hits Record High: What''s Next?',
    'demo-gold-xauusd-record-high',
    'Vestibulum id ligula porta felis euismod semper. Nullam quis risus eget urna mollis ornare vel eu leo. Cras mattis consectetur purus sit amet fermentum.',
    '2026-07-05 14:30:00'
  ),
  (
    9003,
    'Bitcoin ETF Approval: Impact on Crypto Markets',
    'demo-bitcoin-etf-approval-impact',
    'Donec sed odio dui. Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
    '2026-07-10 09:15:00'
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content),
  published_at = VALUES(published_at);

-- CLEANUP NOTE: Khi xoa demo data, chay:
-- DELETE FROM posts WHERE id BETWEEN 9001 AND 9999;
