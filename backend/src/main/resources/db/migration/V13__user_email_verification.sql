-- Email verification for new accounts (existing users treated as verified)

ALTER TABLE users
    ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN email_verification_token VARCHAR(64) NULL,
    ADD COLUMN email_verification_expires_at DATETIME(6) NULL;

UPDATE users SET email_verified = 1;
