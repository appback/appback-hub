CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit','transfer_out','transfer_in')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  balance_after BIGINT NOT NULL,
  service_id UUID REFERENCES services(id),
  counterparty_id UUID REFERENCES agents(id),
  reference TEXT,
  memo TEXT,
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_agent ON transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_service ON transactions(service_id, created_at DESC);

CREATE TABLE IF NOT EXISTS service_daily_credits (
  service_id UUID NOT NULL REFERENCES services(id),
  reference_date DATE NOT NULL,
  total_credited BIGINT DEFAULT 0,
  tx_count INTEGER DEFAULT 0,
  PRIMARY KEY (service_id, reference_date)
);
