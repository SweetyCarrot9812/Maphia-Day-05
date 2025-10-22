# 05 UseCase Generator (v2.0)

**역할**: Userflow 기반 구현 가능한 상세 유스케이스 작성 + 시퀀스 다이어그램 시각화
**목적**: 요구사항 → 테스트 가능한 명세 → 검증 가능한 구현 완벽한 폐루프 구조
**통합**: PRD → Userflow → Tech Stack → Architecture → Dataflow → **UseCase** → Implementation

---

## 📋 핵심 원칙

### 1. 간결성 📝

```yaml
principle:
  rule: "핵심만 명확히, 검토 가능하도록, 구현자가 바로 이해"
  anti_pattern:
    ❌ "장황한 설명, 불필요한 반복, 구현 세부사항"
  pattern:
    ✅ "간결한 서술, 검증 가능한 조건, 테스트 가능한 시나리오"
```

### 2. 사용자 관점 Precondition 👤

```yaml
precondition_rule:
  scope: "사용자가 이해 가능한 조건만"
  anti_pattern:
    ❌ "데이터베이스에 users 테이블이 존재한다"
    ❌ "JWT 토큰이 Redis에 저장되어 있다"
  pattern:
    ✅ "사용자가 로그인되어 있다"
    ✅ "사용자가 게시글 작성 권한이 있다"
```

### 3. PlantUML 표준 문법 📊

```yaml
diagram_rule:
  standard: "PlantUML 표준 문법만 사용"
  participants: [User, FE, BE, Database]
  arrows:
    request: "->"
    response: "-->"
  branching: "alt/else/end만 사용"
  anti_pattern:
    ❌ "== Phase 1 == (구분선 사용)"
    ❌ "note over User (비표준 마킹)"
```

---

## 🚀 에이전트 실행 플로우

### 0단계: 입력 문서 자동 파싱

**필수 입력**: `/docs/userflow.md`, `/docs/database.md`, `/docs/architecture.md`
**사용자 프롬프트 형식**:

```
/docs/userflow.md의 {N}번 기능에 대한 상세 유스케이스를 작성하고,
/docs/00N/spec.md 경로에 저장하세요.
```

**자동 추출 항목**:

```yaml
usecase_context:
  # From Userflow
  flow_id: "UF-AUTH-LOGIN-EMAIL"
  feature_name: "회원가입"
  inputs: [email, password, name]
  validations: [email_format, password_strength, email_unique]
  edge_cases: [duplicate_email, weak_password, network_error]

  # From Database
  affected_tables: [users, auth_tokens]
  constraints: [unique_email, password_hash_bcrypt]

  # From Architecture
  layers: [Presentation → Application → Domain → Infrastructure]
  patterns: [Result<T>, UnitOfWork, Validation_at_boundary]
```

---

## 📄 유스케이스 문서 구조 (v2.0)

### 파일명 규칙

```
N=1  → /docs/001/spec.md (UC-001)
N=5  → /docs/005/spec.md (UC-005)
N=12 → /docs/012/spec.md (UC-012)
```

### 문서 템플릿

```markdown
# UC-00N: [기능명]

## 개요
- **Use Case ID**: UC-00N
- **Use Case Name**: [기능명]
- **Flow ID**: [UF-EPIC-FEATURE-TASK] (from 02-Userflow)
- **Created**: YYYY-MM-DD
- **Version**: 2.0
- **Related**:
  - [PRD](/docs/prd.md#section)
  - [Userflow](/docs/userflow.md#flow-N)
  - [Database](/docs/database.md#tables)
  - [Architecture](/docs/architecture.md#patterns)

---

## Primary Actor
[주요 사용자 역할]

**예시**:
- 일반 사용자 (Guest → Registered)
- 관리자 (Admin)
- 시스템 (Automated Task)

---

## Precondition
[사용자 관점 전제조건 - 기술 조건 제외]

**예시**:
- 사용자가 로그인되어 있지 않다
- 사용자가 이메일 인증을 완료했다
- 사용자가 게시글 작성 권한이 있다

---

## Trigger
[유스케이스를 시작하는 액션]

**예시**:
- 사용자가 "회원가입" 버튼 클릭
- 사용자가 게시글 작성 폼 제출
- 시스템이 예약된 작업 실행

---

## Data Contract

### Request
| Field | Type | Required | Constraints | Example |
|------|------|----------|-------------|---------|
| email | string | Yes | RFC5322, max 254 chars | "user@example.com" |
| password | string | Yes | ≥8, letters+digits+symbols | "P@ssw0rd!" |
| name | string | Yes | 2–50, no special chars | "John Doe" |

### Response (201 Created)
| Field | Type | Notes | Example |
|------|------|-------|---------|
| userId | string | ULID/UUID | "01HP9XGQZ..." |
| email | string | Lowercase | "user@example.com" |
| name | string | | "John Doe" |
| createdAt | string | ISO 8601 | "2024-01-15T12:00:00Z" |

### Error Shape
```json
{
  "code": "VAL-001",
  "message": "이미 사용 중인 이메일입니다",
  "details": {
    "field": "email",
    "value": "user@example.com"
  }
}
```

---

## Main Scenario

### Happy Path
1. 사용자가 회원가입 폼에 정보 입력
   - **Actor**: User
   - **Action**: 이메일, 비밀번호, 이름 입력 후 "가입하기" 버튼 클릭
   - **Validation**: 클라이언트 측 형식 검증

2. 시스템이 입력 데이터 검증 (Boundary Validation)
   - **Actor**: System (Presentation Layer)
   - **Action**: Zod 스키마로 요청 검증
   - **Validation**:
     - BR-001: 이메일 형식 (RFC 5322)
     - BR-002: 비밀번호 정책 (≥8, 조합)
     - BR-003: 이름 길이 (2-50자)

3. 시스템이 비즈니스 규칙 검증
   - **Actor**: System (Application Layer)
   - **Action**: Use Case 실행
   - **Validation**:
     - BR-004: 이메일 중복 검사 (users.email UNIQUE)

4. 시스템이 사용자 정보 저장
   - **Actor**: System (Infrastructure Layer)
   - **Action**: Unit of Work 트랜잭션 내 처리
   - **Data**:
     - users INSERT (email, password_hash, name, created_at)
     - outbox_events INSERT (topic='user.registered') [선택]

5. 시스템이 성공 응답 반환
   - **Actor**: System
   - **Action**: 201 Created 응답
   - **Output**:
     - 성공 메시지 표시
     - 로그인 페이지로 리다이렉트
     - traceId 로깅 (UC-001)

---

## Edge Cases

### EC-001: 이메일 중복
- **조건**: 입력한 이메일이 이미 존재 (users.email UNIQUE 위반)
- **처리**: Repository.findByEmail → 중복 발견 → Result.fail(VAL-003)
- **응답**: 409 Conflict
- **결과**: "이미 사용 중인 이메일입니다" 메시지, 폼 입력값 유지
- **보장**: DB 변경 없음, 재시도 안전

### EC-002: 비밀번호 형식 오류
- **조건**: 비밀번호 < 8자 OR 조합 규칙 위반
- **처리**: Zod 검증 실패 → Result.fail(VAL-002)
- **응답**: 400 Bad Request
- **결과**: "비밀번호는 8자 이상, 영문+숫자+특수문자 조합이어야 합니다"
- **보장**: API 호출 전 클라이언트 검증으로 예방 가능

### EC-003: 네트워크 타임아웃
- **조건**: API 요청 중 네트워크 끊김 (timeout > 10s)
- **처리**: Fetch API abort → 재시도 로직 (최대 3회, 지수백오프)
- **응답**: -
- **결과**: "네트워크 오류가 발생했습니다. 다시 시도해주세요"
- **보장**: Idempotency-Key로 중복 가입 방지

### EC-004: 서버 내부 오류
- **조건**: DB 연결 실패, 예외 발생
- **처리**: Result.fail(SYS-001) → 로깅 + 알림
- **응답**: 500 Internal Server Error
- **결과**: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요"
- **보장**: 트랜잭션 롤백, 데이터 일관성 유지

---

## Business Rules

### BR-001: 이메일 형식 검증
- **Rule**: RFC 5322 표준 준수
- **Validation**: Zod schema (email format)
- **Location**: Presentation Layer (DTO validation)

### BR-002: 비밀번호 정책
- **Rule**: 최소 8자, 영문 대소문자 + 숫자 + 특수문자 조합
- **Validation**: Zod regex pattern
- **Location**: Presentation Layer + Domain Layer (Value Object)

### BR-003: 이름 검증
- **Rule**: 2-50자, 특수문자 불가 (공백 허용)
- **Validation**: Zod minLength(2).maxLength(50)
- **Location**: Presentation Layer

### BR-004: 이메일 중복 불가
- **Rule**: users.email UNIQUE 제약
- **Validation**: Repository.findByEmail → Result<User | null>
- **Location**: Application Layer (Use Case)

### BR-005: 비밀번호 해싱
- **Rule**: bcrypt/argon2, salt rounds ≥ 10
- **Validation**: Password Value Object
- **Location**: Domain Layer

---

## Rule ↔ Validation Mapping

| Rule ID | Description | Validation Location | Validation Method |
|---------|-------------|---------------------|-------------------|
| **BR-001** | 이메일 형식 (RFC 5322) | Presentation (DTO) | Zod email() |
| **BR-002** | 비밀번호 정책 (≥8, 조합) | Presentation + Domain | Zod regex + VO |
| **BR-003** | 이름 길이 (2-50자) | Presentation | Zod min/max |
| **BR-004** | 이메일 중복 불가 | Application (Use Case) | DB query (SELECT) |
| **BR-005** | 비밀번호 해싱 | Domain (Value Object) | bcrypt.hash() |

---

## Guarantees

### Success Guarantees
- ✅ 신규 사용자 레코드 생성 (`users.id` 존재)
- ✅ 로그인 가능 상태 (email + password_hash 저장)
- ✅ 이메일 인증 토큰 발송 [선택] (Phase 0)
- ✅ traceId 로깅 완료 (UC-001 태깅)

### Failure Guarantees
- ✅ DB 변경 없음 (트랜잭션 롤백)
- ✅ 재시도 안전 (Idempotency-Key 기반)
- ✅ Rate Limit 남은 횟수 응답 헤더에 포함 (`X-RateLimit-Remaining`)
- ✅ 실패 케이스 샘플링 100% (로깅 + 알림)

---

## Concurrency & Idempotency

### Idempotency
- **Client**: `Idempotency-Key` 헤더 전송 (UUID v4, 요청당 고유)
- **Server**:
  - Redis 캐시에 키 저장 (TTL=10분)
  - 중복 요청 시 캐싱된 응답 반환 (201 → 200)
- **Example**:
  ```http
  POST /api/auth/register
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  ```

### Retry Policy
- **Network Error**: 3회 지수백오프 (1s, 2s, 4s)
- **Retry Skip**:
  - 200/201 (성공)
  - 400/409 (클라이언트 오류)
  - 401/403 (인증/권한 오류)
- **Retry Allowed**: 500/503 (서버 오류)

### Concurrency Control
- **Email Uniqueness**: DB UNIQUE 제약 + SELECT FOR UPDATE
- **Race Condition**:
  - 동시 가입 시 → 하나만 성공, 나머지 409 반환
  - Idempotency-Key로 중복 방지

---

## Error Catalogue

| Code | HTTP | Message | Cause | Recovery |
|------|------|---------|-------|----------|
| **VAL-001** | 400 | 이메일 형식이 올바르지 않습니다 | RFC 5322 위반 | 형식 수정 후 재시도 |
| **VAL-002** | 400 | 비밀번호는 8자 이상, 영문+숫자+특수문자 조합이어야 합니다 | 정책 위반 | 규칙 준수 후 재시도 |
| **VAL-003** | 409 | 이미 사용 중인 이메일입니다 | UNIQUE 제약 위반 | 다른 이메일 사용 |
| **VAL-004** | 400 | 이름은 2-50자여야 합니다 | 길이 제약 위반 | 길이 조정 후 재시도 |
| **AUTH-001** | 401 | 인증이 필요합니다 | 토큰 없음/만료 | 로그인 |
| **AUTH-002** | 403 | 권한이 없습니다 | 역할 불일치 | 관리자 문의 |
| **RATE-001** | 429 | 요청 한도를 초과했습니다 | Rate Limit 초과 | `Retry-After` 헤더 확인 |
| **SYS-001** | 500 | 일시적인 오류가 발생했습니다 | 내부 오류 | 재시도 (3회) |
| **SYS-002** | 503 | 서비스를 일시적으로 사용할 수 없습니다 | DB 연결 실패 | 재시도 (지수백오프) |

---

## Non-Functional Requirements (Baseline)

### Performance
- **SLO**: P95 < 500ms, P99 < 900ms
- **Measurement**: traceId 기반 APM 추적
- **Target**: API 응답 시간 (서버 처리 시간만, 네트워크 제외)

### Security
- **Transport**: HTTPS (TLS 1.3)
- **Password**: bcrypt salt rounds ≥ 10
- **OWASP**: ASVS V2 (Authentication), V3 (Session Management) 준수
- **Rate Limiting**: 동일 IP 10req/min (sliding window)

### Accessibility (WCAG 2.2 Level AA)
- **Form Errors**: `aria-describedby`로 오류 메시지 연결
- **Focus Management**: 오류 발생 시 첫 번째 오류 필드로 포커스 이동
- **Keyboard Navigation**: Tab/Shift+Tab/Enter로 모든 작업 가능
- **Screen Reader**: 폼 레이블 + 오류 메시지 음성 안내

### i18n (Internationalization)
- **Languages**: ko-KR (한국어), en-US (영어)
- **Keys**: 모든 UI/오류 문구는 i18n 키로 관리
  ```typescript
  t('auth.register.error.duplicate_email')
  // ko-KR: "이미 사용 중인 이메일입니다"
  // en-US: "This email is already in use"
  ```
- **Date/Time**: ISO 8601 형식, 클라이언트에서 로컬 타임존 변환

### Observability
- **Logging**:
  - traceId 전파 (Request ID)
  - UC-ID 태깅 (UC-001)
  - 실패 케이스 샘플링 100%
- **Metrics**:
  - 성공/실패율
  - P50/P95/P99 응답 시간
  - 에러 코드별 분포
- **Alerting**:
  - 에러율 > 5% → Slack 알림
  - P95 > 1000ms → PagerDuty 알림

---

## Acceptance Criteria (Gherkin)

### Scenario 1: 신규 이메일로 회원가입 성공
```gherkin
Given 사용자가 로그인하지 않았다
  And 이메일 "newuser@example.com"이 존재하지 않는다
When 유효한 이메일/비밀번호/이름으로 폼을 제출한다
  And 이메일: "newuser@example.com"
  And 비밀번호: "P@ssw0rd123"
  And 이름: "New User"
Then 201 Created 응답을 받는다
  And 응답 본문에 userId가 포함된다
  And "회원가입이 완료되었습니다" 메시지가 보인다
  And 로그인 페이지로 리다이렉트된다
  And traceId가 로깅된다
```

### Scenario 2: 중복 이메일로 회원가입 실패
```gherkin
Given 이메일 "existing@example.com"이 이미 존재한다
When 동일 이메일로 폼을 제출한다
  And 이메일: "existing@example.com"
  And 비밀번호: "ValidP@ss123"
  And 이름: "Test User"
Then 409 Conflict 응답을 받는다
  And 에러 코드는 "VAL-003"이다
  And 에러 메시지는 "이미 사용 중인 이메일입니다"이다
  And 폼 입력값은 유지된다 (비밀번호 제외)
  And 이메일 필드에 포커스가 이동한다
```

### Scenario 3: 비밀번호 정책 위반
```gherkin
Given 사용자가 회원가입 폼에 접근한다
When 약한 비밀번호로 폼을 제출한다
  And 이메일: "test@example.com"
  And 비밀번호: "1234"
  And 이름: "Test User"
Then 400 Bad Request 응답을 받는다
  And 에러 코드는 "VAL-002"이다
  And 에러 메시지는 "비밀번호는 8자 이상, 영문+숫자+특수문자 조합이어야 합니다"이다
  And 비밀번호 필드가 비워진다
  And 비밀번호 필드에 포커스가 이동한다
```

### Scenario 4: Idempotency 검증
```gherkin
Given 사용자가 회원가입 요청을 전송했다
  And Idempotency-Key는 "uuid-123"이다
  And 요청이 성공했다 (201 Created)
When 동일한 Idempotency-Key로 재요청한다
Then 200 OK 응답을 받는다 (캐싱된 응답)
  And 응답 본문은 첫 요청과 동일하다
  And DB에 중복 레코드가 생성되지 않는다
```

### Scenario 5: Rate Limit 초과
```gherkin
Given 동일 IP에서 1분 내 10회 요청을 전송했다
When 11번째 요청을 전송한다
Then 429 Too Many Requests 응답을 받는다
  And 에러 코드는 "RATE-001"이다
  And 응답 헤더에 "Retry-After: 60"이 포함된다
  And "X-RateLimit-Remaining: 0"이 포함된다
```

---

## Sequence Diagram

```plantuml
@startuml
actor User
participant FE as "Frontend\n(Presentation)"
participant BE as "Backend\n(API)"
participant App as "Application\n(Use Case)"
participant Domain as "Domain\n(Entity/VO)"
participant DB as "Database"

User -> FE: 회원가입 폼 입력 및 제출
FE -> FE: 클라이언트 검증\n(이메일 형식, 비밀번호 길이)

FE -> BE: POST /api/auth/register\nIdempotency-Key: uuid-123\n{email, password, name}

BE -> BE: 경계 검증 (Zod Schema)\nBR-001, BR-002, BR-003

alt 검증 실패
    BE --> FE: 400 Bad Request\n{code: "VAL-002", message: "..."}
    FE --> User: 에러 메시지 표시\n포커스 이동
else 검증 성공
    BE -> App: RegisterUserUseCase.execute(command)

    App -> Domain: Email.create(email)
    Domain --> App: Result<Email>

    App -> Domain: Password.create(password)
    Domain -> Domain: bcrypt.hash(password, 10)
    Domain --> App: Result<Password>

    App -> DB: SELECT * FROM users\nWHERE email = ? FOR UPDATE
    DB --> App: null (중복 없음)

    alt 이메일 중복
        App --> BE: Result.fail(VAL-003)
        BE --> FE: 409 Conflict\n{code: "VAL-003", message: "..."}
        FE --> User: 에러 메시지 표시
    else 정상
        App -> DB: BEGIN TRANSACTION

        App -> DB: INSERT INTO users\n(email, password_hash, name)
        DB --> App: userId

        App -> DB: INSERT INTO outbox_events\n(topic='user.registered', payload)
        DB --> App: eventId

        App -> DB: COMMIT

        App --> BE: Result.ok(UserDto)
        BE --> FE: 201 Created\n{userId, email, name, createdAt}\nX-Trace-Id: abc-123

        FE -> FE: i18n 메시지 표시\nt('auth.register.success')
        FE --> User: "회원가입 완료" 메시지
        FE -> FE: 로그인 페이지로 리다이렉트
    end
end

@enduml
```

**다이어그램 작성 규칙 (엄격)**:
- ✅ 참여자: `actor User`, `participant FE/BE/App/Domain/DB`
- ✅ 요청 화살표: `->`
- ✅ 응답 화살표: `-->`
- ✅ 분기: `alt/else/end`만 사용
- ✅ 라벨: `POST /path\n{json}` 형태
- ✅ 민감정보 마스킹: 비밀번호 `***` 표시
- ❌ 구분선 `==` 사용 금지
- ❌ `note over` 사용 금지
- ❌ 비표준 PlantUML 문법 금지

---

## Postcondition

### Success Postcondition
- ✅ `users` 테이블에 신규 레코드 존재
- ✅ `email` UNIQUE 제약 만족
- ✅ `password_hash` bcrypt 해싱 완료
- ✅ `created_at` 자동 기록
- ✅ `outbox_events` 테이블에 이벤트 저장 [선택]
- ✅ traceId 로깅 완료 (UC-001 태깅)

### Failure Postcondition
- ✅ DB 변경 없음 (트랜잭션 롤백)
- ✅ 에러 로깅 완료 (에러 코드 + traceId)
- ✅ Rate Limit 카운터 증가 (실패해도 카운트)

---

## Related Use Cases

| UC ID | Name | Relationship |
|-------|------|--------------|
| **UC-002** | 로그인 | 회원가입 후 로그인 가능 |
| **UC-003** | 이메일 인증 | 회원가입 후 인증 이메일 발송 [Phase 0] |
| **UC-010** | 비밀번호 재설정 | 비밀번호 분실 시 재설정 |
| **UC-015** | 프로필 수정 | 가입 후 이름/아바타 변경 |

---

## Notes

### Phase 0 (Current)
- ✅ 기본 회원가입 (이메일 + 비밀번호)
- ✅ Idempotency 지원
- ✅ Rate Limiting

### Phase 1 (Planned)
- 🔜 이메일 인증 (UC-003 연동)
- 🔜 소셜 로그인 (Google, Apple)
- 🔜 프로필 이미지 업로드

### Phase 2 (Future)
- 🔜 reCAPTCHA 추가 (봇 방지)
- 🔜 2FA (Two-Factor Authentication)
- 🔜 비밀번호 없는 인증 (Passkey)

### Technical Debt
- ⚠️ Email 중복 검사 성능 최적화 (SELECT → Redis 캐시)
- ⚠️ Idempotency-Key TTL 관리 (Redis → DB 영구 저장)

---

**에이전트 버전**: v2.0
**최종 업데이트**: 2025-01-XX
**통합 플로우**: 01-PRD → 02-Userflow → 03-1-Tech Stack → 03-2-Architecture → 04-Dataflow & Schema → **05-UseCase** → 06-Implementation
```

---

## 🔧 작업 원칙

1. **Data Contract 명시**: Request/Response/Error Shape 표 필수
2. **Rule↔Validation 1:1 맵핑**: BR-ID로 추적 가능하게
3. **Guarantees 분리**: Success/Failure 보장 사항 명확화
4. **Idempotency 규칙**: 중복 요청/재시도 정책 문서화
5. **Error Catalogue**: 에러 코드 체계 + 복구 방법
6. **NFR Baseline**: 성능/보안/접근성/i18n 구체적 기준
7. **Gherkin AC**: Given-When-Then 테스트 가능한 시나리오

---

## 🚀 시작 방법

1. **Userflow 읽기**: `/docs/userflow.md` 전체 확인
2. **N번 기능 찾기**: 사용자가 지정한 N번 기능 식별
3. **컨텍스트 수집**: Database, Architecture 문서 참조
4. **유스케이스 작성**: 위 템플릿 따라 상세 문서 작성
5. **7가지 강화 포인트 적용**: Data Contract → Guarantees → Error Catalogue → AC
6. **시퀀스 다이어그램**: PlantUML 표준 문법으로 시각화
7. **디렉토리 생성**: `/docs/00N/` 생성
8. **파일 저장**: `/docs/00N/spec.md` 저장
9. **완료 보고**: 사용자에게 생성 완료 알림

---

**현재 작업**: 사용자가 "/docs/userflow.md의 {N}번 기능..." 프롬프트를 입력하면 해당 기능의 유스케이스를 작성하세요.