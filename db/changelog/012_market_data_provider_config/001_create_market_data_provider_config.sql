-- Cau hinh provider du lieu tai chinh: bat/tat + API key (ma hoa) nhap qua admin UI,
-- thay the viec chi doc thang tu process.env (xem lib/marketData/providerConfig.ts)
CREATE TABLE IF NOT EXISTS `market_data_provider_config` (
  `provider_key` VARCHAR(30) PRIMARY KEY,
  `category` ENUM('forex','crypto','commodity','stock') NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `requires_key` BOOLEAN NOT NULL DEFAULT TRUE,
  `api_key_encrypted` TEXT NULL,
  `api_secret_encrypted` TEXT NULL,
  `updated_by` VARCHAR(50) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `market_data_provider_config` (`provider_key`, `category`, `requires_key`) VALUES
  ('twelvedata', 'forex', TRUE),
  ('fcs', 'forex', TRUE),
  ('alpaca', 'stock', TRUE),
  ('coingecko', 'crypto', FALSE),
  ('goldapi', 'commodity', FALSE)
ON DUPLICATE KEY UPDATE `provider_key` = `provider_key`;
