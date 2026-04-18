CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cats (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    breed VARCHAR(255),
    age_months INT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cats_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE cat_photos (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cat_id BIGINT NOT NULL,
    url VARCHAR(1024) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_cat_photos_cat FOREIGN KEY (cat_id) REFERENCES cats (id) ON DELETE CASCADE
);

CREATE TABLE shelters (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    region VARCHAR(255),
    phone VARCHAR(64),
    email_contact VARCHAR(255),
    bio TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shelters_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE swipes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cat_id BIGINT NOT NULL,
    target_cat_id BIGINT NOT NULL,
    direction VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_swipes_cat FOREIGN KEY (cat_id) REFERENCES cats (id) ON DELETE CASCADE,
    CONSTRAINT fk_swipes_target FOREIGN KEY (target_cat_id) REFERENCES cats (id) ON DELETE CASCADE,
    CONSTRAINT uq_swipe UNIQUE (cat_id, target_cat_id)
);

CREATE TABLE chat_threads (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    participant_one_id BIGINT NOT NULL,
    participant_two_id BIGINT NOT NULL,
    market_listing_id BIGINT NULL,
    match_id BIGINT NULL,
    adoption_inquiry_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_thread_p1 FOREIGN KEY (participant_one_id) REFERENCES users (id),
    CONSTRAINT fk_thread_p2 FOREIGN KEY (participant_two_id) REFERENCES users (id)
);

CREATE TABLE paw_matches (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cat_a_id BIGINT NOT NULL,
    cat_b_id BIGINT NOT NULL,
    thread_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_cat_a FOREIGN KEY (cat_a_id) REFERENCES cats (id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_cat_b FOREIGN KEY (cat_b_id) REFERENCES cats (id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_thread FOREIGN KEY (thread_id) REFERENCES chat_threads (id) ON DELETE CASCADE,
    CONSTRAINT uq_match_cats UNIQUE (cat_a_id, cat_b_id)
);

CREATE TABLE market_listings (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    cat_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents BIGINT NOT NULL,
    city VARCHAR(255),
    region VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    photo_url VARCHAR(1024),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_listing_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_listing_cat FOREIGN KEY (cat_id) REFERENCES cats (id) ON DELETE SET NULL
);

CREATE TABLE adoption_listings (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    shelter_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    pet_name VARCHAR(255),
    description TEXT,
    breed VARCHAR(255),
    age_months INT,
    photo_url VARCHAR(1024),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adopt_list_shelter FOREIGN KEY (shelter_id) REFERENCES shelters (id) ON DELETE CASCADE
);

CREATE TABLE adoption_inquiries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    adoption_listing_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    thread_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inq_listing FOREIGN KEY (adoption_listing_id) REFERENCES adoption_listings (id) ON DELETE CASCADE,
    CONSTRAINT fk_inq_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_inq_thread FOREIGN KEY (thread_id) REFERENCES chat_threads (id) ON DELETE CASCADE,
    CONSTRAINT uq_inq UNIQUE (adoption_listing_id, user_id)
);

CREATE TABLE messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_thread FOREIGN KEY (thread_id) REFERENCES chat_threads (id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_cats_user ON cats (user_id);
CREATE INDEX idx_listings_user ON market_listings (user_id);
CREATE INDEX idx_listings_city ON market_listings (city);
CREATE INDEX idx_threads_p1 ON chat_threads (participant_one_id);
CREATE INDEX idx_threads_p2 ON chat_threads (participant_two_id);
CREATE INDEX idx_messages_thread ON messages (thread_id);
