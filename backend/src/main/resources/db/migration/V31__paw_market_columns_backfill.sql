-- Backfill paw_market columns when Flyway history advanced without V26 applying (e.g. duplicate-version repairs).

SET @db := DATABASE();

SET @exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'paw_orders' AND COLUMN_NAME = 'seller_status');
SET @sql := IF(@exists = 0,
    'ALTER TABLE paw_orders ADD COLUMN seller_status VARCHAR(32) NOT NULL DEFAULT ''PENDING_SELLER'' AFTER quantity',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'paw_market_banned');
SET @sql := IF(@exists = 0,
    'ALTER TABLE users ADD COLUMN paw_market_banned TINYINT NOT NULL DEFAULT 0 AFTER role',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
