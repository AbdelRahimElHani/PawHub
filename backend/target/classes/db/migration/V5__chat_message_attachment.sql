-- Optional image attachment per chat message (caption stays in body; image-only uses empty body allowed via app validation)
ALTER TABLE messages
    ADD COLUMN attachment_url VARCHAR(1024) NULL;
