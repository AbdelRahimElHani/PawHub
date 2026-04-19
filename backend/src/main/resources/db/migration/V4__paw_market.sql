-- V4: Paw Market (idempotent via stored procedures for MySQL 8 compatibility)

DROP PROCEDURE IF EXISTS paw_v4_migrate;

CREATE PROCEDURE paw_v4_migrate()
BEGIN
    -- market_listings: new Paw Market columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE market_listings ADD COLUMN category   VARCHAR(32)  NULL AFTER region;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'is_free') THEN
        ALTER TABLE market_listings ADD COLUMN is_free    TINYINT      NOT NULL DEFAULT 0 AFTER category;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'latitude') THEN
        ALTER TABLE market_listings ADD COLUMN latitude   DOUBLE       NULL AFTER is_free;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'longitude') THEN
        ALTER TABLE market_listings ADD COLUMN longitude  DOUBLE       NULL AFTER latitude;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'city_text') THEN
        ALTER TABLE market_listings ADD COLUMN city_text  VARCHAR(512) NULL AFTER longitude;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_listings' AND COLUMN_NAME = 'paw_status') THEN
        ALTER TABLE market_listings ADD COLUMN paw_status VARCHAR(32)  NOT NULL DEFAULT 'Available' AFTER city_text;
    END IF;

    -- users: verified meow + completed sales
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_verified_meow') THEN
        ALTER TABLE users ADD COLUMN is_verified_meow TINYINT NOT NULL DEFAULT 0 AFTER profile_bio;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'completed_sales') THEN
        ALTER TABLE users ADD COLUMN completed_sales INT NOT NULL DEFAULT 0 AFTER is_verified_meow;
    END IF;
END;

CALL paw_v4_migrate();

DROP PROCEDURE IF EXISTS paw_v4_migrate;

-- New tables (IF NOT EXISTS is safe for CREATE TABLE in MySQL 8)
CREATE TABLE IF NOT EXISTS market_listing_images (
    listing_id BIGINT        NOT NULL,
    image_url  VARCHAR(1024) NOT NULL,
    sort_order INT           NOT NULL DEFAULT 0,
    CONSTRAINT fk_mli_listing FOREIGN KEY (listing_id)
        REFERENCES market_listings (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paw_orders (
    id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    listing_id  BIGINT      NOT NULL,
    buyer_id    BIGINT      NOT NULL,
    buyer_phone VARCHAR(64) NOT NULL,
    thread_id   BIGINT      NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paw_order_listing FOREIGN KEY (listing_id)
        REFERENCES market_listings (id) ON DELETE CASCADE,
    CONSTRAINT fk_paw_order_buyer   FOREIGN KEY (buyer_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_paw_order_thread  FOREIGN KEY (thread_id)
        REFERENCES chat_threads (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paw_reviews (
    id             BIGINT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id       BIGINT    NOT NULL,
    reviewer_id    BIGINT    NOT NULL,
    target_user_id BIGINT    NOT NULL,
    rating         INT       NOT NULL,
    comment        TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paw_review_order    FOREIGN KEY (order_id)
        REFERENCES paw_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_paw_review_reviewer FOREIGN KEY (reviewer_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_paw_review_target   FOREIGN KEY (target_user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_paw_review UNIQUE (order_id, reviewer_id)
);

-- Indexes (MySQL 8 does not support CREATE INDEX IF NOT EXISTS; guard via procedure)
DROP PROCEDURE IF EXISTS paw_v4_indexes;

CREATE PROCEDURE paw_v4_indexes()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paw_orders' AND INDEX_NAME = 'idx_paw_orders_listing') THEN
        CREATE INDEX idx_paw_orders_listing ON paw_orders (listing_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paw_orders' AND INDEX_NAME = 'idx_paw_orders_buyer') THEN
        CREATE INDEX idx_paw_orders_buyer ON paw_orders (buyer_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paw_reviews' AND INDEX_NAME = 'idx_paw_reviews_target') THEN
        CREATE INDEX idx_paw_reviews_target ON paw_reviews (target_user_id);
    END IF;
END;

CALL paw_v4_indexes();

DROP PROCEDURE IF EXISTS paw_v4_indexes;
