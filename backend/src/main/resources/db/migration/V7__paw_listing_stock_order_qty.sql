-- Remaining inventory per listing; units per order (repeat purchases until stock 0)

ALTER TABLE market_listings
    ADD COLUMN stock_quantity INT NOT NULL DEFAULT 1 AFTER paw_status;

ALTER TABLE paw_orders
    ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER buyer_phone;
