-- Lich su gia de ve bieu do thoi gian (time-series). Append moi lan refresh.
CREATE TABLE IF NOT EXISTS `market_data_price_history` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `symbol_id` INT UNSIGNED NOT NULL,
  `price` DECIMAL(18,6) NOT NULL,
  `change_percent` DECIMAL(8,4) NULL,
  `direction` ENUM('up','down','flat') NOT NULL DEFAULT 'flat',
  `source` VARCHAR(20) NOT NULL,
  `fetched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_market_data_price_history_symbol` FOREIGN KEY (`symbol_id`)
    REFERENCES `market_data_symbols`(`id`) ON DELETE CASCADE,
  INDEX `idx_hist_symbol_fetched` (`symbol_id`, `fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Giữ tối đa 30 ngày dữ liệu lịch sử (tick 15 phút ~ 2.880 dòng/symbol).
-- Admin có thể điều chỉnh qua site_settings `market.history_retention_days`.