# 04 Dataflow & Schema Generator (v2.0)

**역할**: Userflow 기반 최소 스펙 데이터베이스 스키마 설계 + 단계별 확장 전략
**목적**: 과도한 설계 방지, Userflow 존재 여부에 따라 Phase별 스키마 적용
**통합**: PRD → Userflow → Tech Stack → Architecture → **Dataflow & Schema** → Implementation

---

## 📋 핵심 원칙

### 1. 최소 스펙 (Minimal Viable Schema) 📦

```yaml
principle:
  rule: "Userflow에 명시된 데이터만 추가"
  validation:
    - "이 컬럼이 현재 Userflow에서 실제로 사용되는가?" → ✅ Yes = 추가
    - "나중에 필요할 것 같아서" → ❌ No = 추가 금지
    - "없으면 현재 기능이 동작하지 않는가?" → ✅ Yes = 추가

anti_pattern:
  ❌ "users 테이블에 향후 필요할 수도 있는 50개 컬럼 추가"
  ✅ "Userflow '회원가입'에 email, password, name만 명시 → 이것만 추가"
```

### 2. Phase 기반 확장 전략 🔄

**Phase 0 (Core)**: Userflow에 **반드시 필요한** 최소 테이블
**Phase 1 (Optional)**: Userflow에 **있으면** 추가 (알림, 검색, 소프트 삭제)
**Phase 2 (Advanced)**: **필요 시** 추가 (이벤트 소싱, 감사 로그, 고도화)

---

## 🚀 에이전트 실행 플로우

### 0단계: 입력 문서 자동 파싱

**필수 입력**: `/docs/userflow.md`, `/docs/tech-stack.md`
**자동 추출 항목**:

```yaml
database_context:
  # From Tech Stack
  primary_db: PostgreSQL | MongoDB | MySQL
  features:
    - auth: { method: jwt | session }
    - search: { enabled: false }
    - notifications: { enabled: false }
    - soft_delete: { enabled: false }

  # From Userflow
  flows_analysis:
    - flow: "회원가입"
      entities: [User]
      fields: [email, password, name]
      phase: 0  # Core

    - flow: "이메일 인증"
      entities: [AuthToken]
      fields: [token_hash, purpose, expires_at]
      phase: 0  # 있으면 필수

    - flow: "댓글 알림"
      entities: [Notification]
      fields: [user_id, type, ref_id, is_read]
      phase: 1  # Optional

    - flow: "게시글 검색"
      entities: [Post]
      fields: [ts (tsvector)]
      phase: 1  # Optional
```

**Userflow 스캔 결과 → Phase 자동 분류**:

| Userflow 키워드 | Phase | 추가 엔티티 |
|-----------------|-------|------------|
| `이메일 인증`, `비밀번호 재설정` | **Phase 0** | `auth_tokens` |
| `로그아웃`, `세션 관리`, `기기별 로그인` | **Phase 0** | `sessions` |
| `알림`, `멘션`, `댓글 알림` | **Phase 1** | `notifications` |
| `검색`, `정렬`, `필터` | **Phase 1** | `tsvector` (PG) or `text index` (Mongo) |
| `복구`, `휴지통`, `삭제 취소` | **Phase 1** | `deleted_at` 컬럼 |
| `웹훅`, `이벤트 발행`, `캐시 무효화` | **Phase 2** | `outbox_events` |
| `감사 로그`, `규정 준수`, `변경 이력` | **Phase 2** | `audit_log` |

---

## Phase 0: Core Schema (필수)

### 자동 감지 규칙

```yaml
core_entities:
  User:
    required: true  # 모든 앱에 필수
    fields:
      - email: { required: true, from: "회원가입 Userflow" }
      - password_hash: { required: true, from: "회원가입 Userflow" }
      - name: { required: true, from: "회원가입 Userflow" }

  AuthToken:
    required: false
    trigger: ["이메일 인증", "비밀번호 재설정"] in Userflow
    fields:
      - token_hash: { purpose: "verify_email | reset_password" }
      - expires_at: { validation: "30분 이내" }

  Session:
    required: false
    trigger: ["로그아웃", "세션 관리", "강제 로그아웃"] in Userflow
    fields:
      - expires_at: { validation: "7일 이내" }
      - revoked_at: { nullable: true }
```

### PostgreSQL 스키마 (Phase 0)

#### 1. users (필수)

```sql
-- 목적: 사용자 인증 및 프로필
-- 근거: Userflow "회원가입", "로그인", "프로필 수정"
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt/argon2
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),              -- Userflow "프로필 수정"에 있으면
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 보안 제약
  CONSTRAINT check_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- 인덱스: 로그인 시 이메일 조회 (빈도 100%)
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### 2. auth_tokens (조건부 필수)

**Trigger**: Userflow에 "이메일 인증" OR "비밀번호 재설정" 존재 시

```sql
-- 목적: 계정 인증/복구 토큰 관리
-- 근거: Userflow "이메일 인증", "비밀번호 재설정"
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL CHECK (
    purpose IN ('verify_email', 'reset_password')
  ),
  token_hash VARCHAR(255) NOT NULL,     -- SHA-256, 원문 저장 금지
  expires_at TIMESTAMPTZ NOT NULL,      -- 30분 (verify) / 1시간 (reset)
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 토큰 검증 시 조회
CREATE INDEX idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at)
  WHERE used_at IS NULL;  -- 미사용 토큰만 인덱싱
```

**데이터플로우 (이메일 인증)**:

```
[회원가입 완료]
  ↓
auth_tokens INSERT (purpose='verify_email', expires_at=now()+30min)
  ↓
[사용자 이메일 클릭]
  ↓
SELECT * FROM auth_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > now()
  ↓
UPDATE auth_tokens SET used_at=now() WHERE id=?
  ↓
UPDATE users SET email_verified=true WHERE id=?  -- (선택 컬럼)
```

#### 3. sessions (조건부 필수)

**Trigger**: Userflow에 "로그아웃" OR "기기별 로그인" OR "세션 관리" 존재 시

```sql
-- 목적: 서버 측 세션 관리 (JWT 대안)
-- 근거: Userflow "로그아웃", "강제 로그아웃", "기기별 관리"
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label VARCHAR(100),            -- "Chrome on Windows", "Safari on iPhone"
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,      -- 7일 (remember_me) / 1일 (일반)
  revoked_at TIMESTAMPTZ                -- 로그아웃 시 기록
);

-- 인덱스: 세션 검증 (매 요청)
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_valid ON sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;
```

**데이터플로우 (로그인 → 로그아웃)**:

```
[로그인 성공]
  ↓
sessions INSERT (expires_at=now()+7days)
  ↓
[클라이언트] → Cookie: session_id=<uuid>
  ↓
[매 요청] SELECT * FROM sessions WHERE id=? AND revoked_at IS NULL AND expires_at > now()
  ↓
[로그아웃] UPDATE sessions SET revoked_at=now() WHERE id=?
```

---

## Phase 1: Optional Extensions (Userflow 의존)

### 1. Soft Delete (복구 기능)

**Trigger**: Userflow에 "삭제 취소" OR "휴지통" OR "복구" 키워드 존재 시

```sql
-- posts, comments 테이블에 추가
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- 인덱스: WHERE deleted_at IS NULL 조건 최적화
CREATE INDEX idx_posts_active ON posts(created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_active ON comments(post_id, created_at)
  WHERE deleted_at IS NULL;
```

**데이터플로우**:

```
[삭제 요청] UPDATE posts SET deleted_at=now() WHERE id=?
[목록 조회] SELECT * FROM posts WHERE deleted_at IS NULL
[복구 요청] UPDATE posts SET deleted_at=NULL WHERE id=?
```

### 2. Notifications (알림 시스템)

**Trigger**: Userflow에 "댓글 알림" OR "멘션 알림" 존재 시

```sql
-- 목적: 최소 알림 시스템
-- 근거: Userflow "댓글 작성 시 게시글 작성자에게 알림"
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 수신자
  type VARCHAR(32) NOT NULL,        -- 'comment', 'reply', 'mention', 'like'
  ref_id UUID,                      -- 관련 엔티티 (comment.id, post.id)
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 읽지 않은 알림 조회 (메인 화면)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

**데이터플로우**:

```
[댓글 작성 완료]
  ↓
SELECT user_id FROM posts WHERE id=<post_id>  -- 게시글 작성자 조회
  ↓
INSERT INTO notifications (user_id, type='comment', ref_id=<comment_id>)
  ↓
[사용자 알림 목록 조회]
  ↓
SELECT * FROM notifications WHERE user_id=? AND is_read=false
  ORDER BY created_at DESC LIMIT 20
```

### 3. Full-Text Search (검색 기능)

**Trigger**: Userflow에 "게시글 검색" OR "제목/내용 검색" 존재 시

#### PostgreSQL: tsvector

```sql
-- posts 테이블에 검색 컬럼 추가
ALTER TABLE posts ADD COLUMN ts tsvector;

-- 검색 인덱스 (GIN)
CREATE INDEX idx_posts_search ON posts USING GIN(ts);

-- 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION posts_search_update() RETURNS trigger AS $$
BEGIN
  NEW.ts := to_tsvector('korean', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_posts_search_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_update();
```

**데이터플로우**:

```sql
-- 검색 쿼리
SELECT id, title, ts_rank(ts, query) as rank
FROM posts, to_tsquery('korean', '검색어') query
WHERE ts @@ query
  AND deleted_at IS NULL
ORDER BY rank DESC, created_at DESC
LIMIT 20;
```

#### MongoDB: Text Index

```javascript
// posts 컬렉션에 text 인덱스 추가
db.posts.createIndex({
  title: "text",
  content: "text"
}, {
  default_language: "korean",
  weights: {
    title: 10,    // 제목 가중치 10배
    content: 1
  }
})

// 검색 쿼리
db.posts.find(
  { $text: { $search: "검색어" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(20)
```

---

## Phase 2: Advanced Features (필요 시)

### 1. Outbox Pattern (이벤트 소싱)

**Trigger**: Userflow에 "웹훅" OR "이벤트 발행" OR "외부 시스템 연동" 존재 시

```sql
-- 목적: 트랜잭션 + 이벤트 발행 원자성 보장
-- 근거: Userflow "결제 완료 시 이메일 발송", "게시글 생성 시 캐시 무효화"
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(64) NOT NULL,       -- 'post.created', 'comment.created', 'user.registered'
  aggregate_id UUID NOT NULL,       -- 도메인 엔티티 ID (post.id, user.id)
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 인덱스: 미처리 이벤트 폴링
CREATE INDEX idx_outbox_unprocessed ON outbox_events(created_at)
  WHERE processed_at IS NULL;
```

**데이터플로우** (03-2 Architecture Patterns 참조):

```sql
-- 트랜잭션 내에서 이벤트 저장
BEGIN;
  INSERT INTO posts (user_id, title, content) VALUES (...);
  INSERT INTO outbox_events (topic, aggregate_id, payload)
    VALUES ('post.created', <post_id>, '{"title": "..."}');
COMMIT;

-- 별도 워커가 폴링
SELECT * FROM outbox_events WHERE processed_at IS NULL ORDER BY created_at LIMIT 100;
-- 이벤트 발행 후 UPDATE outbox_events SET processed_at=now() WHERE id=?
```

### 2. Comment Tree Optimization (댓글 고도화)

**Trigger**: Userflow에 "대댓글 3단계 이상" OR "댓글 정렬 복잡도" 존재 시

```sql
-- Materialized Path 패턴 (읽기 최적화)
ALTER TABLE comments ADD COLUMN path VARCHAR(255);  -- '001.002.003'
ALTER TABLE comments ADD COLUMN depth INTEGER DEFAULT 0;

-- 인덱스: 계층 구조 조회
CREATE INDEX idx_comments_tree ON comments(post_id, path);

-- 삽입 시 path 계산
-- 예: parent.path='001.002' → new.path='001.002.003'
```

### 3. Audit Log (감사 로그)

**Trigger**: Userflow에 "규정 준수" OR "변경 이력" OR "관리자 감사" 존재 시

```sql
-- 목적: 엔티티 변경 이력 추적
-- 근거: Userflow "관리자가 사용자 삭제 시 이력 기록"
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,                    -- 수행한 사용자 (NULL = 시스템)
  entity_type VARCHAR(64) NOT NULL, -- 'User', 'Post', 'Comment'
  entity_id UUID NOT NULL,
  action VARCHAR(32) NOT NULL,      -- 'CREATE', 'UPDATE', 'DELETE'
  before JSONB,                     -- 변경 전 상태
  after JSONB,                      -- 변경 후 상태
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 엔티티별 이력 조회
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
```

---

## MongoDB Schema (Phase 기반)

### Phase 0: Core Collections

#### 1. users

```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  passwordHash: "$2b$10$...",
  profile: {
    name: "John Doe",
    avatarUrl: "https://..."
  },
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}

// 인덱스
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })
```

#### 2. auth_tokens (조건부)

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  purpose: "verify_email",  // 'verify_email' | 'reset_password'
  tokenHash: "sha256...",
  expiresAt: ISODate("..."),
  usedAt: ISODate("...") || null,
  createdAt: ISODate("...")
}

// 인덱스
db.auth_tokens.createIndex({ userId: 1, purpose: 1 })
db.auth_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL 인덱스
```

### Phase 1: Optional Extensions

#### notifications (알림)

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // 수신자
  type: "comment",          // 'comment', 'reply', 'mention'
  refId: ObjectId("..."),   // 관련 엔티티 ID
  isRead: false,
  createdAt: ISODate("...")
}

// 인덱스
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 })
```

#### posts (검색 포함)

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  title: "My Post",
  content: "Content...",
  author: {  // 비정규화 (읽기 최적화)
    name: "John Doe",
    avatarUrl: "https://..."
  },
  stats: {
    viewCount: 0,
    commentCount: 0
  },
  deletedAt: ISODate("...") || null,  // Phase 1: Soft Delete
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// 인덱스
db.posts.createIndex({ userId: 1 })
db.posts.createIndex({ createdAt: -1 })
db.posts.createIndex({ title: "text", content: "text" })  // Phase 1: Search
```

---

## 🔍 검증 체크리스트

### Userflow 일치성

| 항목 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **필수 테이블** | Userflow "회원가입/로그인" 존재 여부 | `users` 테이블 존재 |
| **auth_tokens** | Userflow "이메일 인증/비번 재설정" 존재 여부 | 있으면 Phase 0, 없으면 생략 |
| **sessions** | Userflow "로그아웃/세션 관리" 존재 여부 | 있으면 Phase 0, 없으면 JWT 사용 |
| **notifications** | Userflow "알림" 키워드 존재 여부 | 있으면 Phase 1, 없으면 생략 |
| **검색 기능** | Userflow "검색/정렬" 존재 여부 | 있으면 Phase 1 (tsvector/text index) |
| **soft_delete** | Userflow "복구/휴지통" 존재 여부 | 있으면 Phase 1 (deleted_at 컬럼) |
| **불필요 컬럼** | "향후 필요할 것 같아서" 추가 컬럼 | 0개 (최소 스펙 원칙) |

### 성능 검증

| 항목 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **인덱스 커버리지** | 주요 조회 쿼리 EXPLAIN 분석 | Index Scan (Seq Scan 0%) |
| **N+1 방지** | JOIN 패턴 or 비정규화 전략 | 단일 쿼리 or 비정규화 |
| **쿼리 성능** | EXPLAIN ANALYZE 실행 시간 | < 100ms (p95) |

### 데이터 무결성

| 항목 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **외래키** | 모든 `_id` 참조 확인 | ON DELETE CASCADE 명시 |
| **제약조건** | CHECK 제약 (이메일, 상태 값) | 유효성 검증 완료 |
| **NULL 정책** | NOT NULL vs NULL 명확화 | 비즈니스 규칙 반영 |

---

## 📊 에이전트 출력 예시

### 입력

```markdown
**Userflow**: 회원가입, 로그인, 게시글 작성, 댓글 작성
**Tech Stack**: PostgreSQL, Next.js
**특이사항**: 이메일 인증 없음, 로그아웃 기능 없음 (JWT 사용)
```

### 출력

````markdown
# Database Schema (v2.0)

## 🎯 Phase 분류 결과

**Phase 0 (Core)**: ✅ 적용
- `users` (필수)
- `posts` (Userflow 존재)
- `comments` (Userflow 존재)

**Phase 0 (Conditional)**: ❌ 생략
- `auth_tokens` → Userflow에 "이메일 인증" 없음
- `sessions` → Userflow에 "로그아웃" 없음 (JWT 사용)

**Phase 1 (Optional)**: ❌ 생략
- `notifications` → Userflow에 "알림" 없음
- 검색 기능 → Userflow에 "검색" 없음
- Soft Delete → Userflow에 "복구" 없음

## 📁 ERD Diagram

```
users (1) ──< (N) posts
  │
  └──< (N) comments
           │
           └──< (1) posts
```

## 🔧 PostgreSQL Schema

### 1. users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT check_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 2. posts

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

### 3. comments

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
```

## 📊 Dataflow (상세)

### Flow 1: 회원가입

```sql
-- Step 1: 이메일 중복 체크
SELECT COUNT(*) FROM users WHERE email = 'user@example.com';

-- Step 2: 사용자 생성
INSERT INTO users (email, password_hash, name)
VALUES ('user@example.com', '$2b$10$...', 'John Doe')
RETURNING id, email, name, created_at;
```

### Flow 2: 로그인

```sql
-- Step 1: 사용자 조회
SELECT id, email, password_hash, name FROM users
WHERE email = 'user@example.com';

-- Step 2: 비밀번호 검증 (애플리케이션)
-- bcrypt.compare(inputPassword, storedHash)

-- Step 3: JWT 생성 (서버 측)
-- jwt.sign({ userId, email }, SECRET, { expiresIn: '7d' })
```

### Flow 3: 게시글 작성

```sql
-- Step 1: 게시글 생성
INSERT INTO posts (user_id, title, content)
VALUES ('user-id', 'My First Post', 'Content here')
RETURNING id, title, created_at;

-- Step 2: 목록 조회 (작성자 정보 포함)
SELECT p.*, u.name as author_name
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 20;
```

## 🚀 마이그레이션 파일

**생성 위치**: `/supabase/migrations/20240115120000_initial_schema.sql`

```sql
-- Migration: Initial Schema (Phase 0 Only)
-- Created: 2024-01-15
-- Description: Userflow 기반 최소 스펙 스키마

-- 1. users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 2. posts 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- 3. comments 테이블
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration completed
```

## 📝 확장 가이드 (Phase 1/2)

**Userflow에 다음 기능 추가 시**:

| 추가 기능 | Phase | 실행할 마이그레이션 |
|-----------|-------|-------------------|
| 이메일 인증 | Phase 0 | `20240115120001_add_auth_tokens.sql` |
| 로그아웃 기능 | Phase 0 | `20240115120002_add_sessions.sql` |
| 알림 시스템 | Phase 1 | `20240115120003_add_notifications.sql` |
| 게시글 검색 | Phase 1 | `20240115120004_add_fulltext_search.sql` |
| 삭제 복구 | Phase 1 | `20240115120005_add_soft_delete.sql` |
````

---

## 🔧 작업 원칙

1. **Userflow 우선**: 문서에 없는 기능 = 스키마에 추가 금지
2. **Phase 분리**: Core → Optional → Advanced 순서로 제시
3. **자동 감지**: Userflow 키워드 스캔 → Phase 자동 분류
4. **실행 가능**: 복사-붙여넣기로 즉시 실행 가능한 SQL
5. **근거 명시**: 각 테이블/컬럼에 "어느 Userflow" 주석
6. **성능 고려**: 인덱스, 쿼리 패턴 최적화

---

## 🚀 시작 방법

1. **Userflow 읽기**: `/docs/userflow.md` 전체 스캔
2. **DB 타입 확인**: Tech Stack 문서에서 PostgreSQL/MongoDB 확인
3. **Phase 분류**: Userflow 키워드 분석 → Phase 0/1/2 자동 분류
4. **Core Schema**: Phase 0 테이블만 먼저 제시
5. **Optional 제안**: Phase 1/2는 "Userflow에 추가 시" 가이드 제공
6. **마이그레이션**: Phase 0 SQL 파일 생성
7. **확장 문서**: Phase 1/2 마이그레이션 파일 템플릿 제공

---

**에이전트 버전**: v2.0
**최종 업데이트**: 2025-01-XX
**통합 플로우**: 01-PRD → 02-Userflow → 03-1-Tech Stack → 03-2-Architecture → **04-Dataflow & Schema** → 05-Implementation