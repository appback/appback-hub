-- 004_platform_auth.sql
-- Extend users table for platform auth (GitHub OAuth + player accounts)

-- New columns for user profile and GitHub OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username TEXT;

-- Allow password_hash to be NULL (GitHub-only users have no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Change default role from 'admin' to 'player'
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'player';

-- Linked accounts table (manual linking of TC/CC existing accounts)
CREATE TABLE IF NOT EXISTS linked_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    service_user_id TEXT NOT NULL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, service),
    UNIQUE(service, service_user_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON linked_accounts(user_id);
