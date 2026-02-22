# Claw Wallet Design

## References
- Plan: `docs/01-plan/features/claw-wallet.plan.md`

---

## 1. 프로젝트 구조

```
agent-wallet/               (→ claw-wallet로 rename 예정)
  apps/api/
    server.js               Express 서버 (port 3100, seedAdmin, DB 대기 루프)
    db/index.js             pg Pool (DATABASE_URL)
    routes/v1/index.js      전체 라우트 정의
    routes/v1/auth.js       POST /auth/login (JWT 발급)
    controllers/v1/
      agents.js             에이전트 등록
      wallet.js             balance, history, credit, debit, transfer
      services.js           서비스 등록/목록
      admin.js              플랫폼 통계
      leaderboard.js        잔액 기준 순위
    services/
      walletService.js      credit, debit, transfer (트랜잭션 처리)
    middleware/
      auth.js               JWT 파싱
      agentAuth.js          Bearer aw_agent_* 검증
      serviceAuth.js        Bearer aw_service_* 검증
      adminAuth.js          role=admin 확인
      rateLimiter.js        120 req/60s per IP
      errorHandler.js       AppError → JSON 응답
    utils/
      errors.js             packages/common/errors 재수출
      token.js              generateAgentToken, generateServiceKey, hashToken
      pagination.js         packages/common/pagination 재수출
  db/migrations/
    001_init.sql            users, agents
    002_services.sql        services
    003_transactions.sql    transactions, service_daily_credits
  docker/
    docker-compose.yml      dev (postgres + api)
    docker-compose.prod.yml prod (api only, titleclash_default 네트워크)
  skills/wallet/SKILL.md    OpenClaw 스킬 (name: claw-wallet)
```

## 2. DB 상세

### 2.1 users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 agents
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_token TEXT NOT NULL UNIQUE,    -- SHA-256 hash
  balance BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}',
  external_ids JSONB DEFAULT '{}',   -- {titleclash: "tc-agent-uuid"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 services
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,      -- SHA-256 hash
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  daily_credit_limit BIGINT DEFAULT 1000000,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 transactions
```sql
CREATE TABLE transactions (
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
CREATE INDEX idx_tx_agent ON transactions(agent_id, created_at DESC);
CREATE INDEX idx_tx_service ON transactions(service_id, created_at DESC);
```

### 2.5 service_daily_credits
```sql
CREATE TABLE service_daily_credits (
  service_id UUID NOT NULL REFERENCES services(id),
  reference_date DATE NOT NULL,
  total_credited BIGINT DEFAULT 0,
  tx_count INTEGER DEFAULT 0,
  PRIMARY KEY (service_id, reference_date)
);
```

## 3. 인증 3계층

### 3.1 Agent Token
- 형식: `aw_agent_` + 32 random hex (packages/common/token.js)
- 저장: SHA-256 해시 → `agents.api_token`
- 미들웨어: `agentAuth` — `Bearer aw_agent_*` 접두사 확인 → 해시 조회 → `req.agent` 설정
- 등록 시 raw 토큰 1회 반환, 이후 조회 불가

### 3.2 Service API Key
- 형식: `aw_service_` + 32 random hex
- 저장: SHA-256 해시 → `services.api_key`
- 미들웨어: `serviceAuth` — `Bearer aw_service_*` 접두사 확인 → 해시 조회 → `req.service` 설정
- 생성 시 raw 키 1회 반환

### 3.3 Admin JWT
- 로그인: `POST /api/v1/auth/login` (email + password → bcrypt 검증)
- JWT: `{ id, email, role }`, 24h 만료, `JWT_SECRET`으로 서명
- 미들웨어: `auth` (JWT 파싱) → `adminAuth` (role=admin 확인)
- 시작 시 `seedAdmin()`으로 ADMIN_EMAIL/ADMIN_PASSWORD 자동 생성

## 4. 핵심 로직 (walletService.js)

### 4.1 credit()
```
BEGIN
  → 멱등성 체크 (idempotency_key 중복 시 기존 tx 반환)
  → 일일 한도 체크 (service_daily_credits vs daily_credit_limit)
  → UPDATE agents SET balance = balance + amount
  → INSERT transactions (type: 'credit')
  → UPSERT service_daily_credits
COMMIT
```

### 4.2 debit()
```
BEGIN
  → 멱등성 체크
  → UPDATE agents SET balance = balance - amount WHERE balance >= amount
    (실패 시 InsufficientFundsError 422)
  → INSERT transactions (type: 'debit')
COMMIT
```

### 4.3 transfer()
```
BEGIN
  → 데드락 방지: UUID 순서로 SELECT FOR UPDATE (작은 UUID 먼저 lock)
  → sender: balance -= amount (부족 시 InsufficientFundsError)
  → receiver: balance += amount
  → INSERT transactions × 2 (transfer_out + transfer_in)
COMMIT
```

## 5. 에러 코드

| Code | Status | 상황 |
|------|--------|------|
| BAD_REQUEST | 400 | 필수 파라미터 누락, 잘못된 값 |
| VALIDATION_ERROR | 400 | 유효성 검증 실패 |
| UNAUTHORIZED | 401 | 토큰/키 누락 또는 무효 |
| FORBIDDEN | 403 | 권한 부족 |
| NOT_FOUND | 404 | 에이전트/서비스 미존재 |
| CONFLICT | 409 | 중복 등록 |
| INSUFFICIENT_FUNDS | 422 | 잔액 부족 |
| RATE_LIMIT | 429 | 요청 초과 |
| DAILY_LIMIT_EXCEEDED | 429 | 서비스 일일 적립 한도 초과 |
| INTERNAL_ERROR | 500 | 예상치 못한 오류 |

## 6. Docker 구성

### 6.1 Development
- **db**: postgres:15-alpine, port 5436, migrations auto-load (initdb.d)
- **api**: 빌드 + 실행, port 3100, depends_on db healthy

### 6.2 Production
- **api only**: 외부 DB 사용 또는 공유 DB
- `titleclash_default` 외부 네트워크에 join
- env vars: `AW_DB_PASSWORD`, `AW_JWT_SECRET`, `AW_ADMIN_PASSWORD`

## 7. 공유 패키지 (packages/common)

| 모듈 | 사용처 |
|------|--------|
| `errors.js` | AppError 계층 (10개 서브클래스) |
| `token.js` | generateToken, hashToken (SHA-256), compareToken |
| `pagination.js` | parsePagination, paginatedResponse |
| `middleware/adminAuth.js` | role=admin 확인 |
| `middleware/errorHandler.js` | AppError → JSON, 알 수 없는 에러 → 500 |

`utils/` 디렉토리에서 wrapper로 재수출하여 기존 require 경로 유지.

## 8. OpenClaw Skill (claw-wallet)

- **name**: `claw-wallet` (ClawHub slug)
- **tools**: `["fetch"]`
- **env vars**: `AGENT_WALLET_URL`, `AGENT_WALLET_TOKEN`
- **기능**: 잔액 조회, 거래 내역, P2P 이체

## 9. 변경하지 않은 부분 (Phase 1 범위 밖)

| 항목 | 이유 |
|------|------|
| TC 자동 연동 | TC의 walletClient.js 존재하나 미연결 |
| 포인트 교환 비율 | 1:1 고정, 교환 비율 설정 없음 |
| 에이전트 비활성화 API | DB 직접 조작만 가능 |
| 거래 내역 필터링 | type별 필터 미구현 (전체 목록만) |
| Webhook | 적립/차감 시 외부 알림 없음 |
