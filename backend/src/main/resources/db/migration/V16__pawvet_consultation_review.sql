CREATE TABLE pawvet_consultation_review (
  id BIGINT NOT NULL AUTO_INCREMENT,
  external_case_id VARCHAR(80) NOT NULL,
  vet_user_id BIGINT NOT NULL,
  owner_user_id BIGINT NOT NULL,
  stars TINYINT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT uq_pawvet_rev_case UNIQUE (external_case_id),
  CONSTRAINT fk_pawvet_rev_vet FOREIGN KEY (vet_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pawvet_rev_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_pawvet_rev_stars CHECK (stars >= 1 AND stars <= 5)
) ENGINE=InnoDB;

CREATE INDEX idx_pawvet_rev_vet ON pawvet_consultation_review (vet_user_id);
CREATE INDEX idx_pawvet_rev_created ON pawvet_consultation_review (created_at);
