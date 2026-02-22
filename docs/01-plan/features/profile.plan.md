# Hub Profile Plan

> Hub는 인증 + 지갑만 담당. 서비스별 프로필은 각 서비스가 독립 관리.
> 전체 구조: `docs/architecture/ACCOUNT_PROFILE_SPEC.md` 참조

## 1. 현재 상태

### DB (users 테이블)
- `display_name`, `avatar_url`, `email`, `password_hash`, `github_id`, `github_username`, `role`

### API
| Endpoint | 설명 | 상태 |
|----------|------|------|
| POST /auth/register | 가입 (display_name 설정) | 구현됨 |
| POST /auth/login | 로그인 | 구현됨 |
| POST /auth/github | GitHub OAuth | 구현됨 |
| GET /auth/me | 내 정보 조회 | 구현됨 |
| GET /account/links | 연결된 서비스 목록 | 구현됨 |
| POST /account/link | 서비스 계정 연결 | 구현됨 |
| DELETE /account/links/:service | 서비스 계정 해제 | 구현됨 |

### 없는 것
- 프로필 수정 API (display_name 변경 등)
- 비밀번호 변경 API
- GitHub 연동 추가/해제 API (기존 계정에)

## 2. 추가 구현 항목

### 2.1 프로필 수정 API
```
PUT /api/v1/auth/profile
Authorization: Bearer <JWT>
Body: { display_name: "새 닉네임" }
```
- display_name 유효성: 2~20자, 공백 trim
- 성공 시 업데이트된 유저 객체 반환
- Hub 내에서만 의미. 서비스 닉네임에 영향 없음

### 2.2 비밀번호 변경 API
```
PUT /api/v1/auth/password
Authorization: Bearer <JWT>
Body: { current_password: "...", new_password: "..." }
```
- GitHub-only 유저(password_hash NULL)는 사용 불가 → 에러 반환
- current_password 검증 필수
- new_password: 8자 이상

### 2.3 GitHub 연동 관리
```
POST /api/v1/auth/github/link     — 기존 이메일 계정에 GitHub 연동 추가
DELETE /api/v1/auth/github/link   — GitHub 연동 해제 (password_hash 있을 때만)
```
- 연동 추가: OAuth flow → 기존 유저에 github_id/github_username 업데이트
- 연동 해제: password_hash가 NULL이면 거부 (로그인 불가 방지)

### 2.4 프론트엔드 — ProfilePage 개선
현재 ProfilePage.jsx 수정:
- display_name 인라인 편집
- 비밀번호 변경 섹션 (이메일 가입자만 표시)
- GitHub 연동 상태 표시 + 연동/해제 버튼
- 지갑 잔액 + 최근 거래 내역 표시 (기존 wallet API 활용)

## 3. 구현 순서

1. `PUT /auth/profile` — display_name 수정
2. `PUT /auth/password` — 비밀번호 변경
3. `POST/DELETE /auth/github/link` — GitHub 연동 관리
4. ProfilePage.jsx 개선
5. 지갑 섹션 ProfilePage에 통합

## 4. 참고

- DB 스키마 변경 불필요 (기존 users 컬럼 활용)
- 아바타는 현재 미구현 (GitHub avatar_url만 존재)
- 프로필 공개는 현재 미구현 (본인만 조회)
