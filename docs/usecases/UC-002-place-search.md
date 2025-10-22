# UC-002: 장소 검색 (Place Search)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-002 |
| **Use Case명** | 장소 검색 |
| **액터** | 사용자 (모든 방문자) |
| **우선순위** | 🔴 Critical |
| **복잡도** | High |
| **사전조건** | - 지도가 정상 표시됨 (UC-001)<br>- 네이버 검색 API 키 설정 완료 |
| **사후조건** | - 검색 결과가 목록으로 표시됨<br>- 지도에 마커가 표시됨 (UC-003) |
| **관련 문서** | - [external/naver-maps-search.md](../external/naver-maps-search.md) |

---

## 주요 성공 시나리오 (Main Success Scenario)

### 1. 검색 입력
```
1. 사용자가 상단 검색창에 포커스
2. 시스템이 자동완성 드롭다운 활성화
3. 사용자가 검색어 입력 (예: "강남역 카페")
4. 시스템이 300ms debounce 후 자동완성 API 호출
5. 자동완성 제안 5개 표시
```

### 2. 검색 실행
```
6. 사용자가 Enter 또는 검색 버튼 클릭
7. 시스템이 로딩 스피너 표시
8. 시스템이 Next.js API Route (/api/search) 호출
   - Query: 검색어
   - Display: 10
   - Start: 1
   - Sort: random
9. API Route가 네이버 검색 API 호출
   - Client ID/Secret 헤더 추가
   - CORS 프록시 처리
10. 검색 응답 수신 (< 2초)
```

### 3. 결과 표시
```
11. 시스템이 검색 결과 파싱
    - HTML 태그 제거 (<b>, </b>)
    - 좌표 변환 (mapx/mapy → lat/lng)
12. 검색 결과 목록 표시 (왼쪽 사이드바)
    - 장소명, 주소, 카테고리, 거리
    - 페이지네이션 (10개씩)
13. 지도 중심을 첫 번째 결과로 이동
14. 검색 결과 마커 표시 (UC-003 트리거)
```

---

## 대체 플로우 (Alternative Flows)

### A1: 자동완성 선택
```
5a. 사용자가 자동완성 제안 클릭
    1. 선택된 검색어로 검색창 채우기
    2. Main Flow Step 6으로 이동 (검색 실행)
```

### A2: 검색 결과 없음
```
10a. 네이버 API가 빈 결과 반환
     1. "검색 결과가 없습니다" 메시지 표시
     2. 추천 검색어 제안 (인기 검색어, 근처 카테고리)
     3. Use Case 종료
```

### A3: 필터 적용
```
12a. 사용자가 카테고리 필터 선택 (음식점, 카페, 병원 등)
     1. 시스템이 클라이언트 사이드 필터링 적용
     2. 필터링된 결과만 표시
     3. 마커도 필터링된 결과만 표시
     4. Main Flow Step 12 계속
```

### A4: 정렬 변경
```
12b. 사용자가 정렬 옵션 변경 (거리순, 리뷰순, 평점순)
     1. 리뷰순/평점순: Supabase에서 리뷰 데이터 조인
     2. 거리순: 현재 지도 중심 기준 거리 계산
     3. 결과 재정렬 및 표시
     4. Main Flow Step 12 계속
```

### A5: 페이지네이션
```
12c. 사용자가 "더 보기" 버튼 클릭
     1. 시스템이 다음 페이지 API 호출 (start: 11, 21, ...)
     2. 새로운 결과를 기존 목록에 추가
     3. 스크롤을 새로 추가된 항목으로 이동
     4. Main Flow Step 12 계속
```

---

## 예외 플로우 (Exception Flows)

### E1: API 호출 실패
```
9a. 네이버 검색 API 호출 실패 (네트워크 오류, 타임아웃)
    1. 시스템이 에러 감지 (HTTP 500, timeout)
    2. 토스트 알림: "검색 중 오류가 발생했습니다"
    3. 재시도 버튼 표시
    4. 사용자 클릭 시 Main Flow Step 8로 복귀
```

### E2: API 키 오류
```
9b. 네이버 API가 401 Unauthorized 반환
    1. 시스템이 개발자 콘솔에 에러 로그
    2. 사용자에게 "서비스 점검 중입니다" 표시
    3. 관리자에게 알림 전송
    4. Use Case 종료
```

### E3: API 호출 제한 초과
```
9c. 네이버 API가 429 Too Many Requests 반환
    1. 시스템이 rate limit 감지
    2. 토스트 알림: "잠시 후 다시 시도해주세요"
    3. 60초 후 재시도 가능하도록 타이머 표시
    4. Use Case 종료
```

### E4: 빈 검색어
```
6a. 사용자가 검색어 없이 검색 버튼 클릭
    1. 시스템이 유효성 검사 실패
    2. 검색창에 빨간 테두리 표시
    3. "검색어를 입력해주세요" 메시지 표시
    4. Main Flow Step 3으로 복귀
```

### E5: 부적절한 검색어
```
3a. 사용자가 욕설/부적절한 검색어 입력
    1. 시스템이 클라이언트 사이드 필터링 (금칙어 목록)
    2. 토스트 알림: "적절한 검색어를 입력해주세요"
    3. 검색창 초기화
    4. Main Flow Step 3으로 복귀
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 검색 응답 시간
- **규칙**: 검색 응답 시간 2초 이내
- **근거**: 사용자 경험 최적화, 이탈률 감소

### BR-002: 자동완성 debounce
- **규칙**: 자동완성 API 호출 300ms debounce
- **근거**: 불필요한 API 호출 방지, 비용 절감

### BR-003: 페이지당 결과 수
- **규칙**: 페이지당 10개 결과 표시
- **근거**: 네이버 API 권장 사항, 로딩 성능

### BR-004: 검색어 길이 제한
- **규칙**: 최소 2자, 최대 50자
- **근거**: 네이버 API 제약, 의미 있는 검색 보장

### BR-005: 검색 결과 캐싱
- **규칙**: 동일 검색어 10분 동안 캐싱
- **근거**: API 호출 절감, 응답 속도 향상

### BR-006: HTML 태그 제거
- **규칙**: 네이버 API 응답의 `<b>`, `</b>` 태그 제거
- **근거**: XSS 방지, 깨끗한 UI

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **검색 응답 시간** | < 2초 | API call duration |
| **자동완성 응답** | < 500ms | Debounce + API |
| **결과 렌더링** | < 300ms | React rendering time |
| **페이지네이션** | < 1초 | Incremental load |
| **필터링 응답** | < 100ms | Client-side filter |

---

## UI/UX 요구사항

### 검색창 컴포넌트
```typescript
// components/search/SearchBar.tsx
<div className="relative w-full max-w-xl">
  <Input
    type="text"
    placeholder="장소, 주소, 카테고리를 검색하세요"
    value={query}
    onChange={handleChange}
    onKeyDown={handleKeyDown}
    className="pr-10"
  />
  <button
    onClick={handleSearch}
    className="absolute right-2 top-1/2 -translate-y-1/2"
  >
    <Search className="h-5 w-5" />
  </button>

  {/* 자동완성 드롭다운 */}
  {suggestions.length > 0 && (
    <Card className="absolute top-full mt-2 w-full z-50">
      {suggestions.map((item) => (
        <button
          key={item.id}
          onClick={() => handleSelectSuggestion(item)}
          className="w-full p-3 text-left hover:bg-accent"
        >
          {item.name}
        </button>
      ))}
    </Card>
  )}
</div>
```

### 검색 결과 목록
```typescript
// components/search/SearchResults.tsx
<div className="h-full overflow-y-auto space-y-2 p-4">
  {results.map((place) => (
    <Card
      key={place.id}
      className="p-4 cursor-pointer hover:bg-accent"
      onClick={() => handlePlaceClick(place)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{place.name}</h3>
          <p className="text-sm text-muted-foreground">{place.category}</p>
          <p className="text-sm">{place.roadAddress}</p>
        </div>
        <Badge variant="secondary">{place.distance}m</Badge>
      </div>

      {/* 리뷰 통계 */}
      {place.reviewCount > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm">{place.avgRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            ({place.reviewCount}개 리뷰)
          </span>
        </div>
      )}
    </Card>
  ))}

  {/* 페이지네이션 */}
  {hasMore && (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleLoadMore}
      disabled={isLoading}
    >
      {isLoading ? <Spinner /> : '더 보기'}
    </Button>
  )}
</div>
```

### 로딩 상태
```typescript
{isSearching && (
  <div className="flex items-center justify-center p-8">
    <div className="space-y-4 text-center">
      <Spinner className="mx-auto" />
      <p className="text-muted-foreground">검색 중...</p>
    </div>
  </div>
)}
```

### 빈 결과 상태
```typescript
{results.length === 0 && !isSearching && (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <MapPinOff className="h-16 w-16 text-muted-foreground" />
    <div className="space-y-2 text-center">
      <h3 className="font-semibold">검색 결과가 없습니다</h3>
      <p className="text-sm text-muted-foreground">
        다른 검색어를 입력해보세요
      </p>
    </div>

    {/* 추천 검색어 */}
    <div className="space-y-2">
      <p className="text-sm font-medium">추천 검색어</p>
      <div className="flex flex-wrap gap-2">
        {['강남역 카페', '홍대 맛집', '신촌 병원'].map((keyword) => (
          <Badge
            key={keyword}
            variant="outline"
            className="cursor-pointer"
            onClick={() => handleSearch(keyword)}
          >
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## API 명세 (API Specification)

### Next.js API Route
```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('query')
  const display = searchParams.get('display') || '10'
  const start = searchParams.get('start') || '1'
  const sort = searchParams.get('sort') || 'random'

  // 유효성 검사
  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: '검색어는 2자 이상이어야 합니다' },
      { status: 400 }
    )
  }

  if (query.length > 50) {
    return NextResponse.json(
      { error: '검색어는 50자 이하여야 합니다' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID!,
          'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET!,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Naver API error: ${response.status}`)
    }

    const data = await response.json()

    // HTML 태그 제거 및 좌표 변환
    const places = data.items.map((item: any) => ({
      id: `${item.mapx}_${item.mapy}`,
      name: item.title.replace(/<\/?b>/g, ''), // <b>, </b> 제거
      address: item.address,
      roadAddress: item.roadAddress,
      category: item.category,
      telephone: item.telephone,
      lat: parseInt(item.mapy) / 10000000, // Y좌표 → 위도
      lng: parseInt(item.mapx) / 10000000, // X좌표 → 경도
    }))

    return NextResponse.json({
      total: data.total,
      start: data.start,
      display: data.display,
      places,
    })
  } catch (error) {
    console.error('[Search API Error]', error)
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
```

### 클라이언트 사용 예제
```typescript
// hooks/useSearch.ts
import { useState } from 'react'
import { Place } from '@/types/place'

export function useSearch() {
  const [results, setResults] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string, start = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&start=${start}`
      )

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      const data = await res.json()

      if (start === 1) {
        setResults(data.places)
      } else {
        setResults((prev) => [...prev, ...data.places])
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 실패')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { results, isLoading, error, search }
}
```

---

## 상태 관리 (State Management)

### Zustand Store
```typescript
// stores/searchStore.ts
import { create } from 'zustand'
import { Place } from '@/types/place'

interface SearchState {
  query: string
  results: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  error: string | null
  filters: {
    category: string | null
    sortBy: 'distance' | 'review' | 'rating'
  }

  setQuery: (query: string) => void
  setResults: (results: Place[]) => void
  setSelectedPlace: (place: Place | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<SearchState['filters']>) => void
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  selectedPlace: null,
  isLoading: false,
  error: null,
  filters: {
    category: null,
    sortBy: 'distance',
  },

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  clearSearch: () =>
    set({
      query: '',
      results: [],
      selectedPlace: null,
      error: null,
    }),
}))
```

---

## 테스트 시나리오 (Test Scenarios)

### T1: 정상 검색 테스트
```gherkin
Given 사용자가 검색창에 포커스
When "강남역 카페"를 입력하고 Enter를 누를 때
Then 2초 이내에 검색 결과가 표시되어야 함
And 결과 목록에 장소명, 주소, 카테고리가 표시되어야 함
And 지도에 마커가 표시되어야 함
```

### T2: 자동완성 테스트
```gherkin
Given 사용자가 검색창에 포커스
When "강남"을 입력할 때
Then 300ms 후 자동완성 제안이 표시되어야 함
And 제안 목록에 최대 5개 항목이 표시되어야 함
When 제안 중 하나를 클릭할 때
Then 선택된 검색어로 검색이 실행되어야 함
```

### T3: 빈 결과 테스트
```gherkin
Given 사용자가 검색창에 "asdfqwerzxcv"를 입력
When 검색을 실행할 때
Then "검색 결과가 없습니다" 메시지가 표시되어야 함
And 추천 검색어가 표시되어야 함
```

### T4: 필터 테스트
```gherkin
Given 검색 결과가 표시된 상태
When 카테고리 필터에서 "카페"를 선택할 때
Then 카페 카테고리 결과만 표시되어야 함
And 지도 마커도 필터링되어야 함
```

### T5: 페이지네이션 테스트
```gherkin
Given 검색 결과가 10개 표시된 상태
When "더 보기" 버튼을 클릭할 때
Then 다음 10개 결과가 추가로 로드되어야 함
And 기존 결과는 유지되어야 함
```

### T6: 에러 처리 테스트
```gherkin
Given 네트워크가 끊긴 상태
When 검색을 실행할 때
Then "검색 중 오류가 발생했습니다" 메시지가 표시되어야 함
And 재시도 버튼이 표시되어야 함
```

---

## 보안 요구사항 (Security)

### XSS 방지
```typescript
// HTML 태그 제거 함수
function sanitizeHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

// 사용 예
const safeName = sanitizeHtml(apiResponse.title)
```

### API 키 보호
- Client ID/Secret은 서버 사이드에서만 사용
- 환경변수로 관리, 절대 클라이언트에 노출 금지
- Next.js API Route를 프록시로 사용

### Rate Limiting (선택 사항)
```typescript
// middleware.ts (또는 API Route 내부)
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000, // 1분
  uniqueTokenPerInterval: 500, // 최대 500명의 사용자
})

export async function GET(req: NextRequest) {
  try {
    await limiter.check(req, 10) // 분당 10회 제한
  } catch {
    return NextResponse.json(
      { error: '요청이 너무 많습니다' },
      { status: 429 }
    )
  }
  // ... 검색 로직
}
```

---

## 접근성 요구사항 (Accessibility)

### 검색창 ARIA
```html
<div role="search">
  <label htmlFor="search-input" className="sr-only">
    장소 검색
  </label>
  <input
    id="search-input"
    type="text"
    role="searchbox"
    aria-label="장소, 주소, 카테고리 검색"
    aria-describedby="search-help"
    aria-autocomplete="list"
    aria-controls="search-results"
  />
  <span id="search-help" className="sr-only">
    최소 2자 이상 입력하세요
  </span>
</div>
```

### 검색 결과 ARIA
```html
<div
  id="search-results"
  role="region"
  aria-live="polite"
  aria-label="검색 결과"
>
  {results.length > 0 && (
    <p className="sr-only">
      {results.length}개의 장소를 찾았습니다
    </p>
  )}
  {/* 결과 목록 */}
</div>
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- **UC-001**: 지도 표시 (검색 결과를 표시할 지도 필요)

### 후속 Use Case
- **UC-003**: 마커 표시 (검색 결과를 지도에 마커로 표시)
- **UC-004**: 리뷰 조회 (검색된 장소의 리뷰 표시)

### 외부 의존성
- **네이버 검색 API**: Local Search API v1
- **환경변수**: `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`
- **Supabase**: 리뷰 데이터 조인 (정렬 시)

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
