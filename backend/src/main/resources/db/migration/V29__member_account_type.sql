-- Unify former ADOPTER + CAT_OWNER into MEMBER (single "user" account for adopters & cat households)

UPDATE users SET account_type = 'MEMBER' WHERE account_type IN ('ADOPTER', 'CAT_OWNER');

ALTER TABLE users MODIFY COLUMN account_type VARCHAR(32) NOT NULL DEFAULT 'MEMBER';
