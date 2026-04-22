CREATE TABLE vet_license_applications (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    license_number VARCHAR(128) NOT NULL,
    university VARCHAR(255) NOT NULL,
    years_experience INT NULL,
    phone VARCHAR(64) NULL,
    professional_bio TEXT NULL,
    status VARCHAR(32) NOT NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vla_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
