# NaviSpot

네이버 지도 기반 장소 검색 및 리뷰 서비스

## 프로젝트 개요

NaviSpot은 네이버 지도 SDK와 검색 API를 활용하여 사용자가 장소를 검색하고 리뷰를 작성할 수 있는 웹 애플리케이션입니다.

### 주요 기능

- 🔐 사용자 인증 (이메일 로그인/회원가입)
- 🗺️ 네이버 지도 기반 인터랙티브 맵
- 🔍 장소 검색 (네이버 검색 API)
- ⭐ 장소 리뷰 작성/수정/삭제
- 📍 현재 위치 기반 주변 장소 검색

## 기술 스택

### Frontend
- **Next.js 15** - App Router, React Server Components
- **React 19** - 최신 React 기능 활용
- **TypeScript 5.x** - 타입 안정성
- **Tailwind CSS 4.x** - 유틸리티 기반 스타일링
- **Zustand** - 상태 관리 (persist middleware)
- **React Hook Form + Zod** - 폼 관리 및 검증
- **sonner** - 토스트 알림

### Backend & Infrastructure
- **Supabase** - 인증 및 PostgreSQL 데이터베이스
- **Naver Maps JavaScript API v3** - 지도 표시
- **Naver Search Local API v1** - 장소 검색

### Architecture
- **Clean Architecture** - 계층 분리
- **Zustand Pattern** - 상태 관리 표준화
- **Type-Safe API** - 완전한 타입 안정성

## 시작하기

### 1. 사전 요구사항

- Node.js 18.17 이상
- npm 또는 yarn
- Supabase 계정
- Naver Cloud Platform 계정

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase-migration.sql` 파일 실행
3. Settings → API에서 다음 정보 복사:
   - Project URL
   - anon/public key
   - service_role key

### 3. Naver API 키 발급

#### Naver Maps Client ID
1. [Naver Cloud Platform](https://console.ncloud.com) 접속
2. AI·NAVER API → Application 등록
3. Web Dynamic Map 서비스 선택
4. Client ID 발급

#### Naver Search API
1. Naver Cloud Platform에서 Application 등록
2. 검색 → 지역 서비스 선택
3. Client ID와 Client Secret 발급

### 4. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Naver Maps
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your-map-client-id

# Naver Search
NAVER_SEARCH_CLIENT_ID=your-search-client-id
NAVER_SEARCH_CLIENT_SECRET=your-search-client-secret
```

### 5. 의존성 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── search/         # 장소 검색 API
│   │   └── reviews/        # 리뷰 CRUD API
│   ├── layout.tsx          # Root Layout
│   ├── page.tsx            # Home Page
│   └── globals.css         # Global Styles
├── components/              # React Components
│   ├── map/                # 지도 관련 컴포넌트
│   ├── search/             # 검색 관련 컴포넌트
│   ├── review/             # 리뷰 관련 컴포넌트
│   ├── auth/               # 인증 관련 컴포넌트
│   ├── layout/             # 레이아웃 컴포넌트
│   └── ui/                 # 재사용 가능한 UI 컴포넌트
├── stores/                  # Zustand Stores
│   ├── authStore.ts        # 인증 상태 관리
│   ├── mapStore.ts         # 지도 상태 관리
│   ├── searchStore.ts      # 검색 상태 관리
│   └── reviewStore.ts      # 리뷰 상태 관리
├── types/                   # TypeScript 타입 정의
│   ├── index.ts            # 핵심 타입
│   └── naver-maps.d.ts     # Naver Maps 타입
├── lib/                     # 유틸리티 함수
│   └── utils.ts            # 공통 유틸리티
└── infrastructure/          # 인프라 레이어
    └── supabase/           # Supabase 클라이언트
        ├── client.ts       # 브라우저 클라이언트
        └── server.ts       # 서버 클라이언트
```

## 데이터베이스 스키마

### users 테이블
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `nickname` (VARCHAR, UNIQUE)
- `created_at` (TIMESTAMPTZ)

### reviews 테이블
- `id` (UUID, PK)
- `place_id` (VARCHAR) - 네이버 장소 ID
- `place_name` (VARCHAR)
- `user_id` (UUID, FK → users)
- `rating` (SMALLINT, 1-5)
- `content` (TEXT, max 500자)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 개발 가이드

### State Management Pattern

Zustand를 사용한 상태 관리 패턴:

```typescript
interface StoreState {
  // State
  data: DataType | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchData: () => Promise<void>
  updateData: (data: DataType) => Promise<void>
  clearError: () => void
}
```

### API Route Pattern

Next.js API Routes:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    // Logic here
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error message' }, { status: 500 })
  }
}
```

### Component Pattern

Client Components with hooks:

```typescript
'use client'

import { useEffect } from 'react'
import { useStore } from '@/stores/store'

export function Component() {
  const { data, isLoading, fetchData } = useStore()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) return <div>Loading...</div>

  return <div>{/* UI */}</div>
}
```

## 배포

### Vercel 배포

1. GitHub 리포지토리에 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 임포트
3. 환경 변수 설정 (Settings → Environment Variables)
4. 자동 배포 완료

### 환경 변수 체크리스트

배포 전 모든 환경 변수가 설정되어 있는지 확인:

- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
- ✅ NAVER_SEARCH_CLIENT_ID
- ✅ NAVER_SEARCH_CLIENT_SECRET

## 문서

프로젝트 문서는 `docs/` 디렉토리에 위치:

- [요구사항 정의](docs/requirement.md)
- [사용자 플로우](docs/user-flow.md)
- [기술 스택 분석](docs/tech-stack-analysis.md)
- [코드베이스 구조](docs/codebase-structure.md)
- [데이터 플로우](docs/dataflow-schema.md)
- [유즈케이스](docs/use-cases.md)
- [상태 관리](docs/state-management.md)
- [구현 계획](docs/implementation-plan.md)

## 라이선스

MIT License

## 개발 진행 상황

- ✅ Phase 0: 프로젝트 초기화 (완료)
- ✅ Phase 1: 인증 시스템 (완료)
- ⏳ Phase 2: 지도 표시 (진행 예정)
- ⏳ Phase 3: 검색 기능 (진행 예정)
- ⏳ Phase 4: 리뷰 기능 (진행 예정)
- ⏳ Phase 5: 통합 및 최적화 (진행 예정)
- ⏳ Phase 6: 배포 (진행 예정)
