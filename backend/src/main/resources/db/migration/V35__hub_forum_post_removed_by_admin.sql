-- Soft-remove forum threads so authors can still open the post from moderation notifications.
ALTER TABLE hub_forum_posts
    ADD COLUMN removed_by_admin TINYINT(1) NOT NULL DEFAULT 0;
