# UC-004: 리뷰 작성 (Review Creation)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-004 |
| **Use Case명** | 리뷰 작성 |
| **액터** | 인증된 사용자 (Authenticated User) |
| **우선순위** | 🟡 High |
| **복잡도** | Medium |
| **사전조건** | - 사용자가 로그인됨 (UC-006)<br>- 장소가 선택됨 (UC-002, UC-003) |
| **사후조건** | - 리뷰가 Supabase에 저장됨<br>- 리뷰 목록에 즉시 반영됨 |
| **관련 문서** | - [database.md](../database.md) |

---

## 주요 성공 시나리오 (Main Success Scenario)

### 1. 리뷰 작성 시작
```
1. 사용자가 장소 상세 페이지에서 "리뷰 작성" 버튼 클릭
2. 시스템이 로그인 상태 확인
3. 시스템이 리뷰 작성 폼 표시
   - 별점 선택 (1-5)
   - 리뷰 내용 입력창 (최대 500자)
   - 글자 수 카운터
   - "취소" / "작성 완료" 버튼
```

### 2. 별점 선택
```
4. 사용자가 별점 클릭 (1-5)
5. 시스템이 선택된 별점까지 노란색으로 표시
6. 별점이 상태에 저장됨
```

### 3. 리뷰 내용 입력
```
7. 사용자가 리뷰 내용 입력
8. 시스템이 실시간으로 글자 수 업데이트
   - 예: "247 / 500"
9. 500자 초과 시 더 이상 입력 불가
```

### 4. 리뷰 제출
```
10. 사용자가 "작성 완료" 버튼 클릭
11. 시스템이 유효성 검사
    - 별점 선택 여부 (1-5)
    - 리뷰 내용 존재 (최소 10자)
12. 시스템이 Supabase에 리뷰 저장
    - place_id, place_name, user_id, rating, content
    - created_at: 현재 시각
    - updated_at: 현재 시각
13. 리뷰 저장 성공 (< 1초)
14. 토스트 알림: "리뷰가 등록되었습니다"
15. 리뷰 작성 폼 닫기
16. 리뷰 목록에 새 리뷰 즉시 표시
```

---

## 대체 플로우 (Alternative Flows)

### A1: 미로그인 상태
```
2a. 사용자가 로그인하지 않은 상태
    1. 시스템이 로그인 필요 다이얼로그 표시
       - "로그인이 필요한 기능입니다"
       - "로그인" / "취소" 버튼
    2. 사용자가 "로그인" 클릭 시
       → UC-006 (로그인) 트리거
       → 로그인 완료 후 Main Flow Step 3으로 복귀
    3. 사용자가 "취소" 클릭 시
       → Use Case 종료
```

### A2: 이미 리뷰 작성함
```
1a. 사용자가 이미 해당 장소에 리뷰를 작성한 상태
    1. 시스템이 기존 리뷰 존재 확인 (Supabase 조회)
    2. "이미 리뷰를 작성하셨습니다" 다이얼로그 표시
       - "수정하기" / "닫기" 버튼
    3. "수정하기" 클릭 시
       → UC-005 (리뷰 수정) 트리거
    4. "닫기" 클릭 시
       → Use Case 종료
```

### A3: 작성 중 취소
```
10a. 사용자가 "취소" 버튼 클릭
     1. 입력 내용이 있는 경우 확인 다이얼로그 표시
        - "작성 중인 내용이 사라집니다. 계속하시겠습니까?"
        - "예" / "아니오"
     2. "예" 클릭 시
        → 폼 닫기, Use Case 종료
     3. "아니오" 클릭 시
        → Main Flow Step 7로 복귀 (계속 작성)
```

### A4: 임시 저장 (선택 사항)
```
7a. 사용자가 작성 중 다른 페이지 이동 시도
    1. 시스템이 localStorage에 임시 저장
       - place_id, rating, content, timestamp
    2. 나중에 동일 장소 리뷰 작성 시 복원 제안
       - "이전에 작성하던 리뷰가 있습니다. 불러올까요?"
       - "예" / "아니오"
```

---

## 예외 플로우 (Exception Flows)

### E1: 네트워크 오류
```
12a. Supabase API 호출 실패 (네트워크 오류)
     1. 시스템이 에러 감지
     2. 토스트 알림: "리뷰 등록 중 오류가 발생했습니다"
     3. "재시도" 버튼 표시
     4. 사용자 클릭 시 Main Flow Step 12로 복귀
     5. 3회 재시도 실패 시 "나중에 다시 시도해주세요" 표시
```

### E2: RLS 정책 위반
```
12b. Supabase RLS 정책 위반 (권한 없음)
     1. 시스템이 403 Forbidden 응답 수신
     2. 개발자 콘솔에 에러 로그
     3. 사용자에게 "권한이 없습니다" 표시
     4. 로그아웃 후 재로그인 유도
```

### E3: 중복 리뷰 생성
```
12c. Supabase에서 중복 제약 위반 (동일 user_id + place_id)
     1. 시스템이 409 Conflict 응답 수신
     2. 토스트 알림: "이미 리뷰를 작성하셨습니다"
     3. 기존 리뷰 표시 및 수정 옵션 제공
```

### E4: 부적절한 내용
```
11a. 리뷰 내용에 욕설/부적절한 단어 포함
     1. 시스템이 클라이언트 사이드 필터링 (금칙어 목록)
     2. 입력창에 빨간 테두리 표시
     3. "부적절한 내용이 포함되어 있습니다" 메시지
     4. 제출 버튼 비활성화
     5. Main Flow Step 7로 복귀 (내용 수정)
```

### E5: 세션 만료
```
12d. 리뷰 제출 시 세션 만료
     1. 시스템이 401 Unauthorized 응답 수신
     2. 토스트 알림: "세션이 만료되었습니다"
     3. 작성 중인 내용 localStorage에 자동 저장
     4. 로그인 페이지로 리다이렉트
     5. 로그인 후 임시 저장된 내용 복원 제안
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 리뷰 길이 제한
- **규칙**: 최소 10자, 최대 500자
- **근거**: 의미 있는 리뷰 보장, 스팸 방지, DB 저장 공간 관리

### BR-002: 별점 필수
- **규칙**: 별점은 1-5 중 반드시 선택
- **근거**: 평균 평점 계산 필요, 정량적 평가 제공

### BR-003: 1인 1리뷰
- **규칙**: 한 장소당 사용자 1개 리뷰만 작성 가능
- **근거**: 리뷰 조작 방지, 공정한 평가

### BR-004: 리뷰 작성 시간 제한
- **규칙**: 리뷰 제출 후 5분 이내 수정 가능, 이후 수정 불가 (삭제만 가능)
- **근거**: 리뷰 신뢰성 유지, 변경 이력 관리 복잡도 감소

### BR-005: 욕설 필터링
- **규칙**: 금칙어 목록에 포함된 단어 사용 불가
- **근거**: 커뮤니티 가이드라인 준수, 법적 문제 방지

### BR-006: 리뷰 제출 제한 시간
- **규칙**: 리뷰 제출 응답 시간 1초 이내
- **근거**: 사용자 경험 최적화, 즉각적인 피드백

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **리뷰 제출 시간** | < 1초 | Supabase insert duration |
| **폼 렌더링** | < 200ms | Component mount time |
| **유효성 검사** | < 50ms | Client-side validation |
| **글자 수 업데이트** | < 16ms | onChange debounce |
| **리뷰 목록 반영** | < 500ms | Optimistic update |

---

## UI/UX 요구사항

### 리뷰 작성 폼 (Dialog)
```typescript
// components/review/ReviewForm.tsx
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z
    .string()
    .min(10, '최소 10자 이상 입력해주세요')
    .max(500, '최대 500자까지 입력 가능합니다'),
})

type ReviewInput = z.infer<typeof reviewSchema>

interface ReviewFormProps {
  open: boolean
  onClose: () => void
  placeId: string
  placeName: string
}

export function ReviewForm({
  open,
  onClose,
  placeId,
  placeName,
}: ReviewFormProps) {
  const [hoveredRating, setHoveredRating] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      content: '',
    },
  })

  const rating = watch('rating')
  const content = watch('content')

  const onSubmit = async (data: ReviewInput) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          place_name: placeName,
          rating: data.rating,
          content: data.content,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      toast.success('리뷰가 등록되었습니다')
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '리뷰 등록에 실패했습니다'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{placeName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 별점 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">별점</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('rating', value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      value <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">
                별점을 선택해주세요
              </p>
            )}
          </div>

          {/* 리뷰 내용 */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              리뷰 내용
            </label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="이 장소에 대한 솔직한 리뷰를 남겨주세요 (최소 10자)"
              className="min-h-[150px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between text-sm">
              <p className="text-destructive">
                {errors.content?.message}
              </p>
              <p className="text-muted-foreground">
                {content.length} / 500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '작성 중...' : '작성 완료'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### 리뷰 작성 트리거 버튼
```typescript
// components/place/PlaceDetail.tsx
<Button
  onClick={() => setReviewFormOpen(true)}
  className="w-full"
>
  <Edit className="mr-2 h-4 w-4" />
  리뷰 작성
</Button>

<ReviewForm
  open={reviewFormOpen}
  onClose={() => setReviewFormOpen(false)}
  placeId={place.id}
  placeName={place.name}
/>
```

---

## API 명세 (API Specification)

### POST /api/reviews
```typescript
// app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  // 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { place_id, place_name, rating, content } = body

    // 유효성 검사
    if (!place_id || !place_name) {
      return NextResponse.json(
        { error: '장소 정보가 필요합니다' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: '별점은 1-5 사이여야 합니다' },
        { status: 400 }
      )
    }

    if (!content || content.length < 10 || content.length > 500) {
      return NextResponse.json(
        { error: '리뷰는 10자 이상 500자 이하여야 합니다' },
        { status: 400 }
      )
    }

    // 중복 리뷰 확인
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('place_id', place_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '이미 리뷰를 작성하셨습니다' },
        { status: 409 }
      )
    }

    // 리뷰 저장
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        place_id,
        place_name,
        user_id: user.id,
        rating,
        content,
      })
      .select(
        `
        *,
        user:users(nickname)
      `
      )
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Create Review Error]', error)
    return NextResponse.json(
      { error: '리뷰 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
```

---

## 데이터 유효성 검사 (Validation)

### 클라이언트 사이드 (Zod)
```typescript
// lib/validations/review.ts
import { z } from 'zod'

export const createReviewSchema = z.object({
  place_id: z.string().min(1, '장소 ID가 필요합니다'),
  place_name: z.string().min(1, '장소명이 필요합니다'),
  rating: z
    .number()
    .int()
    .min(1, '최소 1점')
    .max(5, '최대 5점'),
  content: z
    .string()
    .min(10, '최소 10자 이상 입력해주세요')
    .max(500, '최대 500자까지 입력 가능합니다')
    .refine(
      (val) => !containsProfanity(val),
      '부적절한 내용이 포함되어 있습니다'
    ),
})

// 금칙어 필터링 (간단한 예제)
function containsProfanity(text: string): boolean {
  const profanityList = ['욕설1', '욕설2', '욕설3']
  return profanityList.some((word) => text.includes(word))
}
```

### 서버 사이드 (PostgreSQL CHECK)
```sql
-- database schema에서 이미 정의됨
ALTER TABLE reviews
  ADD CONSTRAINT check_rating CHECK (rating >= 1 AND rating <= 5),
  ADD CONSTRAINT check_content_length CHECK (LENGTH(content) <= 500);
```

---

## 보안 요구사항 (Security)

### RLS 정책 (Row Level Security)
```sql
-- reviews 테이블 RLS 활성화
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 리뷰 읽기 가능
CREATE POLICY select_reviews ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- 리뷰 작성은 본인만 가능
CREATE POLICY insert_own_review ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 리뷰 수정은 본인만 가능
CREATE POLICY update_own_review ON reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 리뷰 삭제는 본인만 가능
CREATE POLICY delete_own_review ON reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### XSS 방지
```typescript
// React는 기본적으로 XSS 방지
// 추가로 DOMPurify 사용 (선택 사항)
import DOMPurify from 'dompurify'

function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // 모든 HTML 태그 제거
    ALLOWED_ATTR: [],
  })
}
```

---

## 테스트 시나리오 (Test Scenarios)

### T1: 정상 리뷰 작성
```gherkin
Given 사용자가 로그인한 상태
And 장소 상세 페이지를 보고 있음
When "리뷰 작성" 버튼을 클릭
And 별점 4점을 선택
And "친절하고 분위기 좋았습니다"를 입력
And "작성 완료" 버튼을 클릭할 때
Then 1초 이내에 리뷰가 저장되어야 함
And "리뷰가 등록되었습니다" 알림이 표시되어야 함
And 리뷰 목록에 새 리뷰가 즉시 표시되어야 함
```

### T2: 미로그인 상태 리뷰 작성 시도
```gherkin
Given 사용자가 로그인하지 않은 상태
When "리뷰 작성" 버튼을 클릭할 때
Then "로그인이 필요한 기능입니다" 다이얼로그가 표시되어야 함
And "로그인" 버튼이 표시되어야 함
```

### T3: 유효성 검사 실패
```gherkin
Given 리뷰 작성 폼이 열린 상태
When 별점을 선택하지 않고
And 리뷰 내용을 5자만 입력하고
And "작성 완료" 버튼을 클릭할 때
Then "별점을 선택해주세요" 에러가 표시되어야 함
And "최소 10자 이상 입력해주세요" 에러가 표시되어야 함
And 리뷰가 제출되지 않아야 함
```

### T4: 중복 리뷰 작성 시도
```gherkin
Given 사용자가 이미 해당 장소에 리뷰를 작성한 상태
When "리뷰 작성" 버튼을 클릭할 때
Then "이미 리뷰를 작성하셨습니다" 다이얼로그가 표시되어야 함
And "수정하기" 버튼이 표시되어야 함
```

### T5: 글자 수 제한
```gherkin
Given 리뷰 작성 폼이 열린 상태
When 리뷰 내용을 500자 입력할 때
Then 글자 수 카운터가 "500 / 500"으로 표시되어야 함
And 더 이상 입력이 불가능해야 함
```

---

## 접근성 요구사항 (Accessibility)

### 폼 ARIA
```html
<form
  onSubmit={handleSubmit(onSubmit)}
  aria-labelledby="review-form-title"
>
  <h2 id="review-form-title" className="sr-only">
    리뷰 작성 폼
  </h2>

  {/* 별점 */}
  <div role="radiogroup" aria-labelledby="rating-label">
    <label id="rating-label">별점</label>
    {[1, 2, 3, 4, 5].map((value) => (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={rating === value}
        aria-label={`${value}점`}
      >
        <Star />
      </button>
    ))}
  </div>

  {/* 리뷰 내용 */}
  <label htmlFor="content">리뷰 내용</label>
  <textarea
    id="content"
    aria-describedby="content-help content-count"
    aria-required="true"
    aria-invalid={!!errors.content}
  />
  <span id="content-help" className="sr-only">
    최소 10자 이상, 최대 500자까지 입력 가능합니다
  </span>
  <span id="content-count" aria-live="polite">
    {content.length} / 500
  </span>
</form>
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- **UC-006**: 로그인 (리뷰 작성 권한 필요)
- **UC-002** 또는 **UC-003**: 장소 선택 (리뷰 대상 장소 필요)

### 후속 Use Case
- **UC-005**: 리뷰 수정/삭제 (작성 후 수정 가능)

### 외부 의존성
- **Supabase Auth**: 사용자 인증
- **Supabase Database**: 리뷰 저장
- **React Hook Form**: 폼 상태 관리
- **Zod**: 유효성 검사

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
