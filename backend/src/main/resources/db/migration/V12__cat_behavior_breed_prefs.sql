-- PawMatch: cat personality, preferred behavior in others, optional breed filter (reciprocal in app)

ALTER TABLE cats
    ADD COLUMN behavior VARCHAR(32) NULL
        COMMENT 'This cat''s vibe: PLAYFUL, CALM, CUDDLY, INDEPENDENT, CURIOUS, CHILL',
    ADD COLUMN pref_behavior VARCHAR(32) NOT NULL DEFAULT 'ANY'
        COMMENT 'ANY or same labels — behavior wanted in other cats',
    ADD COLUMN pref_breed VARCHAR(255) NULL
        COMMENT 'If set, other cat''s breed must match (case-insensitive); NULL = any breed';
