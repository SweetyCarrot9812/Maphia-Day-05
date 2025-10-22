# UC-005: 리뷰 관리 (Review Management)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-005 |
| **Use Case명** | 리뷰 수정 및 삭제 |
| **액터** | 리뷰 작성자 (Review Owner) |
| **우선순위** | 🟡 High |
| **복잡도** | Medium |
| **사전조건** | - 사용자가 로그인됨 (UC-006)<br>- 본인이 작성한 리뷰 존재 (UC-004) |
| **사후조건** | - 리뷰가 수정 또는 삭제됨<br>- 변경사항이 즉시 반영됨 |
| **관련 문서** | - [database.md](../database.md) |

---

## 주요 성공 시나리오 (Main Success Scenario) - 리뷰 수정

### 1. 수정 시작
```
1. 사용자가 본인 리뷰에서 "수정" 버튼 클릭
2. 시스템이 소유권 확인 (user_id == 현재 사용자)
3. 시스템이 리뷰 작성 시간 확인
   - 5분 이내: 수정 가능
   - 5분 초과: "수정 기간이 지났습니다" 표시, Use Case 종료
4. 시스템이 리뷰 수정 폼 표시
   - 기존 별점 채워짐
   - 기존 리뷰 내용 채워짐
   - 글자 수 카운터
   - "취소" / "수정 완료" 버튼
```

### 2. 리뷰 수정
```
5. 사용자가 별점 또는 내용 수정
6. 시스템이 실시간으로 글자 수 업데이트
7. 사용자가 "수정 완료" 버튼 클릭
8. 시스템이 유효성 검사
   - 별점 선택 여부 (1-5)
   - 리뷰 내용 존재 (최소 10자)
9. 시스템이 Supabase에서 리뷰 업데이트
   - rating, content 수정
   - updated_at: 현재 시각
10. 리뷰 수정 성공 (< 1초)
11. 토스트 알림: "리뷰가 수정되었습니다"
12. 리뷰 목록에 수정된 리뷰 즉시 반영
```

---

## 주요 성공 시나리오 (Main Success Scenario) - 리뷰 삭제

### 1. 삭제 시작
```
1. 사용자가 본인 리뷰에서 "삭제" 버튼 클릭
2. 시스템이 소유권 확인 (user_id == 현재 사용자)
3. 시스템이 확인 다이얼로그 표시
   - "리뷰를 삭제하시겠습니까?"
   - "삭제한 리뷰는 복구할 수 없습니다"
   - "취소" / "삭제" 버튼
```

### 2. 리뷰 삭제
```
4. 사용자가 "삭제" 버튼 클릭
5. 시스템이 Supabase에서 리뷰 삭제
   - DELETE WHERE id = review_id AND user_id = current_user
6. 리뷰 삭제 성공 (< 500ms)
7. 토스트 알림: "리뷰가 삭제되었습니다"
8. 리뷰 목록에서 즉시 제거
9. 장소 평균 평점 및 리뷰 수 자동 재계산
```

---

## 대체 플로우 (Alternative Flows)

### A1: 수정 기간 만료
```
3a. 리뷰 작성 후 5분 초과
    1. 시스템이 수정 불가 판단
    2. 토스트 알림: "수정 기간이 지났습니다 (5분)"
    3. "수정" 버튼 비활성화 또는 숨김
    4. "삭제" 버튼만 활성화
    5. Use Case 종료
```

### A2: 수정 중 취소
```
7a. 사용자가 "취소" 버튼 클릭
    1. 변경사항이 있는 경우 확인 다이얼로그 표시
       - "수정 내용이 저장되지 않습니다. 계속하시겠습니까?"
       - "예" / "아니오"
    2. "예" 클릭 시
       → 폼 닫기, 원본 리뷰 유지
    3. "아니오" 클릭 시
       → Main Flow Step 5로 복귀 (계속 수정)
```

### A3: 삭제 취소
```
3a. 사용자가 확인 다이얼로그에서 "취소" 클릭
    1. 다이얼로그 닫기
    2. 리뷰 삭제되지 않음
    3. Use Case 종료
```

### A4: 다른 사용자의 리뷰 수정/삭제 시도
```
2a. 현재 사용자가 리뷰 작성자가 아님
    1. 시스템이 소유권 확인 실패
    2. "수정" / "삭제" 버튼 표시 안 함
    3. 또는 API 호출 시 403 Forbidden 응답
    4. Use Case 종료
```

---

## 예외 플로우 (Exception Flows)

### E1: 네트워크 오류 (수정)
```
9a. Supabase API 호출 실패 (네트워크 오류)
    1. 시스템이 에러 감지
    2. 토스트 알림: "리뷰 수정 중 오류가 발생했습니다"
    3. "재시도" 버튼 표시
    4. 사용자 클릭 시 Main Flow Step 9로 복귀
```

### E2: 네트워크 오류 (삭제)
```
5a. Supabase API 호출 실패 (네트워크 오류)
    1. 시스템이 에러 감지
    2. 토스트 알림: "리뷰 삭제 중 오류가 발생했습니다"
    3. "재시도" 버튼 표시
    4. 리뷰는 삭제되지 않고 목록에 유지
```

### E3: RLS 정책 위반
```
9b. Supabase RLS 정책 위반 (user_id != 작성자)
    1. 시스템이 403 Forbidden 응답 수신
    2. 토스트 알림: "권한이 없습니다"
    3. 폼 닫기
    4. Use Case 종료
```

### E4: 리뷰가 이미 삭제됨
```
5b. 다른 탭/기기에서 이미 리뷰를 삭제한 경우
    1. Supabase에서 404 Not Found 응답
    2. 토스트 알림: "이미 삭제된 리뷰입니다"
    3. 리뷰 목록에서 제거
    4. Use Case 종료
```

### E5: 세션 만료
```
9c. 리뷰 수정 제출 시 세션 만료
    1. 시스템이 401 Unauthorized 응답 수신
    2. 토스트 알림: "세션이 만료되었습니다"
    3. 수정 중인 내용 localStorage에 자동 저장
    4. 로그인 페이지로 리다이렉트
    5. 로그인 후 임시 저장된 내용 복원 제안
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 수정 가능 시간
- **규칙**: 리뷰 작성 후 5분 이내만 수정 가능
- **근거**: 리뷰 신뢰성 유지, 평점 조작 방지

### BR-002: 삭제 가능 시간
- **규칙**: 리뷰 삭제는 시간 제한 없음
- **근거**: 사용자 권리 보장, GDPR 준수

### BR-003: 소유권 확인
- **규칙**: 본인이 작성한 리뷰만 수정/삭제 가능
- **근거**: 보안, 무결성 유지

### BR-004: 수정 이력 미저장
- **규칙**: 리뷰 수정 이력을 별도 저장하지 않음 (updated_at만 기록)
- **근거**: 복잡도 감소, 저장 공간 절약

### BR-005: 삭제 복구 불가
- **규칙**: 삭제된 리뷰는 소프트 삭제가 아닌 하드 삭제 (복구 불가)
- **근거**: GDPR 준수, 저장 공간 절약

### BR-006: 평균 평점 자동 재계산
- **규칙**: 리뷰 수정/삭제 시 장소 평균 평점 자동 재계산
- **근거**: 데이터 일관성, 실시간 반영

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **리뷰 수정 시간** | < 1초 | Supabase update duration |
| **리뷰 삭제 시간** | < 500ms | Supabase delete duration |
| **평균 평점 재계산** | < 300ms | Aggregate query |
| **UI 반영 시간** | < 200ms | Optimistic update |

---

## UI/UX 요구사항

### 리뷰 아이템 컴포넌트 (수정/삭제 버튼)
```typescript
// components/review/ReviewItem.tsx
'use client'

import { useState } from 'react'
import { Review } from '@/types/review'
import { Star, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ReviewItemProps {
  review: Review
  currentUserId?: string
  onEdit: (review: Review) => void
  onDelete: (reviewId: string) => void
}

export function ReviewItem({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUserId === review.user_id
  const createdAt = new Date(review.created_at)
  const canEdit = isOwner && Date.now() - createdAt.getTime() < 5 * 60 * 1000 // 5분

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      toast.success('리뷰가 삭제되었습니다')
      onDelete(review.id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '리뷰 삭제에 실패했습니다'
      )
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* 헤더: 작성자, 평점, 작성 시간 */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.user_nickname}</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(createdAt, {
              addSuffix: true,
              locale: ko,
            })}
          </p>
        </div>

        {/* 수정/삭제 버튼 (본인 리뷰만) */}
        {isOwner && (
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(review)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* 리뷰 내용 */}
      <p className="text-sm whitespace-pre-wrap">{review.content}</p>

      {/* 수정됨 표시 */}
      {review.updated_at !== review.created_at && (
        <p className="text-xs text-muted-foreground">(수정됨)</p>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>리뷰를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 리뷰는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### 리뷰 수정 폼 (ReviewForm 재사용)
```typescript
// components/review/ReviewForm.tsx (수정 모드)
interface ReviewFormProps {
  open: boolean
  onClose: () => void
  placeId: string
  placeName: string
  editReview?: Review // 수정할 리뷰 (선택 사항)
}

export function ReviewForm({
  open,
  onClose,
  placeId,
  placeName,
  editReview,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: editReview?.rating || 0,
      content: editReview?.content || '',
    },
  })

  const onSubmit = async (data: ReviewInput) => {
    try {
      const method = editReview ? 'PATCH' : 'POST'
      const url = editReview ? `/api/reviews/${editReview.id}` : '/api/reviews'

      const res = await fetch(url, {
        method,
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

      toast.success(editReview ? '리뷰가 수정되었습니다' : '리뷰가 등록되었습니다')
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `리뷰 ${editReview ? '수정' : '등록'}에 실패했습니다`
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editReview ? '리뷰 수정' : '리뷰 작성'} - {placeName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 별점, 리뷰 내용 */}
          {/* ... 동일한 UI ... */}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? editReview
                  ? '수정 중...'
                  : '작성 중...'
                : editReview
                  ? '수정 완료'
                  : '작성 완료'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## API 명세 (API Specification)

### PATCH /api/reviews/[id]
```typescript
// app/api/reviews/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const reviewId = params.id
    const body = await req.json()
    const { rating, content } = body

    // 유효성 검사
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

    // 기존 리뷰 조회 (소유권 + 수정 가능 시간 확인)
    const { data: existing, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: '리뷰를 찾을 수 없거나 권한이 없습니다' },
        { status: 404 }
      )
    }

    // 5분 이내 확인
    const createdAt = new Date(existing.created_at).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (now - createdAt > fiveMinutes) {
      return NextResponse.json(
        { error: '수정 기간이 지났습니다 (5분)' },
        { status: 403 }
      )
    }

    // 리뷰 수정
    const { data, error } = await supabase
      .from('reviews')
      .update({
        rating,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('user_id', user.id) // RLS 정책 추가 보호
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

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Update Review Error]', error)
    return NextResponse.json(
      { error: '리뷰 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}
```

### DELETE /api/reviews/[id]
```typescript
// app/api/reviews/[id]/route.ts
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const reviewId = params.id

    // 리뷰 삭제 (RLS 정책이 소유권 확인)
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id) // RLS 정책 추가 보호

    if (error) {
      // 리뷰가 없거나 권한 없음
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '리뷰를 찾을 수 없거나 권한이 없습니다' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ message: '리뷰가 삭제되었습니다' })
  } catch (error) {
    console.error('[Delete Review Error]', error)
    return NextResponse.json(
      { error: '리뷰 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
```

---

## 상태 관리 (Optimistic Update)

### Zustand Store로 낙관적 업데이트
```typescript
// stores/reviewStore.ts
import { create } from 'zustand'
import { Review } from '@/types/review'

interface ReviewState {
  reviews: Review[]
  setReviews: (reviews: Review[]) => void
  addReview: (review: Review) => void
  updateReview: (reviewId: string, updates: Partial<Review>) => void
  deleteReview: (reviewId: string) => void
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],

  setReviews: (reviews) => set({ reviews }),

  addReview: (review) =>
    set((state) => ({
      reviews: [review, ...state.reviews],
    })),

  // 낙관적 업데이트: 즉시 UI에 반영
  updateReview: (reviewId, updates) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId ? { ...r, ...updates } : r
      ),
    })),

  // 낙관적 삭제: 즉시 UI에서 제거
  deleteReview: (reviewId) =>
    set((state) => ({
      reviews: state.reviews.filter((r) => r.id !== reviewId),
    })),
}))
```

### 사용 예제
```typescript
// components/review/ReviewList.tsx
const { reviews, updateReview, deleteReview } = useReviewStore()

const handleEdit = (review: Review) => {
  setEditingReview(review)
  setReviewFormOpen(true)
}

const handleEditComplete = (updated: Review) => {
  // 낙관적 업데이트
  updateReview(updated.id, updated)

  // 실제 API 호출 (백그라운드)
  // 실패 시 롤백 처리
}

const handleDelete = (reviewId: string) => {
  // 낙관적 삭제
  deleteReview(reviewId)

  // 실제 API 호출 (백그라운드)
  // 실패 시 롤백 처리
}
```

---

## 테스트 시나리오 (Test Scenarios)

### T1: 정상 리뷰 수정
```gherkin
Given 사용자가 3분 전에 리뷰를 작성함
When "수정" 버튼을 클릭
And 별점을 4점에서 5점으로 변경
And 리뷰 내용을 수정
And "수정 완료" 버튼을 클릭할 때
Then 1초 이내에 리뷰가 수정되어야 함
And "리뷰가 수정되었습니다" 알림이 표시되어야 함
And 리뷰 목록에 수정된 내용이 즉시 반영되어야 함
And "(수정됨)" 표시가 추가되어야 함
```

### T2: 수정 기간 만료
```gherkin
Given 사용자가 10분 전에 리뷰를 작성함
When 리뷰를 보고 있을 때
Then "수정" 버튼이 표시되지 않아야 함
And "삭제" 버튼만 활성화되어야 함
```

### T3: 정상 리뷰 삭제
```gherkin
Given 사용자가 본인 리뷰를 보고 있음
When "삭제" 버튼을 클릭
And 확인 다이얼로그에서 "삭제"를 클릭할 때
Then 500ms 이내에 리뷰가 삭제되어야 함
And "리뷰가 삭제되었습니다" 알림이 표시되어야 함
And 리뷰 목록에서 즉시 제거되어야 함
And 장소의 평균 평점이 재계산되어야 함
```

### T4: 삭제 취소
```gherkin
Given 사용자가 "삭제" 버튼을 클릭함
And 확인 다이얼로그가 표시됨
When "취소" 버튼을 클릭할 때
Then 다이얼로그가 닫혀야 함
And 리뷰가 삭제되지 않아야 함
```

### T5: 다른 사용자 리뷰 수정 시도
```gherkin
Given 사용자 A가 사용자 B의 리뷰를 보고 있음
When 리뷰를 확인할 때
Then "수정" / "삭제" 버튼이 표시되지 않아야 함
```

---

## 보안 요구사항 (Security)

### RLS 정책 (이미 database.md에 정의됨)
```sql
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

### API 레벨 추가 검증
- 클라이언트: 버튼 숨김 (UX)
- API Route: RLS 정책 (보안)
- 이중 검증으로 안전성 보장

---

## 접근성 요구사항 (Accessibility)

### 버튼 ARIA
```html
<Button
  onClick={() => onEdit(review)}
  aria-label="리뷰 수정"
>
  <Edit className="h-4 w-4" />
</Button>

<Button
  onClick={() => setDeleteDialogOpen(true)}
  aria-label="리뷰 삭제"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### 삭제 확인 다이얼로그 ARIA
```html
<AlertDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
>
  <AlertDialogContent
    role="alertdialog"
    aria-labelledby="delete-dialog-title"
    aria-describedby="delete-dialog-description"
  >
    <AlertDialogTitle id="delete-dialog-title">
      리뷰를 삭제하시겠습니까?
    </AlertDialogTitle>
    <AlertDialogDescription id="delete-dialog-description">
      삭제한 리뷰는 복구할 수 없습니다.
    </AlertDialogDescription>
  </AlertDialogContent>
</AlertDialog>
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- **UC-004**: 리뷰 작성 (수정/삭제할 리뷰 존재 필요)
- **UC-006**: 로그인 (인증 필요)

### 후속 Use Case
- 없음 (종료 Use Case)

### 외부 의존성
- **Supabase Auth**: 사용자 인증
- **Supabase Database**: 리뷰 수정/삭제
- **date-fns**: 시간 계산 (5분 체크)

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
