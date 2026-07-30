-- db/dataseed/001_demo_content/002_insert_demo_brokers.sql
-- Demo broker affiliate links cho staging/dev
-- Idempotent: dung INSERT IGNORE hoac ON DUPLICATE KEY

-- NOTE: Table broker_links chua ton tai, file nay la template
-- Update sau khi build app va tao table that

-- VD: Gia su broker_links table:
-- CREATE TABLE broker_links (
--   id INT PRIMARY KEY,
--   name VARCHAR(100),
--   url TEXT,
--   region VARCHAR(50),
--   rating DECIMAL(3,2)
-- );

INSERT INTO broker_links (id, name, url, region, rating) VALUES
  (
    9001,
    'Demo Broker EU',
    'https://example.com/demo-eu?ref=pipsnote',
    'EU',
    4.50
  ),
  (
    9002,
    'Demo Broker US',
    'https://example.com/demo-us?ref=pipsnote',
    'US',
    4.20
  ),
  (
    9003,
    'Demo Crypto Exchange',
    'https://example.com/demo-crypto?ref=pipsnote',
    'Global',
    4.80
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  url = VALUES(url),
  rating = VALUES(rating);

-- CLEANUP NOTE: Xoa demo data:
-- DELETE FROM broker_links WHERE id BETWEEN 9001 AND 9999;
