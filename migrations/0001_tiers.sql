CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cup TEXT NOT NULL,
  seed_tier TEXT
);

CREATE TABLE tier_votes (
  track_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (track_id, user_id)
);

CREATE TABLE tier_overrides (
  track_id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  set_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
