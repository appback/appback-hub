-- 005_user_wallet.sql
-- User multi-currency wallet system + bonus policies

-- Currency registry (extend by INSERT only, no code changes needed)
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User balances (one row per user+currency)
CREATE TABLE IF NOT EXISTS user_balances (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_id INT NOT NULL REFERENCES currencies(id),
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, currency_id)
);

-- User transaction ledger
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_id INT NOT NULL REFERENCES currencies(id),
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'transfer_out', 'transfer_in', 'bonus')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    balance_after BIGINT NOT NULL,
    counterparty_id UUID REFERENCES users(id),
    reference TEXT,
    memo TEXT,
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tx_user ON user_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tx_currency ON user_transactions(user_id, currency_id, created_at DESC);

-- Bonus policy registry (extend by INSERT only)
CREATE TABLE IF NOT EXISTS bonus_policies (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    currency_id INT NOT NULL REFERENCES currencies(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    cooldown_seconds INT,          -- NULL = no cooldown (one-time)
    max_claims INT,                -- NULL = unlimited
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus claim history
CREATE TABLE IF NOT EXISTS bonus_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_id INT NOT NULL REFERENCES bonus_policies(id),
    transaction_id UUID REFERENCES user_transactions(id),
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_claims_user_policy ON bonus_claims(user_id, policy_id, claimed_at DESC);

-- Seed: currencies
INSERT INTO currencies (code, name, description) VALUES
    ('point',         'Point',         'Platform universal currency'),
    ('private_point', 'Private Point', 'Non-transferable personal points'),
    ('tc_point',      'TC Point',      'TitleClash game points'),
    ('cc_point',      'CC Point',      'ClawClash game points')
ON CONFLICT (code) DO NOTHING;

-- Seed: bonus policies
INSERT INTO bonus_policies (code, currency_id, amount, cooldown_seconds, max_claims, description) VALUES
    ('signup',      (SELECT id FROM currencies WHERE code = 'point'), 1000, NULL, 1,    'Welcome bonus for new users'),
    ('daily_visit', (SELECT id FROM currencies WHERE code = 'point'), 100,  86400, NULL, 'Daily visit reward (100p every 24h)')
ON CONFLICT (code) DO NOTHING;
