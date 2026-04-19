CREATE TABLE hub_faq_items (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    category_id VARCHAR(32) NOT NULL,
    question TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    is_health TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE hub_editorial_links (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    topic_id VARCHAR(64) NOT NULL,
    source_label VARCHAR(256),
    dek TEXT,
    image_url VARCHAR(2048),
    featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE hub_forum_rooms (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(32) NOT NULL DEFAULT 'custom',
    created_by_user_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hub_room_creator FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE hub_forum_posts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    author_user_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    body MEDIUMTEXT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    helpful_comment_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hub_post_room FOREIGN KEY (room_id) REFERENCES hub_forum_rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_hub_post_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE hub_forum_comments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    parent_id BIGINT,
    author_user_id BIGINT NOT NULL,
    body MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hub_c_post FOREIGN KEY (post_id) REFERENCES hub_forum_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_hub_c_parent FOREIGN KEY (parent_id) REFERENCES hub_forum_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_hub_c_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE hub_forum_post_votes (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    vote_value TINYINT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_hub_vote_post FOREIGN KEY (post_id) REFERENCES hub_forum_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_hub_vote_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
