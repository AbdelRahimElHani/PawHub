-- Paw Market: seller response on orders + optional ban from market participation

ALTER TABLE paw_orders
    ADD COLUMN seller_status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED' AFTER quantity;

ALTER TABLE users
    ADD COLUMN paw_market_banned TINYINT NOT NULL DEFAULT 0 AFTER role;
