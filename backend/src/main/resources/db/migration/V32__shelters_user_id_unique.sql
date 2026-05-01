-- One shelter profile per user (fixes orphaned SHELTER accounts and race-safe upserts).
DELETE s1
FROM shelters s1
         INNER JOIN shelters s2 ON s1.user_id = s2.user_id AND s1.id > s2.id;

ALTER TABLE shelters
    ADD CONSTRAINT uq_shelters_user_id UNIQUE (user_id);
