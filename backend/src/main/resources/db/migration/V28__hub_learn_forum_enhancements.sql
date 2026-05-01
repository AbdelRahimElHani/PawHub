-- FAQ / editorial section labels; forum comment soft-delete + attachments; admin-only PawHub home room

ALTER TABLE hub_faq_items
    ADD COLUMN section_title VARCHAR(256) NULL;

ALTER TABLE hub_editorial_links
    ADD COLUMN section_title VARCHAR(256) NULL;

ALTER TABLE hub_forum_rooms
    ADD COLUMN admin_only_posts TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE hub_forum_comments
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN deleted_by_admin TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN attachment_url VARCHAR(2048) NULL;

INSERT INTO hub_forum_rooms (slug, title, description, icon, created_by_user_id, admin_only_posts)
SELECT 'pawhub-announcements',
       'PawHub announcements',
       'Official updates from the PawHub team. Only administrators can post here; threads may appear on your home dashboard.',
       'custom',
       NULL,
       1
FROM (SELECT 1 AS x) dummy
WHERE NOT EXISTS (SELECT 1 FROM hub_forum_rooms WHERE slug = 'pawhub-announcements');
