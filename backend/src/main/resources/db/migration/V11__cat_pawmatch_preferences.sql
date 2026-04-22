-- PawMatch: per-cat discovery preferences (Tinder-style filters; reciprocal in app logic)

ALTER TABLE cats
    ADD COLUMN pref_looking_for_gender VARCHAR(16) NOT NULL DEFAULT 'ANY'
        COMMENT 'ANY, MALE, or FEMALE — which genders of other cats to show',
    ADD COLUMN pref_min_age_months INT NULL
        COMMENT 'Minimum age (months) of other cats; NULL treated as 0',
    ADD COLUMN pref_max_age_months INT NULL
        COMMENT 'Maximum age (months) of other cats; NULL = no upper limit';
