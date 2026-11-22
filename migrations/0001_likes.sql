-- One row per (theme, anonymous visitor). `voter` is an HMAC of the visitor cookie, never the raw value.
CREATE TABLE likes (
  theme_id   TEXT NOT NULL,
  voter      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (theme_id, voter)
) WITHOUT ROWID;

-- Denormalized totals so the gallery reads one row per theme instead of every like.
CREATE TABLE like_counts (
  theme_id TEXT PRIMARY KEY,
  count    INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

CREATE TRIGGER likes_after_insert AFTER INSERT ON likes
BEGIN
  INSERT INTO like_counts (theme_id, count) VALUES (NEW.theme_id, 1)
  ON CONFLICT (theme_id) DO UPDATE SET count = count + 1;
END;

CREATE TRIGGER likes_after_delete AFTER DELETE ON likes
BEGIN
  UPDATE like_counts SET count = MAX(count - 1, 0) WHERE theme_id = OLD.theme_id;
END;
