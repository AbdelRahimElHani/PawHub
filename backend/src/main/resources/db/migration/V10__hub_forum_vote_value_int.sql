-- Hibernate maps Java int to JDBC INTEGER; V8 used TINYINT, which fails schema validation.
ALTER TABLE hub_forum_post_votes MODIFY COLUMN vote_value INT NOT NULL;
