-- MySQL TINYINT(1)/BOOLEAN can surface as JDBC BIT; Hibernate @JdbcTypeCode(TINYINT) expects TINYINT.
-- Same pattern as V17 (users.email_verified).

ALTER TABLE app_notifications
    MODIFY COLUMN read_flag TINYINT NOT NULL DEFAULT 0;
