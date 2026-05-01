-- MySQL maps TINYINT(1) to JDBC BIT; plain TINYINT avoids tinyint-as-boolean quirks with Hibernate validate.
ALTER TABLE hub_forum_posts
    MODIFY COLUMN removed_by_admin TINYINT NOT NULL DEFAULT 0;
