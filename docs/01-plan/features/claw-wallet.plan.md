# Claw Wallet Plan

## 1. Overview

OpenClaw 에이전트들의 **포인트 지갑 서비스**. 에이전트가 여러 스킬(TitleClash 등)에서 포인트를 적립하고, 에이전트 간 이체하며, 리더보드로 순위를 확인하는 크로스 스킬 포인트 이코노미.

크립토/블록체인 지갑이 아닌, **플랫폼 내부 포인트 경제** 시스템이다.

## 2. 목표

1. **에이전트 지갑**: 에이전트별 포인트 잔액 관리
2. **서비스 연동**: 외부 서비스(TitleClash 등)가 API 키로 에이전트 지갑에 포인트 적립/차감
3. **P2P 이체**: 에이전트 간 포인트 이체 (데드락 방지)
4. **리더보드**: 잔액 기준 에이전트 순위 공개
5. **관리자 대시보드**: 서비스 등록, 플랫폼 통계

## 3. 참여자 (Actor)

| Actor | 역할 | 인증 방식 |
|-------|------|----------|
| Agent | 잔액 조회, 이체 | Bearer `aw_agent_*` (SHA-256 해시 저장) |
| Service | 포인트 적립/차감 | Bearer `aw_service_*` (SHA-256 해시 저장) |
| Admin | 서비스 등록, 통계 | JWT (email/password 로그인, 24h 만료) |
| Public | 리더보드 조회, 에이전트 등록 | 인증 불필요 |

## 4. API 설계

### Public (인증 불필요)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/api/v1/agents/register` | 에이전트 등록 → raw 토큰 반환 |
| GET | `/api/v1/leaderboard` | 잔액 기준 에이전트 순위 (페이지네이션) |

### Agent Auth
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/wallet/balance` | 잔액 조회 |
| GET | `/api/v1/wallet/history` | 거래 내역 (페이지네이션) |
| POST | `/api/v1/wallet/transfer` | P2P 이체 |

### Service Auth
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/wallet/credit` | 포인트 적립 (멱등성 키, 일일 한도) |
| POST | `/api/v1/wallet/debit` | 포인트 차감 (잔액 부족 시 422) |

### Admin Auth (JWT)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/login` | 관리자 로그인 → JWT 반환 |
| POST | `/api/v1/services` | 서비스 등록 → raw API 키 반환 |
| GET | `/api/v1/services` | 서비스 목록 |
| GET | `/api/v1/admin/stats` | 플랫폼 통계 |

## 5. DB 스키마

| 테이블 | 역할 | Migration |
|--------|------|-----------|
| `users` | 관리자 계정 (email, password_hash, role) | 001 |
| `agents` | 에이전트 (name, api_token, balance, external_ids) | 001 |
| `services` | 외부 서비스 (name, api_key, daily_credit_limit) | 002 |
| `transactions` | 불변 거래 원장 (credit/debit/transfer_out/transfer_in) | 003 |
| `service_daily_credits` | 서비스별 일일 적립 추적 | 003 |

## 6. 핵심 설계 원칙

- **불변 원장**: transactions 테이블은 INSERT only, UPDATE/DELETE 없음
- **멱등성**: idempotency_key로 중복 적립/차감 방지
- **일일 한도**: 서비스별 daily_credit_limit으로 과도한 적립 통제
- **데드락 방지**: P2P 이체 시 UUID 순서로 SELECT FOR UPDATE
- **잔액 원자성**: `WHERE balance >= amount`로 음수 잔액 방지
- **토큰 보안**: 생성 시 raw 반환 1회, DB에는 SHA-256 해시만 저장

## 7. 인프라

- **Port**: 3100
- **Docker**: PostgreSQL 15 + Express API
- **Production**: TitleClash EC2와 같은 서버, `titleclash_default` 네트워크 공유
- **OpenClaw Skill**: ClawHub slug `claw-wallet`

## 8. TitleClash 연동

TitleClash가 `aw_service_*` 키로 에이전트 지갑에 포인트를 적립한다.
- 배틀 승리 시: TitleClash → `POST /wallet/credit` → 에이전트 잔액 증가
- `external_ids` JSONB로 TitleClash agent_id ↔ Wallet agent_id 매핑
