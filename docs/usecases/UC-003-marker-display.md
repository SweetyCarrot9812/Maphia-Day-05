# UC-003: 마커 표시 (Marker Display)

## 메타데이터

| 속성 | 값 |
|------|-----|
| **Use Case ID** | UC-003 |
| **Use Case명** | 지도 마커 표시 |
| **액터** | 시스템 (자동 트리거) |
| **우선순위** | 🔴 Critical |
| **복잡도** | Medium |
| **사전조건** | - 지도가 표시됨 (UC-001)<br>- 검색 결과 존재 (UC-002) |
| **사후조건** | - 검색 결과가 지도에 마커로 표시됨<br>- 마커 클릭 시 장소 상세 팝업 표시 |
| **관련 문서** | - [external/naver-maps-search.md](../external/naver-maps-search.md) |

---

## 주요 성공 시나리오 (Main Success Scenario)

### 1. 마커 생성
```
1. 시스템이 검색 결과 수신 (UC-002 완료)
2. 시스템이 기존 마커 모두 제거
3. 각 검색 결과에 대해 마커 생성
   - 위치: place.lat, place.lng
   - 아이콘: 카테고리별 색상 (카페: 갈색, 음식점: 빨강, 병원: 파랑)
   - 제목: place.name
4. 마커를 지도에 표시
5. 지도 범위를 모든 마커가 보이도록 조정 (fitBounds)
```

### 2. 마커 클러스터링 (줌 아웃 시)
```
6. 사용자가 지도를 줌 아웃할 때
7. 시스템이 가까운 마커 그룹 감지 (100m 이내)
8. 그룹을 클러스터 마커로 대체
   - 아이콘: 숫자가 표시된 원형
   - 숫자: 포함된 마커 수
9. 사용자가 클러스터 클릭 시 해당 영역으로 줌인
```

### 3. 마커 상호작용
```
10. 사용자가 개별 마커 클릭
11. 시스템이 마커 애니메이션 실행 (bounce)
12. 시스템이 장소 상세 팝업 표시
    - 장소명, 주소, 카테고리
    - 평균 평점, 리뷰 수
    - "상세 보기" 버튼
13. 지도 중심을 클릭한 마커로 이동
```

---

## 대체 플로우 (Alternative Flows)

### A1: 마커 호버 (데스크톱)
```
10a. 사용자가 마커에 마우스 오버
     1. 시스템이 간단한 툴팁 표시
        - 장소명
        - 평점 (별 아이콘 + 숫자)
     2. 마커 크기 1.2배 확대 애니메이션
     3. Use Case 계속
```

### A2: 검색 결과 항목 클릭
```
1a. 사용자가 검색 결과 목록에서 항목 클릭
    1. 시스템이 해당 장소의 마커 찾기
    2. 지도 중심을 해당 마커로 이동 (줌 레벨 17)
    3. 마커 bounce 애니메이션 실행
    4. Main Flow Step 12로 이동 (팝업 표시)
```

### A3: 단일 결과
```
1b. 검색 결과가 1개만 있을 때
    1. 클러스터링 비활성화
    2. 마커를 지도 중심에 표시
    3. 줌 레벨을 16으로 설정 (상세 뷰)
    4. Use Case 계속
```

### A4: 많은 결과 (50개 초과)
```
3a. 검색 결과가 50개 초과
    1. 시스템이 현재 지도 영역 내 마커만 표시
    2. 지도 이동 시 해당 영역 마커 업데이트
    3. "현재 영역에 X개 장소" 배지 표시
    4. Use Case 계속
```

---

## 예외 플로우 (Exception Flows)

### E1: 좌표 오류
```
3a. 특정 장소의 좌표가 유효하지 않음 (0, 0 또는 null)
    1. 시스템이 해당 장소의 마커 생성 스킵
    2. 개발자 콘솔에 경고 로그
    3. 나머지 마커는 정상 표시
    4. Use Case 계속
```

### E2: 마커 생성 실패
```
3b. 네이버 지도 API 마커 생성 오류
    1. 시스템이 에러 감지 (JavaScript exception)
    2. 토스트 알림: "지도 표시 중 오류"
    3. 재시도 버튼 제공
    4. Use Case 종료
```

### E3: 메모리 부족
```
3c. 마커 수가 너무 많아 브라우저 메모리 부족
    1. 시스템이 성능 저하 감지 (프레임율 < 20fps)
    2. 자동으로 클러스터링 활성화
    3. 마커 아이콘 단순화 (텍스트 제거)
    4. Use Case 계속
```

---

## 비즈니스 규칙 (Business Rules)

### BR-001: 최대 마커 수
- **규칙**: 한 번에 최대 50개 마커 표시
- **근거**: 성능 최적화, 사용자 경험

### BR-002: 클러스터링 기준
- **규칙**: 줌 레벨 < 15일 때 100m 이내 마커 클러스터링
- **근거**: 시각적 혼잡도 감소, 성능 향상

### BR-003: 마커 아이콘 크기
- **규칙**: 기본 32x40px, 선택 시 38x48px
- **근거**: 터치 타겟 크기 최소 44px (Apple HIG), 시각적 명확성

### BR-004: fitBounds 여백
- **규칙**: 모든 마커가 보이도록 조정 시 50px 여백
- **근거**: UI 요소(검색창, 컨트롤)와 겹치지 않도록

### BR-005: 마커 z-index
- **규칙**: 선택된 마커 z-index 100, 클러스터 50, 일반 마커 10
- **근거**: 선택된 마커가 다른 마커 위에 표시

---

## 성능 요구사항 (Performance Requirements)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **마커 생성 시간** | < 500ms | 50개 마커 기준 |
| **클러스터링 시간** | < 200ms | Debounce 후 계산 |
| **마커 클릭 응답** | < 100ms | 팝업 표시까지 |
| **fitBounds 시간** | < 300ms | 애니메이션 포함 |
| **메모리 사용량** | < 50MB | 50개 마커 기준 |

---

## UI/UX 요구사항

### 마커 아이콘 (카테고리별)
```typescript
// lib/marker-icons.ts
const MARKER_ICONS = {
  cafe: {
    url: '/markers/cafe.svg',
    size: new naver.maps.Size(32, 40),
    anchor: new naver.maps.Point(16, 40),
    scaledSize: new naver.maps.Size(32, 40),
  },
  restaurant: {
    url: '/markers/restaurant.svg',
    size: new naver.maps.Size(32, 40),
    anchor: new naver.maps.Point(16, 40),
    scaledSize: new naver.maps.Size(32, 40),
  },
  hospital: {
    url: '/markers/hospital.svg',
    size: new naver.maps.Size(32, 40),
    anchor: new naver.maps.Point(16, 40),
    scaledSize: new naver.maps.Size(32, 40),
  },
  default: {
    url: '/markers/default.svg',
    size: new naver.maps.Size(32, 40),
    anchor: new naver.maps.Point(16, 40),
    scaledSize: new naver.maps.Size(32, 40),
  },
}

function getMarkerIcon(category: string) {
  if (category.includes('카페')) return MARKER_ICONS.cafe
  if (category.includes('음식점')) return MARKER_ICONS.restaurant
  if (category.includes('병원')) return MARKER_ICONS.hospital
  return MARKER_ICONS.default
}
```

### 마커 생성 컴포넌트
```typescript
// components/map/Marker.tsx
import { useEffect, useRef } from 'react'
import { Place } from '@/types/place'

interface MarkerProps {
  map: naver.maps.Map
  place: Place
  onClick: (place: Place) => void
}

export function Marker({ map, place, onClick }: MarkerProps) {
  const markerRef = useRef<naver.maps.Marker | null>(null)

  useEffect(() => {
    if (!map || !window.naver) return

    // 마커 생성
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(place.lat, place.lng),
      map,
      title: place.name,
      icon: getMarkerIcon(place.category),
      zIndex: 10,
    })

    // 클릭 이벤트
    naver.maps.Event.addListener(marker, 'click', () => {
      // 애니메이션
      marker.setAnimation(naver.maps.Animation.BOUNCE)
      setTimeout(() => marker.setAnimation(null), 500)

      // z-index 상승
      marker.setZIndex(100)

      // 콜백
      onClick(place)
    })

    // 호버 이벤트 (데스크톱)
    naver.maps.Event.addListener(marker, 'mouseover', () => {
      marker.setIcon({
        ...getMarkerIcon(place.category),
        scaledSize: new naver.maps.Size(38, 48), // 1.2배 확대
      })
    })

    naver.maps.Event.addListener(marker, 'mouseout', () => {
      marker.setIcon(getMarkerIcon(place.category))
    })

    markerRef.current = marker

    return () => {
      marker.setMap(null) // 마커 제거
    }
  }, [map, place, onClick])

  return null // 렌더링 없음 (지도에 직접 추가)
}
```

### 마커 클러스터링 (선택 사항)
```typescript
// hooks/useMarkerClustering.ts
import { useEffect, useState } from 'react'
import { Place } from '@/types/place'

export function useMarkerClustering(
  map: naver.maps.Map | null,
  places: Place[]
) {
  const [clusters, setClusters] = useState<Cluster[]>([])

  useEffect(() => {
    if (!map || places.length === 0) return

    const zoom = map.getZoom()

    // 줌 레벨 15 이상이면 클러스터링 비활성화
    if (zoom >= 15) {
      setClusters([])
      return
    }

    // 간단한 거리 기반 클러스터링
    const threshold = 100 // 100m
    const newClusters: Cluster[] = []
    const used = new Set<string>()

    places.forEach((place) => {
      if (used.has(place.id)) return

      const cluster: Cluster = {
        center: { lat: place.lat, lng: place.lng },
        places: [place],
      }

      places.forEach((other) => {
        if (used.has(other.id) || place.id === other.id) return

        const distance = getDistance(
          place.lat,
          place.lng,
          other.lat,
          other.lng
        )

        if (distance < threshold) {
          cluster.places.push(other)
          used.add(other.id)
        }
      })

      used.add(place.id)
      newClusters.push(cluster)
    })

    setClusters(newClusters.filter((c) => c.places.length > 1))
  }, [map, places])

  return clusters
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  // Haversine formula (간단한 거리 계산)
  const R = 6371e3 // 지구 반지름 (m)
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // 미터 단위
}
```

### 장소 상세 팝업 (InfoWindow)
```typescript
// components/map/PlacePopup.tsx
import { Place } from '@/types/place'
import { Star, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlacePopupProps {
  place: Place
  onViewDetails: () => void
  onClose: () => void
}

export function PlacePopup({ place, onViewDetails, onClose }: PlacePopupProps) {
  return (
    <div className="w-80 p-4 bg-background rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{place.name}</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{place.roadAddress}</span>
        </div>

        {place.telephone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <a
              href={`tel:${place.telephone}`}
              className="hover:text-foreground"
            >
              {place.telephone}
            </a>
          </div>
        )}

        {place.reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{place.avgRating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({place.reviewCount}개 리뷰)
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={onViewDetails}
        className="w-full mt-4"
      >
        상세 보기
      </Button>
    </div>
  )
}
```

### fitBounds 구현
```typescript
// hooks/useMapBounds.ts
import { useEffect } from 'react'
import { Place } from '@/types/place'

export function useMapBounds(map: naver.maps.Map | null, places: Place[]) {
  useEffect(() => {
    if (!map || !window.naver || places.length === 0) return

    const bounds = new naver.maps.LatLngBounds()

    places.forEach((place) => {
      bounds.extend(new naver.maps.LatLng(place.lat, place.lng))
    })

    // 50px 여백 적용
    map.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    })
  }, [map, places])
}
```

---

## 상태 관리 (State Management)

### Zustand Store 확장
```typescript
// stores/mapStore.ts
interface MapState {
  map: naver.maps.Map | null
  markers: naver.maps.Marker[]
  selectedMarker: naver.maps.Marker | null
  infoWindow: naver.maps.InfoWindow | null

  setMap: (map: naver.maps.Map) => void
  addMarkers: (markers: naver.maps.Marker[]) => void
  clearMarkers: () => void
  setSelectedMarker: (marker: naver.maps.Marker | null) => void
  showInfoWindow: (marker: naver.maps.Marker, content: string) => void
  closeInfoWindow: () => void
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  markers: [],
  selectedMarker: null,
  infoWindow: null,

  setMap: (map) => set({ map }),

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
}))
```

---

## 테스트 시나리오 (Test Scenarios)

### T1: 마커 생성 테스트
```gherkin
Given 검색 결과 10개가 반환됨
When 지도에 마커가 표시될 때
Then 10개의 마커가 생성되어야 함
And 각 마커가 올바른 위치에 표시되어야 함
And 카테고리별로 다른 아이콘이 적용되어야 함
```

### T2: fitBounds 테스트
```gherkin
Given 검색 결과가 여러 위치에 분산됨
When 마커가 표시될 때
Then 지도가 모든 마커를 포함하도록 조정되어야 함
And 50px 여백이 적용되어야 함
```

### T3: 마커 클릭 테스트
```gherkin
Given 마커가 지도에 표시된 상태
When 사용자가 마커를 클릭할 때
Then 마커가 bounce 애니메이션을 실행해야 함
And 장소 상세 팝업이 표시되어야 함
And 지도 중심이 해당 마커로 이동해야 함
```

### T4: 클러스터링 테스트
```gherkin
Given 가까운 위치에 5개 마커가 있음
When 지도를 줌 아웃 (레벨 < 15)할 때
Then 5개 마커가 클러스터로 합쳐져야 함
And 클러스터 아이콘에 "5"가 표시되어야 함
When 클러스터를 클릭할 때
Then 해당 영역으로 줌인되어야 함
```

### T5: 마커 제거 테스트
```gherkin
Given 마커 10개가 표시된 상태
When 새로운 검색을 실행할 때
Then 기존 마커가 모두 제거되어야 함
And 새로운 검색 결과 마커가 표시되어야 함
```

---

## 접근성 요구사항 (Accessibility)

### 마커 키보드 내비게이션
```typescript
// 마커에 tabindex 추가 (커스텀 마커 HTML 사용 시)
<button
  className="marker-button"
  tabIndex={0}
  aria-label={`${place.name}, ${place.category}`}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  {/* 마커 아이콘 */}
</button>
```

### 스크린 리더 지원
```typescript
// 마커 생성 시 알림
<div role="status" aria-live="polite" className="sr-only">
  {markers.length}개의 장소가 지도에 표시되었습니다
</div>
```

---

## 의존성 (Dependencies)

### 선행 Use Case
- **UC-001**: 지도 표시 (마커를 표시할 지도 필요)
- **UC-002**: 장소 검색 (마커로 표시할 장소 데이터 필요)

### 후속 Use Case
- **UC-004**: 장소 상세 조회 (마커 클릭 시 트리거)

### 외부 의존성
- **네이버 지도 SDK**: Marker, InfoWindow API
- **마커 아이콘**: SVG 파일 (`/public/markers/*.svg`)

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 05 (Use Case Generator)
