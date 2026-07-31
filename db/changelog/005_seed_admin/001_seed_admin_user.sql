-- Seed initial superadmin user (idempotent)
-- Default credentials: admin / admin123 (change password after first login in production)
INSERT INTO `admin_users` (`username`, `email`, `password_hash`, `role`, `is_active`)
VALUES (
  'admin',
  'admin@pipsnote.local',
  '$2b$10$rZeoO5lpkw8oP3FowcXKmuWOtmQw1N4EO/kiF4JeqpJBsGxG7A4va',
  'superadmin',
  TRUE
)
ON DUPLICATE KEY UPDATE `username` = `username`;
