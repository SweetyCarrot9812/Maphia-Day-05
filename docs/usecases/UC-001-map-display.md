# UC-001: 지도 표시 (Map Display)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-001 |
| **Use Case명** | 지도 표시 |
| **액터** | 사용자 (모든 방문자) |
| **우선순위** | 🔴 Critical |
| **복잡도** | Medium |
| **사전조건** | - 네이버 지도 SDK 로드 완료<br>- 브라우저가 JavaScript 지원 |
| **사후조건** | - 지도가 화면에 표시됨<br>- 사용자가 지도와 상호작용 가능 |
| **관련 문서** | - [tech-stack.md](../tech-stack.md)<br>- [external/naver-maps-search.md](../external/naver-maps-search.md) |

---

## 주요 성공 시나리오 (Main Success Scenario)

### 1. 초기 로딩
```
1. 사용자가 NaviSpot 웹사이트에 접속
2. 시스템이 네이버 지도 SDK 로드 (beforeInteractive)
3. 시스템이 기본 위치(서울 시청)로 지도 초기화
   - 위도: 37.5666103
   - 경도: 126.9783882
   - 줌 레벨: 15
4. 지도가 화면에 렌더링 (로딩 시간 < 3초)
5. 지도 컨트롤 표시 (줌 버튼, 현재 위치 버튼)
```

### 2. 지도 상호작용
```
6. 사용자가 지도를 드래그하여 이동
   → 시스템이 새로운 중심 좌표 계산 및 업데이트
7. 사용자가 핀치 줌 또는 줌 버튼 사용
   → 시스템이 줌 레벨 변경 (7~21 범위)
8. 사용자가 현재 위치 버튼 클릭
   → 시스템이 브라우저 Geolocation API 호출
   → 지도 중심이 사용자 현재 위치로 이동
```

---

## 대체 플로우 (Alternative Flows)

### A1: SDK 로드 실패
```
3a. 네이버 지도 SDK 로드 실패 (네트워크 오류)
    1. 시스템이 에러 메시지 표시: "지도를 불러올 수 없습니다"
    2. 시스템이 5초 후 자동 재시도
    3. 3회 재시도 실패 시 수동 새로고침 버튼 표시
    4. Use Case 종료
```

### A2: 위치 권한 거부
```
8a. 사용자가 위치 권한 거부
    1. 시스템이 토스트 알림: "위치 권한이 필요합니다"
    2. 지도는 기본 위치(서울 시청)에 유지
    3. Use Case 계속 (Main Flow Step 6으로 복귀)
```

### A3: 저사양 기기
```
4a. 지도 렌더링이 3초 초과
    1. 시스템이 로딩 스피너 표시
    2. 지도 타일 로딩 우선순위 최적화 (중심부 먼저)
    3. 로딩 완료 후 Use Case 계속
```

### A4: 오프라인 상태
```
1a. 사용자가 오프라인 상태로 접속
    1. 시스템이 네트워크 상태 감지
    2. 오프라인 알림 배너 표시
    3. 캐시된 지도 타일 표시 (가능한 경우)
    4. 온라인 복귀 시 자동 새로고침
```

---

## 예외 플로우 (Exception Flows)

### E1: API Key 누락
```
2a. 네이버 지도 Client ID 환경변수 누락
    1. 시스템이 개발자 콘솔에 에러 로그: "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID not found"
    2. 사용자에게 "서비스 점검 중입니다" 표시
    3. Use Case 종료
```

### E2: API 호출 제한 초과
```
2b. 네이버 지도 API 일일 호출 제한 초과 (10만 건)
    1. 시스템이 에러 응답 수신 (HTTP 429)
    2. 사용자에게 "일시적으로 사용할 수 없습니다" 표시
    3. 관리자에게 알림 전송
    4. Use Case 종료
```

### E3: 브라우저 비호환
```
1b. 사용자가 구형 브라우저 사용 (IE11 등)
    1. 시스템이 브라우저 버전 체크
    2. 업그레이드 안내 페이지 표시
    3. Use Case 종료
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 초기 위치 기본값
- **규칙**: 사용자 위치 정보 없을 시 서울 시청을 기본 위치로 사용
- **근거**: 대한민국 중심 지역, 네이버 지도 권장 사항

### BR-002: 줌 레벨 제한
- **규칙**: 최소 줌 레벨 7 (전국 뷰), 최대 줌 레벨 21 (건물 상세)
- **근거**: 네이버 지도 SDK 지원 범위, UX 최적화

### BR-003: 로딩 시간 목표
- **규칙**: 초기 지도 렌더링 3초 이내
- **근거**: 웹 성능 표준 (FCP < 1.5s, LCP < 2.5s), 사용자 이탈률 최소화

### BR-004: 위치 권한 처리
- **규칙**: 위치 권한은 선택 사항, 거부 시에도 서비스 이용 가능
- **근거**: 사용자 프라이버시 존중, 필수 아닌 기능

### BR-005: 반응형 지원
- **규칙**: 모바일/태블릿/데스크톱 모든 화면에서 정상 동작
- **근거**: 모바일 우선 전략, 접근성 향상

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **초기 로딩 시간** | < 3초 | Time to Interactive (TTI) |
| **지도 렌더링** | < 1초 | Custom performance mark |
| **상호작용 응답** | < 100ms | Touch delay 측정 |
| **메모리 사용량** | < 150MB | Chrome DevTools Memory |
| **프레임율** | > 30fps | 드래그/줌 시 FPS 측정 |

---

## UI/UX 요구사항

### 지도 컨테이너
```typescript
// 데스크톱: 전체 화면 (헤더 제외)
<div className="h-[calc(100vh-64px)] w-full">
  <div id="map" className="h-full w-full" />
</div>

// 모바일: 검색 결과 하단 시트 고려
<div className="h-[calc(100vh-200px)] w-full">
  <div id="map" className="h-full w-full" />
</div>
```

### 지도 컨트롤 위치
- **줌 컨트롤**: 우측 하단
- **현재 위치 버튼**: 우측 하단 (줌 컨트롤 위)
- **지도 타입 전환**: 우측 상단 (선택 사항)

### 로딩 상태 UI
```typescript
{isLoading && (
  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
    <div className="space-y-4 text-center">
      <Spinner className="mx-auto" />
      <p className="text-muted-foreground">지도를 불러오는 중...</p>
    </div>
  </div>
)}
```

---

## 기술적 제약사항 (Technical Constraints)

### SDK 로딩 전략
```typescript
// app/layout.tsx
import Script from 'next/script'

<Script
  src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
  strategy="beforeInteractive" // 필수: 페이지 interactive 전 로드
  onLoad={() => console.log('Naver Maps SDK loaded')}
  onError={() => console.error('Failed to load Naver Maps SDK')}
/>
```

### 타입 안전성
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
    getCenter(): LatLng
    getZoom(): number
  }

  interface MapOptions {
    center: LatLng
    zoom: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    mapTypeControl?: boolean
  }
}
```

### 상태 관리
```typescript
// stores/mapStore.ts
interface MapState {
  map: naver.maps.Map | null
  center: { lat: number; lng: number }
  zoom: number
  isLoading: boolean

  setMap: (map: naver.maps.Map) => void
  setCenter: (lat: number, lng: number) => void
  setZoom: (zoom: number) => void
}
```

---

## 테스트 시나리오 (Test Scenarios)

### T1: 정상 로딩 테스트
```gherkin
Given 사용자가 네이버 지도 SDK를 지원하는 브라우저로 접속
When 홈페이지가 로드될 때
Then 3초 이내에 지도가 표시되어야 함
And 서울 시청 중심으로 줌 레벨 15로 표시되어야 함
And 줌 컨트롤이 우측 하단에 표시되어야 함
```

### T2: 지도 상호작용 테스트
```gherkin
Given 지도가 정상 로드된 상태
When 사용자가 지도를 드래그할 때
Then 지도 중심 좌표가 변경되어야 함
And 100ms 이내에 화면이 업데이트되어야 함
```

### T3: 줌 동작 테스트
```gherkin
Given 지도가 정상 로드된 상태
When 사용자가 줌인 버튼을 클릭할 때
Then 줌 레벨이 1 증가해야 함
And 최대 줌 레벨 21에서 멈춰야 함
```

### T4: 현재 위치 테스트
```gherkin
Given 사용자가 위치 권한을 허용한 상태
When 현재 위치 버튼을 클릭할 때
Then 지도가 사용자 현재 위치로 이동해야 함
And 줌 레벨이 16으로 설정되어야 함
```

### T5: 에러 처리 테스트
```gherkin
Given 네트워크가 불안정한 상태
When 지도 SDK 로드에 실패할 때
Then "지도를 불러올 수 없습니다" 메시지가 표시되어야 함
And 5초 후 자동 재시도가 실행되어야 함
```

---

## 접근성 요구사항 (Accessibility)

### ARIA 레이블
```html
<div
  id="map"
  role="application"
  aria-label="네이버 지도"
  aria-describedby="map-instructions"
/>
<div id="map-instructions" className="sr-only">
  화살표 키로 지도를 이동하고, + - 키로 줌을 조절할 수 있습니다.
</div>
```

### 키보드 내비게이션
- **화살표 키**: 지도 이동 (Pan)
- **+ / =**: 줌인
- **- / _**: 줌아웃
- **Home**: 초기 위치(서울 시청)로 리셋
- **Space**: 현재 위치로 이동

### 색상 대비
- 지도 컨트롤 버튼: WCAG AA 기준 (4.5:1)
- 로딩 메시지: 명확한 시각적 피드백

---

## 모니터링 및 로깅 (Monitoring & Logging)

### 성능 메트릭
```typescript
// 지도 로딩 시간 추적
performance.mark('map-load-start')
// ... 지도 초기화
performance.mark('map-load-end')
performance.measure('map-load-time', 'map-load-start', 'map-load-end')

// Vercel Analytics로 전송
if (typeof window !== 'undefined' && window.va) {
  window.va.track('map-load', {
    duration: measure.duration,
    zoom: initialZoom,
  })
}
```

### 에러 로깅
```typescript
// Sentry 또는 콘솔 로깅
try {
  const map = new naver.maps.Map('map', mapOptions)
} catch (error) {
  console.error('[Map Init Error]', error)
  // 에러 리포팅 서비스로 전송
}
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- 없음 (최초 진입점)

### 후속 Use Case
- **UC-002**: 장소 검색 (지도 위에서 검색)
- **UC-003**: 마커 표시 (검색 결과를 지도에 표시)

### 외부 의존성
- **네이버 지도 SDK**: JavaScript API v3
- **환경변수**: `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
- **브라우저 API**: Geolocation API (선택 사항)

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
