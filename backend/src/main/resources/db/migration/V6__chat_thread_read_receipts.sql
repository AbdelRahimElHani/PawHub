-- Per-participant last read timestamps for unread badges (market + DMs)

ALTER TABLE chat_threads
    ADD COLUMN participant_one_last_read_at TIMESTAMP(6) NULL AFTER created_at;

ALTER TABLE chat_threads
    ADD COLUMN participant_two_last_read_at TIMESTAMP(6) NULL AFTER participant_one_last_read_at;
