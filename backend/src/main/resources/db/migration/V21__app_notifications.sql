CREATE TABLE app_notifications (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    kind VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    read_flag TINYINT NOT NULL DEFAULT 0,
    deep_link VARCHAR(512) NOT NULL,
    icon_kind VARCHAR(32) NULL,
    avatar_url VARCHAR(1024) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_app_notif_user_created (user_id, created_at),
    INDEX idx_app_notif_user_unread (user_id, read_flag)
);
