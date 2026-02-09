USE helper;

-- Dodavanje pin_code kolone
ALTER TABLE children
ADD COLUMN pin_code VARCHAR(4) NULL;
