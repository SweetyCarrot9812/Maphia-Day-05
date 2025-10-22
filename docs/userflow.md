# NaviSpot - User Flow

## 전체 플로우 개요

NaviSpot은 지도 탐색, 장소 검색, 리뷰 작성 3가지 주요 플로우로 구성됩니다.

---

## 1. 메인 화면 진입 플로우

```mermaid
flowchart TD
    Start([사용자 앱 접속]) --> LoadMap[네이버 지도 SDK 로드]
    LoadMap --> CheckAuth{로그인<br/>여부}
    CheckAuth -->|로그인| ShowMapWithUser[지도 표시<br/>+ 사용자 정보]
    CheckAuth -->|미로그인| ShowMapGuest[지도 표시<br/>+ 게스트 모드]

    ShowMapWithUser --> SetInitialView[서울 시청 중심<br/>줌 레벨 15]
    ShowMapGuest --> SetInitialView

    SetInitialView --> ShowSearchBar[검색창 표시]
    ShowSearchBar --> WaitInput([대기 상태])

    style Start fill:#e1f5ff
    style WaitInput fill:#fff4e1
```

**주요 상태**:
- 초기 로딩: 지도 SDK 로드 (< 3초)
- 인증 확인: Supabase Auth 세션 체크
- 지도 초기화: 서울 시청 (37.5666103, 126.9783882)

---

## 2. 장소 검색 플로우

```mermaid
flowchart TD
    Input([검색어 입력]) --> Debounce{입력 후<br/>300ms 대기}
    Debounce -->|타이핑 중| Input
    Debounce -->|입력 완료| Autocomplete[자동완성 API 호출]

    Autocomplete --> ShowSuggestions[제안 목록 표시]
    ShowSuggestions --> UserSelect{사용자<br/>선택}

    UserSelect -->|제안 클릭| SearchAPI[네이버 검색 API 호출]
    UserSelect -->|Enter| SearchAPI
    UserSelect -->|계속 입력| Input

    SearchAPI --> ParseResults[검색 결과 파싱<br/>장소명, 주소, 좌표]
    ParseResults --> UpdateUI{결과 존재?}

    UpdateUI -->|있음| ShowResults[검색 결과 리스트 표시]
    UpdateUI -->|없음| ShowEmpty[결과 없음 메시지]

    ShowResults --> AddMarkers[지도에 마커 추가]
    AddMarkers --> FitBounds[마커들이 모두 보이도록<br/>지도 범위 조정]
    FitBounds --> WaitInteraction([대기 상태])

    ShowEmpty --> WaitInteraction

    style Input fill:#e1f5ff
    style SearchAPI fill:#ffe1e1
    style WaitInteraction fill:#fff4e1
```

**API 연동**:
- 엔드포인트: `GET /v1/search/local.json`
- 헤더: `X-Naver-Client-Id`, `X-Naver-Client-Secret`
- 파라미터:
  - `query`: 검색어
  - `display`: 10 (페이지당 개수)
  - `start`: 1 (시작 위치)
  - `sort`: random (정렬 방식)

**응답 예시**:
```json
{
  "items": [
    {
      "title": "스타벅스 강남역점",
      "address": "서울특별시 강남구 역삼동 123-45",
      "category": "음식점>카페,디저트",
      "mapx": "1270000",
      "mapy": "375000"
    }
  ]
}
```

---

## 3. 장소 상세 조회 플로우

```mermaid
flowchart TD
    MarkerClick([마커 또는<br/>리스트 항목 클릭]) --> ShowPopup[장소 상세 팝업 표시]
    ShowPopup --> LoadPlaceInfo[장소 기본 정보 표시<br/>이름, 주소, 카테고리]

    LoadPlaceInfo --> LoadReviews[Supabase에서<br/>리뷰 조회]
    LoadReviews --> CalcRating[평균 평점 계산<br/>총 리뷰 수 집계]

    CalcRating --> ShowStats[리뷰 통계 표시<br/>⭐ 4.5 (리뷰 12개)]
    ShowStats --> ShowRecentReviews[최신 리뷰 3개 표시]

    ShowRecentReviews --> UserAction{사용자<br/>액션}

    UserAction -->|리뷰 전체 보기| ShowAllReviews[리뷰 전체 목록 모달]
    UserAction -->|리뷰 작성| CheckAuth{로그인<br/>여부}
    UserAction -->|닫기| ClosePopup([팝업 닫기])

    CheckAuth -->|로그인| WriteReviewForm[리뷰 작성 폼]
    CheckAuth -->|미로그인| LoginPrompt[로그인 유도 다이얼로그]

    LoginPrompt --> UserDecision{사용자<br/>선택}
    UserDecision -->|로그인| LoginFlow[로그인 플로우]
    UserDecision -->|취소| ClosePopup

    style MarkerClick fill:#e1f5ff
    style LoadReviews fill:#ffe1e1
    style ClosePopup fill:#fff4e1
```

**데이터 흐름**:
1. 클라이언트 → Supabase: `SELECT * FROM reviews WHERE place_id = ?`
2. Supabase → 클라이언트: 리뷰 배열 반환
3. 클라이언트: 평균 평점 계산, 최신 3개 필터링

---

## 4. 리뷰 작성 플로우

```mermaid
flowchart TD
    WriteBtn([리뷰 작성 버튼 클릭]) --> ShowForm[리뷰 작성 폼 표시]
    ShowForm --> RatingInput[별점 선택<br/>1-5 Stars]
    RatingInput --> ContentInput[리뷰 내용 입력<br/>최대 500자]

    ContentInput --> Validate{유효성<br/>검사}

    Validate -->|별점 없음| ShowError1[에러: 별점 선택 필요]
    Validate -->|내용 없음| ShowError2[에러: 내용 입력 필요]
    Validate -->|500자 초과| ShowError3[에러: 500자 이하로 작성]

    ShowError1 --> RatingInput
    ShowError2 --> ContentInput
    ShowError3 --> ContentInput

    Validate -->|통과| Sanitize[XSS 방지<br/>내용 Sanitize]
    Sanitize --> SaveDB[Supabase에<br/>리뷰 저장]

    SaveDB --> CheckResult{저장<br/>성공?}

    CheckResult -->|성공| UpdateUI[리뷰 목록에 추가<br/>평균 평점 갱신]
    CheckResult -->|실패| ShowErrorDB[에러: 저장 실패<br/>재시도 유도]

    UpdateUI --> ShowSuccess[성공 토스트<br/>리뷰 작성 완료]
    ShowSuccess --> CloseForm([폼 닫기])

    ShowErrorDB --> Retry{재시도?}
    Retry -->|예| SaveDB
    Retry -->|아니오| CloseForm

    style WriteBtn fill:#e1f5ff
    style SaveDB fill:#ffe1e1
    style CloseForm fill:#fff4e1
```

**데이터 구조**:
```typescript
interface ReviewInput {
  place_id: string         // 네이버 장소 ID
  place_name: string       // 장소명 (검색 결과에서)
  user_id: UUID            // Supabase Auth UID
  rating: number           // 1-5
  content: string          // 최대 500자
}
```

**Supabase 삽입 쿼리**:
```sql
INSERT INTO reviews (place_id, place_name, user_id, rating, content)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
```

---

## 5. 리뷰 수정/삭제 플로우

```mermaid
flowchart TD
    ReviewItem([본인 리뷰<br/>항목 표시]) --> ShowActions[수정/삭제 버튼 표시]
    ShowActions --> UserAction{사용자<br/>선택}

    UserAction -->|수정| LoadForm[리뷰 작성 폼 로드<br/>기존 내용 채움]
    UserAction -->|삭제| ShowConfirm[확인 다이얼로그<br/>정말 삭제하시겠습니까?]

    LoadForm --> EditContent[별점/내용 수정]
    EditContent --> Validate{유효성<br/>검사}

    Validate -->|통과| UpdateDB[Supabase에<br/>리뷰 업데이트]
    Validate -->|실패| ShowError[에러 메시지]
    ShowError --> EditContent

    UpdateDB --> UpdateUI1[리뷰 목록 갱신<br/>평균 평점 재계산]
    UpdateUI1 --> ShowSuccessUpdate[성공 토스트<br/>수정 완료]

    ShowConfirm --> UserConfirm{확인?}
    UserConfirm -->|예| DeleteDB[Supabase에서<br/>리뷰 삭제]
    UserConfirm -->|아니오| Cancel([취소])

    DeleteDB --> UpdateUI2[리뷰 목록에서 제거<br/>평균 평점 재계산]
    UpdateUI2 --> ShowSuccessDelete[성공 토스트<br/>삭제 완료]

    ShowSuccessUpdate --> End([완료])
    ShowSuccessDelete --> End
    Cancel --> End

    style ReviewItem fill:#e1f5ff
    style UpdateDB fill:#ffe1e1
    style DeleteDB fill:#ffe1e1
    style End fill:#fff4e1
```

**RLS (Row Level Security) 정책**:
```sql
-- 수정: 본인 리뷰만 가능
CREATE POLICY update_own_review ON reviews
FOR UPDATE USING (auth.uid() = user_id);

-- 삭제: 본인 리뷰만 가능
CREATE POLICY delete_own_review ON reviews
FOR DELETE USING (auth.uid() = user_id);
```

---

## 6. 인증 플로우

```mermaid
flowchart TD
    LoginBtn([로그인 버튼 클릭]) --> ShowLoginForm[로그인 폼 표시]
    ShowLoginForm --> InputCreds[이메일/비밀번호 입력]

    InputCreds --> Validate{유효성<br/>검사}
    Validate -->|이메일 형식 오류| ShowError1[에러: 유효한 이메일 입력]
    Validate -->|비밀번호 없음| ShowError2[에러: 비밀번호 입력]

    ShowError1 --> InputCreds
    ShowError2 --> InputCreds

    Validate -->|통과| CallAuth[Supabase Auth<br/>로그인 API 호출]

    CallAuth --> CheckResult{인증<br/>성공?}

    CheckResult -->|성공| SaveSession[세션 저장<br/>localStorage]
    CheckResult -->|실패| ShowAuthError[에러: 잘못된 이메일<br/>또는 비밀번호]

    ShowAuthError --> Retry{재시도?}
    Retry -->|예| InputCreds
    Retry -->|아니오| Cancel([취소])

    SaveSession --> UpdateUI[UI 상태 업데이트<br/>로그인 버튼 → 프로필]
    UpdateUI --> LoadUserData[사용자 정보 로드<br/>닉네임, 프로필]
    LoadUserData --> ShowSuccess[성공 토스트<br/>로그인 완료]
    ShowSuccess --> End([완료])

    Cancel --> End

    style LoginBtn fill:#e1f5ff
    style CallAuth fill:#ffe1e1
    style End fill:#fff4e1
```

**회원가입 플로우** (간소화):
```mermaid
flowchart TD
    SignupBtn([회원가입 클릭]) --> InputForm[이메일, 비밀번호, 닉네임 입력]
    InputForm --> Validate{유효성 검사}
    Validate -->|통과| CreateAccount[Supabase Auth<br/>계정 생성]
    CreateAccount --> CreateProfile[users 테이블에<br/>프로필 생성]
    CreateProfile --> AutoLogin[자동 로그인]
    AutoLogin --> End([완료])

    style SignupBtn fill:#e1f5ff
    style CreateAccount fill:#ffe1e1
    style CreateProfile fill:#ffe1e1
    style End fill:#fff4e1
```

---

## 7. 지도 인터랙션 플로우

```mermaid
flowchart TD
    MapReady([지도 준비 완료]) --> UserGesture{사용자<br/>제스처}

    UserGesture -->|드래그| PanMap[지도 이동]
    UserGesture -->|핀치 줌| ZoomMap[줌 레벨 변경]
    UserGesture -->|마커 클릭| MarkerClick[마커 클릭 이벤트]
    UserGesture -->|현재 위치 버튼| GetLocation[브라우저 위치 권한 요청]

    PanMap --> UpdateBounds[지도 범위 업데이트]
    UpdateBounds --> CheckMarkers{마커가<br/>범위 밖?}
    CheckMarkers -->|예| ClusterMarkers[마커 클러스터링]
    CheckMarkers -->|아니오| ShowAllMarkers[모든 마커 표시]

    ZoomMap --> CheckZoomLevel{줌 레벨<br/>체크}
    CheckZoomLevel -->|<10| ShowClusters[클러스터만 표시]
    CheckZoomLevel -->|10-15| ShowMixed[클러스터 + 마커]
    CheckZoomLevel -->|>15| ShowIndividual[개별 마커 표시]

    MarkerClick --> ShowPopup[장소 상세 팝업]
    ShowPopup --> HighlightMarker[선택된 마커 강조]

    GetLocation --> CheckPermission{위치 권한<br/>허용?}
    CheckPermission -->|허용| MoveToLocation[지도 이동<br/>현재 위치]
    CheckPermission -->|거부| ShowError[에러: 위치 권한 필요]

    MoveToLocation --> AddLocationMarker[현재 위치 마커 추가]

    ClusterMarkers --> WaitNext([대기])
    ShowAllMarkers --> WaitNext
    ShowClusters --> WaitNext
    ShowMixed --> WaitNext
    ShowIndividual --> WaitNext
    HighlightMarker --> WaitNext
    ShowError --> WaitNext
    AddLocationMarker --> WaitNext

    style MapReady fill:#e1f5ff
    style WaitNext fill:#fff4e1
```

---

## 에러 처리 플로우

```mermaid
flowchart TD
    Error([에러 발생]) --> CheckType{에러<br/>타입}

    CheckType -->|네트워크 에러| ShowNetworkError[네트워크 오류<br/>인터넷 연결 확인]
    CheckType -->|API 제한 초과| ShowRateLimit[API 제한 초과<br/>잠시 후 다시 시도]
    CheckType -->|인증 에러| ShowAuthError[로그인 필요<br/>로그인 유도]
    CheckType -->|DB 에러| ShowDBError[일시적 오류<br/>재시도 유도]
    CheckType -->|지도 로드 실패| ShowMapError[지도 로드 실패<br/>새로고침 권장]

    ShowNetworkError --> Retry{재시도?}
    ShowRateLimit --> Wait[1분 대기]
    ShowAuthError --> LoginFlow[로그인 플로우]
    ShowDBError --> Retry
    ShowMapError --> Reload[페이지 새로고침]

    Retry -->|예| RetryAction[원래 작업 재시도]
    Retry -->|아니오| Cancel([취소])

    Wait --> RetryAction

    RetryAction --> Success{성공?}
    Success -->|예| End([완료])
    Success -->|아니오| Error

    LoginFlow --> End
    Reload --> End
    Cancel --> End

    style Error fill:#ffe1e1
    style End fill:#fff4e1
```

---

## 주요 상태 관리 (Zustand)

```typescript
interface AppState {
  // 지도 상태
  map: naver.maps.Map | null
  markers: naver.maps.Marker[]
  selectedPlace: Place | null

  // 검색 상태
  searchQuery: string
  searchResults: Place[]
  isSearching: boolean

  // 리뷰 상태
  reviews: Review[]
  isLoadingReviews: boolean

  // 인증 상태
  user: User | null
  session: Session | null

  // UI 상태
  isPopupOpen: boolean
  isReviewFormOpen: boolean
}
```

---

## 성능 최적화 플로우

```mermaid
flowchart TD
    PageLoad([페이지 로드]) --> LazyMap[지도 SDK<br/>Lazy Loading]
    LazyMap --> UseDebounce[검색 입력<br/>Debounce 300ms]
    UseDebounce --> CacheResults[검색 결과<br/>클라이언트 캐싱]

    CacheResults --> VirtualizeList[검색 결과 리스트<br/>가상화 스크롤]
    VirtualizeList --> OptimizeMarkers[마커 렌더링<br/>최대 50개 제한]

    OptimizeMarkers --> ClusteringLogic[줌 아웃 시<br/>마커 클러스터링]
    ClusteringLogic --> ImageOptimize[마커 이미지<br/>WebP + 압축]

    ImageOptimize --> SWR[리뷰 데이터<br/>SWR 캐싱]
    SWR --> End([완료])

    style PageLoad fill:#e1f5ff
    style End fill:#fff4e1
```

---

**작성일**: 2025-10-23
**버전**: 1.0
**작성자**: SuperNext Agent 02
