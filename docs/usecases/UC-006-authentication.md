# UC-006: 사용자 인증 (Authentication)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-006 |
| **Use Case명** | 사용자 인증 (로그인/회원가입) |
| **액터** | 비회원 사용자 (Guest User) |
| **우선순위** | 🔴 Critical |
| **복잡도** | Medium |
| **사전조건** | - Supabase Auth 설정 완료<br>- 이메일 인증 설정 (선택 사항) |
| **사후조건** | - 사용자 세션 생성됨<br>- 사용자 프로필 생성됨 (회원가입 시)<br>- 인증 상태 전역 공유됨 |
| **관련 문서** | - [database.md](../database.md)<br>- [tech-stack.md](../tech-stack.md) |

---

## 주요 성공 시나리오 (Main Success Scenario) - 로그인

### 1. 로그인 시작
```
1. 사용자가 "로그인" 버튼 클릭
2. 시스템이 로그인 다이얼로그 표시
   - 이메일 입력 필드
   - 비밀번호 입력 필드
   - "로그인" / "회원가입" 버튼
3. 사용자가 이메일 입력
4. 사용자가 비밀번호 입력
```

### 2. 로그인 실행
```
5. 사용자가 "로그인" 버튼 클릭
6. 시스템이 유효성 검사
   - 이메일 형식 검증
   - 비밀번호 입력 확인
7. 시스템이 Supabase Auth API 호출
   - signInWithPassword(email, password)
8. Supabase가 인증 처리
   - 이메일/비밀번호 확인
   - 세션 토큰 생성
9. 인증 성공 응답 수신 (< 2초)
10. 시스템이 사용자 정보 조회
    - users 테이블에서 nickname 등 조회
11. 토스트 알림: "환영합니다, {닉네임}님!"
12. 로그인 다이얼로그 닫기
13. 전역 인증 상태 업데이트 (Zustand)
14. 이전 페이지로 리다이렉트 또는 홈으로 이동
```

---

## 주요 성공 시나리오 (Main Success Scenario) - 회원가입

### 1. 회원가입 시작
```
1. 사용자가 로그인 다이얼로그에서 "회원가입" 탭 클릭
2. 시스템이 회원가입 폼 표시
   - 이메일 입력 필드
   - 닉네임 입력 필드 (최대 20자)
   - 비밀번호 입력 필드 (최소 8자)
   - 비밀번호 확인 입력 필드
   - "회원가입" 버튼
```

### 2. 정보 입력
```
3. 사용자가 이메일 입력
4. 시스템이 실시간 이메일 형식 검증
5. 사용자가 닉네임 입력
6. 시스템이 실시간 닉네임 중복 확인 (debounce 500ms)
7. 사용자가 비밀번호 입력
8. 시스템이 비밀번호 강도 표시 (약함/보통/강함)
9. 사용자가 비밀번호 확인 입력
10. 시스템이 비밀번호 일치 여부 검증
```

### 3. 회원가입 실행
```
11. 사용자가 "회원가입" 버튼 클릭
12. 시스템이 최종 유효성 검사
13. 시스템이 Supabase Auth API 호출
    - signUp(email, password, { data: { nickname } })
14. Supabase가 회원가입 처리
    - auth.users 테이블에 사용자 생성
    - 이메일 인증 메일 발송 (선택 사항)
15. 회원가입 성공 응답 수신 (< 2초)
16. 시스템이 users 테이블에 프로필 생성
    - INSERT INTO users (id, email, nickname)
17. 토스트 알림: "회원가입이 완료되었습니다"
18. 자동 로그인 또는 이메일 인증 안내
```

---

## 대체 플로우 (Alternative Flows)

### A1: 로그인 실패 (잘못된 비밀번호)
```
8a. Supabase가 잘못된 비밀번호 오류 반환
    1. 토스트 알림: "이메일 또는 비밀번호가 올바르지 않습니다"
    2. 비밀번호 입력 필드 초기화
    3. 비밀번호 입력 필드에 포커스
    4. Main Flow Step 4로 복귀
```

### A2: 회원가입 실패 (이메일 중복)
```
14a. Supabase가 이메일 중복 오류 반환
     1. 토스트 알림: "이미 사용 중인 이메일입니다"
     2. 이메일 입력 필드에 빨간 테두리 표시
     3. "로그인하시겠습니까?" 버튼 표시
     4. Main Flow Step 3으로 복귀
```

### A3: 닉네임 중복
```
6a. Supabase에서 닉네임 중복 확인
    1. 입력 필드에 빨간 테두리 표시
    2. "이미 사용 중인 닉네임입니다" 메시지 표시
    3. 제안 닉네임 표시 (예: "사용자1234")
    4. Main Flow Step 5로 복귀
```

### A4: 이메일 인증 필요 (선택 사항)
```
15a. Supabase가 이메일 미인증 응답
     1. "이메일 인증이 필요합니다" 다이얼로그 표시
     2. "인증 메일이 {email}로 발송되었습니다"
     3. "인증 메일 재발송" 버튼 제공
     4. 이메일 인증 완료 후 자동 로그인
```

### A5: 소셜 로그인 (선택 사항)
```
2a. 사용자가 "Google로 로그인" 버튼 클릭
    1. 시스템이 Supabase OAuth 플로우 시작
    2. Google 로그인 팝업 표시
    3. 사용자가 Google 계정 선택 및 권한 승인
    4. Supabase가 OAuth 토큰 처리 및 세션 생성
    5. Main Flow Step 10으로 이동 (사용자 정보 조회)
```

### A6: 비밀번호 재설정
```
1a. 사용자가 "비밀번호를 잊으셨나요?" 클릭
    1. 시스템이 비밀번호 재설정 폼 표시
    2. 사용자가 이메일 입력
    3. 시스템이 Supabase resetPasswordForEmail() 호출
    4. 토스트 알림: "비밀번호 재설정 메일이 발송되었습니다"
    5. 사용자가 이메일에서 링크 클릭
    6. 비밀번호 재설정 페이지로 리다이렉트
    7. 새 비밀번호 입력 및 변경
```

---

## 예외 플로우 (Exception Flows)

### E1: 네트워크 오류
```
7a. Supabase API 호출 실패 (네트워크 오류)
    1. 시스템이 에러 감지
    2. 토스트 알림: "네트워크 오류가 발생했습니다"
    3. "재시도" 버튼 표시
    4. 사용자 클릭 시 Main Flow Step 7로 복귀
```

### E2: 서버 오류 (500)
```
14b. Supabase가 서버 오류 반환
     1. 토스트 알림: "일시적인 오류가 발생했습니다"
     2. "나중에 다시 시도해주세요" 메시지
     3. Use Case 종료
```

### E3: Rate Limiting
```
7b. Supabase가 429 Too Many Requests 반환
    1. 토스트 알림: "너무 많은 시도입니다. 잠시 후 다시 시도해주세요"
    2. 로그인 버튼 60초간 비활성화
    3. 타이머 표시 (59초... 58초...)
    4. Use Case 종료
```

### E4: 계정 정지
```
8b. Supabase가 계정 정지 오류 반환
    1. 토스트 알림: "계정이 정지되었습니다. 관리자에게 문의하세요"
    2. 고객센터 링크 제공
    3. Use Case 종료
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 이메일 형식
- **규칙**: 표준 이메일 형식 (RFC 5322)
- **근거**: 인증 메일 발송, 계정 복구

### BR-002: 비밀번호 강도
- **규칙**: 최소 8자, 영문/숫자 혼합 권장
- **근거**: 보안, 계정 보호

### BR-003: 닉네임 길이
- **규칙**: 최소 2자, 최대 20자
- **근거**: UI 레이아웃, 가독성

### BR-004: 닉네임 고유성
- **규칙**: 닉네임은 중복 불가 (UNIQUE 제약)
- **근거**: 사용자 식별, 리뷰 작성자 구분

### BR-005: 세션 유효 기간
- **규칙**: 세션 토큰 7일 유효, Refresh Token 30일
- **근거**: 사용자 편의성과 보안 균형

### BR-006: 자동 로그인 (Remember Me)
- **규칙**: 기본적으로 활성화, 사용자가 선택 해제 가능
- **근거**: 모바일 앱 사용성 향상

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **로그인 응답 시간** | < 2초 | Supabase API call |
| **회원가입 응답 시간** | < 2초 | Supabase API call |
| **닉네임 중복 확인** | < 500ms | Debounced query |
| **세션 확인** | < 100ms | Local storage check |
| **자동 로그인** | < 1초 | Refresh token validation |

---

## UI/UX 요구사항

### 로그인/회원가입 다이얼로그
```typescript
// components/auth/AuthDialog.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

const signupSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다'),
    nickname: z
      .string()
      .min(2, '최소 2자 이상')
      .max(20, '최대 20자까지')
      .regex(/^[가-힣a-zA-Z0-9_]+$/, '한글, 영문, 숫자, _만 사용 가능'),
    password: z
      .string()
      .min(8, '최소 8자 이상')
      .regex(/[A-Za-z]/, '영문을 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

type LoginInput = z.infer<typeof loginSchema>
type SignupInput = z.infer<typeof signupSchema>

export function AuthDialog() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const { login, signup } = useAuthStore()

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const handleLogin = async (data: LoginInput) => {
    try {
      await login(data.email, data.password)
      toast.success('로그인되었습니다')
      setOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '로그인에 실패했습니다'
      )
    }
  }

  const handleSignup = async (data: SignupInput) => {
    try {
      await signup(data.email, data.password, data.nickname)
      toast.success('회원가입이 완료되었습니다')
      setOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '회원가입에 실패했습니다'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>로그인</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>NaviSpot</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          {/* 로그인 탭 */}
          <TabsContent value="login">
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">이메일</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="example@email.com"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">비밀번호</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting ? '로그인 중...' : '로그인'}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => {
                  /* TODO: 비밀번호 재설정 */
                }}
              >
                비밀번호를 잊으셨나요?
              </Button>
            </form>
          </TabsContent>

          {/* 회원가입 탭 */}
          <TabsContent value="signup">
            <form
              onSubmit={signupForm.handleSubmit(handleSignup)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="signup-email">이메일</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="example@email.com"
                  {...signupForm.register('email')}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-nickname">닉네임</Label>
                <Input
                  id="signup-nickname"
                  type="text"
                  placeholder="2-20자 (한글, 영문, 숫자)"
                  {...signupForm.register('nickname')}
                />
                {signupForm.formState.errors.nickname && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.nickname.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">비밀번호</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="최소 8자 (영문, 숫자 포함)"
                  {...signupForm.register('password')}
                />
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="비밀번호 재입력"
                  {...signupForm.register('confirmPassword')}
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={signupForm.formState.isSubmitting}
              >
                {signupForm.formState.isSubmitting
                  ? '회원가입 중...'
                  : '회원가입'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 상태 관리 (Zustand Store)

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/infrastructure/supabase'

interface User {
  id: string
  email: string
  nickname: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })

        try {
          const supabase = createClient()

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          // 사용자 정보 조회
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, nickname')
            .eq('id', data.user.id)
            .single()

          if (userError) throw userError

          set({ user: userData, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '로그인 실패',
            isLoading: false,
          })
          throw error
        }
      },

      signup: async (email, password, nickname) => {
        set({ isLoading: true, error: null })

        try {
          const supabase = createClient()

          // 1. Auth 사용자 생성
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { nickname },
            },
          })

          if (error) throw error

          // 2. users 테이블에 프로필 생성
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user!.id,
            email,
            nickname,
          })

          if (profileError) throw profileError

          set({
            user: { id: data.user!.id, email, nickname },
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '회원가입 실패',
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
          set({ user: null })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      checkSession: async () => {
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          // 사용자 정보 조회
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, nickname')
            .eq('id', session.user.id)
            .single()

          if (userData) {
            set({ user: userData })
          }
        } else {
          set({ user: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
```

---

## 보안 요구사항 (Security)

### Supabase RLS (Row Level Security)
```sql
-- users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 사용자 정보 읽기 가능
CREATE POLICY select_users ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- 본인 정보만 수정 가능
CREATE POLICY update_own_profile ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
```

### 비밀번호 정책
- Supabase Auth 기본 정책 사용
- 최소 8자
- 해싱: bcrypt (Supabase 자동 처리)

### CSRF 방지
- Supabase Auth가 자동 처리
- PKCE 플로우 사용

---

## 테스트 시나리오 (Test Scenarios)

### T1: 정상 로그인
```gherkin
Given 사용자가 이미 회원가입한 상태
When "로그인" 버튼을 클릭
And 이메일 "test@example.com"을 입력
And 비밀번호를 입력
And "로그인" 버튼을 클릭할 때
Then 2초 이내에 로그인되어야 함
And "환영합니다" 알림이 표시되어야 함
And 헤더에 닉네임이 표시되어야 함
```

### T2: 정상 회원가입
```gherkin
Given 사용자가 비회원 상태
When "회원가입" 탭을 클릭
And 이메일, 닉네임, 비밀번호를 입력
And "회원가입" 버튼을 클릭할 때
Then 2초 이내에 회원가입되어야 함
And "회원가입이 완료되었습니다" 알림이 표시되어야 함
And 자동 로그인되어야 함
```

### T3: 로그인 실패 (잘못된 비밀번호)
```gherkin
Given 사용자가 로그인 폼을 작성함
When 올바른 이메일과 잘못된 비밀번호를 입력할 때
Then "이메일 또는 비밀번호가 올바르지 않습니다" 알림이 표시되어야 함
And 비밀번호 입력 필드가 초기화되어야 함
```

### T4: 회원가입 실패 (이메일 중복)
```gherkin
Given 이미 사용 중인 이메일이 있음
When 해당 이메일로 회원가입을 시도할 때
Then "이미 사용 중인 이메일입니다" 알림이 표시되어야 함
And "로그인하시겠습니까?" 버튼이 표시되어야 함
```

### T5: 자동 로그인 (세션 유지)
```gherkin
Given 사용자가 이전에 로그인한 상태
When 브라우저를 닫았다가 다시 접속할 때
Then 자동으로 로그인되어야 함
And 1초 이내에 사용자 정보가 로드되어야 함
```

---

## 접근성 요구사항 (Accessibility)

### 폼 ARIA
```html
<form
  onSubmit={handleLogin}
  aria-labelledby="login-form-title"
>
  <h2 id="login-form-title" className="sr-only">
    로그인 폼
  </h2>

  <label htmlFor="email">이메일</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby="email-error"
  />
  {errors.email && (
    <p id="email-error" role="alert">
      {errors.email.message}
    </p>
  )}
</form>
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- 없음 (독립적인 Use Case)

### 후속 Use Case
- **UC-004**: 리뷰 작성 (로그인 필요)
- **UC-005**: 리뷰 관리 (로그인 필요)

### 외부 의존성
- **Supabase Auth**: 인증 처리
- **Supabase Database**: 사용자 프로필 저장

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
