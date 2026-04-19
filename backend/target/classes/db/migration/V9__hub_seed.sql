-- Seed default Learn hub content (runs once; skips if slugs / ids already exist)

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-seed-1', 'general', 'How do I create a profile?', 'Sign up from the home page, then complete your profile from the account menu.', 0, 1
FROM (SELECT 1 AS x) dummy
WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-seed-1');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-seed-1', 'Understanding feline nutrition', 'https://www.avma.org/resources-tools/pet-owners/petcare/cats', 'nutrition', 'AVMA', 'Trusted guidance on feeding your cat.', NULL, 1, 1
FROM (SELECT 1 AS x) dummy
WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-seed-1');

INSERT INTO hub_forum_rooms (slug, title, description, icon, created_by_user_id)
SELECT 'general', 'General discussion', 'Community chat about cats and PawHub.', 'custom', NULL
FROM (SELECT 1 AS x) dummy
WHERE NOT EXISTS (SELECT 1 FROM hub_forum_rooms WHERE slug = 'general');

INSERT INTO hub_forum_rooms (slug, title, description, icon, created_by_user_id)
SELECT 'health', 'Health & wellness', 'Questions about vet visits, diet, and behavior.', 'custom', NULL
FROM (SELECT 1 AS x) dummy
WHERE NOT EXISTS (SELECT 1 FROM hub_forum_rooms WHERE slug = 'health');
