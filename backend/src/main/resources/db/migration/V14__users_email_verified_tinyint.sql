-- MySQL Connector/J reports TINYINT(1) as JDBC BIT; Hibernate @JdbcTypeCode(TINYINT) expects TINYINT.
-- Match is_verified_meow (plain TINYINT) so schema validation succeeds.

ALTER TABLE users
    MODIFY COLUMN email_verified TINYINT NOT NULL DEFAULT 0;
