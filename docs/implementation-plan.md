# NaviSpot - Implementation Plan

## 프로젝트 개요

**프로젝트명**: NaviSpot
**목표**: 네이버 지도 + 검색 API 기반 장소 검색 및 리뷰 서비스
**기간**: 약 40-60시간 (5-7일)
**기술 스택**: Next.js 15, TypeScript, Tailwind CSS, Supabase, Zustand, Naver APIs

---

## 구현 전략

### 핵심 원칙
1. **Bottom-Up 접근**: 인프라 → 핵심 기능 → UI 순서로 구현
2. **Feature-First**: 기능별로 완성하며 점진적 확장
3. **Test as You Go**: 각 기능 완성 시 즉시 테스트
4. **MVP 우선**: 핵심 기능 먼저 완성 후 부가 기능 추가

### 단계별 전략
```
Phase 0: 프로젝트 초기화 및 설정
  ↓
Phase 1: 인프라 및 인증 (Supabase, Auth)
  ↓
Phase 2: 지도 기본 기능 (Naver Maps SDK)
  ↓
Phase 3: 검색 기능 (Naver Search API)
  ↓
Phase 4: 리뷰 기능 (CRUD)
  ↓
Phase 5: 통합 및 최적화
  ↓
Phase 6: 배포 및 테스트
```

---

## Phase 0: 프로젝트 초기화 및 설정 (2-3시간)

### 목표
- Next.js 프로젝트 초기화
- 필수 패키지 설치
- 기본 설정 파일 구성
- 환경 변수 설정

### Task 0-1: Next.js 프로젝트 생성
```bash
# 프로젝트 생성 (이미 docs 디렉토리 존재하므로 상위에서)
npx create-next-app@latest navispot \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --eslint

cd navispot
```

**예상 시간**: 10분
**검증**: `npm run dev` 실행 확인

---

### Task 0-2: 필수 패키지 설치
```bash
# 핵심 패키지
npm install @supabase/supabase-js @supabase/ssr zustand

# Form & Validation
npm install react-hook-form @hookform/resolvers zod

# UI 컴포넌트
npm install class-variance-authority clsx tailwind-merge

# 유틸리티
npm install date-fns
```

**예상 시간**: 10분
**검증**: `package.json` 확인

---

### Task 0-3: shadcn/ui 설정
```bash
# shadcn/ui 초기화
npx shadcn@latest init -y

# 필수 컴포넌트 추가
npx shadcn@latest add button input card form dialog toast
npx shadcn@latest add select textarea label alert-dialog tabs
```

**예상 시간**: 15분
**검증**: `components/ui/` 디렉토리 생성 확인

---

### Task 0-4: 디렉토리 구조 생성
```bash
# src/ 디렉토리 구조 생성
mkdir -p src/app/api/search
mkdir -p src/app/api/reviews
mkdir -p src/components/map
mkdir -p src/components/search
mkdir -p src/components/review
mkdir -p src/components/auth
mkdir -p src/stores
mkdir -p src/types
mkdir -p src/lib
mkdir -p src/infrastructure/supabase
mkdir -p public/markers
```

**예상 시간**: 5분
**검증**: `tree src/ -L 2` 확인

---

### Task 0-5: TypeScript 설정
```typescript
// tsconfig.json 수정
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**예상 시간**: 5분

---

### Task 0-6: 환경 변수 설정
```bash
# .env.local 생성
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Naver Maps
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your-map-client-id

# Naver Search
NAVER_SEARCH_CLIENT_ID=your-search-client-id
NAVER_SEARCH_CLIENT_SECRET=your-search-client-secret
EOF

# .env.example 생성 (Git에 커밋)
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
EOF
```

**예상 시간**: 10분
**검증**: `.env.local` 파일 존재 확인

---

### Task 0-7: Tailwind 설정
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... shadcn/ui 기본 색상
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

**예상 시간**: 10분

---

### Task 0-8: 기본 타입 정의
```typescript
// src/types/index.ts
export interface User {
  id: string
  email: string
  nickname: string
  created_at: string
}

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
```

**예상 시간**: 10분

---

### Task 0-9: Naver Maps 타입 정의
```typescript
// src/types/naver-maps.d.ts
declare global {
  interface Window {
    naver: typeof naver
  }
}

declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options: MapOptions)
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setZoom(level: number, useEffect?: boolean): void
    getZoom(): number
    panTo(latlng: LatLng, transition?: any): void
    fitBounds(bounds: LatLngBounds, margin?: Margin): void
  }

  interface MapOptions {
    center: LatLng
    zoom: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    mapTypeControl?: boolean
  }

  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): LatLngBounds
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(latlng: LatLng): void
    setZIndex(zIndex: number): void
    setAnimation(animation: Animation | null): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    title?: string
    icon?: Icon
    zIndex?: number
  }

  enum Animation {
    BOUNCE = 1,
    DROP = 2,
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions)
    open(map: Map, anchor: Marker | LatLng): void
    close(): void
  }

  interface InfoWindowOptions {
    content: string | HTMLElement
    maxWidth?: number
    anchorSkew?: boolean
  }

  class Event {
    static addListener(
      target: any,
      eventName: string,
      listener: Function
    ): void
  }
}

export {}
```

**예상 시간**: 15분

---

### Phase 0 완료 체크리스트
- [ ] Next.js 프로젝트 생성
- [ ] 필수 패키지 설치
- [ ] shadcn/ui 설정
- [ ] 디렉토리 구조 생성
- [ ] TypeScript 설정
- [ ] 환경 변수 설정
- [ ] Tailwind 설정
- [ ] 기본 타입 정의
- [ ] Naver Maps 타입 정의

**총 예상 시간**: 2-3시간

---

## Phase 1: 인프라 및 인증 (4-6시간)

### 목표
- Supabase 연결 설정
- 데이터베이스 마이그레이션 실행
- 인증 Store 구현
- 로그인/회원가입 UI 구현

---

### Task 1-1: Supabase 클라이언트 설정
```typescript
// src/infrastructure/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/infrastructure/supabase/server.ts
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**예상 시간**: 20분
**검증**: 클라이언트 생성 테스트

---

### Task 1-2: Supabase 프로젝트 생성 및 설정
1. https://supabase.com 접속
2. New Project 생성
3. Project URL, API Keys 복사
4. `.env.local`에 입력

**예상 시간**: 10분

---

### Task 1-3: 데이터베이스 마이그레이션 실행
```sql
-- Supabase SQL Editor에서 실행
-- docs/database.md의 마이그레이션 SQL 복사

-- 1. users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. reviews 테이블
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id VARCHAR(100) NOT NULL,
  place_name VARCHAR(200) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX idx_reviews_place_id ON reviews(place_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- 4. RLS 활성화 및 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- users 정책
CREATE POLICY select_users ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY update_own_profile ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- reviews 정책
CREATE POLICY select_reviews ON reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_own_review ON reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_review ON reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY delete_own_review ON reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**예상 시간**: 20분
**검증**: Supabase Table Editor에서 테이블 확인

---

### Task 1-4: authStore 구현
```typescript
// src/stores/authStore.ts
// docs/state-management.md의 authStore 코드 복사
```

**예상 시간**: 30분
**검증**: Store 테스트 작성 및 실행

---

### Task 1-5: 로그인/회원가입 UI 구현
```typescript
// src/components/auth/AuthDialog.tsx
// docs/usecases/UC-006-authentication.md의 UI 코드 참조
```

**예상 시간**: 1-2시간
**검증**: 브라우저에서 UI 확인

---

### Task 1-6: 로그인 API 테스트
```typescript
// 간단한 테스트 페이지 생성
// src/app/test-auth/page.tsx

'use client'

import { useAuthStore } from '@/stores/authStore'

export default function TestAuthPage() {
  const { user, login, signup, logout } = useAuthStore()

  return (
    <div className="p-8 space-y-4">
      <h1>Auth Test</h1>
      {user ? (
        <div>
          <p>Logged in as: {user.nickname}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div className="space-x-2">
          <button
            onClick={() => login('test@example.com', 'password123')}
          >
            Test Login
          </button>
          <button
            onClick={() => signup('test@example.com', 'password123', 'Tester')}
          >
            Test Signup
          </button>
        </div>
      )}
    </div>
  )
}
```

**예상 시간**: 30분
**검증**: 로그인/회원가입 동작 확인

---

### Phase 1 완료 체크리스트
- [ ] Supabase 클라이언트 설정
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 마이그레이션
- [ ] authStore 구현
- [ ] 로그인/회원가입 UI
- [ ] 인증 기능 테스트

**총 예상 시간**: 4-6시간

---

## Phase 2: 지도 기본 기능 (4-6시간)

### 목표
- Naver Maps SDK 로드
- 지도 컴포넌트 구현
- 지도 Store 구현
- 기본 지도 표시 및 상호작용

---

### Task 2-1: Naver Maps SDK 스크립트 추가
```typescript
// src/app/layout.tsx
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**예상 시간**: 10분

---

### Task 2-2: mapStore 구현
```typescript
// src/stores/mapStore.ts
// docs/state-management.md의 mapStore 코드 복사
```

**예상 시간**: 30분

---

### Task 2-3: Map 컴포넌트 구현
```typescript
// src/components/map/Map.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/stores/mapStore'

export function Map() {
  const mapRef = useRef<HTMLDivElement>(null)
  const { setMap, center, zoom } = useMapStore()

  useEffect(() => {
    if (!mapRef.current || !window.naver) return

    const mapOptions: naver.maps.MapOptions = {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom,
      minZoom: 7,
      maxZoom: 21,
      zoomControl: true,
      mapTypeControl: false,
    }

    const map = new naver.maps.Map(mapRef.current, mapOptions)
    setMap(map)

    return () => {
      // Cleanup
    }
  }, [])

  return (
    <div
      ref={mapRef}
      className="h-[calc(100vh-64px)] w-full"
      role="application"
      aria-label="네이버 지도"
    />
  )
}
```

**예상 시간**: 1시간
**검증**: 브라우저에서 지도 표시 확인

---

### Task 2-4: 홈 페이지에 지도 추가
```typescript
// src/app/page.tsx
import { Map } from '@/components/map/Map'

export default function HomePage() {
  return (
    <main>
      <Map />
    </main>
  )
}
```

**예상 시간**: 10분

---

### Task 2-5: 지도 컨트롤 구현 (현재 위치 버튼)
```typescript
// src/components/map/MapControls.tsx
'use client'

import { useMapStore } from '@/stores/mapStore'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'

export function MapControls() {
  const { panTo } = useMapStore()

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('위치 정보를 지원하지 않는 브라우저입니다')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        panTo(position.coords.latitude, position.coords.longitude, 16)
        toast.success('현재 위치로 이동했습니다')
      },
      (error) => {
        toast.error('위치 정보를 가져올 수 없습니다')
      }
    )
  }

  return (
    <div className="absolute right-4 bottom-4 space-y-2">
      <Button
        onClick={handleCurrentLocation}
        variant="secondary"
        size="icon"
        aria-label="현재 위치로 이동"
      >
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

**예상 시간**: 30분

---

### Task 2-6: 지도 로딩 상태 UI
```typescript
// src/components/map/MapLoader.tsx
export function MapLoader() {
  return (
    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">지도를 불러오는 중...</p>
      </div>
    </div>
  )
}
```

**예상 시간**: 20분

---

### Phase 2 완료 체크리스트
- [ ] Naver Maps SDK 로드
- [ ] mapStore 구현
- [ ] Map 컴포넌트 구현
- [ ] 홈 페이지에 지도 추가
- [ ] 현재 위치 버튼 구현
- [ ] 로딩 상태 UI

**총 예상 시간**: 4-6시간

---

## Phase 3: 검색 기능 (6-8시간)

### 목표
- 검색 API Route 구현
- 검색 Store 구현
- 검색 UI 구현
- 마커 표시 기능

---

### Task 3-1: 검색 API Route 구현
```typescript
// src/app/api/search/route.ts
// docs/usecases/UC-002-place-search.md의 API 코드 참조
```

**예상 시간**: 1시간
**검증**: Postman으로 API 테스트

---

### Task 3-2: searchStore 구현
```typescript
// src/stores/searchStore.ts
// docs/state-management.md의 searchStore 코드 복사
```

**예상 시간**: 30분

---

### Task 3-3: SearchBar 컴포넌트 구현
```typescript
// src/components/search/SearchBar.tsx
// docs/usecases/UC-002-place-search.md의 UI 코드 참조
```

**예상 시간**: 1-2시간

---

### Task 3-4: SearchResults 컴포넌트 구현
```typescript
// src/components/search/SearchResults.tsx
// 검색 결과 목록 표시
```

**예상 시간**: 1-2시간

---

### Task 3-5: Marker 컴포넌트 구현
```typescript
// src/components/map/Marker.tsx
// docs/usecases/UC-003-marker-display.md의 코드 참조
```

**예상 시간**: 1-2시간

---

### Task 3-6: 검색 결과와 마커 연동
```typescript
// src/app/page.tsx 수정
// 검색 결과를 마커로 표시
```

**예상 시간**: 1시간

---

### Phase 3 완료 체크리스트
- [ ] 검색 API Route 구현
- [ ] searchStore 구현
- [ ] SearchBar 컴포넌트
- [ ] SearchResults 컴포넌트
- [ ] Marker 컴포넌트
- [ ] 검색-마커 연동

**총 예상 시간**: 6-8시간

---

## Phase 4: 리뷰 기능 (6-8시간)

### 목표
- 리뷰 API Routes 구현 (CRUD)
- 리뷰 Store 구현
- 리뷰 작성/수정/삭제 UI

---

### Task 4-1: 리뷰 API Routes 구현
```typescript
// src/app/api/reviews/route.ts (POST, GET)
// src/app/api/reviews/[id]/route.ts (PATCH, DELETE)
// docs/usecases/UC-004, UC-005 참조
```

**예상 시간**: 2시간

---

### Task 4-2: reviewStore 구현
```typescript
// src/stores/reviewStore.ts
// docs/state-management.md의 reviewStore 코드 복사
```

**예상 시간**: 30분

---

### Task 4-3: ReviewForm 컴포넌트 구현
```typescript
// src/components/review/ReviewForm.tsx
// docs/usecases/UC-004-review-creation.md의 UI 코드 참조
```

**예상 시간**: 2-3시간

---

### Task 4-4: ReviewList 컴포넌트 구현
```typescript
// src/components/review/ReviewList.tsx
// 리뷰 목록 표시 + 수정/삭제 버튼
```

**예상 시간**: 1-2시간

---

### Task 4-5: 장소 상세 페이지 구현
```typescript
// src/app/place/[id]/page.tsx
// 장소 정보 + 리뷰 목록 + 리뷰 작성
```

**예상 시간**: 1-2시간

---

### Phase 4 완료 체크리스트
- [ ] 리뷰 API Routes (CRUD)
- [ ] reviewStore 구현
- [ ] ReviewForm 컴포넌트
- [ ] ReviewList 컴포넌트
- [ ] 장소 상세 페이지

**총 예상 시간**: 6-8시간

---

## Phase 5: 통합 및 최적화 (4-6시간)

### 목표
- 전체 플로우 통합
- 성능 최적화
- 에러 처리 개선
- UI/UX 개선

---

### Task 5-1: 헤더 컴포넌트 구현
```typescript
// src/components/layout/Header.tsx
// 로고 + 검색창 + 로그인 버튼
```

**예상 시간**: 1시간

---

### Task 5-2: 반응형 레이아웃 구현
```typescript
// 모바일: 검색 결과 하단 시트
// 데스크톱: 사이드바
```

**예상 시간**: 2-3시간

---

### Task 5-3: 로딩 및 에러 상태 UI
```typescript
// 전역 로딩 스피너
// 에러 바운더리
// 토스트 알림 설정
```

**예상 시간**: 1시간

---

### Task 5-4: 성능 최적화
- 이미지 최적화 (Next.js Image)
- 코드 스플리팅
- 메모이제이션 (useMemo, useCallback)
- Zustand selector 최적화

**예상 시간**: 1-2시간

---

### Phase 5 완료 체크리스트
- [ ] 헤더 컴포넌트
- [ ] 반응형 레이아웃
- [ ] 로딩/에러 UI
- [ ] 성능 최적화

**총 예상 시간**: 4-6시간

---

## Phase 6: 배포 및 테스트 (2-3시간)

### 목표
- Vercel 배포
- 환경 변수 설정
- 프로덕션 테스트

---

### Task 6-1: 프로덕션 빌드 테스트
```bash
npm run build
npm run start
```

**예상 시간**: 20분

---

### Task 6-2: Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정 (Vercel Dashboard)
```

**예상 시간**: 30분

---

### Task 6-3: 프로덕션 환경 테스트
- 모든 기능 E2E 테스트
- 모바일 반응형 테스트
- 성능 측정 (Lighthouse)

**예상 시간**: 1-2시간

---

### Task 6-4: README 작성
```markdown
# NaviSpot

## 기능
- 네이버 지도 기반 장소 검색
- 장소 리뷰 작성/수정/삭제
- 사용자 인증 (Supabase)

## 기술 스택
- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase
- Zustand
- Naver Maps API
- Naver Search API

## 실행 방법
\`\`\`bash
npm install
npm run dev
\`\`\`

## 환경 변수
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
\`\`\`

## 배포
https://your-app.vercel.app
```

**예상 시간**: 30분

---

### Phase 6 완료 체크리스트
- [ ] 프로덕션 빌드 테스트
- [ ] Vercel 배포
- [ ] 프로덕션 테스트
- [ ] README 작성

**총 예상 시간**: 2-3시간

---

## 전체 타임라인

| Phase | 내용 | 예상 시간 | 누적 시간 |
|-------|------|----------|----------|
| 0 | 프로젝트 초기화 | 2-3h | 2-3h |
| 1 | 인프라 및 인증 | 4-6h | 6-9h |
| 2 | 지도 기본 기능 | 4-6h | 10-15h |
| 3 | 검색 기능 | 6-8h | 16-23h |
| 4 | 리뷰 기능 | 6-8h | 22-31h |
| 5 | 통합 및 최적화 | 4-6h | 26-37h |
| 6 | 배포 및 테스트 | 2-3h | 28-40h |

**총 예상 시간**: 28-40시간 (3.5-5일)

---

## 우선순위 (MVP)

### 🔴 Critical (반드시 구현)
1. ✅ Phase 0: 프로젝트 초기화
2. ✅ Phase 1: 인증 시스템
3. ✅ Phase 2: 지도 표시
4. ✅ Phase 3: 장소 검색 + 마커
5. ✅ Phase 4: 리뷰 CRUD

### 🟡 High (가능하면 구현)
6. Phase 5: 통합 및 최적화
7. Phase 6: 배포

### 🟢 Nice-to-Have (시간 여유 있을 때)
- 자동완성 검색
- 검색 필터링/정렬
- 페이지네이션
- 소셜 로그인
- 마커 클러스터링
- 리뷰 이미지 첨부

---

## 리스크 관리

### 잠재적 리스크

#### 1. 네이버 API 제한
- **리스크**: API 호출 제한 초과 (일 10만 건)
- **완화**:
  - 검색 결과 캐싱
  - Debounce 적용 (300ms)
  - localStorage 활용

#### 2. Supabase 무료 플랜 제한
- **리스크**: 스토리지/DB 용량 초과
- **완화**:
  - 이미지 첨부 기능 제외
  - 리뷰 길이 제한 (500자)
  - 불필요한 데이터 정리

#### 3. 개발 일정 지연
- **리스크**: 예상보다 시간 소요
- **완화**:
  - MVP 우선 집중
  - Nice-to-Have 기능 후순위
  - 코드 재사용 최대화

---

## 품질 보증

### 테스트 전략
1. **단위 테스트**: Store 로직 (Jest)
2. **통합 테스트**: API Routes (Supertest)
3. **E2E 테스트**: 핵심 사용자 플로우 (Playwright) - 선택 사항
4. **수동 테스트**: 각 Phase 완료 후 검증

### 코드 리뷰 체크리스트
- [ ] TypeScript 타입 오류 없음
- [ ] ESLint 경고 없음
- [ ] 불필요한 console.log 제거
- [ ] 에러 처리 완료
- [ ] 로딩 상태 표시
- [ ] 반응형 UI 확인
- [ ] 접근성 (ARIA) 적용

---

## 다음 단계

### Phase 0 시작 전 준비사항
1. ✅ 네이버 클라우드 플랫폼 가입
   - Maps API 키 발급
   - Search API 키 발급

2. ✅ Supabase 프로젝트 생성 준비
   - 계정 생성
   - 프로젝트명 결정

3. ✅ 개발 환경 확인
   - Node.js 18+ 설치
   - Git 설치
   - VS Code 설치

### 시작 명령어
```bash
cd "C:\Users\tkand\Desktop\development\supernext\Day 05"
npx create-next-app@latest navispot --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
cd navispot
```

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 07 (Implementation Plan Generator)
**상태**: Ready to Execute
