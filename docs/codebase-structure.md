# NaviSpot - Codebase Structure

## 프로젝트 구조 개요

NaviSpot은 Next.js 15 App Router 기반으로 구성되며, Clean Architecture 원칙을 적용하여 계층을 분리합니다.

---

## 전체 디렉토리 구조

```
navispot/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 페이지 그룹
│   │   ├── login/
│   │   │   └── page.tsx         # 로그인 페이지
│   │   └── signup/
│   │       └── page.tsx         # 회원가입 페이지
│   ├── api/                      # API Routes
│   │   ├── search/
│   │   │   └── route.ts         # 네이버 검색 API 프록시
│   │   └── reviews/
│   │       ├── route.ts         # 리뷰 CRUD (GET, POST)
│   │       └── [id]/
│   │           └── route.ts     # 리뷰 수정/삭제 (PUT, DELETE)
│   ├── layout.tsx                # 루트 레이아웃 (지도 SDK 로드)
│   ├── page.tsx                  # 메인 페이지 (지도 + 검색)
│   └── globals.css               # 글로벌 스타일 (Tailwind)
├── components/                   # React 컴포넌트
│   ├── map/
│   │   ├── NaverMap.tsx         # 네이버 지도 컴포넌트
│   │   ├── Marker.tsx           # 마커 컴포넌트
│   │   ├── MarkerCluster.tsx    # 마커 클러스터링
│   │   └── PlacePopup.tsx       # 장소 상세 팝업
│   ├── search/
│   │   ├── SearchBar.tsx        # 검색창
│   │   ├── SearchResults.tsx    # 검색 결과 리스트
│   │   └── PlaceCard.tsx        # 장소 카드 UI
│   ├── review/
│   │   ├── ReviewForm.tsx       # 리뷰 작성/수정 폼
│   │   ├── ReviewList.tsx       # 리뷰 목록
│   │   ├── ReviewItem.tsx       # 리뷰 아이템
│   │   └── StarRating.tsx       # 별점 UI
│   ├── auth/
│   │   ├── LoginForm.tsx        # 로그인 폼
│   │   └── SignupForm.tsx       # 회원가입 폼
│   └── ui/                       # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ... (기타 UI 컴포넌트)
├── lib/                          # 유틸리티 및 설정
│   ├── supabase.ts              # Supabase 클라이언트 설정
│   ├── utils.ts                 # 공통 유틸리티 함수
│   └── constants.ts             # 상수 정의
├── stores/                       # Zustand 상태 관리
│   ├── mapStore.ts              # 지도 상태 (중심, 줌, 마커)
│   ├── searchStore.ts           # 검색 상태 (쿼리, 결과)
│   ├── reviewStore.ts           # 리뷰 상태 (목록, 선택)
│   └── authStore.ts             # 인증 상태 (사용자, 세션)
├── types/                        # TypeScript 타입 정의
│   ├── naver-maps.d.ts          # 네이버 지도 타입
│   ├── place.ts                 # 장소 타입
│   ├── review.ts                # 리뷰 타입
│   ├── search.ts                # 검색 API 타입
│   └── database.ts              # Supabase 테이블 타입
├── supabase/                     # Supabase 관련
│   └── migrations/
│       └── 20251023_initial.sql # 초기 DB 스키마
├── public/                       # 정적 파일
│   ├── icons/                   # 마커 아이콘
│   └── favicon.ico
├── docs/                         # 문서
│   ├── requirement.md           # 요구사항 정의서 ✅
│   ├── userflow.md              # 사용자 플로우 ✅
│   ├── tech-stack.md            # 기술 스택 ✅
│   ├── codebase-structure.md    # 코드베이스 구조 (현재 문서)
│   ├── database.md              # DB 스키마 설계
│   └── external/
│       └── naver-maps-search.md # 네이버 API 연동 가이드 ✅
├── .env.local                    # 환경 변수 (Git 제외)
├── .env.example                  # 환경 변수 예시
├── .gitignore                    # Git 제외 파일
├── package.json                  # 의존성 목록
├── tsconfig.json                 # TypeScript 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── next.config.ts                # Next.js 설정
└── README.md                     # 프로젝트 소개
```

---

## 계층별 상세 설명

### 1. Presentation Layer (app/, components/)

#### app/ (Next.js App Router)
- **역할**: 라우팅 및 페이지 구성
- **주요 파일**:
  - `layout.tsx`: 네이버 지도 SDK 스크립트 로드
  - `page.tsx`: 메인 페이지 (지도 + 검색 UI)
  - `(auth)/login/page.tsx`: 로그인 페이지
  - `(auth)/signup/page.tsx`: 회원가입 페이지

#### components/ (React 컴포넌트)
- **역할**: 재사용 가능한 UI 컴포넌트
- **원칙**:
  - 단일 책임 원칙 (SRP)
  - Props 타입 명시
  - 상태는 Zustand store 사용
  - 스타일은 Tailwind CSS

**예시**:
```typescript
// components/map/NaverMap.tsx
interface NaverMapProps {
  center: { lat: number; lng: number }
  zoom: number
  markers: Marker[]
}

export default function NaverMap({ center, zoom, markers }: NaverMapProps) {
  // 지도 렌더링 로직
}
```

---

### 2. Application Layer (app/api/)

#### API Routes
- **역할**: 서버 사이드 API 엔드포인트
- **주요 기능**:
  - 네이버 API 프록시 (Client Secret 보호)
  - Supabase CRUD 작업
  - 인증 검증

**API 구조**:
```
api/
├── search/
│   └── route.ts          # GET /api/search?query=강남역
├── reviews/
│   ├── route.ts          # GET /api/reviews?place_id=xxx
│   │                     # POST /api/reviews (리뷰 작성)
│   └── [id]/
│       └── route.ts      # PUT /api/reviews/[id] (리뷰 수정)
│                         # DELETE /api/reviews/[id] (리뷰 삭제)
```

**예시 (검색 API)**:
```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')

  const response = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${query}`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET!,
      },
    }
  )

  const data = await response.json()
  return NextResponse.json(data)
}
```

---

### 3. Domain Layer (stores/, types/)

#### stores/ (Zustand 상태 관리)
- **역할**: 애플리케이션 전역 상태 관리
- **원칙**:
  - 도메인별 스토어 분리
  - 액션과 상태를 함께 정의
  - TypeScript 타입 명시

**예시 (지도 스토어)**:
```typescript
// stores/mapStore.ts
import { create } from 'zustand'
import type { Place } from '@/types/place'

interface MapState {
  center: { lat: number; lng: number }
  zoom: number
  markers: Place[]
  selectedPlace: Place | null

  setCenter: (center: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
  setMarkers: (markers: Place[]) => void
  setSelectedPlace: (place: Place | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  center: { lat: 37.5666103, lng: 126.9783882 },
  zoom: 15,
  markers: [],
  selectedPlace: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setMarkers: (markers) => set({ markers }),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
}))
```

#### types/ (TypeScript 타입 정의)
- **역할**: 타입 안전성 보장
- **파일**:
  - `naver-maps.d.ts`: 네이버 지도 타입
  - `place.ts`: 장소 관련 타입
  - `review.ts`: 리뷰 관련 타입
  - `search.ts`: 검색 API 타입
  - `database.ts`: Supabase 테이블 타입

---

### 4. Infrastructure Layer (lib/)

#### lib/ (유틸리티 및 설정)
- **역할**: 외부 서비스 연동 및 공통 유틸리티
- **주요 파일**:

**supabase.ts** (Supabase 클라이언트):
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**utils.ts** (공통 유틸리티):
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind CSS 클래스 병합
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// HTML 태그 제거 (네이버 API 응답 처리)
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

// 좌표 변환 (네이버 API → 위도/경도)
export function convertCoordinates(mapx: string, mapy: string) {
  return {
    lat: parseInt(mapy) / 10000000,
    lng: parseInt(mapx) / 10000000,
  }
}
```

**constants.ts** (상수 정의):
```typescript
export const MAP_DEFAULTS = {
  CENTER: { lat: 37.5666103, lng: 126.9783882 }, // 서울 시청
  ZOOM: 15,
  MIN_ZOOM: 7,
  MAX_ZOOM: 21,
} as const

export const SEARCH_CONFIG = {
  DISPLAY: 10, // 페이지당 개수
  DEBOUNCE_MS: 300, // 검색 디바운스 시간
} as const

export const REVIEW_CONFIG = {
  MAX_LENGTH: 500, // 리뷰 최대 글자 수
  MIN_RATING: 1,
  MAX_RATING: 5,
} as const
```

---

### 5. Data Layer (supabase/)

#### supabase/migrations/
- **역할**: 데이터베이스 스키마 버전 관리
- **파일**: `20251023_initial.sql`

---

## 파일 명명 규칙

### 컴포넌트 파일
- **PascalCase**: `NaverMap.tsx`, `SearchBar.tsx`
- **역할 명확**: 파일명에서 역할 추론 가능
- **단일 export**: 하나의 메인 컴포넌트만 export

### 유틸리티 파일
- **camelCase**: `utils.ts`, `constants.ts`
- **복수형 가능**: `types/`, `stores/`

### API Routes
- **소문자 + 하이픈**: `search/`, `reviews/`
- **RESTful 네이밍**: 명사 사용

---

## Import 경로 규칙

### Alias 사용 (`@/`)
```typescript
// ✅ 좋은 예
import { NaverMap } from '@/components/map/NaverMap'
import { useMapStore } from '@/stores/mapStore'
import { Place } from '@/types/place'

// ❌ 나쁜 예
import { NaverMap } from '../../components/map/NaverMap'
import { useMapStore } from '../../../stores/mapStore'
```

### Import 순서
1. React / Next.js
2. 외부 라이브러리
3. 내부 컴포넌트 (`@/components`)
4. 내부 유틸리티 (`@/lib`, `@/stores`)
5. 타입 (`@/types`)
6. 스타일

```typescript
// ✅ 좋은 예
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

import { NaverMap } from '@/components/map/NaverMap'
import { SearchBar } from '@/components/search/SearchBar'

import { useMapStore } from '@/stores/mapStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

import type { Place } from '@/types/place'
import type { Review } from '@/types/review'
```

---

## 컴포넌트 패턴

### 1. Client Component (클라이언트 상태 사용)
```typescript
'use client'

import { useState } from 'react'
import { useMapStore } from '@/stores/mapStore'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const { setMarkers } = useMapStore()

  // ...
}
```

### 2. Server Component (기본, 상태 없음)
```typescript
// 'use client' 지시어 없음

import { supabase } from '@/lib/supabase'

export default async function ReviewList({ placeId }: { placeId: string }) {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('place_id', placeId)

  return (
    <div>
      {reviews?.map((review) => (
        <div key={review.id}>{review.content}</div>
      ))}
    </div>
  )
}
```

### 3. API Route Handler
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // GET 요청 처리
}

export async function POST(req: NextRequest) {
  // POST 요청 처리
}
```

---

## 환경 변수 관리

### .env.local (Git 제외)
```env
# 네이버 지도
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=actual_client_id

# 네이버 검색
NAVER_SEARCH_CLIENT_ID=actual_client_id
NAVER_SEARCH_CLIENT_SECRET=actual_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=actual_anon_key
```

### .env.example (Git 포함)
```env
# 네이버 지도
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id

# 네이버 검색
NAVER_SEARCH_CLIENT_ID=your_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_search_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 빌드 최적화

### 1. 코드 분할 (Code Splitting)
```typescript
// 동적 import로 번들 사이즈 줄이기
import dynamic from 'next/dynamic'

const NaverMap = dynamic(() => import('@/components/map/NaverMap'), {
  ssr: false, // 지도는 클라이언트에서만 렌더링
  loading: () => <div>지도 로딩 중...</div>,
})
```

### 2. 이미지 최적화
```typescript
import Image from 'next/image'

<Image
  src="/icons/marker-default.png"
  alt="마커"
  width={32}
  height={32}
  priority // 중요한 이미지는 우선 로드
/>
```

### 3. Font 최적화
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

---

## 테스트 구조 (향후 추가)

```
navispot/
├── __tests__/              # 테스트 파일
│   ├── components/
│   │   ├── map/
│   │   │   └── NaverMap.test.tsx
│   │   └── search/
│   │       └── SearchBar.test.tsx
│   ├── stores/
│   │   └── mapStore.test.ts
│   └── api/
│       └── search.test.ts
└── jest.config.js
```

---

## 코딩 컨벤션

### 1. 함수형 컴포넌트 사용
```typescript
// ✅ 좋은 예
export default function MyComponent() {
  return <div>...</div>
}

// ❌ 나쁜 예
const MyComponent = () => {
  return <div>...</div>
}
export default MyComponent
```

### 2. 명시적 타입 정의
```typescript
// ✅ 좋은 예
interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  // ...
}

// ❌ 나쁜 예
export default function SearchBar({ onSearch, placeholder }: any) {
  // ...
}
```

### 3. Early Return 패턴
```typescript
// ✅ 좋은 예
function processData(data: Data | null) {
  if (!data) return null

  // 메인 로직
  return processedData
}

// ❌ 나쁜 예
function processData(data: Data | null) {
  if (data) {
    // 메인 로직
    return processedData
  } else {
    return null
  }
}
```

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 03-2
