-- 007_sponsorship.sql
-- 후원 시스템: 티어, 주문, 플랫폼 지출

-- 후원 보상 티어 (설정 테이블)
CREATE TABLE sponsorship_tiers (
    id SERIAL PRIMARY KEY,
    amount BIGINT NOT NULL,          -- 후원 금액 (원)
    gem_reward BIGINT NOT NULL,      -- 보상 Gem
    bonus_pct INT DEFAULT 0,         -- 보너스 %
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

INSERT INTO sponsorship_tiers (amount, gem_reward, bonus_pct, sort_order) VALUES
(1000,   100,   0, 1),
(5000,   550,  10, 2),
(10000, 1200,  20, 3),
(30000, 4000,  33, 4);

-- 후원 주문
CREATE TABLE sponsorship_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL,
    gem_reward BIGINT NOT NULL,
    payment_key TEXT UNIQUE,
    pg_provider TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','rewarded','cancelled','refunded')),
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ
);

CREATE INDEX idx_spon_user ON sponsorship_orders(user_id, created_at DESC);
CREATE INDEX idx_spon_status ON sponsorship_orders(status);

-- 플랫폼 지출 기록 (관리자 수동 입력, 공개용)
CREATE TABLE platform_expenses (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,          -- 'server', 'domain', 'service', 'etc'
    amount BIGINT NOT NULL,          -- 지출 금액 (원)
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
