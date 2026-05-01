-- Paw Adopt: moderator may ban shelter accounts from publishing adoption listings

ALTER TABLE users
    ADD COLUMN paw_adopt_banned TINYINT NOT NULL DEFAULT 0 AFTER paw_market_banned;
