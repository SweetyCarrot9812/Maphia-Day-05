# 네이버 지도 SDK + 검색 API 연동 가이드

## 문서 정보
- **서비스**: 네이버 클라우드 플랫폼 (네이버 지도 + 장소 검색)
- **연동 유형**: SDK (지도), REST API (검색)
- **LTS 버전**: JavaScript API v3 (지도), Search Local API v1 (검색)
- **작성일**: 2025-10-23
- **검증 날짜**: 2025-10-23
- **공식 문서**:
  - 지도: [https://navermaps.github.io/maps.js.ncp/](https://navermaps.github.io/maps.js.ncp/)
  - 검색: [https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding-geocode](https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding-geocode)

---

## 연동 개요

이 서비스는 다음을 제공합니다:
- **지도 SDK**: 웹 페이지에 네이버 지도 임베드, 마커 표시, 이벤트 처리
- **검색 API**: 키워드 기반 장소 검색 (주소, 전화번호, 좌표 등)

---

## 1. 인증 정보 발급

### 1.1 네이버 클라우드 플랫폼 콘솔 접속

1. [https://www.ncloud.com/](https://www.ncloud.com/) 접속
2. **회원가입** 또는 **로그인**
3. **Console** 버튼 클릭

### 1.2 Application 등록

1. 좌측 메뉴: **Services > AI·NAVER API > AI·NAVER API**
2. **Application 등록** 버튼 클릭
3. 정보 입력:
   - Application 이름: `NaviSpot`
   - Service 선택:
     - ✅ **Maps** (Web Dynamic Map)
     - ✅ **검색 > 지역** (Local Search)
   - Web 서비스 URL: `http://localhost:3000` (개발 시), `https://navispot.vercel.app` (배포 시)

4. **등록** 클릭

### 1.3 인증키 확인

등록 완료 후 다음 정보를 확인:
- **Client ID**: 공개 가능 (클라이언트 사이드 사용)
- **Client Secret**: **절대 공개 금지** (서버 사이드 전용)

**예시**:
```
Client ID: abc123xyz456
Client Secret: DEF789UVW012
```

---

## 2. 환경 변수 설정

### 2.1 .env.local 파일 생성

프로젝트 루트에 `.env.local` 파일 생성:

```env
# 네이버 지도 SDK (클라이언트 사이드)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=abc123xyz456

# 네이버 검색 API (서버 사이드)
NAVER_SEARCH_CLIENT_ID=abc123xyz456
NAVER_SEARCH_CLIENT_SECRET=DEF789UVW012
```

**주의사항**:
- `NEXT_PUBLIC_` 접두사: 브라우저에서 접근 가능 (공개 OK)
- `NEXT_PUBLIC_` 없음: 서버 사이드 전용 (비밀 유지)

### 2.2 .env.example 파일 생성

Git 저장소에는 예시 파일만 커밋:

```env
# 네이버 지도 SDK
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id

# 네이버 검색 API
NAVER_SEARCH_CLIENT_ID=your_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_search_client_secret
```

### 2.3 TypeScript 타입 정의

`env.d.ts` 파일 생성:

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: string
    NAVER_SEARCH_CLIENT_ID: string
    NAVER_SEARCH_CLIENT_SECRET: string
  }
}
```

---

## 3. 네이버 지도 SDK 연동

### 3.1 SDK 로드 (Script 태그)

**파일**: `app/layout.tsx`

```typescript
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const mapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

  return (
    <html lang="ko">
      <head>
        {/* 네이버 지도 SDK */}
        <Script
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${mapClientId}`}
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**설명**:
- `strategy="beforeInteractive"`: 페이지가 인터랙티브되기 전에 로드 (필수)
- `ncpClientId`: Client ID 파라미터로 전달

### 3.2 지도 컴포넌트 생성

**파일**: `components/map/NaverMap.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'

interface NaverMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
}

export default function NaverMap({
  center = { lat: 37.5666103, lng: 126.9783882 }, // 서울 시청
  zoom = 15,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<naver.maps.Map | null>(null)

  useEffect(() => {
    // window.naver가 로드될 때까지 대기
    const initMap = () => {
      if (!mapRef.current || !window.naver) return

      const mapOptions: naver.maps.MapOptions = {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom: zoom,
        minZoom: 7,
        maxZoom: 21,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
        },
      }

      mapInstanceRef.current = new naver.maps.Map(mapRef.current, mapOptions)
    }

    // SDK가 이미 로드되었는지 확인
    if (window.naver && window.naver.maps) {
      initMap()
    } else {
      // SDK 로드 대기
      const checkNaver = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(checkNaver)
          initMap()
        }
      }, 100)

      return () => clearInterval(checkNaver)
    }
  }, [center.lat, center.lng, zoom])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100vh' }}
      className="relative"
    />
  )
}
```

### 3.3 마커 추가

```typescript
// 마커 생성 함수
function addMarker(map: naver.maps.Map, lat: number, lng: number, title: string) {
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map: map,
    title: title,
  })

  // 마커 클릭 이벤트
  naver.maps.Event.addListener(marker, 'click', () => {
    console.log(`${title} 클릭됨`)
    // 팝업 표시 로직
  })

  return marker
}
```

### 3.4 TypeScript 타입 정의

**파일**: `types/naver-maps.d.ts`

```typescript
declare global {
  interface Window {
    naver: typeof naver
  }
}

declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options: MapOptions)
    setCenter(latlng: LatLng): void
    setZoom(level: number, useEffect?: boolean): void
    destroy(): void
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
  }

  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  interface MapOptions {
    center: LatLng
    zoom: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    zoomControlOptions?: {
      position: Position
    }
  }

  interface MarkerOptions {
    position: LatLng
    map: Map
    title?: string
    icon?: string | ImageIcon
  }

  enum Position {
    TOP_LEFT,
    TOP_CENTER,
    TOP_RIGHT,
    LEFT_CENTER,
    CENTER,
    RIGHT_CENTER,
    BOTTOM_LEFT,
    BOTTOM_CENTER,
    BOTTOM_RIGHT,
  }

  interface ImageIcon {
    url: string
    size: Size
    origin: Point
    anchor: Point
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  namespace Event {
    function addListener(
      target: any,
      eventName: string,
      handler: Function
    ): MapEventListener
    function removeListener(listener: MapEventListener): void
  }

  interface MapEventListener {
    remove(): void
  }
}

export {}
```

---

## 4. 네이버 검색 API 연동

### 4.1 API Route 생성 (프록시)

**파일**: `app/api/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')
  const display = searchParams.get('display') || '10'
  const start = searchParams.get('start') || '1'

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID!
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET!

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
        query
      )}&display=${display}&start=${start}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: 'Naver API error', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 4.2 클라이언트에서 호출

**파일**: `components/search/SearchBar.tsx`

```typescript
'use client'

import { useState } from 'react'

interface SearchResult {
  title: string
  link: string
  category: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&display=10`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.items || [])
    } catch (error) {
      console.error('Search error:', error)
      alert('검색 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="장소 검색 (예: 강남역 카페)"
          className="flex-1 rounded border px-4 py-2"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
        >
          {isLoading ? '검색 중...' : '검색'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((result, index) => (
            <li key={index} className="rounded border p-4">
              <h3
                className="font-bold"
                dangerouslySetInnerHTML={{ __html: result.title }}
              />
              <p className="text-sm text-gray-600">{result.address}</p>
              <p className="text-xs text-gray-400">{result.category}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### 4.3 API 응답 타입 정의

**파일**: `types/search.ts`

```typescript
export interface NaverSearchResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverSearchItem[]
}

export interface NaverSearchItem {
  title: string          // HTML 태그 포함 (예: "<b>스타벅스</b>")
  link: string
  category: string       // "음식점>카페,디저트"
  description: string
  telephone: string
  address: string        // 지번 주소
  roadAddress: string    // 도로명 주소
  mapx: string          // X 좌표 (127xxxx 형태, 10000000으로 나눔)
  mapy: string          // Y 좌표 (37xxxx 형태, 10000000으로 나눔)
}

export interface Place {
  id: string            // mapx + mapy 조합
  name: string          // HTML 제거된 이름
  address: string
  roadAddress: string
  category: string
  telephone: string
  lat: number           // mapy / 10000000
  lng: number           // mapx / 10000000
}

// 유틸리티 함수: API 응답 → Place 변환
export function convertToPlace(item: NaverSearchItem): Place {
  // HTML 태그 제거
  const name = item.title.replace(/<[^>]*>/g, '')

  // 좌표 변환
  const lat = parseInt(item.mapy) / 10000000
  const lng = parseInt(item.mapx) / 10000000

  return {
    id: `${item.mapx}-${item.mapy}`,
    name,
    address: item.address,
    roadAddress: item.roadAddress,
    category: item.category,
    telephone: item.telephone,
    lat,
    lng,
  }
}
```

---

## 5. 지도 + 검색 통합

### 5.1 검색 결과를 지도에 마커로 표시

**파일**: `app/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import NaverMap from '@/components/map/NaverMap'
import SearchBar from '@/components/search/SearchBar'
import type { Place } from '@/types/search'

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)

  const handleSearch = (results: Place[]) => {
    setPlaces(results)

    // 검색 결과가 있으면 첫 번째 장소로 지도 중심 이동
    if (results.length > 0) {
      setSelectedPlace(results[0])
    }
  }

  return (
    <div className="flex h-screen">
      {/* 검색 사이드바 */}
      <div className="w-96 overflow-y-auto border-r bg-white p-4">
        <SearchBar onSearch={handleSearch} />

        <div className="mt-4 space-y-2">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => setSelectedPlace(place)}
              className={`cursor-pointer rounded border p-3 hover:bg-gray-50 ${
                selectedPlace?.id === place.id ? 'bg-blue-50' : ''
              }`}
            >
              <h3 className="font-bold">{place.name}</h3>
              <p className="text-sm text-gray-600">{place.roadAddress}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 지도 */}
      <div className="flex-1">
        <NaverMap
          center={
            selectedPlace
              ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
              : undefined
          }
          places={places}
        />
      </div>
    </div>
  )
}
```

---

## 6. 알려진 이슈 & 해결 방법

### 6.1 CORS 에러 (클라이언트에서 직접 호출 시)

❌ **문제**:
```
Access to fetch at 'https://openapi.naver.com/v1/search/local.json'
has been blocked by CORS policy
```

✅ **해결**: 클라이언트에서 직접 호출 금지, 서버 API Route 사용

```typescript
// ❌ 클라이언트에서 직접 호출
fetch('https://openapi.naver.com/v1/search/local.json?query=...', {
  headers: {
    'X-Naver-Client-Id': clientId,
    'X-Naver-Client-Secret': clientSecret,
  },
})

// ✅ 서버 API Route를 통해 호출
fetch('/api/search?query=...')
```

### 6.2 좌표 변환 오류

❌ **문제**: `mapx`, `mapy` 값이 그대로 사용되어 지도에 표시되지 않음

✅ **해결**: 10000000으로 나누기

```typescript
const lat = parseInt(item.mapy) / 10000000  // 375000 → 37.5000
const lng = parseInt(item.mapx) / 10000000  // 1270000 → 127.0000
```

### 6.3 HTML 태그 포함된 title

❌ **문제**: `title: "<b>스타벅스</b> 강남역점"` 형태로 반환

✅ **해결**: 정규식으로 HTML 제거

```typescript
const name = item.title.replace(/<[^>]*>/g, '')  // "스타벅스 강남역점"
```

### 6.4 API 제한 초과

❌ **문제**: `429 Too Many Requests`

✅ **해결**: 디바운스 적용 + 로컬 캐싱

```typescript
import { useMemo } from 'react'
import { debounce } from 'lodash'

const debouncedSearch = useMemo(
  () =>
    debounce((query: string) => {
      fetch(`/api/search?query=${query}`)
    }, 300),
  []
)
```

---

## 7. 참고 자료

### 7.1 공식 문서
- [네이버 지도 API v3 가이드](https://navermaps.github.io/maps.js.ncp/docs/index.html)
- [네이버 검색 API 가이드](https://api.ncloud-docs.com/docs/ai-naver-searchlocal-search)
- [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com/)

### 7.2 GitHub
- [공식 예제 코드](https://github.com/navermaps/maps.js.ncp)
- [Next.js 예제](https://github.com/vercel/next.js/tree/canary/examples/with-naver-maps)

### 7.3 커뮤니티
- [네이버 지도 API 포럼](https://developers.naver.com/forum/posts)

---

## 8. 체크리스트

구현 전 확인 사항:

```
☑️ 네이버 클라우드 플랫폼 계정 생성 완료
☑️ Application 등록 완료 (Maps + 검색)
☑️ Client ID, Client Secret 발급 완료
☑️ 환경변수 설정 완료 (.env.local)
☑️ 환경변수 타입 정의 완료 (env.d.ts)
☑️ 지도 SDK 스크립트 로드 (layout.tsx)
☑️ 지도 컴포넌트 구현 완료
☑️ 검색 API Route 구현 완료 (/api/search)
☑️ 검색 UI 구현 완료
☑️ 검색 결과 → 마커 변환 완료
☑️ 좌표 변환 로직 구현 (/ 10000000)
☑️ HTML 태그 제거 로직 구현
☑️ 에러 처리 구현 (CORS, Rate Limit)
☑️ 로컬 테스트 완료
```

---

**작성일**: 2025-10-23
**검증 날짜**: 2025-10-23
**LTS 버전**: JavaScript API v3 (지도), Search Local API v1 (검색)
