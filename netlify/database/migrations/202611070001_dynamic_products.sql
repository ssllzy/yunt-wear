ALTER TABLE design_votes DROP CONSTRAINT IF EXISTS design_votes_design_id_check;
ALTER TABLE design_votes DROP CONSTRAINT IF EXISTS design_votes_known_design;
ALTER TABLE design_votes ADD CONSTRAINT design_votes_known_design
  CHECK (design_id ~ '^design-(0[1-9]|[1-9][0-9])$');
