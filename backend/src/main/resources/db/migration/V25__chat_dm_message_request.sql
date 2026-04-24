ALTER TABLE chat_threads
    ADD COLUMN dm_request_status VARCHAR(32) NULL,
    ADD COLUMN dm_request_initiator_id BIGINT NULL,
    ADD CONSTRAINT fk_chat_dm_request_initiator FOREIGN KEY (dm_request_initiator_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_chat_threads_dm_req ON chat_threads (dm_request_status);
