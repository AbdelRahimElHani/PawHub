CREATE TABLE user_friendships (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_low_id BIGINT NOT NULL,
    user_high_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    initiator_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_uf_low FOREIGN KEY (user_low_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_uf_high FOREIGN KEY (user_high_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_uf_init FOREIGN KEY (initiator_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_uf_order CHECK (user_low_id < user_high_id),
    UNIQUE KEY uq_user_friend_pair (user_low_id, user_high_id)
);

CREATE INDEX idx_uf_low_status ON user_friendships (user_low_id, status);
CREATE INDEX idx_uf_high_status ON user_friendships (user_high_id, status);
