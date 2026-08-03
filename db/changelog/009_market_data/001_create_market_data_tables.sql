-- Bang cau hinh symbol ticker (danh sach co dinh, admin chi bat/tat + sap xep)
CREATE TABLE IF NOT EXISTS `market_data_symbols` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `label` VARCHAR(20) NOT NULL UNIQUE,
  `category` ENUM('forex','crypto','commodity','stock') NOT NULL,
  `provider_codes` JSON NOT NULL,
  `decimals` TINYINT UNSIGNED NOT NULL DEFAULT 4,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snapshot gia moi nhat (last-known-good) tung symbol, ghi de boi refresh orchestrator
CREATE TABLE IF NOT EXISTS `market_data_snapshots` (
  `symbol_id` INT UNSIGNED PRIMARY KEY,
  `price` DECIMAL(18,6) NOT NULL,
  `change_percent` DECIMAL(8,4) NULL,
  `direction` ENUM('up','down','flat') NOT NULL DEFAULT 'flat',
  `source` VARCHAR(20) NOT NULL,
  `fetched_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_market_data_snapshots_symbol` FOREIGN KEY (`symbol_id`)
    REFERENCES `market_data_symbols`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
