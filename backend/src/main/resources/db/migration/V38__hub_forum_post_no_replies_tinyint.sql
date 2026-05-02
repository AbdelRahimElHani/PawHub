-- MySQL maps TINYINT(1) to JDBC BIT; plain TINYINT matches Hibernate validate with @JdbcTypeCode(TINYINT).
ALTER TABLE hub_forum_posts
    MODIFY COLUMN no_replies TINYINT NOT NULL DEFAULT 0;
