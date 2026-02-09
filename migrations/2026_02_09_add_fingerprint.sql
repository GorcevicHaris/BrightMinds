USE helper;

ALTER TABLE children
ADD fingerprint_id VARCHAR(64) NULL,
ADD UNIQUE KEY uniq_children_fingerprint (fingerprint_id);
