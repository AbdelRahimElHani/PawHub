-- Dev-only: wipes the pawhub schema so Flyway can re-run all migrations after
-- migration files were renumbered or checksums no longer match flyway_schema_history.
-- Usage (adjust user/password to match application.yml):
--   mysql -u root -p < scripts/reset-pawhub-database.sql

DROP DATABASE IF EXISTS pawhub;
CREATE DATABASE pawhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
