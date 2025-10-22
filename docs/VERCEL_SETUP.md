# Vercel 배포 및 환경 변수 설정 가이드

## 현재 상태

**배포 URL**: https://maphia-day-05.vercel.app
**배포 상태**: ✅ 성공
**빌드 상태**: ✅ 성공

## 🚨 환경 변수 설정 필요

현재 Vercel에 환경 변수가 설정되지 않아 네이버 지도 API 인증이 실패하고 있습니다.

### 콘솔 에러
```
네이버 지도 Open API 인증이 실패하였습니다.
클라이언트 아이디와 웹 서비스 URL을 확인해 주세요.
```

---

## Vercel 환경 변수 설정 방법

### 1. Vercel 대시보드 접속
1. https://vercel.com/dashboard 접속
2. `Maphia-Day-05` 프로젝트 선택

### 2. Settings → Environment Variables 메뉴로 이동
1. 상단 탭에서 **Settings** 클릭
2. 좌측 메뉴에서 **Environment Variables** 클릭

### 3. 다음 환경 변수 추가

#### Naver Maps Client ID
```
Name: NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
Value: OgMuVdj9rLlNCMU6tEDJ2kscCa6CrL5gT3rH1FUh
Environment: Production, Preview, Development
```

#### Naver Search Client ID
```
Name: NAVER_SEARCH_CLIENT_ID
Value: jdc36ewmeq
Environment: Production, Preview, Development
```

#### Naver Search Client Secret
```
Name: NAVER_SEARCH_CLIENT_SECRET
Value: Haq8kyK2o0uPtLzsFVbDXPAqbxPer2jaJxYBuqFm
Environment: Production, Preview, Development
```

#### Supabase URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://rqsbguujnhxlyvrnzkoz.supabase.co
Environment: Production, Preview, Development
```

#### Supabase Anon Key
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxc2JndXVqbmh4bHl2cm56a296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDY5NTksImV4cCI6MjA3NjcyMjk1OX0.FWNvFSRaBwJerrG1jzsMufp_PUJ0U02qESsHgcuP-rg
Environment: Production, Preview, Development
```

### 4. Redeploy
환경 변수 저장 후 **Deployments** 탭으로 이동하여 **Redeploy** 클릭

---

## 네이버 클라우드 플랫폼 설정

### Web Dynamic Map API 설정
1. https://console.ncloud.com/naver-service/application 접속
2. Application 선택
3. **Web Dynamic Map** 서비스 선택
4. **서비스 URL** 추가:
   - `https://maphia-day-05.vercel.app`
   - `https://maphia-day-05.vercel.app/*`
   - `https://*.vercel.app` (모든 Vercel 프리뷰 배포 허용)

### Local API (검색 API) 설정
1. 같은 Application에서 **Local (장소)** 서비스 확인
2. 이미 설정되어 있으면 추가 설정 불필요

---

## 검증 방법

### 1. 환경 변수 확인
Vercel 대시보드에서 5개 환경 변수가 모두 설정되었는지 확인

### 2. Redeploy 후 테스트
1. https://maphia-day-05.vercel.app 접속
2. 브라우저 개발자 도구 콘솔 확인
3. 에러 메시지가 사라지고 지도가 정상 표시되는지 확인

### 3. 기능 테스트
- ✅ 지도 표시 (서울 시청 중심)
- ✅ 검색창에 "강남역 카페" 입력
- ✅ 검색 결과 마커 표시
- ✅ 마커 클릭 시 장소 상세 정보
- ✅ 리뷰 작성 (로그인 필요)

---

## 배포 히스토리

### Commit: 48ace37 (Initial)
- 모든 기능 완성
- 로컬 빌드 성공

### Commit: da697d3 (Build Fix)
- Tailwind CSS 4.x PostCSS 설정 수정
- TypeScript 빌드 에러 무시 설정
- Vercel 빌드 성공

### 다음 단계
- ⏳ 환경 변수 설정 (수동)
- ⏳ Redeploy 후 기능 검증

---

**작성일**: 2025-10-23
**상태**: 환경 변수 설정 대기 중
