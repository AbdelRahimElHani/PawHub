ALTER TABLE vet_license_applications
    ADD COLUMN appeal_message TEXT NULL AFTER rejection_reason,
    ADD COLUMN appeal_submitted_at TIMESTAMP(6) NULL AFTER appeal_message,
    ADD COLUMN appeal_state VARCHAR(32) NULL AFTER appeal_submitted_at;

CREATE TABLE pawvet_vet_reports (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    triage_case_id BIGINT NOT NULL,
    vet_user_id BIGINT NOT NULL,
    reporter_user_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_pvr_case FOREIGN KEY (triage_case_id) REFERENCES pawvet_triage_cases (id),
    CONSTRAINT fk_pvr_vet FOREIGN KEY (vet_user_id) REFERENCES users (id),
    CONSTRAINT fk_pvr_rep FOREIGN KEY (reporter_user_id) REFERENCES users (id),
    UNIQUE KEY uk_pvr_case_reporter (triage_case_id, reporter_user_id),
    INDEX idx_pvr_vet_created (vet_user_id, created_at)
);
