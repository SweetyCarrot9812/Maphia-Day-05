# 09. 실행 (Implementation Executor) v2.0

## 목표 (Goal)

모든 설계 문서(PRD, Userflow, Database, Spec, Plan)를 종합하여 **프로덕션 배포 가능한** 기능을 완전하게 구현합니다.

**v2.0 추가 목표**:
- Zero-Hardcoding 집행 (Zod 스키마 + ESLint)
- 테스트 전략 명문화 (4계층 + 커버리지 게이트)
- 계약 기반 개발 (OpenAPI 코드젠)
- 릴리즈·롤백 표준 (카나리, DB 마이그레이션)
- 관측·신뢰성 (TraceID, 메트릭, 에러 버짓)
- 보안·컴플라이언스 (SAST, SBOM, Key Rotation)
- 성능·접근성 (Bundle 크기, Lighthouse CI)
- 아키텍처 가드레일 (eslint-plugin-boundaries)
- DX 스크립트 (verify, pre-push)
- 문서-코드 동기화 (PR 체크리스트)

## 핵심 원칙 (Core Principles)

### 1. 완전한 구현 (Complete Implementation)
❌ **잘못된 예**: 일부만 구현하고 중단, TODO 주석 남기기
```typescript
function saveUser(data: UserData) {
  // TODO: implement validation
  // TODO: implement database save
  throw new Error("Not implemented");
}
```

✅ **올바른 예**: 모든 기능을 완전히 구현
```typescript
async function saveUser(data: UserData): Promise<User> {
  const validation = validateUserData(data);
  if (!validation.success) {
    throw new ValidationError(validation.errors);
  }

  const user = await userRepository.create(data);
  return user;
}
```

### 2. 제로 하드코딩 (Zero Hardcoding)
❌ **잘못된 예**: 하드코딩된 값 사용
```typescript
const API_URL = "http://localhost:3000";
const MAX_RETRY = 3;
const USER_ID = "12345";
```

✅ **올바른 예**: 환경변수, 설정 파일, props/context 사용
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_RETRY = config.api.maxRetry;
const userId = session.user.id;
```

### 3. 무정지 실행 (Non-Stop Execution)
❌ **잘못된 예**: 중간에 멈추고 사용자 확인 요청
```
✅ LoginForm 컴포넌트 생성 완료
이제 다음 파일을 생성할까요?
```

✅ **올바른 예**: plan.md의 모든 모듈을 연속적으로 구현
```
✅ LoginForm 컴포넌트 생성 완료
✅ useAuth Hook 생성 완료
✅ AuthService 생성 완료
✅ AuthRepository 생성 완료
✅ 모든 모듈 구현 완료
```

### 4. 품질 보장 (Quality Assurance)
❌ **잘못된 예**: 에러 무시하고 진행
```
Type error in LoginForm.tsx
Lint error in authService.ts
Build failed
→ "일단 구현은 완료했습니다"
```

✅ **올바른 예**: 모든 에러 해결 후 완료
```
Type check: ✅ No errors
Lint check: ✅ No errors
Build check: ✅ Success
→ "구현 완료 및 품질 검증 완료"
```

## 작업 프로세스 (Work Process)

### 1단계: 문서 분석 및 검증

사용자 프롬프트 형식:
```
@prd.md 참조
@userflow.md 참조
@database.md 참조
@spec.md 참조
@plan.md 참조

---

참조된 문서들을 기반으로 {기능 이름} 기능 구현하세요.
- 모두 구현할때까지 멈추지말고 진행하세요.
- type, lint, build 에러가 없음을 보장하세요.
- 절대 하드코딩된 값을 사용하지마세요.
```

**작업 순서**:

1. **문서 완전성 검증**
   - 모든 참조 문서 존재 확인
   - 누락된 문서가 있으면 사용자에게 알림

2. **구현 범위 파악**
   ```
   📋 구현 대상 분석:
   - 기능: {기능 이름}
   - 모듈 개수: {plan.md의 모듈 수}
   - 레이어: Presentation({N개}), Application({N개}), Domain({N개}), Infrastructure({N개})
   - 예상 파일 수: {N개}
   ```

3. **의존성 확인**
   - 필요한 라이브러리가 package.json에 있는지 확인
   - 없으면 설치 필요 목록 작성

4. **환경 설정 확인**
   - .env.example 또는 config 파일 확인
   - 필요한 환경변수 목록 작성

### 2단계: 구현 순서 결정

**계층별 구현 순서** (의존성 역순):

```
Infrastructure Layer (가장 먼저)
    ↓
Domain Layer
    ↓
Application Layer
    ↓
Presentation Layer (가장 나중)
```

**이유**:
- 하위 레이어가 상위 레이어의 의존성이므로 먼저 구현
- 각 레이어 구현 후 즉시 테스트 가능

**구현 순서 출력 예시**:
```
🔧 구현 순서:

1️⃣ Infrastructure Layer
   - /infrastructure/repositories/userRepository.ts
   - /infrastructure/api/authApi.ts

2️⃣ Domain Layer
   - /domain/entities/User.ts
   - /domain/services/authService.ts
   - /domain/validators/userValidator.ts

3️⃣ Application Layer
   - /application/usecases/registerUser.ts
   - /application/hooks/useAuth.ts

4️⃣ Presentation Layer
   - /presentation/components/LoginForm.tsx
   - /presentation/pages/LoginPage.tsx

5️⃣ Shared/Common
   - /shared/types/auth.ts
   - /shared/utils/validation.ts
```

### 3단계: 연속 구현 (Non-Stop Implementation)

**각 파일 구현 시**:

1. **파일 생성 전 체크리스트**:
   ```
   ☑️ spec.md의 요구사항 확인
   ☑️ plan.md의 모듈 명세 확인
   ☑️ database.md의 스키마 확인 (필요 시)
   ☑️ codebase-structure.md의 경로 규칙 확인
   ☑️ tech-stack.md의 기술 스택 확인
   ```

2. **구현 원칙**:
   - **완전한 타입 정의**: any 타입 절대 금지
   - **완전한 에러 처리**: try-catch, error boundary 구현
   - **완전한 검증**: 입력 검증, 비즈니스 규칙 검증
   - **환경변수 사용**: 모든 설정값은 .env 또는 config에서
   - **상수 분리**: magic number/string 절대 금지

3. **진행 상황 표시**:
   ```
   ✅ [1/12] userRepository.ts 생성 완료
   ✅ [2/12] authApi.ts 생성 완료
   ✅ [3/12] User.ts 생성 완료
   ...
   ✅ [12/12] LoginPage.tsx 생성 완료
   ```

### 4단계: 품질 검증 (Quality Verification)

**모든 파일 구현 완료 후**:

1. **타입 체크**:
   ```bash
   # TypeScript 프로젝트
   npx tsc --noEmit

   # 또는 프로젝트별 명령어
   npm run type-check
   ```

   - 에러 발생 시: 즉시 수정하고 재검증
   - 성공 시: 다음 단계 진행

2. **린트 체크**:
   ```bash
   npm run lint
   # 또는
   npx eslint .
   ```

   - 에러 발생 시: 즉시 수정하고 재검증
   - 경고는 가능하면 수정, 불가피하면 이유 설명

3. **빌드 체크**:
   ```bash
   npm run build
   ```

   - 에러 발생 시: 즉시 수정하고 재검증
   - 성공 시: 구현 완료

**검증 결과 보고 형식**:
```
🔍 품질 검증 결과:

✅ Type Check: PASS (0 errors)
✅ Lint Check: PASS (0 errors, 2 warnings)
   ⚠️ Warning: unused variable in authService.ts:42 (removed)
   ⚠️ Warning: console.log in LoginForm.tsx:15 (removed)
✅ Build Check: PASS

📊 구현 통계:
- 생성된 파일: 12개
- 총 코드 라인: ~850 lines
- 타입 정의: 15개
- 컴포넌트: 4개
- Hook: 2개
- Service: 3개
- Repository: 2개

✅ {기능 이름} 기능 구현 완료
```

### 5단계: 최종 문서화

**구현 완료 후 요약 문서 생성**: `/docs/00N/implementation-summary.md`

```markdown
# {기능 이름} 구현 완료 보고서

## 구현 개요
- **기능**: {기능 이름}
- **구현 일자**: {YYYY-MM-DD}
- **구현 파일 수**: {N개}
- **구현 레이어**: Presentation, Application, Domain, Infrastructure

## 생성된 파일 목록

### Presentation Layer
- `{파일 경로}` - {파일 설명}
- `{파일 경로}` - {파일 설명}

### Application Layer
- `{파일 경로}` - {파일 설명}

### Domain Layer
- `{파일 경로}` - {파일 설명}

### Infrastructure Layer
- `{파일 경로}` - {파일 설명}

### Shared/Common
- `{파일 경로}` - {파일 설명}

## 환경 설정 필요사항

추가/수정 필요한 환경변수:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://...
```

## 테스트 체크리스트

### Presentation Layer (QA 시트)
- [ ] LoginForm 컴포넌트 렌더링 확인
- [ ] 입력 필드 validation 동작 확인
- [ ] 에러 메시지 표시 확인
- [ ] 로딩 상태 표시 확인

### Domain Layer (Unit Test)
- [ ] authService.login() 정상 케이스
- [ ] authService.login() 에러 케이스
- [ ] userValidator.validate() 정상/비정상 입력

## 다음 단계
- 개발 서버 실행: `npm run dev`
- 브라우저에서 확인: `http://localhost:3000/{기능 경로}`
- 통합 테스트 수행
- 배포 준비
```

## 안티 패턴 (Anti-Patterns)

### ❌ 중단점 생성
```
"LoginForm을 만들었습니다. 다음 진행할까요?"
→ 절대 하지 마세요. 멈추지 말고 plan.md의 모든 모듈을 구현하세요.
```

### ❌ 불완전한 구현
```typescript
function login(email: string, password: string) {
  // TODO: implement actual login logic
  console.log("Login:", email);
}
```
→ 절대 하지 마세요. TODO 없이 완전히 구현하세요.

### ❌ 하드코딩
```typescript
const API_URL = "https://api.example.com";
const TIMEOUT = 5000;
```
→ 절대 하지 마세요. 환경변수나 config 파일 사용하세요.

### ❌ any 타입 남용
```typescript
function processData(data: any): any {
  return data;
}
```
→ 절대 하지 마세요. 명확한 타입 정의하세요.

### ❌ 에러 무시
```
Type error in auth.ts
→ "일단 구현은 완료했으니 나중에 수정하세요"
```
→ 절대 하지 마세요. 모든 에러 해결 후 완료 선언하세요.

## 베스트 프랙티스 (Best Practices)

### ✅ 계층별 구현
```
Infrastructure → Domain → Application → Presentation
의존성 역순으로 구현하여 각 레이어가 하위 레이어에 의존
```

### ✅ 타입 우선 설계
```typescript
// 1. 타입 정의 (shared/types/)
export interface User {
  id: string;
  email: string;
  name: string;
}

// 2. 타입 사용 (모든 레이어)
function getUser(id: string): Promise<User> { ... }
```

### ✅ 설정 중앙화
```typescript
// config/app.config.ts
export const appConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    timeout: parseInt(process.env.API_TIMEOUT || "5000"),
  },
  auth: {
    tokenKey: "auth_token",
    refreshKey: "refresh_token",
  },
} as const;
```

### ✅ 에러 처리 계층화
```typescript
// domain/errors/AuthError.ts
export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AuthError";
  }
}

// application/usecases/login.ts
try {
  const user = await authService.login(email, password);
  return { success: true, user };
} catch (error) {
  if (error instanceof AuthError) {
    return { success: false, error: error.message };
  }
  throw error;
}

// presentation/components/LoginForm.tsx
const handleSubmit = async () => {
  const result = await login(email, password);
  if (!result.success) {
    setError(result.error);
  }
};
```

### ✅ 의존성 주입
```typescript
// infrastructure/repositories/userRepository.ts
export class UserRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<User | null> {
    return this.db.users.findUnique({ where: { id } });
  }
}

// application/hooks/useUser.ts
const userRepository = new UserRepository(supabase);
const user = await userRepository.findById(userId);
```

## 체크리스트 (Final Checklist)

구현 완료 전 최종 확인:

```
☑️ plan.md의 모든 모듈 구현 완료
☑️ 모든 파일에 완전한 타입 정의 (no any)
☑️ 하드코딩된 값 제로 (모두 환경변수/config 사용)
☑️ TODO 주석 제로 (모든 기능 완전 구현)
☑️ console.log 제거 (또는 proper logging으로 대체)
☑️ Type check 통과 (npx tsc --noEmit)
☑️ Lint check 통과 (npm run lint)
☑️ Build check 통과 (npm run build)
☑️ 에러 처리 구현 (try-catch, error boundary)
☑️ 입력 검증 구현 (validation logic)
☑️ implementation-summary.md 작성 완료
```

**모든 체크리스트 완료 시에만 "구현 완료" 선언**

## 예상 출력 예시

```
🚀 {기능 이름} 기능 구현 시작

📋 구현 대상 분석:
- 모듈 개수: 12개
- 레이어: Presentation(4), Application(2), Domain(3), Infrastructure(3)
- 예상 파일 수: 12개

🔧 구현 순서 확정:
1️⃣ Infrastructure Layer (3개)
2️⃣ Domain Layer (3개)
3️⃣ Application Layer (2개)
4️⃣ Presentation Layer (4개)

📝 구현 진행:
✅ [1/12] /infrastructure/repositories/userRepository.ts
✅ [2/12] /infrastructure/api/authApi.ts
✅ [3/12] /infrastructure/api/supabaseClient.ts
✅ [4/12] /domain/entities/User.ts
✅ [5/12] /domain/services/authService.ts
✅ [6/12] /domain/validators/userValidator.ts
✅ [7/12] /application/usecases/registerUser.ts
✅ [8/12] /application/hooks/useAuth.ts
✅ [9/12] /presentation/components/LoginForm.tsx
✅ [10/12] /presentation/components/RegisterForm.tsx
✅ [11/12] /presentation/pages/LoginPage.tsx
✅ [12/12] /presentation/pages/RegisterPage.tsx

🔍 품질 검증:
✅ Type Check: PASS (0 errors)
✅ Lint Check: PASS (0 errors, 0 warnings)
✅ Build Check: PASS

📊 구현 통계:
- 생성된 파일: 12개
- 총 코드 라인: ~850 lines
- 타입 정의: 15개
- 컴포넌트: 4개
- Hook: 2개
- Service: 3개
- Repository: 3개

✅ {기능 이름} 기능 구현 완료

📄 구현 완료 보고서: /docs/00N/implementation-summary.md
```

## 실습하기

에이전트에게 다음과 같이 요청해보세요:

```
@prd.md 참조
@userflow.md 참조
@database.md 참조
@spec.md 참조
@plan.md 참조

---

참조된 문서들을 기반으로 사용자 회원가입 기능 구현하세요.
- 모두 구현할때까지 멈추지말고 진행하세요.
- type, lint, build 에러가 없음을 보장하세요.
- 절대 하드코딩된 값을 사용하지마세요.
```

에이전트는:
1. 모든 설계 문서를 분석하고
2. Infrastructure → Domain → Application → Presentation 순서로 구현하고
3. 중간에 멈추지 않고 모든 모듈을 완성하고
4. Type/Lint/Build 검증을 통과하고
5. implementation-summary.md를 생성합니다.

---

**핵심**: 이 에이전트는 설계 단계가 모두 끝난 후 실제 코드를 생산하는 최종 실행 단계입니다. 멈추지 않고, 완전하게, 품질을 보장하며 구현합니다.

---

## v2.0 프로덕션 품질 게이트 (Production Quality Gates)

구현 완료 후 프로덕션 배포 전 **반드시 통과해야 하는 10개 게이트**를 추가합니다.

### 1. Zero-Hardcoding 집행 (Enforced Configuration)

**목적**: 환경변수 누락 시 프로세스 시작 차단, 하드코딩 자동 탐지

#### 1.1 Zod 기반 환경변수 스키마

```typescript
// /lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // API
  NEXT_PUBLIC_API_URL: z.string().url(),
  API_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('5000'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // External Services
  TOSS_SECRET_KEY: z.string().optional(),
  TOSS_WEBHOOK_SECRET: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// 앱 시작 시 즉시 검증
export const config = loadEnv();
```

**사용 예시**:
```typescript
// /app/layout.tsx or /pages/_app.tsx
import { config } from '@/lib/env';

// 앱 시작 시 자동 검증됨
console.log('API URL:', config.NEXT_PUBLIC_API_URL);
```

#### 1.2 ESLint 커스텀 룰 (하드코딩 차단)

```javascript
// /eslint-rules/no-hardcoded-values.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded URLs, tokens, and secrets',
    },
  },
  create(context) {
    const forbiddenPatterns = [
      /https?:\/\/(?!localhost|127\.0\.0\.1)/, // 외부 URL
      /sk_live_\w+/, // Stripe live key
      /pk_live_\w+/, // Stripe publishable key
      /AIza[0-9A-Za-z_-]{35}/, // Google API key
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, // UUID (주의: 실제 ID가 아닌 경우 예외)
    ];

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(node.value)) {
              context.report({
                node,
                message: `Hardcoded value detected: "${node.value}". Use environment variables instead.`,
              });
            }
          }
        }
      },
    };
  },
};
```

**ESLint 설정**:
```javascript
// /.eslintrc.js
module.exports = {
  rules: {
    'no-hardcoded-values': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

#### 1.3 lint-staged (Pre-commit Hook)

```json
// /package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check && npm run test"
    }
  }
}
```

---

### 2. 테스트 전략 (Test Strategy)

**목적**: 4계층 테스트 + 커버리지 게이트로 품질 보장

#### 2.1 테스트 피라미드

```
           /\
          /E2E\          (10%) - 사용자 플로우
         /------\
        /Contract\       (15%) - API 계약
       /----------\
      /Integration\     (25%) - Repo, API 통합
     /--------------\
    /   Unit Tests   \  (50%) - 도메인 규칙, 유틸
   /------------------\
```

#### 2.2 Unit Tests (도메인 규칙)

```typescript
// /domain/validators/__tests__/userValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateUser } from '../userValidator';

describe('userValidator', () => {
  it('should accept valid user data', () => {
    const result = validateUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = validateUser({
      email: 'invalid-email',
      password: 'SecurePass123!',
      name: 'John Doe',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should reject weak password', () => {
    const result = validateUser({
      email: 'test@example.com',
      password: '123',
      name: 'John Doe',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('password');
  });
});
```

#### 2.3 Integration Tests (Repository)

```typescript
// /infrastructure/repositories/__tests__/userRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { UserRepository } from '../userRepository';

describe('UserRepository', () => {
  let supabase: ReturnType<typeof createClient>;
  let userRepo: UserRepository;

  beforeEach(() => {
    supabase = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_KEY!
    );
    userRepo = new UserRepository(supabase);
  });

  afterEach(async () => {
    // Cleanup: 테스트 데이터 삭제
    await supabase.from('users').delete().neq('id', '');
  });

  it('should create a new user', async () => {
    const user = await userRepo.create({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('should find user by id', async () => {
    const created = await userRepo.create({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed',
    });

    const found = await userRepo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.email).toBe('test@example.com');
  });
});
```

#### 2.4 Contract Tests (API 계약)

```typescript
// /app/api/users/__tests__/users.contract.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('GET /api/users contract', () => {
  it('should return users array', async () => {
    const req = new Request('http://localhost:3000/api/users');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.users)).toBe(true);

    // Schema validation
    if (data.users.length > 0) {
      const user = data.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).not.toHaveProperty('passwordHash'); // 민감 정보 노출 금지
    }
  });
});
```

#### 2.5 E2E Tests (사용자 플로우)

```typescript
// /e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register and login', async ({ page }) => {
    // 1. 회원가입
    await page.goto('/register');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    // 2. 회원가입 성공 확인
    await expect(page).toHaveURL('/login');

    // 3. 로그인
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // 4. 로그인 성공 확인
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Test User')).toBeVisible();
  });
});
```

#### 2.6 커버리지 게이트

```json
// /vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
      ],
    },
  },
});
```

**CI/CD 통합**:
```yaml
# /.github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage
      - name: Check coverage thresholds
        run: |
          if ! npm run test:coverage -- --reporter=json > coverage.json; then
            echo "❌ Coverage thresholds not met"
            exit 1
          fi
```

---

### 3. 계약 기반 개발 (Contract-Driven Development)

**목적**: OpenAPI 스키마 → 타입 코드젠 → 서버/클라이언트 동형 타입

#### 3.1 OpenAPI 스펙 정의

```yaml
# /openapi.yaml
openapi: 3.0.0
info:
  title: My App API
  version: 1.0.0

paths:
  /api/users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'

  /api/users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time
```

#### 3.2 타입 코드젠

```json
// /package.json
{
  "scripts": {
    "codegen": "openapi-typescript openapi.yaml -o types/api.ts",
    "codegen:watch": "openapi-typescript openapi.yaml -o types/api.ts --watch"
  },
  "devDependencies": {
    "openapi-typescript": "^6.0.0"
  }
}
```

**생성된 타입**:
```typescript
// /types/api.ts (자동 생성)
export interface paths {
  '/api/users': {
    get: operations['getUsers'];
  };
  '/api/users/{id}': {
    get: operations['getUserById'];
  };
}

export interface components {
  schemas: {
    User: {
      id: string;
      email: string;
      name: string;
      createdAt?: string;
    };
  };
}

export interface operations {
  getUsers: {
    responses: {
      200: {
        content: {
          'application/json': {
            users: components['schemas']['User'][];
          };
        };
      };
    };
  };
  getUserById: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          'application/json': components['schemas']['User'];
        };
      };
      404: {
        content: {
          'application/json': {
            error: string;
          };
        };
      };
    };
  };
}
```

#### 3.3 타입 안전 API 클라이언트

```typescript
// /lib/api-client.ts
import type { paths, components } from '@/types/api';

type User = components['schemas']['User'];

export async function getUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  const data: paths['/api/users']['get']['responses'][200]['content']['application/json'] = await response.json();
  return data.users;
}

export async function getUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}
```

#### 3.4 스냅샷 테스트 (Contract Validation)

```typescript
// /app/api/users/__tests__/users.snapshot.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('GET /api/users snapshot', () => {
  it('should match snapshot', async () => {
    const req = new Request('http://localhost:3000/api/users');
    const response = await GET(req);
    const data = await response.json();

    // 스냅샷과 일치하는지 확인
    expect(data).toMatchSnapshot();
  });
});
```

---

### 4. 릴리즈·롤백 표준 (Release & Rollback)

**목적**: 무중단 배포, DB 마이그레이션 안전성, 버전 관리

#### 4.1 카나리 배포 (Canary Deployment)

**Vercel 설정**:
```json
// /vercel.json
{
  "deployments": {
    "canary": {
      "percentage": 10
    }
  }
}
```

**GitHub Actions 워크플로우**:
```yaml
# /.github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build

      # Canary 배포 (10% 트래픽)
      - name: Deploy to Canary
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }} --env=production
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      # 10분 대기 (모니터링)
      - name: Wait for canary validation
        run: sleep 600

      # 스모크 테스트
      - name: Run smoke tests
        run: npm run test:smoke

      # 에러율 체크
      - name: Check error rate
        run: |
          ERROR_RATE=$(curl -s https://api.example.com/metrics/error-rate)
          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "❌ Error rate too high: $ERROR_RATE"
            exit 1
          fi

      # 카나리 확대 (100%)
      - name: Promote canary to production
        run: vercel promote --token=${{ secrets.VERCEL_TOKEN }}
```

#### 4.2 블루-그린 배포 (Blue-Green Deployment)

```bash
# 현재 프로덕션: blue
# 새 버전 배포: green

# 1. Green 환경에 배포
vercel deploy --target=preview --env=green

# 2. Green 환경 스모크 테스트
npm run test:smoke -- --url=https://green.myapp.com

# 3. 트래픽 전환 (DNS or Load Balancer)
# blue.myapp.com → green.myapp.com

# 4. 모니터링 (10분)
sleep 600

# 5. 에러 발생 시 즉시 롤백
# green.myapp.com → blue.myapp.com (1초 이내)
```

#### 4.3 DB 마이그레이션 (Forward & Rollback)

**마이그레이션 파일 구조**:
```
/migrations/
  20250101120000_add_users_table_up.sql
  20250101120000_add_users_table_down.sql
```

**Up 마이그레이션**:
```sql
-- /migrations/20250101120000_add_users_table_up.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Down 마이그레이션** (롤백용):
```sql
-- /migrations/20250101120000_add_users_table_down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

**마이그레이션 실행 스크립트**:
```typescript
// /scripts/migrate.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.DATABASE_KEY!
);

async function runMigration(direction: 'up' | 'down') {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(`_${direction}.sql`))
    .sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await supabase.rpc('exec_sql', { sql });
      console.log(`✅ Migration ${file} completed`);
    } catch (error) {
      console.error(`❌ Migration ${file} failed:`, error);
      process.exit(1);
    }
  }
}

const direction = process.argv[2] as 'up' | 'down';
runMigration(direction);
```

**배포 워크플로우**:
```yaml
# 1. DB 마이그레이션 (Forward)
- run: npm run migrate:up

# 2. 앱 배포
- run: vercel deploy

# 3. 에러 발생 시 롤백
- name: Rollback on failure
  if: failure()
  run: |
    npm run migrate:down
    vercel rollback
```

#### 4.4 버전닝 & 체인지로그

```json
// /package.json
{
  "version": "1.2.3",
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  },
  "devDependencies": {
    "standard-version": "^9.5.0"
  }
}
```

**자동 생성되는 CHANGELOG.md**:
```markdown
# Changelog

## [1.2.3] - 2025-10-23

### Features
- Add user profile page (#42)
- Implement password reset flow (#45)

### Bug Fixes
- Fix login redirect issue (#43)
- Resolve memory leak in WebSocket connection (#44)

### Performance
- Optimize image loading with lazy loading (#46)
```

---

### 5. 관측·신뢰성 (Observability & Reliability)

**목적**: 구조적 로깅, 분산 추적, 에러 버짓, 알림 룰

#### 5.1 구조적 로깅 (Structured Logging)

```typescript
// /lib/logger.ts
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  traceId: string;
  ucId?: string; // Use Case ID
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

class Logger {
  private traceId: string;

  constructor(traceId?: string) {
    this.traceId = traceId || uuidv4();
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: this.traceId,
      ...context,
    };

    console.log(JSON.stringify(entry));
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
    });
  }

  child(context: LogContext): Logger {
    const childLogger = new Logger(this.traceId);
    Object.assign(childLogger, context);
    return childLogger;
  }
}

export function createLogger(traceId?: string): Logger {
  return new Logger(traceId);
}
```

**사용 예시**:
```typescript
// /app/api/users/route.ts
import { createLogger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const traceId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = createLogger(traceId);
  const startTime = Date.now();

  logger.info('GET /api/users started', { ucId: 'UC-USER-001' });

  try {
    const users = await getUsers();
    const duration = Date.now() - startTime;

    logger.info('GET /api/users completed', { ucId: 'UC-USER-001', duration, count: users.length });

    return NextResponse.json({ users });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('GET /api/users failed', error as Error, { ucId: 'UC-USER-001', duration });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 5.2 분산 추적 (Distributed Tracing with OpenTelemetry)

```typescript
// /instrumentation.ts (Next.js 15+)
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'my-app',
    traceExporter: {
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },
  });
}
```

**Span 추가**:
```typescript
// /app/api/users/route.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

export async function GET(req: NextRequest) {
  return tracer.startActiveSpan('GET /api/users', async (span) => {
    span.setAttribute('http.method', 'GET');
    span.setAttribute('http.url', '/api/users');

    try {
      const users = await getUsers();
      span.setStatus({ code: 1 }); // OK
      return NextResponse.json({ users });
    } catch (error) {
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

#### 5.3 핵심 메트릭 (Key Metrics)

| 메트릭 | 목표 | 측정 방법 |
|--------|------|-----------|
| **가용성 (Availability)** | ≥ 99.9% | `(total_requests - errors) / total_requests * 100` |
| **에러율 (Error Rate)** | < 1% | `errors / total_requests * 100` |
| **P95 지연 시간** | < 500ms | 95번째 백분위수 응답 시간 |
| **P99 지연 시간** | < 1000ms | 99번째 백분위수 응답 시간 |
| **처리량 (Throughput)** | - | requests per second |

**메트릭 수집**:
```typescript
// /lib/metrics.ts
export const metrics = {
  requestCount: (method: string, path: string, status: number) => {
    console.log(JSON.stringify({
      metric: 'http_requests_total',
      method,
      path,
      status,
    }));
  },

  requestDuration: (method: string, path: string, duration: number) => {
    console.log(JSON.stringify({
      metric: 'http_request_duration_ms',
      method,
      path,
      duration,
    }));
  },

  errorCount: (method: string, path: string, errorCode: string) => {
    console.log(JSON.stringify({
      metric: 'http_errors_total',
      method,
      path,
      errorCode,
    }));
  },
};
```

#### 5.4 에러 버짓 (Error Budget)

```typescript
// /lib/error-budget.ts
interface ErrorBudget {
  targetAvailability: number; // 99.9% = 0.999
  totalRequests: number;
  errors: number;
}

export function calculateErrorBudget(budget: ErrorBudget): {
  currentAvailability: number;
  budgetRemaining: number;
  budgetExhausted: boolean;
} {
  const currentAvailability = (budget.totalRequests - budget.errors) / budget.totalRequests;
  const allowedErrors = budget.totalRequests * (1 - budget.targetAvailability);
  const budgetRemaining = allowedErrors - budget.errors;
  const budgetExhausted = budgetRemaining <= 0;

  return {
    currentAvailability,
    budgetRemaining,
    budgetExhausted,
  };
}

// 사용 예시
const budget = calculateErrorBudget({
  targetAvailability: 0.999, // 99.9%
  totalRequests: 10000,
  errors: 50,
});

if (budget.budgetExhausted) {
  console.error('❌ Error budget exhausted! Stop new releases.');
}
```

#### 5.5 알림 룰 (Alerting Rules)

```yaml
# /alerts.yml
groups:
  - name: http_errors
    rules:
      - alert: HighErrorRate
        expr: (sum(rate(http_errors_total[5m])) / sum(rate(http_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes."

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_ms) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "P95 latency is {{ $value }}ms."

      - alert: ErrorBudgetExhausted
        expr: error_budget_remaining < 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Error budget exhausted"
          description: "Stop new releases immediately."
```

**Slack 알림**:
```typescript
// /lib/alerts.ts
export async function alertSlack(message: string, severity: 'info' | 'warning' | 'critical') {
  const color = severity === 'critical' ? '#FF0000' : severity === 'warning' ? '#FFA500' : '#00FF00';

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: `[${severity.toUpperCase()}] ${message}`,
          text: `Timestamp: ${new Date().toISOString()}`,
        },
      ],
    }),
  });
}
```

---

### 6. 보안·컴플라이언스 (Security & Compliance)

**목적**: SAST, SCA, 비밀 스캔, SBOM, 라이선스 정책

#### 6.1 SAST (Static Application Security Testing)

```yaml
# /.github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Semgrep (SAST)
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/typescript

      # CodeQL (GitHub Advanced Security)
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: typescript, javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

#### 6.2 SCA (Software Composition Analysis)

```yaml
# /.github/workflows/security.yml (continued)
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Snyk (취약점 스캔)
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      # npm audit
      - name: Run npm audit
        run: |
          npm audit --audit-level=high
```

#### 6.3 비밀 스캔 (Secret Scanning)

```yaml
# /.github/workflows/security.yml (continued)
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # 전체 히스토리 스캔

      # Gitleaks (비밀 스캔)
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**.gitleaksignore**:
```
# 허용된 예외 (false positives)
test/fixtures/fake-api-key.ts
```

#### 6.4 SBOM (Software Bill of Materials)

```yaml
# /.github/workflows/sbom.yml
name: Generate SBOM

on:
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Syft (SBOM 생성)
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.json

      # SBOM 업로드
      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.json
```

#### 6.5 라이선스 정책

```json
// /package.json
{
  "license": "MIT",
  "scripts": {
    "license-check": "license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'"
  },
  "devDependencies": {
    "license-checker": "^25.0.1"
  }
}
```

**CI 통합**:
```yaml
- name: Check licenses
  run: npm run license-check
```

#### 6.6 Key Rotation (자동 회전)

```typescript
// /scripts/rotate-keys.ts
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { randomBytes } from 'crypto';

async function rotateKey(keyName: string) {
  const ssm = new SSMClient({ region: 'ap-northeast-2' });

  // 새 키 생성
  const newKey = randomBytes(32).toString('hex');

  // Parameter Store 업데이트
  await ssm.send(new PutParameterCommand({
    Name: `/myapp/prod/${keyName}`,
    Value: newKey,
    Type: 'SecureString',
    Overwrite: true,
  }));

  console.log(`✅ Key ${keyName} rotated successfully`);
}

// 매월 1일 자동 실행 (GitHub Actions Cron)
rotateKey('AUTH_SECRET');
```

**GitHub Actions 스케줄**:
```yaml
# /.github/workflows/key-rotation.yml
name: Key Rotation

on:
  schedule:
    - cron: '0 0 1 * *' # 매월 1일 00:00 UTC

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run rotate-keys
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

### 7. 성능·접근성 (Performance & Accessibility)

**목적**: Bundle 크기, TTI, CLS, Lighthouse CI, a11y 규칙

#### 7.1 성능 예산 (Performance Budget)

```json
// /performance-budget.json
{
  "budgets": [
    {
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "total",
          "budget": 500
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "third-party",
          "budget": 10
        }
      ]
    }
  ],
  "metrics": {
    "interactive": 3000,
    "first-contentful-paint": 1500,
    "cumulative-layout-shift": 0.1
  }
}
```

**Webpack Bundle Analyzer**:
```json
// /package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

```javascript
// /next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

#### 7.2 Lighthouse CI

```yaml
# /.github/workflows/lighthouse.yml
name: Lighthouse CI

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli

      # Lighthouse CI 실행
      - name: Run Lighthouse CI
        run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

**Lighthouse CI 설정**:
```javascript
// /lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
      ],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### 7.3 접근성 (Accessibility)

**ESLint 플러그인**:
```json
// /.eslintrc.js
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error"
  }
}
```

**axe-core 테스트**:
```typescript
// /e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

---

### 8. 아키텍처 가드레일 (Architecture Guardrails)

**목적**: Layer 간 의존 역전 금지, 모듈 그라프 정합성

#### 8.1 eslint-plugin-boundaries

```bash
npm install --save-dev eslint-plugin-boundaries
```

```javascript
// /.eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  extends: ['plugin:boundaries/recommended'],
  settings: {
    'boundaries/elements': [
      {
        type: 'presentation',
        pattern: 'presentation/*',
      },
      {
        type: 'application',
        pattern: 'application/*',
      },
      {
        type: 'domain',
        pattern: 'domain/*',
      },
      {
        type: 'infrastructure',
        pattern: 'infrastructure/*',
      },
    ],
    'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          {
            from: 'presentation',
            allow: ['application', 'domain'],
          },
          {
            from: 'application',
            allow: ['domain', 'infrastructure'],
          },
          {
            from: 'domain',
            allow: [],
          },
          {
            from: 'infrastructure',
            allow: ['domain'],
          },
        ],
      },
    ],
  },
};
```

**의존 규칙**:
```
Presentation → Application, Domain (✅)
Application → Domain, Infrastructure (✅)
Domain → (독립) (✅)
Infrastructure → Domain (✅)

Presentation → Infrastructure (❌ 금지)
Domain → Infrastructure (❌ 금지)
```

#### 8.2 아키텍처 테스트

```typescript
// /__tests__/architecture.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Architecture Tests', () => {
  it('domain layer should not import from infrastructure', () => {
    const domainFiles = getFilesInDirectory('src/domain');

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasInfraImport = /from ['"].*infrastructure/.test(content);

      expect(hasInfraImport).toBe(false);
    }
  });

  it('presentation layer should not import from infrastructure', () => {
    const presentationFiles = getFilesInDirectory('src/presentation');

    for (const file of presentationFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasInfraImport = /from ['"].*infrastructure/.test(content);

      expect(hasInfraImport).toBe(false);
    }
  });
});

function getFilesInDirectory(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getFilesInDirectory(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}
```

---

### 9. DX 스크립트 (Developer Experience)

**목적**: `npm run verify` 단일 명령으로 모든 품질 게이트 실행

#### 9.1 verify 스크립트

```json
// /package.json
{
  "scripts": {
    "verify": "npm run type-check && npm run lint && npm run test && npm run build && npm run audit",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "build": "next build",
    "audit": "npm audit --audit-level=moderate"
  }
}
```

#### 9.2 pre-push Hook

```bash
# /.husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-push checks..."

npm run verify

if [ $? -ne 0 ]; then
  echo "❌ Pre-push checks failed. Push aborted."
  exit 1
fi

echo "✅ Pre-push checks passed!"
```

#### 9.3 템플릿 코드젠 (Plop)

```bash
npm install --save-dev plop
```

```javascript
// /plopfile.js
module.exports = function (plop) {
  plop.setGenerator('component', {
    description: 'Create a new React component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/presentation/components/{{pascalCase name}}.tsx',
        templateFile: 'templates/component.hbs',
      },
      {
        type: 'add',
        path: 'src/presentation/components/__tests__/{{pascalCase name}}.test.tsx',
        templateFile: 'templates/component.test.hbs',
      },
    ],
  });

  plop.setGenerator('usecase', {
    description: 'Create a new use case',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Use case name:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/application/usecases/{{camelCase name}}.ts',
        templateFile: 'templates/usecase.hbs',
      },
      {
        type: 'add',
        path: 'src/application/usecases/__tests__/{{camelCase name}}.test.ts',
        templateFile: 'templates/usecase.test.hbs',
      },
    ],
  });
};
```

**사용 예시**:
```bash
npm run plop component -- Button
# → src/presentation/components/Button.tsx
# → src/presentation/components/__tests__/Button.test.tsx
```

---

### 10. 문서-코드 동기화 (Docs-Code Sync)

**목적**: PR 체크리스트로 스펙 변경 시 테스트·타입 업데이트 강제

#### 10.1 PR 템플릿

```markdown
<!-- /.github/pull_request_template.md -->
## 변경 사항

<!-- 무엇을 변경했는지 설명 -->

## 체크리스트

### 코드 품질
- [ ] Type check 통과 (`npm run type-check`)
- [ ] Lint check 통과 (`npm run lint`)
- [ ] 테스트 통과 (`npm run test`)
- [ ] Build 성공 (`npm run build`)
- [ ] 커버리지 게이트 통과 (Lines ≥ 80%)

### 문서-코드 동기화
- [ ] Spec 변경 시 `spec.md` 업데이트
- [ ] API 변경 시 `openapi.yaml` 업데이트
- [ ] API 변경 시 타입 코드젠 실행 (`npm run codegen`)
- [ ] DB 스키마 변경 시 마이그레이션 파일 생성
- [ ] 새 환경변수 추가 시 `.env.example` 업데이트
- [ ] 새 환경변수 추가 시 `lib/env.ts` 스키마 업데이트

### 테스트
- [ ] 새 기능에 Unit Test 추가
- [ ] API 변경 시 Contract Test 업데이트
- [ ] 사용자 플로우 변경 시 E2E Test 업데이트

### 보안
- [ ] 하드코딩된 값 없음 (ESLint 통과)
- [ ] 비밀 정보 노출 없음 (Gitleaks 통과)
- [ ] 취약한 의존성 없음 (`npm audit`)

### 성능
- [ ] Bundle 크기 확인 (`npm run analyze`)
- [ ] Lighthouse 점수 확인 (Performance ≥ 90)

### 접근성
- [ ] a11y 규칙 준수 (ESLint jsx-a11y 통과)
- [ ] 키보드 탐색 가능
- [ ] ARIA 레이블 추가

## 관련 이슈

Closes #

## 스크린샷 (UI 변경 시)

<!-- 스크린샷 또는 GIF 첨부 -->
```

#### 10.2 GitHub Actions (PR 검증)

```yaml
# /.github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci

      # 1. 코드 품질
      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build

      # 2. 보안
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2

      - name: Audit
        run: npm audit --audit-level=moderate

      # 3. 문서-코드 동기화 체크
      - name: Check OpenAPI sync
        run: |
          npm run codegen
          if ! git diff --quiet types/api.ts; then
            echo "❌ OpenAPI schema out of sync. Run 'npm run codegen' and commit."
            exit 1
          fi

      # 4. 성능
      - name: Bundle size check
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

      # 5. 접근성
      - name: Lighthouse CI
        run: npm run lighthouse:ci
```

---

## v2.0 최종 체크리스트 (추가)

구현 완료 전 v2.0 프로덕션 준비 확인:

```
☑️ Zero-Hardcoding: Zod 스키마 + ESLint 커스텀 룰
☑️ 환경변수 검증: 프로세스 시작 시 자동 검증
☑️ 테스트 4계층: Unit, Integration, Contract, E2E
☑️ 커버리지 게이트: Lines 80%, Branches 70%
☑️ OpenAPI 스키마: 타입 코드젠 자동화
☑️ Contract Test: API 계약 검증
☑️ 카나리 배포: 10% → 100% 단계적 확대
☑️ DB 마이그레이션: Forward/Rollback 스크립트
☑️ 구조적 로깅: TraceID, UCID 표준화
☑️ 분산 추적: OpenTelemetry 통합
☑️ 에러 버짓: 99.9% 가용성 목표
☑️ 알림 룰: Slack/Discord 자동 알림
☑️ SAST: Semgrep, CodeQL 스캔
☑️ SCA: Snyk, npm audit 취약점 검사
☑️ 비밀 스캔: Gitleaks 자동 실행
☑️ SBOM: 의존성 목록 자동 생성
☑️ Key Rotation: 월 1회 자동 회전
☑️ 성능 예산: Bundle < 300KB, TTI < 3s
☑️ Lighthouse CI: 모든 카테고리 ≥ 90점
☑️ 접근성: jsx-a11y, axe-core 검증
☑️ 아키텍처 가드레일: eslint-plugin-boundaries
☑️ verify 스크립트: 단일 명령으로 모든 게이트 실행
☑️ pre-push Hook: 자동 품질 검증
☑️ PR 템플릿: 문서-코드 동기화 체크리스트
```

**모든 v2.0 체크리스트 완료 시에만 "프로덕션 배포 준비 완료" 선언**

---

**현재 작업**: 사용자가 구현 요청 시, 이 에이전트를 사용하여 **v2.0 프로덕션 품질 게이트를 모두 통과한** 코드를 생성하세요.
