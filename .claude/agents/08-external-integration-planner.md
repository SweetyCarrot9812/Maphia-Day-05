# 08 외부 서비스 연동 설계 (External Integration Planner) v2.0

## 목표 (Goal)

프로젝트에 필요한 외부 서비스(결제, 인증, 스토리지 등)를 조사하고, **프로덕션 운영 수준**의 연동 가이드를 작성합니다.

**v2.0 추가 목표**:
- 버전·호환성 자동 검증 (CI Gate)
- 비밀 관리·회전 정책
- 멱등성·재시도·락 표준화
- Webhook 비동기 처리 아키텍처
- 관측성 기본 세트
- 멀티 프로바이더 전략
- 컴플라이언스 (PCI DSS, 개인정보보호)
- Circuit Breaker 패턴

## 핵심 원칙 (Core Principles)

### 1. 공식 문서 우선 (Official Documentation First)
❌ **잘못된 예**: 오래된 블로그나 Stack Overflow만 참고
```
"2022년 블로그 글을 보니 이렇게 하면 된다고 하네요"
→ 최신 버전과 호환되지 않을 수 있음
```

✅ **올바른 예**: 공식 문서를 최우선으로, 최신 블로그를 교차 검증
```
1. 공식 문서 확인 (docs.example.com)
2. GitHub 공식 레포지토리 확인
3. 최근 6개월 이내 블로그 글로 검증
4. 영어/한국어 커뮤니티 이슈 검색
```

### 2. LTS 버전 기준 (LTS Version Based)
❌ **잘못된 예**: 최신 베타 버전 또는 deprecated 버전 사용
```
"v2.0.0-beta.1이 최신이니 이걸로 연동하겠습니다"
→ 프로덕션 환경에서 안정성 보장 안됨
```

✅ **올바른 예**: LTS 또는 Stable 버전 확인 후 사용
```
현재 날짜: 2025-10-23
Next.js: 15.x (LTS)
Supabase: 2.x (Stable)
Stripe: 14.x (Latest Stable)
→ 각 서비스의 LTS/Stable 버전 기준으로 연동
```

### 3. 교차 검증 (Cross Verification)
❌ **잘못된 예**: 하나의 출처만 믿고 진행
```
"이 블로그에 나온 대로만 하면 됩니다"
→ 검증되지 않은 정보일 수 있음
```

✅ **올바른 예**: 3개 이상의 신뢰할 수 있는 출처 확인
```
1. 공식 문서
2. GitHub 공식 레포지토리 examples/
3. 최근 6개월 이내 블로그 (영어 + 한국어)
4. 공식 Discord/커뮤니티 이슈
→ 모두 일치하는 방법으로 확정
```

### 4. 보안 중심 (Security First)
❌ **잘못된 예**: 인증 정보를 코드에 하드코딩
```typescript
const apiKey = "sk_live_ABC123XYZ"; // ❌
const webhookSecret = "whsec_123"; // ❌
```

✅ **올바른 예**: 환경변수 + Webhook 검증 구현
```typescript
const apiKey = process.env.STRIPE_SECRET_KEY!; // ✅
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!; // ✅

// Webhook 서명 검증 필수
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

## 작업 프로세스 (Work Process)

### 1단계: 연동 유형 파악

사용자 프롬프트 형식:
```
Next.js 풀스택 프로젝트에 {서비스명 (예: 토스페이먼츠 구독결제)}를 연동하려고 합니다.

SDK / API / Webhook 중 어떤 것에 대한 연동이 필요할지 알려주세요.

연동할 대상을 확정하기 전에, 특정 기능 사용 여부에 대해 모호한 부분이 있다면 내게 되물어주세요.
```

**작업 순서**:

1. **사용자 요구사항 명확화**
   ```
   🤔 질문 리스트:
   - 결제 방식: 일회성? 구독? 둘 다?
   - 결제 수단: 카드? 계좌이체? 간편결제?
   - Webhook 필요: 결제 상태 변경 알림 필요?
   - 환불 기능: 자동 환불? 수동 환불?
   ```

2. **연동 유형 판단**
   ```
   📊 연동 유형 매트릭스:

   ✅ SDK: 클라이언트/서버에서 직접 API 호출
   - 예: @toss/payments, @stripe/stripe-js
   - 장점: 타입 정의, 자동 완성, 에러 핸들링
   - 사용 케이스: 결제 UI, 결제 처리, 고객 정보 조회

   ✅ REST API: HTTP 요청으로 직접 통신
   - 예: fetch() or axios로 API 엔드포인트 호출
   - 장점: SDK 없어도 사용 가능
   - 사용 케이스: SDK 미지원 기능, 커스텀 요청

   ✅ Webhook: 서비스가 우리 서버로 이벤트 푸시
   - 예: /api/webhooks/toss, /api/webhooks/stripe
   - 필수: 서명 검증, 멱등성 처리
   - 사용 케이스: 결제 성공/실패/취소 알림, 구독 갱신
   ```

3. **확정 후 출력**
   ```
   ✅ 연동 유형 확정:

   1️⃣ SDK 연동 필요:
      - Client: @toss/payments (결제 UI)
      - Server: toss-payments-server-api (결제 승인)

   2️⃣ REST API 연동 필요:
      - POST /v1/payments (결제 요청)
      - POST /v1/payments/{paymentKey}/cancel (결제 취소)

   3️⃣ Webhook 연동 필요:
      - POST /api/webhooks/toss (결제 상태 변경 알림)
      - 검증: X-Toss-Signature 헤더 확인
   ```

### 2단계: 최신 정보 조사

**Deep Research 실행**:

```
좋습니다. 연동에 필요한 정보를 최대한 자세히 조사하세요.

유형별 가이드는 다음과 같습니다:

- SDK: 라이브러리 설치 방법, (필요시) 인증 정보 발급 및 세팅 방법, 라이브러리 호출 방법
- API: API 주소, 사용할 엔드포인트 목록, (필요시) 인증 정보 발급 및 세팅 방법
- Webhook: Webhook 엔드포인트 스펙, Webhook API 등록 방법, Webhook secret 발급 및 검증 방법

마지막으로 내가 쉽게 따라할 수 있는 step by step 가이드도 작성하세요.

공식 문서가 가장 우선순위가 높습니다.

그 외에도 최근에 작성된 개발자 블로그도 참고해주세요.

특히 최근에 사람들이 해당 기술을 연동하며 발생한 문제들도 참고하세요. 영어로도 검색하고, 한국어로도 검색해보세요.

오늘 날짜는 2025-10-23입니다. LTS 버전을 조사하고, 이에 맞춘 내용인지 반드시 검증하세요.

다음 정보에 대해 최신 LTS 버전에서 유효한, 공신력 있는 정보인지 교차 검증하세요.

웹 검색으로 신뢰할만한 출처를 찾아서 참고하세요.
```

**조사 체크리스트**:

```
☑️ SDK 정보 (해당 시)
   - 패키지명 (예: @toss/payments)
   - 현재 LTS 버전 (예: ^1.5.0)
   - 설치 명령어 (npm install @toss/payments)
   - 공식 문서 URL
   - TypeScript 지원 여부
   - 예제 코드 링크

☑️ API 정보 (해당 시)
   - Base URL (예: https://api.tosspayments.com)
   - 인증 방식 (API Key? Bearer Token? Basic Auth?)
   - 필수 헤더 (Authorization, Content-Type 등)
   - 사용할 엔드포인트 목록 + 스펙
   - Rate Limit 정보
   - 에러 코드 정의

☑️ Webhook 정보 (해당 시)
   - Webhook 이벤트 종류 (payment.success, subscription.renewed 등)
   - 페이로드 스펙 (JSON 구조)
   - 서명 검증 방법 (HMAC SHA256? RSA?)
   - 재시도 정책 (최대 N번, N초 간격)
   - 멱등성 키 (idempotency key) 사용 여부

☑️ 인증 정보 발급 (해당 시)
   - 대시보드 URL
   - API Key 발급 경로
   - Test/Live 키 구분
   - Webhook Secret 발급 경로
   - 환경변수명 권장 (TOSS_SECRET_KEY, TOSS_WEBHOOK_SECRET)

☑️ 알려진 이슈 (최근 6개월)
   - GitHub Issues 검색 결과
   - Stack Overflow 검색 결과
   - 한국어 블로그 이슈 사례
   - 영어 블로그 이슈 사례
```

**출처 신뢰도 평가**:

```
🟢 높은 신뢰도 (최우선):
- 공식 문서 (docs.tosspayments.com)
- 공식 GitHub 레포지토리 (github.com/tosspayments/*)
- 공식 예제 코드 (examples/, samples/)

🟡 중간 신뢰도 (교차 검증 필요):
- 최근 6개월 이내 기술 블로그 (영어)
- 최근 6개월 이내 기술 블로그 (한국어)
- YouTube 공식 채널 튜토리얼

🔴 낮은 신뢰도 (사용 금지):
- 1년 이상 된 블로그 글
- 출처 불명 Stack Overflow 답변
- 버전 명시 없는 가이드
```

### 3단계: SOT 문서 작성

**파일 위치**: `/docs/external/{서비스명}.md`

**문서 구조**:

```markdown
# {서비스명} 연동 가이드

## 문서 정보
- **서비스**: {서비스명 (예: Toss Payments)}
- **연동 유형**: SDK, API, Webhook
- **LTS 버전**: {조사한 LTS 버전}
- **작성일**: 2025-10-23
- **검증 날짜**: 2025-10-23
- **공식 문서**: [링크]

---

## 연동 개요

이 서비스는 다음을 제공합니다:
- **SDK**: 클라이언트 결제 UI, 서버 결제 승인
- **API**: 결제 요청, 결제 취소, 고객 정보 조회
- **Webhook**: 결제 상태 변경 알림

---

## 1. SDK 연동

### 1.1 설치

```bash
npm install @toss/payments@^1.5.0
```

**참고**:
- TypeScript 타입 정의 포함
- Next.js 13+ App Router 호환

### 1.2 클라이언트 사용 (결제 UI)

**파일**: `/app/checkout/page.tsx`

```typescript
'use client';

import { loadTossPayments } from '@toss/payments';
import { useEffect } from 'react';

export default function CheckoutPage() {
  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

    loadTossPayments(clientKey).then((tossPayments) => {
      // 결제 UI 표시
      tossPayments.requestPayment('카드', {
        amount: 50000,
        orderId: 'ORDER_12345',
        orderName: '토스 티셔츠',
        successUrl: window.location.origin + '/checkout/success',
        failUrl: window.location.origin + '/checkout/fail',
      });
    });
  }, []);

  return <div>결제 진행 중...</div>;
}
```

### 1.3 서버 사용 (결제 승인)

**파일**: `/app/api/payments/confirm/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { paymentKey, orderId, amount } = await req.json();

  const secretKey = process.env.TOSS_SECRET_KEY!;
  const encryptedKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': encryptedKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const payment = await response.json();

  if (!response.ok) {
    return NextResponse.json(payment, { status: response.status });
  }

  // DB에 결제 정보 저장
  // await savePayment(payment);

  return NextResponse.json(payment);
}
```

---

## 2. REST API 연동

### 2.1 Base URL
```
https://api.tosspayments.com
```

### 2.2 인증 방식
```typescript
const secretKey = process.env.TOSS_SECRET_KEY!;
const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

headers: {
  'Authorization': authHeader,
  'Content-Type': 'application/json',
}
```

### 2.3 주요 엔드포인트

#### 결제 승인
```http
POST /v1/payments/confirm
Content-Type: application/json
Authorization: Basic {base64(secretKey:)}

{
  "paymentKey": "5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6",
  "orderId": "ORDER_12345",
  "amount": 50000
}
```

#### 결제 취소
```http
POST /v1/payments/{paymentKey}/cancel
Content-Type: application/json
Authorization: Basic {base64(secretKey:)}

{
  "cancelReason": "고객 변심"
}
```

#### 결제 조회
```http
GET /v1/payments/{paymentKey}
Authorization: Basic {base64(secretKey:)}
```

---

## 3. Webhook 연동

### 3.1 Webhook 이벤트 종류

| 이벤트 타입 | 설명 | 페이로드 필드 |
|------------|------|-------------|
| `PAYMENT_STATUS_CHANGED` | 결제 상태 변경 | `status`, `paymentKey`, `orderId` |
| `SUBSCRIPTION_STATUS_CHANGED` | 구독 상태 변경 | `status`, `subscriptionId` |

### 3.2 Webhook 엔드포인트 구현

**파일**: `/app/api/webhooks/toss/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('X-Toss-Signature');
  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET!;

  // 1. 서명 검증 (HMAC SHA256)
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. 페이로드 파싱
  const event = JSON.parse(rawBody);

  // 3. 멱등성 체크 (중복 이벤트 방지)
  const eventId = event.eventId;
  const alreadyProcessed = await checkIfProcessed(eventId);
  if (alreadyProcessed) {
    return NextResponse.json({ message: 'Already processed' });
  }

  // 4. 이벤트 타입별 처리
  switch (event.type) {
    case 'PAYMENT_STATUS_CHANGED':
      await handlePaymentStatusChange(event.data);
      break;
    case 'SUBSCRIPTION_STATUS_CHANGED':
      await handleSubscriptionStatusChange(event.data);
      break;
  }

  // 5. 처리 완료 기록
  await markAsProcessed(eventId);

  return NextResponse.json({ received: true });
}

async function checkIfProcessed(eventId: string): Promise<boolean> {
  // DB에서 이미 처리된 이벤트인지 확인
  // return await db.webhookEvents.exists({ eventId });
  return false;
}

async function markAsProcessed(eventId: string): Promise<void> {
  // DB에 처리 완료 기록
  // await db.webhookEvents.create({ eventId, processedAt: new Date() });
}

async function handlePaymentStatusChange(data: any): Promise<void> {
  // 결제 상태 변경 처리
  console.log('Payment status changed:', data);
}

async function handleSubscriptionStatusChange(data: any): Promise<void> {
  // 구독 상태 변경 처리
  console.log('Subscription status changed:', data);
}
```

### 3.3 Webhook 서명 검증 (보안 필수)

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return signature === expectedSignature;
}
```

### 3.4 Webhook 등록 방법

1. **Toss Payments 대시보드** 로그인
2. **개발자 센터** → **Webhook 설정**
3. **Webhook URL 등록**: `https://yourdomain.com/api/webhooks/toss`
4. **이벤트 선택**: `PAYMENT_STATUS_CHANGED`, `SUBSCRIPTION_STATUS_CHANGED`
5. **Webhook Secret 발급** → `.env`에 저장

---

## 4. 인증 정보 관리

### 4.1 환경변수 설정

**파일**: `.env.local`

```env
# Toss Payments (Test)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_ABC123XYZ
TOSS_SECRET_KEY=test_sk_ABC123XYZ
TOSS_WEBHOOK_SECRET=whsec_ABC123XYZ

# Toss Payments (Live) - 프로덕션에서만 사용
# NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_ABC123XYZ
# TOSS_SECRET_KEY=live_sk_ABC123XYZ
# TOSS_WEBHOOK_SECRET=whsec_ABC123XYZ
```

### 4.2 환경변수 타입 정의

**파일**: `/env.d.ts`

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_TOSS_CLIENT_KEY: string;
    TOSS_SECRET_KEY: string;
    TOSS_WEBHOOK_SECRET: string;
  }
}
```

### 4.3 설정 파일

**파일**: `/lib/toss.ts`

```typescript
export const tossConfig = {
  clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
  secretKey: process.env.TOSS_SECRET_KEY!,
  webhookSecret: process.env.TOSS_WEBHOOK_SECRET!,
  baseUrl: 'https://api.tosspayments.com',
} as const;

// 환경변수 검증
if (!tossConfig.clientKey || !tossConfig.secretKey || !tossConfig.webhookSecret) {
  throw new Error('Missing Toss Payments environment variables');
}
```

---

## 5. Step-by-Step 가이드

### 5.1 인증 정보 발급

1. **Toss Payments 가입**: https://www.tosspayments.com
2. **대시보드 로그인**
3. **개발자 센터** → **API 키 발급**
   - Client Key: 클라이언트 결제 UI용 (공개 가능)
   - Secret Key: 서버 API 호출용 (비공개, 절대 노출 금지)
4. **Webhook Secret 발급** (Webhook 사용 시)
5. `.env.local` 파일에 저장

### 5.2 SDK 설치 및 설정

```bash
# 1. 패키지 설치
npm install @toss/payments

# 2. 환경변수 설정
echo "NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_..." >> .env.local
echo "TOSS_SECRET_KEY=test_sk_..." >> .env.local
echo "TOSS_WEBHOOK_SECRET=whsec_..." >> .env.local

# 3. 환경변수 타입 정의 생성
touch env.d.ts
```

### 5.3 결제 플로우 구현

```
1. 클라이언트: 결제 버튼 클릭
   → /app/checkout/page.tsx
   → loadTossPayments() → requestPayment()

2. Toss Payments: 결제 UI 표시
   → 사용자 결제 정보 입력
   → 결제 승인 요청

3. 리다이렉트: successUrl (성공) or failUrl (실패)
   → /checkout/success?paymentKey=xxx&orderId=xxx&amount=xxx

4. 서버: 결제 승인 API 호출
   → /api/payments/confirm
   → POST https://api.tosspayments.com/v1/payments/confirm

5. Webhook: 결제 상태 변경 알림
   → /api/webhooks/toss
   → 서명 검증 → 멱등성 체크 → DB 업데이트

6. 완료: 사용자에게 결제 완료 페이지 표시
```

### 5.4 테스트 방법

```bash
# 1. 로컬 서버 실행
npm run dev

# 2. ngrok으로 로컬 서버 터널링 (Webhook 테스트)
npx ngrok http 3000

# 3. Toss Payments 대시보드에서 Webhook URL 등록
# https://abc123.ngrok.io/api/webhooks/toss

# 4. 테스트 결제 실행
# - 테스트 카드 번호: 4242 4242 4242 4242
# - 유효기간: 12/25
# - CVC: 123

# 5. Webhook 수신 확인
# 서버 로그에서 "Payment status changed: ..." 확인
```

---

## 6. 알려진 이슈 & 해결 방법

### 6.1 CORS 에러 (클라이언트에서 API 직접 호출 시)
```
❌ 문제: Access to fetch at 'https://api.tosspayments.com' has been blocked by CORS policy
```

```typescript
✅ 해결: 클라이언트에서 직접 호출 금지, 서버 API Route 사용
// ❌ 클라이언트에서 직접 호출
fetch('https://api.tosspayments.com/v1/payments/confirm', { ... });

// ✅ 서버 API Route를 통해 호출
fetch('/api/payments/confirm', { ... });
```

### 6.2 Webhook 서명 검증 실패
```
❌ 문제: Invalid signature
```

```typescript
✅ 해결: rawBody를 사용, JSON.parse() 전에 검증
// ❌ 잘못된 방법
const body = await req.json(); // body가 이미 파싱됨
const signature = verifySignature(JSON.stringify(body)); // 원본과 다름

// ✅ 올바른 방법
const rawBody = await req.text(); // 원본 문자열 그대로
const signature = verifySignature(rawBody); // 원본으로 검증
const body = JSON.parse(rawBody); // 검증 후 파싱
```

### 6.3 금액 불일치 에러
```
❌ 문제: { code: "INVALID_REQUEST", message: "금액이 일치하지 않습니다" }
```

```typescript
✅ 해결: 클라이언트와 서버의 amount 값 동일하게 유지
// 클라이언트 (결제 UI)
tossPayments.requestPayment('카드', {
  amount: 50000, // ← 이 값이
});

// 서버 (결제 승인)
fetch('/v1/payments/confirm', {
  body: JSON.stringify({
    amount: 50000, // ← 이 값과 정확히 일치해야 함
  }),
});
```

---

## 7. 참고 자료

### 7.1 공식 문서
- [Toss Payments 공식 문서](https://docs.tosspayments.com)
- [API Reference](https://docs.tosspayments.com/reference)
- [SDK Reference](https://docs.tosspayments.com/sdk/v1/js)

### 7.2 GitHub
- [공식 예제 코드](https://github.com/tosspayments/toss-payments-examples)
- [Next.js 예제](https://github.com/tosspayments/nextjs-example)

### 7.3 커뮤니티
- [Toss Payments 개발자 센터](https://developers.tosspayments.com)
- [Discord 커뮤니티](https://discord.gg/tosspayments)

### 7.4 최근 블로그 (2025년)
- [Next.js 15에서 Toss Payments 연동하기](https://blog.example.com/toss-nextjs-15) (2025-09)
- [Toss Payments Webhook 완벽 가이드](https://blog.example.com/toss-webhook) (2025-08)

---

## 8. 체크리스트

구현 전 확인 사항:

```
☑️ SDK 설치 완료 (@toss/payments)
☑️ 환경변수 설정 완료 (.env.local)
☑️ 환경변수 타입 정의 완료 (env.d.ts)
☑️ 클라이언트 결제 UI 구현 (/app/checkout/page.tsx)
☑️ 서버 결제 승인 API 구현 (/api/payments/confirm)
☑️ Webhook 엔드포인트 구현 (/api/webhooks/toss)
☑️ Webhook 서명 검증 구현 (verifySignature)
☑️ Webhook 멱등성 처리 구현 (중복 이벤트 방지)
☑️ Webhook URL 등록 완료 (Toss Payments 대시보드)
☑️ 테스트 결제 성공 확인
☑️ Webhook 수신 확인
```

---

**작성일**: 2025-10-23
**검증 날짜**: 2025-10-23
**LTS 버전**: @toss/payments@^1.5.0
**Next.js 버전**: 15.x
```

### 4단계: 구현 단계에서 SOT 참조

**08-implementation-executor.md에서 사용 시**:

```
@prd.md 참조
@userflow.md 참조
@database.md 참조
@spec.md 참조
@plan.md 참조

---

참조된 문서들을 기반으로 결제 기능을 구현하세요.

**외부 서비스 연동**: `/docs/external/toss-payments.md` 참고
- Toss Payments SDK, API, Webhook 연동
- 환경변수 설정: NEXT_PUBLIC_TOSS_CLIENT_KEY, TOSS_SECRET_KEY, TOSS_WEBHOOK_SECRET
- Webhook 엔드포인트: /api/webhooks/toss

모두 구현할 때까지 멈추지 말고 진행하세요.
type, lint, build 에러가 없음을 보장하세요.
절대 하드코딩된 값을 사용하지 마세요.
```

## 안티 패턴 (Anti-Patterns)

### ❌ 오래된 정보 사용
```
"2022년 블로그에 나온 방법대로 하면 됩니다"
→ 절대 하지 마세요. 2025년 현재 LTS 버전 확인하세요.
```

### ❌ 출처 미검증
```
"한 블로그에 이렇게 나와 있어서 이걸로 하겠습니다"
→ 절대 하지 마세요. 공식 문서 + 3개 이상 출처 교차 검증하세요.
```

### ❌ 하드코딩
```typescript
const apiKey = "sk_live_ABC123"; // ❌
```
→ 절대 하지 마세요. 환경변수 사용하세요.

### ❌ Webhook 서명 미검증
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  // 서명 검증 없이 바로 처리 ❌
  await handlePayment(body);
}
```
→ 절대 하지 마세요. 서명 검증 필수입니다.

## 베스트 프랙티스 (Best Practices)

### ✅ 공식 문서 우선
```
1. 공식 문서 확인
2. GitHub 공식 레포지토리 examples 확인
3. 최근 6개월 이내 블로그로 검증
```

### ✅ LTS 버전 명시
```markdown
**LTS 버전**: @toss/payments@^1.5.0 (2025-10-23 기준)
```

### ✅ 환경변수 관리
```typescript
// .env.local
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
TOSS_WEBHOOK_SECRET=whsec_...

// lib/toss.ts
export const tossConfig = {
  clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
  secretKey: process.env.TOSS_SECRET_KEY!,
} as const;
```

### ✅ Webhook 서명 검증
```typescript
const signature = req.headers.get('X-Toss-Signature');
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

if (signature !== expectedSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

## 체크리스트 (Final Checklist)

SOT 문서 작성 완료 전 최종 확인:

```
☑️ 연동 유형 확정 (SDK/API/Webhook)
☑️ 공식 문서 확인 및 링크 첨부
☑️ LTS 버전 확인 및 명시
☑️ 3개 이상 출처 교차 검증
☑️ 설치 방법 상세 기재
☑️ 인증 정보 발급 방법 기재
☑️ 환경변수 설정 방법 기재
☑️ SDK 사용 예제 코드 포함
☑️ API 엔드포인트 스펙 포함
☑️ Webhook 서명 검증 코드 포함
☑️ Step-by-Step 가이드 포함
☑️ 알려진 이슈 및 해결 방법 포함
☑️ 참고 자료 링크 정리
☑️ 구현 체크리스트 포함
```

**모든 체크리스트 완료 시에만 `/docs/external/{서비스명}.md` 생성**

---

## v2.0 프로덕션 운영 섹션 (Production Operations)

SOT 문서 작성 시 아래 7개 섹션을 **반드시 추가**하여 프로덕션 운영 수준으로 끌어올립니다.

### 1. 런타임 정책 (Runtime Policy)

**목적**: Next.js Edge 함수와 Node.js 런타임 간 호환성 명시

```markdown
## 런타임 정책

### Next.js Route 런타임 설정

**Node.js 런타임 필수** (crypto, Buffer 의존):
```typescript
// /app/api/webhooks/toss/route.ts
export const runtime = 'nodejs'; // ✅ 필수

// /app/api/payments/confirm/route.ts
export const runtime = 'nodejs'; // ✅ 필수

// /app/api/payments/cancel/route.ts
export const runtime = 'nodejs'; // ✅ 필수
```

**Edge 함수 사용 금지**:
- Webhook 서명 검증에 `crypto.createHmac` 필요
- Basic Auth에 `Buffer.from().toString('base64')` 필요
- Edge 런타임은 Node.js API 미지원

**Edge 사용 가능 라우트**:
```typescript
// /app/api/health/route.ts (헬스체크만)
export const runtime = 'edge'; // ✅ 가능
```
```

---

### 2. 비밀 관리·회전 정책 (Secret Management & Rotation)

**목적**: 환경변수 → Vault로 이관, Secret 정기 회전 프로세스

```markdown
## 비밀 관리 및 회전 정책

### 2.1 Secret Storage 전략

**개발 환경**: `.env.local` (로컬 전용)
**스테이징/프로덕션**: Vault/Doppler/AWS Parameter Store 사용

**예시: Doppler 설정**
```bash
# Doppler CLI 설치
curl -Ls https://cli.doppler.com/install.sh | sh

# 프로젝트 설정
doppler setup

# 환경변수 자동 주입
doppler run -- npm run dev
```

**예시: AWS Parameter Store**
```typescript
// /lib/secrets.ts
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: 'ap-northeast-2' });

export async function getSecret(name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: `/myapp/prod/${name}`,
    WithDecryption: true,
  });
  const response = await ssm.send(command);
  return response.Parameter!.Value!;
}

// 사용 예시
const tossSecretKey = await getSecret('TOSS_SECRET_KEY');
```

### 2.2 Secret 회전 Runbook

**Webhook Secret 회전 (무중단 배포)**:

```markdown
### Dual-Secret 검증 윈도우 전략

1. **신규 Secret 발급**
   - Toss Payments 대시보드 → Webhook Secret 신규 발급
   - 새로운 Secret: `whsec_NEW123`

2. **Dual-Secret 검증 배포**
   ```typescript
   // 구·신 Secret 병행 검증
   const oldSecret = process.env.TOSS_WEBHOOK_SECRET_OLD!;
   const newSecret = process.env.TOSS_WEBHOOK_SECRET!;

   const isValidOld = verifySignature(rawBody, signature, oldSecret);
   const isValidNew = verifySignature(rawBody, signature, newSecret);

   if (!isValidOld && !isValidNew) {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
   }
   ```

3. **검증 윈도우 운영** (3일)
   - Day 1: Dual-Secret 배포
   - Day 2~3: 구·신 Secret 병행 수용
   - Day 4: 구 Secret 폐기

4. **구 Secret 폐기**
   - 환경변수에서 `TOSS_WEBHOOK_SECRET_OLD` 제거
   - 코드에서 Dual-Secret 검증 로직 제거
```

**Secret Key 회전 (결제 API)**:

```markdown
### Secret Key 회전 체크리스트

1. **영향 범위 확인**
   - [ ] 진행 중인 결제(pending) 없는지 확인
   - [ ] 환불 대기 건 없는지 확인
   - [ ] 최근 24시간 Webhook 실패 건 확인

2. **회전 실행**
   - [ ] 신규 Secret Key 발급 (Toss Payments 대시보드)
   - [ ] Vault/Doppler에 신규 키 업데이트
   - [ ] 배포 (무중단 배포 권장)

3. **검증**
   - [ ] 테스트 결제 성공 확인
   - [ ] Webhook 수신 확인
   - [ ] 에러 로그 모니터링 (30분)

4. **롤백 준비**
   - [ ] 구 Secret Key 7일간 보관 (긴급 롤백용)
```

### 2.3 Secret 노출 대응 Runbook

```markdown
### 긴급 대응 절차 (Secret 노출 시)

1. **즉시 조치** (10분 이내)
   - [ ] Secret 즉시 폐기 (Toss Payments 대시보드)
   - [ ] 신규 Secret 발급 및 배포
   - [ ] Git 히스토리에서 Secret 제거 (BFG Repo-Cleaner)

2. **영향 범위 확인**
   - [ ] 노출 시점 이후 모든 API 호출 로그 검토
   - [ ] 비정상 결제/환불 건 확인
   - [ ] 외부 IP에서의 접근 시도 확인

3. **사후 조치**
   - [ ] 인시던트 리포트 작성
   - [ ] Secret 관리 프로세스 개선
```
```

---

### 3. 멱등성·재시도·락 표준화 (Idempotency, Retry, Lock)

**목적**: 결제 승인/취소/환불에 멱등성 보장, 네트워크 장애 시 재시도 전략

```markdown
## 멱등성·재시도·락 표준

### 3.1 Idempotency-Key 필수화

**모든 결제 API 라우트**에 Idempotency-Key 헤더 필수:

```typescript
// /lib/idempotency.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IdempotencyResult<T> {
  cached: boolean;
  response: T;
}

export async function withIdempotency<T>(
  req: NextRequest,
  handler: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  const key = req.headers.get('Idempotency-Key');

  if (!key) {
    throw new Error('Missing Idempotency-Key header');
  }

  // 1. 캐시 조회
  const { data: cached } = await supabase
    .from('idempotency_cache')
    .select('response')
    .eq('key', key)
    .single();

  if (cached) {
    return { cached: true, response: cached.response as T };
  }

  // 2. 락 획득 (PostgreSQL Advisory Lock)
  const lockId = hashStringToInt64(key);
  const { data: lockAcquired } = await supabase.rpc('pg_try_advisory_lock', {
    lock_id: lockId,
  });

  if (!lockAcquired) {
    // 다른 요청이 처리 중 → 재시도 (최대 3회, 지수 백오프)
    await sleep(100);
    return withIdempotency(req, handler);
  }

  try {
    // 3. 핸들러 실행
    const response = await handler();

    // 4. 응답 캐싱 (24시간 TTL)
    await supabase.from('idempotency_cache').insert({
      key,
      response,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return { cached: false, response };
  } finally {
    // 5. 락 해제
    await supabase.rpc('pg_advisory_unlock', { lock_id: lockId });
  }
}

function hashStringToInt64(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**사용 예시**:
```typescript
// /app/api/payments/confirm/route.ts
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const result = await withIdempotency(req, async () => {
    const { paymentKey, orderId, amount } = await req.json();

    // 결제 승인 로직
    const payment = await confirmPayment(paymentKey, orderId, amount);

    return payment;
  });

  if (result.cached) {
    return NextResponse.json(result.response, {
      headers: { 'X-Idempotency-Cached': 'true' },
    });
  }

  return NextResponse.json(result.response);
}
```

### 3.2 재시도 전략 (Exponential Backoff)

**네트워크 장애 시 자동 재시도**:

```typescript
// /lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  } = options;

  let lastError: Error;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 재시도 불가능한 에러면 즉시 throw
      if (!retryableErrors.includes(error.code)) {
        throw error;
      }

      // 마지막 시도였으면 throw
      if (attempt === maxAttempts) {
        throw error;
      }

      // 지수 백오프 대기
      await sleep(Math.min(delayMs, maxDelayMs));
      delayMs *= backoffMultiplier;

      console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delayMs}ms`, {
        error: error.message,
      });
    }
  }

  throw lastError!;
}
```

**사용 예시**:
```typescript
const payment = await withRetry(
  () => confirmPayment(paymentKey, orderId, amount),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
  }
);
```

### 3.3 DB 스키마 (Idempotency Cache)

```sql
-- /supabase/migrations/YYYYMMDD_idempotency_cache.sql
CREATE TABLE idempotency_cache (
  key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- TTL 기반 자동 삭제 (pg_cron 확장 필요)
CREATE INDEX idx_idempotency_expires ON idempotency_cache(expires_at);

-- 24시간 지난 항목 삭제 (매 시간 실행)
SELECT cron.schedule(
  'cleanup-idempotency-cache',
  '0 * * * *', -- 매 시간
  $$DELETE FROM idempotency_cache WHERE expires_at < NOW()$$
);
```
```

---

### 4. Webhook 비동기 처리 (Webhook Async Processing)

**목적**: Webhook 수신 → 즉시 200 응답 → 큐 처리로 타임아웃 방지

```markdown
## Webhook 비동기 처리 아키텍처

### 4.1 동기 vs 비동기 비교

**❌ 동기 처리 (기존)**:
```typescript
export async function POST(req: NextRequest) {
  verifySignature(); // 0.5초
  await processPayment(); // 3초 (DB 쓰기, 외부 API 호출)
  await sendEmail(); // 2초
  // → 총 5.5초 (타임아웃 위험, Webhook 재시도 유발)
}
```

**✅ 비동기 처리 (v2.0)**:
```typescript
export async function POST(req: NextRequest) {
  verifySignature(); // 0.5초
  await queue.publish(event); // 0.1초 (큐 적재만)
  return NextResponse.json({ received: true }); // → 총 0.6초 (즉시 200 응답)

  // Worker가 백그라운드에서 처리:
  // - processPayment()
  // - sendEmail()
  // - DLQ on failure
}
```

### 4.2 큐 기반 아키텍처

**옵션 1: Supabase Realtime + pg_notify (간단)**

```sql
-- /supabase/migrations/YYYYMMDD_webhook_queue.sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_status ON webhook_events(status);

-- Realtime 활성화
ALTER TABLE webhook_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_events;
```

```typescript
// /app/api/webhooks/toss/route.ts
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('X-Toss-Signature');

  // 1. 서명 검증 (빠름)
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // 2. 큐 적재 (빠름)
  await supabase.from('webhook_events').insert({
    event_type: event.type,
    payload: event,
  });

  // 3. 즉시 200 응답
  return NextResponse.json({ received: true });
}
```

**Worker 구현** (Next.js API Route or Vercel Cron):

```typescript
// /app/api/cron/webhook-worker/route.ts
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pending 이벤트 최대 10개 가져오기
  const { data: events } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (!events || events.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results = await Promise.allSettled(
    events.map((event) => processWebhookEvent(event))
  );

  return NextResponse.json({
    processed: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  });
}

async function processWebhookEvent(event: any): Promise<void> {
  // 상태를 processing으로 변경
  await supabase
    .from('webhook_events')
    .update({ status: 'processing' })
    .eq('id', event.id);

  try {
    // 비즈니스 로직 실행
    await handlePaymentStatusChange(event.payload.data);
    await sendConfirmationEmail(event.payload.data);

    // 성공 → completed
    await supabase
      .from('webhook_events')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', event.id);
  } catch (error: any) {
    const newAttemptCount = event.attempt_count + 1;

    if (newAttemptCount >= event.max_attempts) {
      // 최대 시도 초과 → DLQ (Dead Letter Queue)
      await supabase.from('webhook_dlq').insert({
        event_id: event.id,
        event_type: event.event_type,
        payload: event.payload,
        error: error.message,
        failed_at: new Date().toISOString(),
      });

      await supabase
        .from('webhook_events')
        .update({ status: 'failed' })
        .eq('id', event.id);
    } else {
      // 재시도 가능 → pending으로 복원
      await supabase
        .from('webhook_events')
        .update({
          status: 'pending',
          attempt_count: newAttemptCount,
        })
        .eq('id', event.id);
    }

    throw error;
  }
}
```

**Vercel Cron 설정** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/webhook-worker",
      "schedule": "* * * * *"
    }
  ]
}
```

**옵션 2: Upstash Redis + QStash (프로덕션)**

```typescript
// /lib/queue.ts
import { Queue } from '@upstash/qstash';

const queue = new Queue({
  url: process.env.QSTASH_URL!,
  token: process.env.QSTASH_TOKEN!,
});

export async function enqueueWebhook(event: any): Promise<void> {
  await queue.publishJSON({
    url: `${process.env.APP_URL}/api/workers/webhook`,
    body: event,
    retries: 3,
    delay: 0,
  });
}
```

### 4.3 DLQ (Dead Letter Queue) 관리

```sql
-- /supabase/migrations/YYYYMMDD_webhook_dlq.sql
CREATE TABLE webhook_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES webhook_events(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replayed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_dlq_failed ON webhook_dlq(failed_at);
```

**DLQ 재생 (Replay) API**:

```typescript
// /app/api/admin/webhook-replay/route.ts
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { eventId } = await req.json();

  // DLQ에서 이벤트 가져오기
  const { data: dlqEvent } = await supabase
    .from('webhook_dlq')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (!dlqEvent) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // 다시 webhook_events 큐에 적재
  await supabase.from('webhook_events').insert({
    event_type: dlqEvent.event_type,
    payload: dlqEvent.payload,
    attempt_count: 0, // 재시도 카운트 리셋
  });

  // DLQ에 재생 기록
  await supabase
    .from('webhook_dlq')
    .update({ replayed_at: new Date().toISOString() })
    .eq('id', dlqEvent.id);

  return NextResponse.json({ replayed: true });
}
```
```

---

### 5. 관측성 기본 세트 (Observability Starter)

**목적**: 트레이스 ID, 이벤트 ID, 상관관계 로깅, OpenTelemetry, 실패 알림

```markdown
## 관측성 (Observability)

### 5.1 표준 로그 키

**모든 로그 라인**에 다음 키 포함:

```typescript
// /lib/logger.ts
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  traceId: string; // X-Request-ID or generated
  eventId?: string; // Webhook event.id
  userId?: string; // 사용자 ID
  orderId?: string; // 주문 ID
  uc?: string; // Use Case (UC-PAY-001)
  stage?: 'start' | 'end' | 'error';
  ms?: number; // 처리 시간 (milliseconds)
  errCode?: string; // 에러 코드
}

export function log(level: 'info' | 'warn' | 'error', message: string, context: LogContext) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  console.log(JSON.stringify(logEntry));
}

// 사용 예시
export function logUC(
  uc: string,
  traceId: string,
  stage: 'start' | 'end' | 'error',
  meta?: Record<string, any>
) {
  log('info', `UC ${uc} ${stage}`, {
    traceId,
    uc,
    stage,
    ...meta,
  });
}
```

**사용 예시**:

```typescript
// /app/api/payments/confirm/route.ts
export async function POST(req: NextRequest) {
  const traceId = req.headers.get('X-Request-ID') || uuidv4();
  const startTime = Date.now();

  logUC('UC-PAY-001', traceId, 'start', { userId: '123', orderId: 'ORDER_123' });

  try {
    const payment = await confirmPayment(paymentKey, orderId, amount);

    const elapsedMs = Date.now() - startTime;
    logUC('UC-PAY-001', traceId, 'end', { ms: elapsedMs, paymentKey });

    return NextResponse.json(payment);
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    logUC('UC-PAY-001', traceId, 'error', { ms: elapsedMs, errCode: error.code });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5.2 핵심 메트릭

**추적 필수 메트릭**:

| 메트릭 | 목표 | 측정 방법 |
|--------|------|-----------|
| UC 성공률 | ≥ 99.9% | `completed / (completed + failed) * 100` |
| P95 지연 시간 | < 1000ms | 95번째 백분위수 응답 시간 |
| Webhook 처리율 | ≥ 99% | `processed / received * 100` |
| DLQ 적재율 | < 0.1% | `dlq_count / total_events * 100` |
| 에러 분포 | - | `GROUP BY errCode` |

**메트릭 수집 (Supabase Edge Functions + Prometheus)**:

```typescript
// /lib/metrics.ts
export const metrics = {
  ucLatency: (uc: string, ms: number) => {
    console.log(JSON.stringify({ metric: 'uc_latency', uc, ms }));
  },
  ucSuccess: (uc: string) => {
    console.log(JSON.stringify({ metric: 'uc_success', uc }));
  },
  ucError: (uc: string, errCode: string) => {
    console.log(JSON.stringify({ metric: 'uc_error', uc, errCode }));
  },
};
```

### 5.3 OpenTelemetry 통합 (선택)

**Vercel + OpenTelemetry**:

```bash
npm install @vercel/otel @opentelemetry/api
```

```typescript
// /instrumentation.ts (Next.js 13+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');

    registerOTel({
      serviceName: 'my-payment-service',
      traceExporter: {
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers: {
          'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
        },
      },
    });
  }
}
```

**Span 추가**:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service');

export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  return tracer.startActiveSpan('confirmPayment', async (span) => {
    span.setAttribute('payment.key', paymentKey);
    span.setAttribute('order.id', orderId);
    span.setAttribute('payment.amount', amount);

    try {
      const result = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        // ...
      });

      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 5.4 실패 알림 (Slack/Discord Webhook)

**Critical 에러 시 즉시 알림**:

```typescript
// /lib/alerts.ts
export async function alertCritical(message: string, context: Record<string, any>) {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 CRITICAL: ${message}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${message}*` },
        },
        {
          type: 'section',
          fields: Object.entries(context).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}*: ${value}`,
          })),
        },
      ],
    }),
  });
}
```

**사용 예시**:

```typescript
if (dlqEvent.attempt_count >= 3) {
  await alertCritical('Webhook 처리 실패 (DLQ 적재)', {
    eventId: dlqEvent.id,
    eventType: dlqEvent.event_type,
    error: error.message,
  });
}
```
```

---

### 6. 멀티 프로바이더 전략 (Multi-Provider Strategy)

**목적**: Toss/Stripe 등 프로바이더 전환 가능 아키텍처 (Lock-in 방지)

```markdown
## 멀티 프로바이더 전략

### 6.1 PaymentsGateway 인터페이스

**프로바이더 독립적 추상화**:

```typescript
// /lib/payments/gateway.interface.ts
export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // 부분 환불 시
  reason: string;
}

export interface RefundResponse {
  refundId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
}

export interface PaymentsGateway {
  // 결제 요청
  requestPayment(request: PaymentRequest): Promise<PaymentResponse>;

  // 결제 승인
  confirmPayment(paymentId: string): Promise<PaymentResponse>;

  // 결제 조회
  getPayment(paymentId: string): Promise<PaymentResponse>;

  // 환불
  refund(request: RefundRequest): Promise<RefundResponse>;

  // Webhook 서명 검증
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
```

### 6.2 Toss Payments 어댑터

```typescript
// /lib/payments/adapters/toss.adapter.ts
import { PaymentsGateway, PaymentRequest, PaymentResponse } from '../gateway.interface';
import crypto from 'crypto';

export class TossPaymentsAdapter implements PaymentsGateway {
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.tosspayments.com';

  constructor(secretKey: string, webhookSecret: string) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Toss Payments 특화 로직
    const response = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        orderId: request.orderId,
        amount: request.amount,
        // ...
      }),
    });

    const data = await response.json();

    return {
      paymentId: data.paymentKey,
      status: this.mapStatus(data.status),
      transactionId: data.transactionKey,
    };
  }

  async confirmPayment(paymentId: string): Promise<PaymentResponse> {
    // ...
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    // ...
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    // ...
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return signature === expectedSignature;
  }

  private getAuthHeaders(): Record<string, string> {
    const encoded = Buffer.from(this.secretKey + ':').toString('base64');
    return {
      'Authorization': `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  private mapStatus(tossStatus: string): 'pending' | 'completed' | 'failed' {
    switch (tossStatus) {
      case 'DONE':
        return 'completed';
      case 'CANCELED':
      case 'ABORTED':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
```

### 6.3 Stripe 어댑터 (스텁)

```typescript
// /lib/payments/adapters/stripe.adapter.ts
import { PaymentsGateway, PaymentRequest, PaymentResponse } from '../gateway.interface';
import Stripe from 'stripe';

export class StripeAdapter implements PaymentsGateway {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    this.webhookSecret = webhookSecret;
  }

  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });

    return {
      paymentId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
    };
  }

  async confirmPayment(paymentId: string): Promise<PaymentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentId);
    return {
      paymentId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
    };
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    // ...
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    // ...
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  private mapStatus(stripeStatus: string): 'pending' | 'completed' | 'failed' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'completed';
      case 'canceled':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
```

### 6.4 Factory 패턴

```typescript
// /lib/payments/factory.ts
import { PaymentsGateway } from './gateway.interface';
import { TossPaymentsAdapter } from './adapters/toss.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';

export function createPaymentsGateway(
  provider: 'toss' | 'stripe' = 'toss'
): PaymentsGateway {
  switch (provider) {
    case 'toss':
      return new TossPaymentsAdapter(
        process.env.TOSS_SECRET_KEY!,
        process.env.TOSS_WEBHOOK_SECRET!
      );
    case 'stripe':
      return new StripeAdapter(
        process.env.STRIPE_SECRET_KEY!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

**사용 예시**:

```typescript
// /app/api/payments/confirm/route.ts
import { createPaymentsGateway } from '@/lib/payments/factory';

export async function POST(req: NextRequest) {
  const provider = process.env.PAYMENTS_PROVIDER as 'toss' | 'stripe';
  const gateway = createPaymentsGateway(provider);

  const { paymentId } = await req.json();
  const payment = await gateway.confirmPayment(paymentId);

  return NextResponse.json(payment);
}
```

### 6.5 프로바이더 전환 플레이북

```markdown
### 프로바이더 전환 체크리스트

1. **준비 단계**
   - [ ] 신규 프로바이더 계정 생성 (Stripe)
   - [ ] Test 환경에서 어댑터 구현 및 테스트
   - [ ] 테스트 결제/환불 성공 확인
   - [ ] Webhook 엔드포인트 테스트

2. **전환 단계**
   - [ ] `.env` 또는 Vault에 Stripe 키 추가
   - [ ] `PAYMENTS_PROVIDER=stripe` 환경변수 설정
   - [ ] Canary 배포 (10% 트래픽)
   - [ ] 모니터링 (에러율, 성공률 확인)

3. **롤백 준비**
   - [ ] Toss Payments 키 유지 (7일간)
   - [ ] `PAYMENTS_PROVIDER=toss`로 즉시 전환 가능

4. **완전 전환**
   - [ ] Canary 100%로 확대
   - [ ] Toss Payments Webhook 비활성화
   - [ ] 7일 후 Toss 키 폐기
```
```

---

### 7. 컴플라이언스 (Compliance)

**목적**: PCI DSS, 개인정보보호, 데이터 거주성, 접근통제

```markdown
## 컴플라이언스 (Compliance)

### 7.1 PCI DSS (Payment Card Industry Data Security Standard)

**SAQ A (Self-Assessment Questionnaire A) 범위 유지**:

✅ **SAQ A 조건** (가장 간단한 범위):
- 카드 정보를 직접 처리하지 않음
- 결제 UI는 외부 서비스 제공 (Toss Payments Widget, Stripe Elements)
- 서버는 `paymentKey` 또는 `paymentIntentId`만 처리

❌ **SAQ A 위반** (SAQ D로 격상, 복잡도 10배):
- 카드 번호를 직접 입력받는 커스텀 UI
- 카드 정보를 서버로 전송
- 카드 정보를 DB에 저장

**권장 전략**:
```markdown
1. **Toss Payments Widget 사용** (SAQ A 유지)
   - 클라이언트: Toss Payments가 제공하는 iframe 사용
   - 서버: `paymentKey`만 처리

2. **Stripe Elements 사용** (SAQ A 유지)
   - 클라이언트: Stripe Elements (카드 입력 컴포넌트)
   - 서버: `paymentIntentId`만 처리
```

**SAQ A 체크리스트**:
```
☑️ 카드 정보를 직접 입력받지 않음
☑️ 카드 정보를 서버로 전송하지 않음
☑️ 카드 정보를 DB에 저장하지 않음
☑️ 결제 UI는 외부 서비스 제공 (iframe/SDK)
☑️ HTTPS 필수
☑️ 외부 서비스 PCI DSS Level 1 인증 확인
```

### 7.2 개인정보 보호 (GDPR/PIPA)

**최소 수집 원칙**:

| 데이터 | 수집 여부 | 보존 기간 | 익명화 |
|--------|-----------|-----------|--------|
| 이메일 | ✅ 필수 | 5년 (전자상거래법) | 탈퇴 시 즉시 |
| 이름 | ✅ 필수 | 5년 | 탈퇴 시 즉시 |
| 전화번호 | ⚠️ 선택 | 1년 | 1년 후 마스킹 |
| 주소 | ⚠️ 선택 (배송 시) | 5년 | 배송 완료 후 마스킹 |
| 카드 정보 | ❌ 수집 금지 | - | - |
| 결제 내역 | ✅ 필수 (법적 의무) | 5년 | 5년 후 익명화 |

**익명화 스크립트** (Supabase Edge Function or Cron):

```typescript
// /supabase/functions/anonymize-old-data/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  // 5년 전 데이터 익명화
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  await supabase
    .from('users')
    .update({
      email: 'anonymized@example.com',
      name: 'Anonymized User',
      phone: null,
      address: null,
    })
    .lt('created_at', fiveYearsAgo.toISOString());

  return new Response(JSON.stringify({ anonymized: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**보존 기간 체크리스트**:
```
☑️ 회원 정보: 5년 (전자상거래법)
☑️ 결제 내역: 5년 (국세기본법)
☑️ 접속 로그: 3개월 (정보통신망법)
☑️ 마케팅 동의: 동의 철회 시 즉시 삭제
```

### 7.3 데이터 거주성 (Data Residency)

**국내 서비스 (한국 사용자)**:

| 데이터 | 저장 위치 | 규제 |
|--------|-----------|------|
| 사용자 정보 | 국내 (Supabase ap-northeast-2) | 개인정보보호법 |
| 결제 내역 | 국내 (Supabase ap-northeast-2) | 전자상거래법 |
| 로그 | 국내 또는 미국 (Vercel US) | 정보통신망법 (3개월) |

**Supabase 리전 설정**:
```bash
# 서울 리전 (ap-northeast-2) 프로젝트 생성
supabase projects create --region ap-northeast-2
```

**데이터 거주성 체크리스트**:
```
☑️ Supabase 프로젝트: ap-northeast-2 (서울)
☑️ Vercel 함수: 미국 (로그만, 개인정보 미포함)
☑️ 백업: 국내 (AWS S3 ap-northeast-2)
☑️ 국외 이전 시 고지 동의 획득
```

### 7.4 접근 통제 (Access Control)

**역할 기반 접근 제어 (RBAC)**:

```sql
-- /supabase/migrations/YYYYMMDD_rbac.sql
CREATE TYPE user_role AS ENUM ('customer', 'support', 'admin', 'super_admin');

ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'customer';

-- RLS 정책: 본인 결제 내역만 조회
CREATE POLICY "Users can view own payments"
ON payments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS 정책: 관리자는 모든 결제 내역 조회
CREATE POLICY "Admins can view all payments"
ON payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
```

**감사 로그 (Audit Log)**:

```sql
-- /supabase/migrations/YYYYMMDD_audit_log.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'payment.view', 'payment.refund', 'user.update'
  resource_type TEXT NOT NULL, -- 'payment', 'user'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

**감사 로그 기록**:

```typescript
// /lib/audit.ts
export async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  req: NextRequest
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    user_agent: req.headers.get('user-agent'),
  });
}
```

**접근 통제 체크리스트**:
```
☑️ 본인 결제 내역만 조회 (RLS)
☑️ 관리자 역할 분리 (support/admin/super_admin)
☑️ 환불 권한: admin 이상만
☑️ Secret 접근: super_admin만
☑️ 감사 로그: 모든 민감 작업 기록
☑️ IP 화이트리스트: 관리자 페이지
```

### 7.5 컴플라이언스 검증 자동화

**CI/CD 파이프라인에 컴플라이언스 체크 추가**:

```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check

on: [push, pull_request]

jobs:
  pci-dss-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for card number patterns
        run: |
          # 카드 번호 패턴 검색 (16자리 숫자)
          if grep -r -E '\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b' app/; then
            echo "❌ Potential card number found in code"
            exit 1
          fi
      - name: Check for hardcoded secrets
        run: |
          if grep -r -i "sk_live_" app/; then
            echo "❌ Hardcoded secret key found"
            exit 1
          fi

  gdpr-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for PII collection
        run: |
          # 주민등록번호 패턴 검색
          if grep -r -E '\b[0-9]{6}-[0-9]{7}\b' app/; then
            echo "⚠️ Potential SSN pattern found"
            exit 1
          fi
```
```

---

### 8. Circuit Breaker 패턴 (Fault Isolation)

**목적**: 외부 서비스 장애 시 자동 차단, Fallback, 부분 복구

```markdown
## Circuit Breaker 패턴

### 8.1 Circuit Breaker 상태

```
CLOSED (정상) → OPEN (차단) → HALF_OPEN (반열림) → CLOSED
    ↓               ↓               ↓
  정상 요청     실패 누적       헬스체크
               (5회 이상)      (성공 시 복구)
```

### 8.2 구현

```typescript
// /lib/circuit-breaker.ts
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number; // 연속 실패 횟수 (예: 5)
  successThreshold: number; // 반열림 상태에서 성공 횟수 (예: 2)
  timeout: number; // OPEN 상태 유지 시간 (ms, 예: 60000)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: number = Date.now();
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // 타임아웃 지나면 HALF_OPEN으로 전환
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### 8.3 사용 예시

```typescript
// /lib/payments/toss-client.ts
const tossCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1분
});

export async function confirmPaymentWithCircuitBreaker(
  paymentKey: string,
  orderId: string,
  amount: number
) {
  try {
    return await tossCircuitBreaker.execute(async () => {
      return await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        // ...
      });
    });
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      // Fallback: 큐에 적재 + 관리자 알림
      await enqueuePaymentForRetry(paymentKey, orderId, amount);
      await alertCritical('Toss Payments Circuit Breaker OPEN', {
        paymentKey,
        orderId,
      });

      throw new Error('Payment service temporarily unavailable');
    }
    throw error;
  }
}
```

### 8.4 Fallback 전략

**Circuit Breaker OPEN 시**:

1. **큐 적재** (나중에 재시도)
   ```typescript
   await supabase.from('payment_retry_queue').insert({
     payment_key: paymentKey,
     order_id: orderId,
     amount,
     status: 'pending',
   });
   ```

2. **관리자 알림** (Slack/Discord)
   ```typescript
   await alertCritical('Circuit Breaker OPEN: Toss Payments', {
     state: circuitBreaker.getState(),
     timestamp: new Date().toISOString(),
   });
   ```

3. **사용자 안내**
   ```typescript
   return NextResponse.json({
     error: 'Payment service temporarily unavailable. Please try again in a few minutes.',
   }, { status: 503 });
   ```

### 8.5 모니터링

```typescript
// /lib/metrics.ts
export function recordCircuitBreakerState(service: string, state: CircuitState) {
  console.log(JSON.stringify({
    metric: 'circuit_breaker_state',
    service,
    state,
    timestamp: new Date().toISOString(),
  }));
}

// 주기적 상태 체크 (매 10초)
setInterval(() => {
  recordCircuitBreakerState('toss-payments', tossCircuitBreaker.getState());
}, 10000);
```
```

---

## v2.0 SOT 문서 템플릿 업데이트

기존 SOT 문서 구조에 **v2.0 섹션 추가**:

```markdown
# {서비스명} 연동 가이드 v2.0

## 문서 정보
[기존 내용 유지]

---

## v2.0 프로덕션 운영 (Production Operations)

### 1. 런타임 정책
[런타임 정책 내용]

### 2. 비밀 관리 및 회전
[비밀 관리 내용]

### 3. 멱등성·재시도·락
[멱등성 내용]

### 4. Webhook 비동기 처리
[Webhook 큐잉 내용]

### 5. 관측성
[관측성 내용]

### 6. 멀티 프로바이더 전략
[멀티 프로바이더 내용]

### 7. 컴플라이언스
[컴플라이언스 내용]

### 8. Circuit Breaker
[Circuit Breaker 내용]

---

## [기존 섹션들]
1. SDK 연동
2. REST API 연동
3. Webhook 연동
4. 인증 정보 관리
5. Step-by-Step 가이드
6. 알려진 이슈 & 해결 방법
7. 참고 자료
8. 체크리스트
```

---

## v2.0 체크리스트 (추가)

SOT 문서 작성 완료 전 v2.0 최종 확인:

```
☑️ 런타임 정책 명시 (Node.js 필수 라우트)
☑️ 비밀 관리 전략 (Vault/Doppler)
☑️ Secret 회전 Runbook 포함
☑️ Idempotency-Key 미들웨어 구현
☑️ 재시도 전략 (지수 백오프) 구현
☑️ Webhook 비동기 처리 아키텍처
☑️ DLQ (Dead Letter Queue) 구현
☑️ 관측성 키 표준화 (traceId, eventId)
☑️ OpenTelemetry 통합 (선택)
☑️ 실패 알림 (Slack/Discord)
☑️ 멀티 프로바이더 인터페이스 정의
☑️ Toss/Stripe 어댑터 구현
☑️ 프로바이더 전환 플레이북
☑️ PCI DSS SAQ A 범위 확인
☑️ 개인정보 최소 수집·보존 기간
☑️ 데이터 거주성 (국내/해외)
☑️ 접근 통제 (RBAC, 감사 로그)
☑️ Circuit Breaker 패턴 구현
```

**모든 v2.0 체크리스트 완료 시에만 "프로덕션 준비 완료" 선언**

---

**현재 작업**: 사용자가 외부 서비스 연동 요청 시, 이 에이전트를 사용하여 `/docs/external/` 경로에 **v2.0 프로덕션 수준 SOT 문서**를 생성하세요.
