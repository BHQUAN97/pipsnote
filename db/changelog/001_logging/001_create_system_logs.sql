-- System logs table (technical errors, runtime issues)
-- Separate from admin_audit_log (business/security audit)

CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `level` ENUM('debug', 'info', 'warn', 'error', 'fatal') NOT NULL,
  `message` TEXT NOT NULL,
  `stacktrace` TEXT,
  `module` VARCHAR(100),
  `request_id` VARCHAR(50),
  `ip_address` VARCHAR(45),
  `user_id` INT UNSIGNED,
  `url` VARCHAR(1000),
  `method` VARCHAR(10),
  `status_code` INT,
  `metadata` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_level_created` (`level`, `created_at`),
  INDEX `idx_module` (`module`),
  INDEX `idx_request_id` (`request_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
