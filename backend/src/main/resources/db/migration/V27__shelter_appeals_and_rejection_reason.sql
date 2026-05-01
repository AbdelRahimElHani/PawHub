-- Shelter appeal workflow (after application rejection) + optional admin rejection note

ALTER TABLE shelters
    ADD COLUMN appeal_message TEXT NULL,
    ADD COLUMN appeal_submitted_at TIMESTAMP(6) NULL,
    ADD COLUMN appeal_state VARCHAR(32) NULL,
    ADD COLUMN application_rejection_reason VARCHAR(4000) NULL;
