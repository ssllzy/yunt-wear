ALTER TABLE newsletter_subscribers RENAME TO newsletter_subscribers_previous;
ALTER TABLE design_votes RENAME TO design_votes_previous;
CREATE TABLE design_votes (
  voter_key TEXT PRIMARY KEY NOT NULL,
  design_id TEXT NOT NULL CHECK (design_id GLOB 'design-[0-9][0-9]' AND design_id <> 'design-00')
);
INSERT INTO design_votes SELECT * FROM design_votes_previous;
CREATE TABLE newsletter_subscribers (
  voter_key TEXT PRIMARY KEY NOT NULL REFERENCES design_votes(voter_key),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 20 CHECK (discount_percent = 20),
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consent_version TEXT NOT NULL
);
INSERT INTO newsletter_subscribers SELECT * FROM newsletter_subscribers_previous;
DROP TABLE newsletter_subscribers_previous;
DROP TABLE design_votes_previous;
CREATE INDEX design_votes_design_idx ON design_votes(design_id);
CREATE UNIQUE INDEX newsletter_subscribers_email_unique ON newsletter_subscribers(email);
