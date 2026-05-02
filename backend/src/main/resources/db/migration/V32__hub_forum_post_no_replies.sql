-- Optional "no replies" threads: read-only discussion (comments disabled for non-admins).

ALTER TABLE hub_forum_posts
    ADD COLUMN no_replies TINYINT(1) NOT NULL DEFAULT 0;
