CREATE TABLE IF NOT EXISTS design_vote_totals (
  design_id TEXT PRIMARY KEY NOT NULL,
  votes INTEGER NOT NULL CHECK (votes >= 0)
) WITHOUT ROWID;

INSERT INTO design_vote_totals (design_id, votes)
SELECT design_id, COUNT(*) FROM design_votes GROUP BY design_id
ON CONFLICT(design_id) DO UPDATE SET votes = excluded.votes;

CREATE TRIGGER IF NOT EXISTS design_votes_count_insert
AFTER INSERT ON design_votes
BEGIN
  INSERT INTO design_vote_totals (design_id, votes) VALUES (NEW.design_id, 1)
  ON CONFLICT(design_id) DO UPDATE SET votes = votes + 1;
END;

CREATE TRIGGER IF NOT EXISTS design_votes_count_delete
AFTER DELETE ON design_votes
BEGIN
  UPDATE design_vote_totals SET votes = votes - 1 WHERE design_id = OLD.design_id;
END;

CREATE TRIGGER IF NOT EXISTS design_votes_count_update
AFTER UPDATE OF design_id ON design_votes
WHEN OLD.design_id <> NEW.design_id
BEGIN
  UPDATE design_vote_totals SET votes = votes - 1 WHERE design_id = OLD.design_id;
  INSERT INTO design_vote_totals (design_id, votes) VALUES (NEW.design_id, 1)
  ON CONFLICT(design_id) DO UPDATE SET votes = votes + 1;
END;
