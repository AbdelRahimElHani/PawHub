ALTER TABLE users
    ADD COLUMN account_type VARCHAR(32) NOT NULL DEFAULT 'ADOPTER' AFTER display_name,
    ADD COLUMN avatar_url VARCHAR(1024) NULL AFTER account_type,
    ADD COLUMN profile_city VARCHAR(255) NULL,
    ADD COLUMN profile_region VARCHAR(255) NULL,
    ADD COLUMN profile_bio TEXT NULL;
