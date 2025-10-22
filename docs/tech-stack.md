# NaviSpot - 기술 스택 (Tech Stack)

## 기술 스택 선정 근거

NaviSpot은 네이버 지도 SDK 연동, 실시간 검색, 리뷰 관리 기능을 요구하므로, 다음 기준으로 기술 스택을 선정했습니다:

1. **빠른 개발 속도**: Next.js + TypeScript로 풀스택 개발
2. **외부 SDK 호환성**: 네이버 지도 JavaScript API v3 지원
3. **실시간 데이터**: Supabase Realtime 활용
4. **타입 안전성**: 전체 코드베이스 TypeScript 적용
5. **배포 편의성**: Vercel 원클릭 배포

---

## Frontend

### Core Framework
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **Next.js** | 15.x | - App Router로 서버 컴포넌트 활용<br>- API Routes로 백엔드 구현<br>- 이미지 최적화 내장<br>- Vercel 최적화 |
| **React** | 19.x | - Next.js 15 기본 의존성<br>- Server Components 지원 |
| **TypeScript** | 5.x | - 타입 안전성 보장<br>- IDE 자동완성<br>- 런타임 에러 사전 방지 |

### Styling
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **Tailwind CSS** | 4.0 | - 유틸리티 퍼스트 스타일링<br>- 빠른 프로토타이핑<br>- PostCSS 없이 동작 (v4)<br>- 반응형 디자인 용이 |
| **shadcn/ui** | Latest | - Radix UI 기반 접근성<br>- Tailwind 완벽 통합<br>- 커스터마이징 용이<br>- 프로젝트 내 코드 복사 방식 |

### State Management
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **Zustand** | 5.x | - 단순한 API (Redux 대비)<br>- TypeScript 완벽 지원<br>- 번들 사이즈 작음 (1KB)<br>- devtools 내장 |

### 외부 SDK
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **Naver Maps API** | v3 | - 국내 지도 서비스 1위<br>- 무료 일 10만 건<br>- 상세한 POI 정보<br>- 공식 TypeScript 타입 제공 |
| **Naver Search API** | v1 | - 장소 검색 전문<br>- 무료 일 25,000건<br>- REST API 방식<br>- 네이버 지도와 통합 |

### UI 라이브러리
| 기술 | 버전 | 용도 |
|------|------|------|
| **Radix UI** | Latest | - shadcn/ui 내부 의존성<br>- 접근성 (a11y) 보장<br>- 헤드리스 컴포넌트 |
| **Lucide React** | Latest | - 아이콘 세트<br>- Tree-shaking 지원<br>- 1000+ 아이콘 |
| **React Hook Form** | 7.x | - 폼 상태 관리<br>- 검증 로직 내장<br>- 성능 최적화 (렌더링 최소화) |
| **Zod** | 3.x | - 스키마 검증<br>- TypeScript 타입 추론<br>- React Hook Form 통합 |

---

## Backend

### Database & Auth
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **Supabase** | Latest | - PostgreSQL 기반<br>- Auth 내장 (이메일/비밀번호)<br>- Realtime 구독 지원<br>- RLS (Row Level Security)<br>- 무료 티어 (500MB DB) |

### API
| 기술 | 용도 |
|------|------|
| **Next.js API Routes** | - 네이버 API 프록시<br>- 환경변수 보호<br>- CORS 처리 |
| **Fetch API** | - 네이버 API 호출<br>- Supabase 클라이언트 내장 |

---

## Development Tools

### Package Manager
| 기술 | 버전 | 선정 이유 |
|------|------|----------|
| **npm** | 10.x | - Node.js 기본 패키지 매니저<br>- Vercel 기본 지원<br>- 안정적 의존성 관리 |

### Code Quality
| 기술 | 버전 | 용도 |
|------|------|------|
| **ESLint** | 9.x | - 코드 품질 검사<br>- Next.js 권장 규칙 |
| **Prettier** | 3.x | - 코드 포맷팅<br>- Tailwind 플러그인 |
| **TypeScript ESLint** | 8.x | - TypeScript 전용 린트 |

### Git Hooks
| 기술 | 버전 | 용도 |
|------|------|------|
| **Husky** | 9.x | - Git hook 관리<br>- pre-commit 린트 |
| **lint-staged** | 15.x | - 변경 파일만 린트<br>- 커밋 속도 향상 |

---

## Deployment

### Hosting
| 기술 | 선정 이유 |
|------|----------|
| **Vercel** | - Next.js 제작사 플랫폼<br>- 원클릭 배포<br>- Edge Functions 지원<br>- Analytics 내장<br>- 무료 티어 (개인 프로젝트) |

### CI/CD
- **GitHub Actions**: Git push 시 자동 배포
- **Vercel CLI**: 로컬 프리뷰 배포

---

## 의존성 목록 (package.json)

### dependencies
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.6.0",

  "@supabase/supabase-js": "^2.45.0",
  "@supabase/ssr": "^0.5.0",

  "zustand": "^5.0.0",

  "tailwindcss": "^4.0.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.5.0",

  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "@radix-ui/react-label": "^2.1.0",
  "@radix-ui/react-slot": "^1.1.0",
  "lucide-react": "^0.446.0",

  "react-hook-form": "^7.53.0",
  "@hookform/resolvers": "^3.9.0",
  "zod": "^3.23.0",

  "sonner": "^1.5.0",
  "class-variance-authority": "^0.7.0"
}
```

### devDependencies
```json
{
  "@types/node": "^22.0.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",

  "eslint": "^9.0.0",
  "eslint-config-next": "^15.0.0",
  "prettier": "^3.3.0",
  "prettier-plugin-tailwindcss": "^0.6.0",

  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0",

  "husky": "^9.0.0",
  "lint-staged": "^15.0.0"
}
```

---

## 네이버 API 설정

### 1. 네이버 클라우드 플랫폼 콘솔
1. [https://www.ncloud.com/](https://www.ncloud.com/) 접속
2. **AI·Application > AI·NAVER API > Application 등록**
3. **Maps**와 **검색 > 지역** 서비스 선택
4. Client ID, Client Secret 발급

### 2. 환경 변수 설정
```env
# 네이버 지도 (Client 사이드)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id

# 네이버 검색 (Server 사이드)
NAVER_SEARCH_CLIENT_ID=your_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_search_client_secret
```

### 3. SDK 로드 방법
```typescript
// app/layout.tsx에서 동적 로드
<Script
  src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
  strategy="beforeInteractive"
/>
```

---

## Supabase 설정

### 1. Supabase 프로젝트 생성
1. [https://supabase.com/dashboard](https://supabase.com/dashboard) 접속
2. **New Project** 클릭
3. 프로젝트명: `navispot`
4. 데이터베이스 비밀번호 설정
5. 리전: `ap-northeast-2` (서울)

### 2. 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. 클라이언트 설정
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 폴더 구조 (미리보기)

```
navispot/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── api/
│   │   ├── search/
│   │   │   └── route.ts          # 네이버 검색 API 프록시
│   │   └── reviews/
│   │       └── route.ts          # 리뷰 CRUD API
│   ├── layout.tsx                # 지도 SDK 로드
│   └── page.tsx                  # 메인 페이지 (지도)
├── components/
│   ├── map/
│   │   ├── Map.tsx              # 네이버 지도 컴포넌트
│   │   ├── Marker.tsx           # 마커 컴포넌트
│   │   └── PlacePopup.tsx       # 장소 상세 팝업
│   ├── search/
│   │   ├── SearchBar.tsx        # 검색창
│   │   └── SearchResults.tsx    # 검색 결과 리스트
│   ├── review/
│   │   ├── ReviewForm.tsx       # 리뷰 작성 폼
│   │   └── ReviewList.tsx       # 리뷰 목록
│   └── ui/                       # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트
│   └── utils.ts                 # 유틸리티 함수
├── stores/
│   ├── mapStore.ts              # 지도 상태 관리
│   ├── searchStore.ts           # 검색 상태 관리
│   └── authStore.ts             # 인증 상태 관리
├── types/
│   ├── naver-maps.d.ts          # 네이버 지도 타입 정의
│   ├── place.ts                 # 장소 타입
│   └── review.ts                # 리뷰 타입
└── supabase/
    └── migrations/
        └── 20251023_initial.sql # 초기 DB 스키마
```

---

## 타입 정의 (TypeScript)

### 네이버 지도 타입
```typescript
// types/naver-maps.d.ts
declare global {
  interface Window {
    naver: typeof naver
  }
}

declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options: MapOptions)
    setCenter(latlng: LatLng): void
    setZoom(level: number): void
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
  }

  class LatLng {
    constructor(lat: number, lng: number)
  }

  interface MapOptions {
    center: LatLng
    zoom: number
    mapTypeId?: string
  }

  interface MarkerOptions {
    position: LatLng
    map: Map
    title?: string
    icon?: any
  }
}
```

### 장소 타입
```typescript
// types/place.ts
export interface NaverPlaceResult {
  title: string          // HTML 태그 포함 (제거 필요)
  link: string
  category: string
  description: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string          // X 좌표 (128xxxx)
  mapy: string          // Y 좌표 (37xxxx)
}

export interface Place {
  id: string            // mapx + mapy 조합
  name: string          // HTML 제거된 이름
  address: string
  roadAddress: string
  category: string
  telephone?: string
  lat: number           // mapy / 10000000
  lng: number           // mapx / 10000000
}
```

### 리뷰 타입
```typescript
// types/review.ts
export interface Review {
  id: string
  place_id: string
  place_name: string
  user_id: string
  user_nickname: string
  rating: number        // 1-5
  content: string
  created_at: string
  updated_at: string
}

export interface ReviewInput {
  place_id: string
  place_name: string
  rating: number
  content: string
}
```

---

## 브라우저 지원

| 브라우저 | 최소 버전 | 지원 기능 |
|---------|---------|----------|
| Chrome | 최신 2개 버전 | 전체 |
| Firefox | 최신 2개 버전 | 전체 |
| Safari | 최신 2개 버전 | 전체 |
| Edge | 최신 2개 버전 | 전체 |
| Mobile Safari | iOS 15+ | 전체 |
| Mobile Chrome | Android 10+ | 전체 |

---

## 성능 목표

| 지표 | 목표 | 도구 |
|------|------|------|
| Lighthouse Performance | > 80 | Chrome DevTools |
| First Contentful Paint | < 1.5s | Vercel Analytics |
| Largest Contentful Paint | < 2.5s | Vercel Analytics |
| Time to Interactive | < 3.0s | Vercel Analytics |
| Cumulative Layout Shift | < 0.1 | Vercel Analytics |

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 03-1
