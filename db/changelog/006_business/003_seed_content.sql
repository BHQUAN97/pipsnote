-- Seed categories, brokers, posts from index.html prototype content
-- Idempotent via ON DUPLICATE KEY UPDATE (matches 005_seed_admin convention)

INSERT INTO `categories` (`name`, `slug`, `description`) VALUES
  ('Kiến thức cơ bản', 'kien-thuc-co-ban', 'Kiến thức nền tảng cho trader mới bắt đầu'),
  ('Phân tích kỹ thuật', 'phan-tich-ky-thuat', 'Phân tích biểu đồ, chỉ báo, mô hình giá'),
  ('Tin tức thị trường', 'tin-tuc-thi-truong', 'Cập nhật tin tức và sự kiện ảnh hưởng thị trường'),
  ('Chiến lược', 'chien-luoc', 'Chiến lược giao dịch và quản lý vốn'),
  ('Review Broker', 'review-broker', 'Đánh giá và so sánh các sàn giao dịch')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `brokers`
  (`name`, `slug`, `type`, `description`, `badge`, `min_deposit`, `leverage`, `spread_from`, `affiliate_url`, `rating`, `is_active`, `is_featured`)
VALUES
  ('IC Markets', 'ic-markets', 'forex', 'Sàn ECN nổi bật với spread cực thấp, phù hợp trader scalping và EA.', 'Hot', '$200', '1:500', '0.0 pip', 'https://affiliate.example.com/ic-markets', 4.7, TRUE, TRUE),
  ('XM', 'xm', 'forex', 'Sàn phổ biến toàn cầu, nạp tối thiểu thấp, hỗ trợ đa ngôn ngữ.', 'Phổ biến', '$5', '1:1000', '0.6 pip', 'https://affiliate.example.com/xm', 4.5, TRUE, TRUE),
  ('VT Markets', 'vt-markets', 'forex', 'Sàn mới nổi với spread cạnh tranh và tốc độ khớp lệnh nhanh.', 'Mới', '$50', '1:500', '0.0 pip', 'https://affiliate.example.com/vt-markets', 4.3, TRUE, TRUE),
  ('HFM', 'hfm', 'forex', 'Đòn bẩy cao, nhiều chương trình bonus cho trader mới.', 'Bonus', '$5', '1:2000', '0.2 pip', 'https://affiliate.example.com/hfm', 4.2, TRUE, FALSE),
  ('Vantage', 'vantage', 'forex', 'Sàn được quản lý đa quốc gia, spread thấp trên tài khoản Raw.', NULL, '$50', '1:500', '0.0 pip', 'https://affiliate.example.com/vantage', 4.4, TRUE, FALSE),
  ('Exness', 'exness', 'forex', 'Đòn bẩy không giới hạn, rút tiền tức thời.', NULL, '$1', 'Unlimited', '0.3 pip', 'https://affiliate.example.com/exness', 4.6, TRUE, FALSE)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `posts`
  (`title`, `slug`, `excerpt`, `content`, `author_id`, `category_id`, `status`, `is_featured`, `read_time`, `published_at`)
VALUES
  (
    'Forex là gì? Hướng dẫn cho người mới bắt đầu từ A-Z',
    'forex-la-gi-huong-dan-cho-nguoi-moi-bat-dau',
    'Tổng quan về thị trường forex, cách hoạt động và những khái niệm cơ bản nhất trader mới cần nắm.',
    '<p>Forex (foreign exchange) là thị trường giao dịch ngoại hối lớn nhất thế giới...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'kien-thuc-co-ban'),
    'published', TRUE, 12, '2026-07-24 08:00:00'
  ),
  (
    'Cách đọc mô hình nến Nhật trong giao dịch ngắn hạn',
    'cach-doc-mo-hinh-nen-nhat-trong-giao-dich-ngan-han',
    'Hướng dẫn nhận diện các mô hình nến phổ biến và ứng dụng trong phân tích kỹ thuật ngắn hạn.',
    '<p>Mô hình nến Nhật (candlestick pattern) là công cụ phân tích kỹ thuật lâu đời...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'phan-tich-ky-thuat'),
    'published', TRUE, 9, '2026-07-22 08:00:00'
  ),
  (
    'Fed giữ nguyên lãi suất: điều gì chờ đợi USD trong quý tới?',
    'fed-giu-nguyen-lai-suat-dieu-gi-cho-doi-usd-trong-quy-toi',
    'Phân tích tác động của quyết định lãi suất Fed lên đồng USD và các cặp tiền chính.',
    '<p>Cục Dự trữ Liên bang Mỹ (Fed) vừa công bố giữ nguyên lãi suất...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'tin-tuc-thi-truong'),
    'published', TRUE, 6, '2026-07-21 08:00:00'
  ),
  (
    '5 chiến lược quản lý vốn giúp trader tồn tại lâu dài',
    '5-chien-luoc-quan-ly-von-giup-trader-ton-tai-lau-dai',
    'Quản lý vốn là yếu tố quyết định sự sống còn của trader hơn cả chiến lược vào lệnh.',
    '<p>Nhiều trader thất bại không phải vì chiến lược vào lệnh kém, mà vì quản lý vốn sai...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'chien-luoc'),
    'published', FALSE, 11, '2026-07-19 08:00:00'
  ),
  (
    'So sánh chi tiết IC Markets và XM: nên chọn sàn nào?',
    'so-sanh-chi-tiet-ic-markets-va-xm-nen-chon-san-nao',
    'So sánh spread, đòn bẩy, nạp rút và độ tin cậy giữa hai sàn phổ biến IC Markets và XM.',
    '<p>IC Markets và XM đều là những lựa chọn phổ biến, nhưng phù hợp với nhóm trader khác nhau...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'review-broker'),
    'published', FALSE, 8, '2026-07-17 08:00:00'
  ),
  (
    'Đòn bẩy và margin call: hiểu đúng để tránh cháy tài khoản',
    'don-bay-va-margin-call-hieu-dung-de-tranh-chay-tai-khoan',
    'Giải thích cơ chế đòn bẩy, margin call và cách quản lý rủi ro để tránh mất trắng tài khoản.',
    '<p>Đòn bẩy (leverage) là con dao hai lưỡi trong giao dịch forex...</p>',
    1, (SELECT id FROM `categories` WHERE `slug` = 'kien-thuc-co-ban'),
    'published', FALSE, 7, '2026-07-15 08:00:00'
  )
ON DUPLICATE KEY UPDATE `excerpt` = VALUES(`excerpt`);
