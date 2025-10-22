# NaviSpot - 네이버 지도 기반 장소 검색 및 리뷰 앱

## 프로젝트 개요

**프로젝트명**: NaviSpot
**목적**: 네이버 지도 SDK를 활용한 장소 검색 및 사용자 리뷰 공유 플랫폼
**핵심 가치**: 실시간 지도 탐색, 정확한 장소 검색, 커뮤니티 기반 리뷰

---

## 핵심 기능 (Core Features)

### 1. 지도 표시 (Map Display)
- **요구사항**: 네이버 지도 SDK를 사용하여 대한민국 전역 지도 표시
- **기능**:
  - 초기 위치: 서울 시청 (위도 37.5666103, 경도 126.9783882)
  - 줌 레벨: 기본 15 (거리 단위로 조정 가능)
  - 지도 타입: 일반 지도 (위성 지도 옵션 제공)
  - 컨트롤: 줌 인/아웃, 현재 위치 이동
- **성공 기준**:
  - 지도가 3초 이내 로딩
  - 드래그, 핀치 줌 등 터치 제스처 정상 동작
  - 모바일/데스크톱 반응형 지원

### 2. 지도 마커 표시 (Map Markers)
- **요구사항**: 검색된 장소를 지도 상에 마커로 표시
- **기능**:
  - 마커 아이콘: 커스텀 디자인 (장소 카테고리별 색상)
  - 마커 클릭: 장소 상세 정보 팝업 표시
  - 마커 클러스터링: 줌 아웃 시 가까운 마커 그룹화
- **성공 기준**:
  - 마커 최대 50개까지 동시 표시
  - 마커 클릭 시 0.5초 이내 팝업 표시
  - 클러스터 숫자 정확하게 표시

### 3. 장소 검색 (Place Search)
- **요구사항**: 네이버 장소 검색 API를 사용한 키워드 기반 검색
- **기능**:
  - 검색 입력: 실시간 자동완성
  - 검색 결과: 장소명, 주소, 카테고리, 거리
  - 결과 필터: 카테고리별 (음식점, 카페, 병원 등)
  - 정렬: 거리순, 리뷰순, 평점순
- **API 연동**:
  - 엔드포인트: `/v1/search/local.json`
  - 파라미터: `query`, `display=10`, `start=1`, `sort=random`
  - 응답: 장소명, 주소, 카테고리, 좌표 (mapx, mapy)
- **성공 기준**:
  - 검색 응답 시간 < 2초
  - 검색 결과 최대 100개 (페이지네이션)
  - 자동완성 지연 시간 < 300ms

### 4. 리뷰 시스템 (Review System)
- **요구사항**: 사용자가 장소에 대한 리뷰를 작성하고 조회할 수 있는 기능
- **기능**:
  - 리뷰 작성: 별점 (1-5), 텍스트 (최대 500자), 작성자 닉네임
  - 리뷰 조회: 장소별 리뷰 목록 (최신순, 평점순)
  - 리뷰 수정/삭제: 본인 작성 리뷰만 가능
  - 리뷰 통계: 평균 평점, 총 리뷰 수
- **데이터 저장**: Supabase PostgreSQL
- **성공 기준**:
  - 리뷰 제출 후 1초 이내 반영
  - 리뷰 목록 로딩 < 1초
  - 욕설/부적절한 내용 필터링

---

## 기술 요구사항 (Technical Requirements)

### Frontend
- **프레임워크**: Next.js 15.x (App Router)
- **언어**: TypeScript 5.x
- **스타일링**: Tailwind CSS 4.0
- **상태 관리**: Zustand
- **지도 SDK**: Naver Maps JavaScript API v3
- **UI 컴포넌트**: shadcn/ui

### Backend
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (이메일/비밀번호)
- **API**: Next.js API Routes
- **외부 API**: 네이버 장소 검색 API

### 외부 서비스 연동
1. **네이버 지도 SDK**
   - JavaScript API v3
   - Client ID 필요
   - 무료 (일 10만 건 제한)

2. **네이버 장소 검색 API**
   - REST API
   - Client ID + Client Secret 필요
   - 무료 (일 25,000건 제한)

### 환경 변수
```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id
NAVER_SEARCH_CLIENT_ID=your_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_search_client_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 데이터 모델 (Data Models)

### User
```typescript
{
  id: UUID (PK)
  email: string
  nickname: string
  created_at: timestamp
}
```

### Review
```typescript
{
  id: UUID (PK)
  place_id: string (네이버 장소 ID)
  place_name: string
  user_id: UUID (FK → users.id)
  rating: number (1-5)
  content: string (max 500)
  created_at: timestamp
  updated_at: timestamp
}
```

### Place (검색 결과 캐시용, 선택)
```typescript
{
  id: string (PK, 네이버 장소 ID)
  name: string
  address: string
  category: string
  lat: number
  lng: number
  cached_at: timestamp
}
```

---

## 사용자 플로우 (User Flow)

### 1. 메인 화면 진입
1. 사용자가 앱 접속
2. 지도가 서울 시청 중심으로 표시
3. 상단에 검색창 노출

### 2. 장소 검색
1. 사용자가 검색창에 키워드 입력 (예: "강남역 카페")
2. 자동완성 제안 표시
3. 검색 버튼 클릭 또는 Enter
4. 네이버 장소 검색 API 호출
5. 검색 결과 목록 표시 (왼쪽 사이드바)
6. 지도에 마커 표시

### 3. 장소 상세 조회
1. 사용자가 마커 또는 검색 결과 항목 클릭
2. 장소 상세 정보 팝업 표시
   - 장소명, 주소, 카테고리
   - 평균 평점, 리뷰 수
   - 리뷰 목록 (최신 3개)
3. "리뷰 전체 보기" 버튼

### 4. 리뷰 작성
1. 사용자가 "리뷰 작성" 버튼 클릭
2. 로그인 여부 확인 (미로그인 시 로그인 유도)
3. 리뷰 작성 폼 표시
   - 별점 선택 (1-5)
   - 리뷰 내용 입력 (textarea)
4. "제출" 버튼 클릭
5. Supabase에 리뷰 저장
6. 리뷰 목록에 즉시 반영

### 5. 리뷰 수정/삭제
1. 사용자가 본인 리뷰에서 "수정" 또는 "삭제" 클릭
2. 수정: 리뷰 작성 폼 재표시 (기존 내용 채워짐)
3. 삭제: 확인 다이얼로그 → Supabase에서 삭제

---

## 화면 구성 (UI/UX)

### 레이아웃
```
┌──────────────────────────────────────────┐
│  Header (로고, 검색창, 로그인/프로필)      │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────┬──────────────────────┐  │
│  │            │                      │  │
│  │  검색 결과  │      네이버 지도       │  │
│  │  리스트     │      (마커 표시)      │  │
│  │  (스크롤)   │                      │  │
│  │            │                      │  │
│  └────────────┴──────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### 반응형 (모바일)
```
┌────────────────────────┐
│  Header (검색창)        │
├────────────────────────┤
│                        │
│    네이버 지도 (전체)    │
│    (마커 표시)          │
│                        │
├────────────────────────┤
│  검색 결과 (하단 시트)   │
└────────────────────────┘
```

---

## 성능 목표 (Performance Goals)

- **초기 로딩**: < 3초 (Lighthouse Performance > 80)
- **검색 응답**: < 2초
- **지도 렌더링**: < 1초
- **리뷰 제출**: < 1초
- **모바일 최적화**: Touch delay < 100ms

---

## 보안 요구사항 (Security)

1. **환경변수 보호**: Client Secret은 서버 사이드에서만 사용
2. **RLS (Row Level Security)**: Supabase에서 사용자별 리뷰 수정/삭제 권한 제어
3. **XSS 방지**: 리뷰 내용 sanitize (DOMPurify)
4. **Rate Limiting**: 네이버 API 호출 제한 준수
5. **HTTPS**: 모든 통신 암호화

---

## 배포 요구사항 (Deployment)

- **플랫폼**: Vercel
- **도메인**: vercel.app 기본 도메인 사용
- **환경 변수**: Vercel 환경 변수에 설정
- **CI/CD**: Git push 시 자동 배포
- **모니터링**: Vercel Analytics

---

## 통과 조건 (Acceptance Criteria)

### ✅ 필수 기능
1. 지도가 정상적으로 표시되며, 드래그/줌 동작 정상
2. 검색어 입력 시 네이버 장소 검색 API 호출 성공
3. 검색 결과가 지도에 마커로 표시
4. 마커 클릭 시 장소 상세 정보 팝업 표시
5. 로그인한 사용자가 리뷰 작성 가능
6. 리뷰 목록이 장소별로 조회 가능
7. 본인 리뷰 수정/삭제 가능

### ✅ 품질 기준
- TypeScript 타입 에러 0개
- ESLint 에러 0개
- 빌드 성공 (`npm run build`)
- 모든 API 연동 오류 없음
- 모바일/데스크톱 반응형 정상 작동

---

## 제약사항 (Constraints)

1. **API 제한**:
   - 네이버 지도 SDK: 일 10만 건
   - 네이버 장소 검색 API: 일 25,000건
   - 제한 초과 시 에러 처리 필요

2. **브라우저 지원**:
   - Chrome 최신 버전
   - Safari 최신 버전
   - 모바일 Safari/Chrome

3. **데이터 제한**:
   - 리뷰 내용: 최대 500자
   - 닉네임: 최대 20자
   - 검색 결과: 페이지당 10개

---

## 향후 확장 계획 (Future Enhancements)

- 리뷰 이미지 업로드 (Supabase Storage)
- 리뷰 좋아요/신고 기능
- 사용자 프로필 페이지
- 즐겨찾기 장소 저장
- 실시간 위치 기반 장소 추천
- 소셜 로그인 (Google, Kakao)

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 01
