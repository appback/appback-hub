-- 008_google_oauth.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
