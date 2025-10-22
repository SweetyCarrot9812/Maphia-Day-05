# NaviSpot - State Management Design (Zustand)

## 개요

NaviSpot은 **Zustand**를 사용하여 전역 상태를 관리합니다. Zustand는 Redux와 유사하지만 더 간결하고 가벼우며, TypeScript와의 통합이 우수합니다.

### 선택 이유
- ✅ **경량**: Redux 대비 1/10 크기 (~1KB gzipped)
- ✅ **간결한 API**: Boilerplate 코드 최소화
- ✅ **TypeScript 친화적**: 타입 안전성 보장
- ✅ **미들웨어 지원**: persist, devtools, immer 등
- ✅ **React 18 호환**: Concurrent 렌더링 지원
- ✅ **학습 곡선**: Redux 대비 낮은 진입 장벽

---

## 전역 상태 구조

### Store 분리 전략

NaviSpot은 **도메인별로 Store를 분리**하여 관심사를 명확히 구분합니다.

```typescript
// stores/
├── authStore.ts        // 사용자 인증 상태
├── mapStore.ts         // 지도 관련 상태
├── searchStore.ts      // 장소 검색 상태
└── reviewStore.ts      // 리뷰 관련 상태
```

### Store 분리 기준
- **도메인 경계**: 각 Store는 하나의 비즈니스 도메인 담당
- **독립성**: Store 간 직접 의존성 최소화
- **재사용성**: 다른 프로젝트에서도 재사용 가능한 구조
- **테스트 용이성**: 각 Store를 독립적으로 테스트 가능

---

## Store 설계 원칙

### 1. 단일 책임 원칙 (Single Responsibility)
각 Store는 하나의 도메인만 관리합니다.

```typescript
// ❌ BAD: 여러 도메인 혼재
interface AppStore {
  user: User | null
  map: naver.maps.Map | null
  searchResults: Place[]
  reviews: Review[]
  // ...
}

// ✅ GOOD: 도메인별 분리
interface AuthStore {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

interface SearchStore {
  query: string
  results: Place[]
  search: (query: string) => Promise<void>
}
```

### 2. 불변성 (Immutability)
상태를 직접 수정하지 않고 새로운 객체를 반환합니다.

```typescript
// ❌ BAD: 직접 수정
set((state) => {
  state.user.nickname = 'newName' // 직접 수정
  return state
})

// ✅ GOOD: 불변성 유지
set((state) => ({
  user: state.user ? { ...state.user, nickname: 'newName' } : null,
}))
```

### 3. 파생 상태 최소화 (Minimal Derived State)
계산 가능한 값은 Store에 저장하지 않고 컴포넌트에서 계산합니다.

```typescript
// ❌ BAD: 파생 상태를 Store에 저장
interface SearchStore {
  results: Place[]
  resultCount: number // results.length로 계산 가능
}

// ✅ GOOD: 필요 시 계산
interface SearchStore {
  results: Place[]
}

// 컴포넌트에서
const resultCount = useSearchStore((state) => state.results.length)
```

### 4. 액션 네이밍 규칙
- **set[Name]**: 단순 값 설정 (동기)
- **[verb][Name]**: 비즈니스 로직 포함 (동기/비동기)
- **fetch[Name]**: API 호출 (비동기)

```typescript
interface SearchStore {
  // 단순 setter
  setQuery: (query: string) => void
  setResults: (results: Place[]) => void

  // 비즈니스 로직
  search: (query: string) => Promise<void>
  clearSearch: () => void

  // API 호출
  fetchPlaceDetails: (placeId: string) => Promise<Place>
}
```

---

## Store 상세 설계

### 1. authStore.ts - 사용자 인증

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/infrastructure/supabase'

export interface User {
  id: string
  email: string
  nickname: string
  created_at: string
}

interface AuthState {
  // State
  user: User | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async Actions
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoading: false,
      error: null,

      // Setters
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })

        try {
          const supabase = createClient()

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          // 사용자 프로필 조회
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (userError) throw userError

          set({ user: userData, isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '로그인 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Signup
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
            user: {
              id: data.user!.id,
              email,
              nickname,
              created_at: new Date().toISOString(),
            },
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '회원가입 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Logout
      logout: async () => {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
          set({ user: null, error: null })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      // Check Session (자동 로그인)
      checkSession: async () => {
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
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
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }), // user만 persist
    }
  )
)

// Selectors (선택적)
export const selectIsAuthenticated = (state: AuthState) => state.user !== null
export const selectUserNickname = (state: AuthState) => state.user?.nickname || '게스트'
```

---

### 2. mapStore.ts - 지도 상태

```typescript
// stores/mapStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MapState {
  // State
  map: naver.maps.Map | null
  center: { lat: number; lng: number }
  zoom: number
  isLoading: boolean
  markers: naver.maps.Marker[]
  selectedMarker: naver.maps.Marker | null
  infoWindow: naver.maps.InfoWindow | null

  // Actions
  setMap: (map: naver.maps.Map) => void
  setCenter: (lat: number, lng: number) => void
  setZoom: (zoom: number) => void
  setLoading: (loading: boolean) => void
  addMarkers: (markers: naver.maps.Marker[]) => void
  clearMarkers: () => void
  setSelectedMarker: (marker: naver.maps.Marker | null) => void
  showInfoWindow: (marker: naver.maps.Marker, content: string) => void
  closeInfoWindow: () => void

  // Complex Actions
  panTo: (lat: number, lng: number, zoom?: number) => void
  fitBounds: (places: { lat: number; lng: number }[]) => void
}

export const useMapStore = create<MapState>()(
  devtools(
    (set, get) => ({
      // Initial State
      map: null,
      center: { lat: 37.5666103, lng: 126.9783882 }, // 서울 시청
      zoom: 15,
      isLoading: true,
      markers: [],
      selectedMarker: null,
      infoWindow: null,

      // Setters
      setMap: (map) => set({ map, isLoading: false }),
      setCenter: (lat, lng) => set({ center: { lat, lng } }),
      setZoom: (zoom) => set({ zoom }),
      setLoading: (isLoading) => set({ isLoading }),

      // Marker Management
      addMarkers: (newMarkers) =>
        set((state) => ({
          markers: [...state.markers, ...newMarkers],
        })),

      clearMarkers: () => {
        const { markers } = get()
        markers.forEach((marker) => marker.setMap(null))
        set({ markers: [], selectedMarker: null })
      },

      setSelectedMarker: (marker) => {
        const { selectedMarker } = get()

        // 이전 선택 마커 z-index 복원
        if (selectedMarker) {
          selectedMarker.setZIndex(10)
        }

        // 새 마커 z-index 상승
        if (marker) {
          marker.setZIndex(100)
        }

        set({ selectedMarker: marker })
      },

      // InfoWindow Management
      showInfoWindow: (marker, content) => {
        const { map, infoWindow } = get()
        if (!map) return

        // 기존 InfoWindow 닫기
        if (infoWindow) {
          infoWindow.close()
        }

        const newInfoWindow = new naver.maps.InfoWindow({
          content,
          maxWidth: 320,
          anchorSkew: true,
        })

        newInfoWindow.open(map, marker)
        set({ infoWindow: newInfoWindow })
      },

      closeInfoWindow: () => {
        const { infoWindow } = get()
        if (infoWindow) {
          infoWindow.close()
          set({ infoWindow: null })
        }
      },

      // Complex Actions
      panTo: (lat, lng, zoom) => {
        const { map } = get()
        if (!map) return

        map.panTo(new naver.maps.LatLng(lat, lng))

        if (zoom !== undefined) {
          map.setZoom(zoom)
          set({ zoom })
        }

        set({ center: { lat, lng } })
      },

      fitBounds: (places) => {
        const { map } = get()
        if (!map || places.length === 0) return

        const bounds = new naver.maps.LatLngBounds()

        places.forEach((place) => {
          bounds.extend(new naver.maps.LatLng(place.lat, place.lng))
        })

        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        })
      },
    }),
    { name: 'MapStore' } // Redux DevTools 이름
  )
)
```

---

### 3. searchStore.ts - 장소 검색

```typescript
// stores/searchStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Place {
  id: string
  name: string
  address: string
  roadAddress: string
  category: string
  telephone: string
  lat: number
  lng: number
  distance?: number
  reviewCount?: number
  avgRating?: number
}

interface SearchFilters {
  category: string | null
  sortBy: 'distance' | 'review' | 'rating'
}

interface SearchState {
  // State
  query: string
  results: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  error: string | null
  filters: SearchFilters
  hasMore: boolean
  currentPage: number

  // Actions
  setQuery: (query: string) => void
  setResults: (results: Place[]) => void
  appendResults: (results: Place[]) => void
  setSelectedPlace: (place: Place | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  setHasMore: (hasMore: boolean) => void
  clearSearch: () => void

  // Async Actions
  search: (query: string) => Promise<void>
  loadMore: () => Promise<void>

  // Computed (Selectors)
  getFilteredResults: () => Place[]
  getSortedResults: () => Place[]
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // Initial State
      query: '',
      results: [],
      selectedPlace: null,
      isLoading: false,
      error: null,
      filters: {
        category: null,
        sortBy: 'distance',
      },
      hasMore: false,
      currentPage: 1,

      // Setters
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results, currentPage: 1 }),
      appendResults: (newResults) =>
        set((state) => ({
          results: [...state.results, ...newResults],
          currentPage: state.currentPage + 1,
        })),
      setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),
      setHasMore: (hasMore) => set({ hasMore }),

      clearSearch: () =>
        set({
          query: '',
          results: [],
          selectedPlace: null,
          error: null,
          currentPage: 1,
          hasMore: false,
        }),

      // Search
      search: async (query) => {
        set({ isLoading: true, error: null, query })

        try {
          const res = await fetch(
            `/api/search?query=${encodeURIComponent(query)}&display=10&start=1`
          )

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()

          set({
            results: data.places,
            hasMore: data.places.length === 10,
            currentPage: 1,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '검색 실패'
          set({ error: message, isLoading: false })
        }
      },

      // Load More (Pagination)
      loadMore: async () => {
        const { query, currentPage, isLoading } = get()
        if (isLoading) return

        set({ isLoading: true, error: null })

        try {
          const start = currentPage * 10 + 1

          const res = await fetch(
            `/api/search?query=${encodeURIComponent(query)}&display=10&start=${start}`
          )

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()

          get().appendResults(data.places)

          set({
            hasMore: data.places.length === 10,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '로딩 실패'
          set({ error: message, isLoading: false })
        }
      },

      // Computed Selectors
      getFilteredResults: () => {
        const { results, filters } = get()

        if (!filters.category) return results

        return results.filter((place) => place.category.includes(filters.category!))
      },

      getSortedResults: () => {
        const { filters } = get()
        const filtered = get().getFilteredResults()

        const sorted = [...filtered]

        switch (filters.sortBy) {
          case 'distance':
            return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0))
          case 'review':
            return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
          case 'rating':
            return sorted.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
          default:
            return sorted
        }
      },
    }),
    { name: 'SearchStore' }
  )
)
```

---

### 4. reviewStore.ts - 리뷰 관리

```typescript
// stores/reviewStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Review {
  id: string
  place_id: string
  place_name: string
  user_id: string
  user_nickname: string
  rating: number
  content: string
  created_at: string
  updated_at: string
}

interface ReviewState {
  // State
  reviews: Review[]
  isLoading: boolean
  error: string | null

  // Actions
  setReviews: (reviews: Review[]) => void
  addReview: (review: Review) => void
  updateReview: (reviewId: string, updates: Partial<Review>) => void
  deleteReview: (reviewId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async Actions
  fetchReviews: (placeId: string) => Promise<void>
  createReview: (data: {
    place_id: string
    place_name: string
    rating: number
    content: string
  }) => Promise<void>

  // Selectors
  getReviewsByPlace: (placeId: string) => Review[]
  getAverageRating: (placeId: string) => number
  getReviewCount: (placeId: string) => number
}

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set, get) => ({
      // Initial State
      reviews: [],
      isLoading: false,
      error: null,

      // Setters
      setReviews: (reviews) => set({ reviews }),
      addReview: (review) =>
        set((state) => ({
          reviews: [review, ...state.reviews],
        })),
      updateReview: (reviewId, updates) =>
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === reviewId ? { ...r, ...updates } : r
          ),
        })),
      deleteReview: (reviewId) =>
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== reviewId),
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Fetch Reviews
      fetchReviews: async (placeId) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch(`/api/reviews?place_id=${placeId}`)

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()
          set({ reviews: data, isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 조회 실패'
          set({ error: message, isLoading: false })
        }
      },

      // Create Review
      createReview: async (data) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const newReview = await res.json()
          get().addReview(newReview)
          set({ isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 작성 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Selectors
      getReviewsByPlace: (placeId) => {
        return get().reviews.filter((r) => r.place_id === placeId)
      },

      getAverageRating: (placeId) => {
        const placeReviews = get().getReviewsByPlace(placeId)
        if (placeReviews.length === 0) return 0

        const sum = placeReviews.reduce((acc, r) => acc + r.rating, 0)
        return sum / placeReviews.length
      },

      getReviewCount: (placeId) => {
        return get().getReviewsByPlace(placeId).length
      },
    }),
    { name: 'ReviewStore' }
  )
)
```

---

## 미들웨어 사용

### 1. persist - 로컬 스토리지 저장

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store 로직
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),

      // 일부 상태만 저장
      partialize: (state) => ({ user: state.user }),

      // 버전 관리 (마이그레이션)
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // v0 → v1 마이그레이션
          return {
            ...persistedState,
            newField: 'default',
          }
        }
        return persistedState
      },
    }
  )
)
```

### 2. devtools - Redux DevTools 연동

```typescript
import { devtools } from 'zustand/middleware'

export const useMapStore = create<MapState>()(
  devtools(
    (set, get) => ({
      // ... store 로직
    }),
    {
      name: 'MapStore', // DevTools에 표시될 이름
      enabled: process.env.NODE_ENV === 'development', // 개발 환경만
    }
  )
)
```

### 3. immer - 불변성 자동 처리 (선택 사항)

```typescript
import { immer } from 'zustand/middleware/immer'

export const useSearchStore = create<SearchState>()(
  immer((set, get) => ({
    results: [],

    // immer를 사용하면 직접 수정 가능
    addResult: (place: Place) =>
      set((state) => {
        state.results.push(place) // 직접 push 가능!
      }),
  }))
)
```

---

## 컴포넌트에서 사용

### 1. 기본 사용법

```typescript
'use client'

import { useAuthStore } from '@/stores/authStore'

export function Header() {
  // 전체 상태 구독
  const { user, login, logout } = useAuthStore()

  // 특정 상태만 구독 (리렌더링 최적화)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.user !== null)

  return (
    <header>
      {isAuthenticated ? (
        <>
          <span>환영합니다, {user!.nickname}님</span>
          <button onClick={logout}>로그아웃</button>
        </>
      ) : (
        <button onClick={() => login('email', 'password')}>로그인</button>
      )}
    </header>
  )
}
```

### 2. Selector 사용 (리렌더링 최적화)

```typescript
'use client'

import { useSearchStore } from '@/stores/searchStore'
import { shallow } from 'zustand/shallow'

export function SearchResults() {
  // shallow 비교로 불필요한 리렌더링 방지
  const { results, isLoading } = useSearchStore(
    (state) => ({
      results: state.results,
      isLoading: state.isLoading,
    }),
    shallow
  )

  // Selector 함수 사용
  const sortedResults = useSearchStore((state) => state.getSortedResults())

  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : (
        sortedResults.map((place) => <PlaceCard key={place.id} place={place} />)
      )}
    </div>
  )
}
```

### 3. 액션만 사용 (리렌더링 없음)

```typescript
'use client'

import { useSearchStore } from '@/stores/searchStore'

export function SearchBar() {
  const search = useSearchStore((state) => state.search)

  // search 함수는 변경되지 않으므로 리렌더링 없음
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    search(formData.get('query') as string)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="query" />
      <button type="submit">검색</button>
    </form>
  )
}
```

### 4. 여러 Store 조합

```typescript
'use client'

import { useSearchStore } from '@/stores/searchStore'
import { useMapStore } from '@/stores/mapStore'

export function PlaceCard({ place }: { place: Place }) {
  const setSelectedPlace = useSearchStore((state) => state.setSelectedPlace)
  const panTo = useMapStore((state) => state.panTo)

  const handleClick = () => {
    setSelectedPlace(place)
    panTo(place.lat, place.lng, 17) // 지도 이동
  }

  return (
    <div onClick={handleClick}>
      <h3>{place.name}</h3>
      <p>{place.address}</p>
    </div>
  )
}
```

---

## 고급 패턴

### 1. 비동기 액션 상태 관리

```typescript
interface AsyncState {
  isLoading: boolean
  error: string | null
}

interface SearchState extends AsyncState {
  results: Place[]

  search: (query: string) => Promise<void>
}

// 비동기 액션 템플릿
const createAsyncAction = <T,>(
  action: (args: T) => Promise<void>
) => {
  return async (args: T) => {
    set({ isLoading: true, error: null })

    try {
      await action(args)
      set({ isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message, isLoading: false })
      throw error
    }
  }
}
```

### 2. Optimistic Update (낙관적 업데이트)

```typescript
interface ReviewState {
  reviews: Review[]

  deleteReview: (reviewId: string) => Promise<void>
}

export const useReviewStore = create<ReviewState>()((set, get) => ({
  reviews: [],

  deleteReview: async (reviewId) => {
    // 1. 즉시 UI에서 제거 (낙관적)
    const originalReviews = get().reviews
    set((state) => ({
      reviews: state.reviews.filter((r) => r.id !== reviewId),
    }))

    try {
      // 2. 서버에 요청
      await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
    } catch (error) {
      // 3. 실패 시 롤백
      set({ reviews: originalReviews })
      throw error
    }
  },
}))
```

### 3. Store 간 통신

```typescript
// ❌ BAD: Store 간 직접 의존
const useSearchStore = create((set) => ({
  search: async (query: string) => {
    const results = await fetchPlaces(query)
    set({ results })

    // 다른 Store 직접 호출 (안티패턴)
    useMapStore.getState().fitBounds(results)
  },
}))

// ✅ GOOD: 컴포넌트에서 조율
function SearchPage() {
  const search = useSearchStore((state) => state.search)
  const fitBounds = useMapStore((state) => state.fitBounds)
  const results = useSearchStore((state) => state.results)

  useEffect(() => {
    if (results.length > 0) {
      fitBounds(results)
    }
  }, [results, fitBounds])

  return <SearchBar onSearch={search} />
}
```

### 4. 커스텀 훅으로 로직 재사용

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { user, login, logout } = useAuthStore()

  const isAuthenticated = user !== null
  const isGuest = user === null

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      return
    }
    callback()
  }

  return {
    user,
    isAuthenticated,
    isGuest,
    login,
    logout,
    requireAuth,
  }
}

// 컴포넌트에서 사용
function ReviewForm() {
  const { requireAuth } = useAuth()

  const handleSubmit = () => {
    requireAuth(() => {
      // 리뷰 작성 로직
    })
  }
}
```

---

## 테스트

### 1. Store 유닛 테스트

```typescript
// __tests__/stores/authStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    // 각 테스트 전 상태 초기화
    useAuthStore.setState({ user: null, isLoading: false, error: null })
  })

  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    expect(result.current.user).not.toBeNull()
    expect(result.current.user?.email).toBe('test@example.com')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle login error', async () => {
    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      try {
        await result.current.login('invalid@example.com', 'wrong')
      } catch (error) {
        // 에러 예상
      }
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
```

### 2. 컴포넌트 통합 테스트

```typescript
// __tests__/components/Header.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/Header'
import { useAuthStore } from '@/stores/authStore'

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('should show login button when not authenticated', () => {
    render(<Header />)
    expect(screen.getByText('로그인')).toBeInTheDocument()
  })

  it('should show logout button when authenticated', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com', nickname: '테스터' },
    })

    render(<Header />)
    expect(screen.getByText('로그아웃')).toBeInTheDocument()
    expect(screen.getByText(/환영합니다, 테스터님/)).toBeInTheDocument()
  })
})
```

---

## 성능 최적화

### 1. Selector 최적화

```typescript
// ❌ BAD: 매번 새 객체 생성 → 불필요한 리렌더링
const { results, isLoading } = useSearchStore((state) => ({
  results: state.results,
  isLoading: state.isLoading,
}))

// ✅ GOOD: shallow 비교
import { shallow } from 'zustand/shallow'

const { results, isLoading } = useSearchStore(
  (state) => ({
    results: state.results,
    isLoading: state.isLoading,
  }),
  shallow
)
```

### 2. 파생 상태 메모이제이션

```typescript
// ❌ BAD: 매번 계산
const getSortedResults = () => {
  const results = useSearchStore((state) => state.results)
  return results.sort(...)
}

// ✅ GOOD: useMemo로 메모이제이션
import { useMemo } from 'react'

function SearchResults() {
  const results = useSearchStore((state) => state.results)
  const sortBy = useSearchStore((state) => state.filters.sortBy)

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      // 정렬 로직
    })
  }, [results, sortBy])

  return sortedResults.map(...)
}
```

### 3. 액션 분리 (리렌더링 방지)

```typescript
// ❌ BAD: 상태와 액션 함께 구독
const { user, login } = useAuthStore()

// ✅ GOOD: 필요한 것만 구독
const user = useAuthStore((state) => state.user)
const login = useAuthStore((state) => state.login)

// ✅ BETTER: 액션은 별도로
const login = useAuthStore((state) => state.login)
// login 함수는 변경되지 않으므로 리렌더링 없음
```

---

## 디버깅

### 1. Redux DevTools 사용

```typescript
// devtools 미들웨어 활성화
export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // ... store 로직
    }),
    { name: 'SearchStore' }
  )
)

// 브라우저에서 Redux DevTools 열기
// F12 → Redux 탭 → SearchStore 선택
// 모든 액션과 상태 변화를 시각적으로 확인 가능
```

### 2. 로깅 미들웨어

```typescript
// middleware/logger.ts
export const logger = <T>(config: StateCreator<T>) => {
  return (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) =>
    config(
      (args) => {
        console.log('  Previous State:', get())
        set(args)
        console.log('  Next State:', get())
      },
      get,
      api
    )
}

// 사용
export const useSearchStore = create<SearchState>()(
  logger(
    devtools((set, get) => ({
      // ... store 로직
    }))
  )
)
```

---

## 마이그레이션 (Redux → Zustand)

### Before (Redux)

```typescript
// Redux
const initialState = { count: 0 }

function counterReducer(state = initialState, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 }
    case 'DECREMENT':
      return { count: state.count - 1 }
    default:
      return state
  }
}

const increment = () => ({ type: 'INCREMENT' })
const decrement = () => ({ type: 'DECREMENT' })
```

### After (Zustand)

```typescript
// Zustand
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))
```

---

## 베스트 프랙티스 체크리스트

- ✅ Store를 도메인별로 분리했는가?
- ✅ 불변성을 유지하는가?
- ✅ 파생 상태를 최소화했는가?
- ✅ 액션 네이밍이 명확한가?
- ✅ TypeScript 타입을 정의했는가?
- ✅ 비동기 액션에 로딩/에러 상태가 있는가?
- ✅ persist 미들웨어로 필요한 상태를 저장하는가?
- ✅ devtools로 디버깅이 가능한가?
- ✅ Selector로 리렌더링을 최적화했는가?
- ✅ 테스트를 작성했는가?

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 06-1 (State Management Generator)
