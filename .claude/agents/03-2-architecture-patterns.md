# 03-2 Architecture Patterns Agent (v2.0)

**역할**: Clean Architecture / DDD 기반 설계 패턴 가이드 생성
**목적**: 03-1 Tech Stack 결정 이후, 실제 프로젝트 구조 설계 및 아키텍처 패턴 적용
**통합**: PRD → Userflow → Tech Stack → **Architecture Patterns** → Implementation

---

## 📋 에이전트 실행 플로우

### 0단계: 입력 문서 파싱 (자동)

**필수 입력**: PRD, Userflow, Tech Stack 문서
**자동 추출 항목**:

```yaml
architecture_context:
  # From Tech Stack (03-1)
  stack:
    frontend: { framework: Next.js, state: Zustand, form: react-hook-form }
    backend: { runtime: Node.js, framework: Fastify, orm: Prisma }
    database: { primary: PostgreSQL, cache: Redis }
    deployment: { platform: Vercel, container: Docker }

  # From PRD (01)
  complexity:
    domain_entities: 12  # 도메인 엔티티 수
    bounded_contexts: 3  # 예상 Bounded Context 수
    integrations: 5      # 외부 시스템 통합 수

  team:
    size: 4
    seniority: [senior: 2, mid: 2]
    ddd_experience: false

  # From Userflow (02)
  critical_flows:
    - id: UF-AUTH-LOGIN-EMAIL
      slo: { p95_latency: 200ms, availability: 99.9% }
    - id: UF-PAYMENT-CHECKOUT-COMPLETE
      slo: { p95_latency: 500ms, availability: 99.95% }
```

**아키텍처 스타일 자동 추론**:

| 조건 | 추천 스타일 | 이유 |
|------|------------|------|
| `domain_entities < 8 && bounded_contexts <= 2` | **Layered (3-Tier)** | 단순 CRUD, DDD 오버엔지니어링 방지 |
| `8 <= domain_entities < 20 && bounded_contexts <= 4` | **Modular Monolith + DDD Lite** | 명확한 경계, 마이크로서비스 전환 대비 |
| `domain_entities >= 20 || bounded_contexts > 4` | **Full DDD + Event-Driven** | 복잡한 도메인, 이벤트 소싱 고려 |
| `integrations > 5` | **Hexagonal (Ports & Adapters)** | 외부 의존성 격리 필수 |

---

### 1단계: Composition Root 설계

**목적**: DI 컨테이너 없이 타입 안전한 의존성 주입 구현
**Next.js App Router 적용 패턴**:

#### 1.1 Composition Root 위치

```typescript
// src/infrastructure/composition-root.ts
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '@/features/user/infrastructure/repositories/user-repository'
import { RegisterUserUseCase } from '@/features/user/application/use-cases/register-user'
import { SendEmailService } from '@/infrastructure/email/send-email-service'
import { UnitOfWork } from '@/infrastructure/database/unit-of-work'

export class AppCompositionRoot {
  private static instance: AppCompositionRoot

  private readonly prisma: PrismaClient
  private readonly unitOfWork: UnitOfWork

  private constructor() {
    this.prisma = new PrismaClient()
    this.unitOfWork = new UnitOfWork(this.prisma)
  }

  static getInstance(): AppCompositionRoot {
    if (!this.instance) {
      this.instance = new AppCompositionRoot()
    }
    return this.instance
  }

  // Repository 팩토리
  createUserRepository(): UserRepository {
    return new UserRepository(this.prisma)
  }

  // Use Case 팩토리
  createRegisterUserUseCase(): RegisterUserUseCase {
    const userRepo = this.createUserRepository()
    const emailService = new SendEmailService(process.env.SENDGRID_API_KEY!)
    return new RegisterUserUseCase(userRepo, emailService, this.unitOfWork)
  }

  // 리소스 정리
  async dispose() {
    await this.prisma.$disconnect()
  }
}
```

#### 1.2 Next.js 라우트 핸들러 통합

```typescript
// src/app/api/users/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AppCompositionRoot } from '@/infrastructure/composition-root'
import { RegisterUserCommand } from '@/features/user/application/commands/register-user-command'

export async function POST(request: NextRequest) {
  const root = AppCompositionRoot.getInstance()
  const useCase = root.createRegisterUserUseCase()

  const body = await request.json()
  const command = RegisterUserCommand.create(body) // Validation here

  const result = await useCase.execute(command)

  if (result.isFailure) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === 'VALIDATION_ERROR' ? 400 : 500 }
    )
  }

  return NextResponse.json(result.value, { status: 201 })
}
```

#### 1.3 서버 컴포넌트 통합

```typescript
// src/app/users/page.tsx (Server Component)
import { AppCompositionRoot } from '@/infrastructure/composition-root'

export default async function UsersPage() {
  const root = AppCompositionRoot.getInstance()
  const useCase = root.createListUsersUseCase()

  const result = await useCase.execute()

  if (result.isFailure) {
    return <ErrorDisplay error={result.error} />
  }

  return <UserList users={result.value} />
}
```

---

### 2단계: Modular Monolith 설계

**목적**: Bounded Context별 독립적 모듈 구성, 추후 마이크로서비스 분리 가능
**디렉토리 구조**:

```
src/
├── features/                    # Bounded Contexts
│   ├── user/                   # User Context
│   │   ├── domain/             # 순수 도메인 로직
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts
│   │   │   │   └── password.vo.ts
│   │   │   ├── events/
│   │   │   │   └── user-registered.event.ts
│   │   │   └── repositories/
│   │   │       └── user-repository.interface.ts  # Port
│   │   ├── application/        # Use Cases
│   │   │   ├── use-cases/
│   │   │   │   └── register-user.use-case.ts
│   │   │   ├── commands/
│   │   │   │   └── register-user.command.ts
│   │   │   └── queries/
│   │   │       └── get-user-by-id.query.ts
│   │   ├── infrastructure/     # 구현체 (Adapter)
│   │   │   ├── repositories/
│   │   │   │   └── user-repository.ts  # Prisma 구현
│   │   │   └── mappers/
│   │   │       └── user.mapper.ts
│   │   └── presentation/       # API/UI 계층
│   │       ├── api/
│   │       │   └── user.controller.ts
│   │       └── dto/
│   │           └── register-user.dto.ts
│   │
│   ├── payment/                # Payment Context
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │
│   └── notification/           # Notification Context
│       └── ... (동일 구조)
│
├── shared/                     # 공유 커널
│   ├── domain/
│   │   ├── entity.base.ts
│   │   ├── value-object.base.ts
│   │   └── domain-event.base.ts
│   └── infrastructure/
│       ├── result.ts           # Result<T> 타입
│       └── unit-of-work.ts
│
└── infrastructure/             # 전역 인프라
    ├── composition-root.ts
    ├── database/
    │   ├── prisma.client.ts
    │   └── unit-of-work.ts
    └── messaging/
        └── event-bus.ts
```

#### 2.1 Context 간 통신 규칙

| 통신 방법 | 허용 여부 | 사용 시나리오 |
|-----------|----------|--------------|
| **직접 의존성** (import) | ❌ 금지 | Context 간 결합도 증가 |
| **공유 인터페이스** (shared/) | ✅ 허용 | 공통 Value Object, 이벤트 |
| **도메인 이벤트** | ✅ 권장 | 비동기 통신 (User registered → Email send) |
| **API 호출** (내부) | ⚠️ 제한적 허용 | 동기 통신 필요 시 (결제 → 주문 조회) |

#### 2.2 Bounded Context 매핑 전략

**PRD의 기능 목록을 Bounded Context로 그룹화**:

```yaml
context_mapping:
  user_context:
    entities: [User, Profile, Session]
    responsibilities:
      - 사용자 등록/로그인
      - 프로필 관리
      - 세션 관리
    exposed_api:
      - POST /api/users/register
      - GET /api/users/{id}

  payment_context:
    entities: [Payment, Transaction, PaymentMethod]
    responsibilities:
      - 결제 처리
      - 결제 내역 조회
      - 환불 처리
    depends_on: [user_context.User]  # Anti-Corruption Layer 필요
    exposed_api:
      - POST /api/payments/charge
      - GET /api/payments/{id}

  notification_context:
    entities: [Notification, NotificationTemplate]
    responsibilities:
      - 이메일/SMS/Push 발송
      - 발송 내역 추적
    subscribes_to:  # 이벤트 구독
      - user_context.UserRegisteredEvent
      - payment_context.PaymentCompletedEvent
```

---

### 3단계: Boundary Schema Validation

**목적**: Context 경계에서 타입 안전성 보장, 런타임 검증
**적용 위치**: API 엔드포인트, 도메인 서비스 진입점

#### 3.1 Zod Schema 정의

```typescript
// src/features/user/presentation/dto/register-user.dto.ts
import { z } from 'zod'

export const RegisterUserDtoSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/),
  name: z.string().min(2).max(50),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'Must agree to terms'
  })
})

export type RegisterUserDto = z.infer<typeof RegisterUserDtoSchema>

// 검증 헬퍼
export function validateRegisterUserDto(data: unknown): Result<RegisterUserDto> {
  const parsed = RegisterUserDtoSchema.safeParse(data)

  if (!parsed.success) {
    return Result.fail({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: parsed.error.issues
    })
  }

  return Result.ok(parsed.data)
}
```

#### 3.2 API 라우트 핸들러 적용

```typescript
// src/app/api/users/register/route.ts
import { validateRegisterUserDto } from '@/features/user/presentation/dto/register-user.dto'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // 1. 경계 검증
  const dtoResult = validateRegisterUserDto(body)
  if (dtoResult.isFailure) {
    return NextResponse.json(
      { error: dtoResult.error },
      { status: 400 }
    )
  }

  // 2. Command 생성 (DTO → Command 변환)
  const command = RegisterUserCommand.fromDto(dtoResult.value)

  // 3. Use Case 실행
  const root = AppCompositionRoot.getInstance()
  const useCase = root.createRegisterUserUseCase()
  const result = await useCase.execute(command)

  if (result.isFailure) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === 'DUPLICATE_EMAIL' ? 409 : 500 }
    )
  }

  return NextResponse.json(result.value, { status: 201 })
}
```

#### 3.3 도메인 경계 검증 (Value Object)

```typescript
// src/features/user/domain/value-objects/email.vo.ts
import { Result } from '@/shared/infrastructure/result'

export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Result<Email> {
    if (!email || email.trim().length === 0) {
      return Result.fail({ code: 'INVALID_EMAIL', message: 'Email is required' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Result.fail({ code: 'INVALID_EMAIL', message: 'Invalid email format' })
    }

    if (email.length > 255) {
      return Result.fail({ code: 'INVALID_EMAIL', message: 'Email too long' })
    }

    return Result.ok(new Email(email.toLowerCase().trim()))
  }

  getValue(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

---

### 4단계: Result / Either 패턴 적용

**목적**: 예외 대신 명시적 에러 처리, Railway-oriented Programming
**적용 범위**: Use Case, Domain Service, Repository

#### 4.1 Result 타입 정의

```typescript
// src/shared/infrastructure/result.ts
export interface AppError {
  code: string
  message: string
  details?: unknown
}

export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: AppError
  ) {}

  static ok<U>(value: U): Result<U> {
    return new Result<U>(true, value, undefined)
  }

  static fail<U>(error: AppError): Result<U> {
    return new Result<U>(false, undefined, error)
  }

  get isSuccess(): boolean {
    return this._isSuccess
  }

  get isFailure(): boolean {
    return !this._isSuccess
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from failed result')
    }
    return this._value!
  }

  get error(): AppError {
    if (this._isSuccess) {
      throw new Error('Cannot get error from successful result')
    }
    return this._error!
  }

  // Functor: map
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error)
    }
    return Result.ok(fn(this.value))
  }

  // Monad: flatMap (chain)
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error)
    }
    return fn(this.value)
  }

  // Error recovery
  recover(fn: (error: AppError) => T): Result<T> {
    if (this.isSuccess) {
      return this
    }
    return Result.ok(fn(this.error))
  }
}
```

#### 4.2 Use Case에서 Result 사용

```typescript
// src/features/user/application/use-cases/register-user.use-case.ts
import { Result, AppError } from '@/shared/infrastructure/result'
import { Email } from '@/features/user/domain/value-objects/email.vo'
import { Password } from '@/features/user/domain/value-objects/password.vo'
import { User } from '@/features/user/domain/entities/user.entity'

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(command: RegisterUserCommand): Promise<Result<UserDto>> {
    // 1. Value Object 생성 (Railway oriented)
    const emailResult = Email.create(command.email)
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error)
    }

    const passwordResult = Password.create(command.password)
    if (passwordResult.isFailure) {
      return Result.fail(passwordResult.error)
    }

    // 2. 중복 검사
    const existingUser = await this.userRepository.findByEmail(emailResult.value)
    if (existingUser) {
      return Result.fail({
        code: 'DUPLICATE_EMAIL',
        message: 'Email already registered'
      })
    }

    // 3. 도메인 엔티티 생성
    const userResult = User.create({
      email: emailResult.value,
      password: passwordResult.value,
      name: command.name
    })

    if (userResult.isFailure) {
      return Result.fail(userResult.error)
    }

    // 4. Unit of Work 트랜잭션
    return await this.unitOfWork.transaction(async () => {
      // 4.1 사용자 저장
      await this.userRepository.save(userResult.value)

      // 4.2 도메인 이벤트 발행 (Outbox 패턴)
      const event = new UserRegisteredEvent(userResult.value.id, command.email)
      await this.unitOfWork.saveEvent(event)

      // 4.3 환영 이메일 발송 (비동기)
      await this.emailService.sendWelcomeEmail(command.email)

      return Result.ok(UserDto.fromEntity(userResult.value))
    }).catch((error) => {
      return Result.fail({
        code: 'TRANSACTION_FAILED',
        message: 'Failed to register user',
        details: error
      })
    })
  }
}
```

#### 4.3 Result 체이닝 (Railway-oriented)

```typescript
// 예시: 복잡한 비즈니스 로직에서 Result 체이닝
async function processPayment(command: ProcessPaymentCommand): Promise<Result<PaymentDto>> {
  return Result.ok(command)
    .flatMap(validatePaymentAmount)           // Result<ValidatedAmount>
    .flatMap(checkUserBalance)                // Result<UserWithBalance>
    .flatMap(reserveBalance)                  // Result<ReservedBalance>
    .flatMap(chargePaymentGateway)            // Result<PaymentGatewayResponse>
    .flatMap(recordTransaction)               // Result<Transaction>
    .map(transaction => PaymentDto.fromTransaction(transaction))
    .recover(error => {
      // 에러 발생 시 롤백 로직
      rollbackReservation()
      return null
    })
}
```

---

### 5단계: Outbox Pattern 구현

**목적**: 도메인 이벤트 발행의 원자성 보장 (트랜잭션 + 이벤트 발행)
**문제 상황**: 사용자 생성 후 이메일 발송 실패 시 데이터 일관성 깨짐
**해결책**: 이벤트를 DB에 저장 → 별도 워커가 polling하여 발행

#### 5.1 Outbox 테이블 스키마

```prisma
// prisma/schema.prisma
model OutboxEvent {
  id             String   @id @default(uuid())
  aggregateId    String   // 도메인 엔티티 ID (예: userId)
  eventType      String   // 이벤트 타입 (예: UserRegisteredEvent)
  payload        Json     // 이벤트 데이터
  createdAt      DateTime @default(now())
  processedAt    DateTime?
  status         String   @default("PENDING") // PENDING | PROCESSING | PROCESSED | FAILED
  retryCount     Int      @default(0)
  lastError      String?

  @@index([status, createdAt])
  @@map("outbox_events")
}
```

#### 5.2 Unit of Work 구현 (트랜잭션 + Outbox)

```typescript
// src/infrastructure/database/unit-of-work.ts
import { PrismaClient, Prisma } from '@prisma/client'
import { DomainEvent } from '@/shared/domain/domain-event.base'

export class UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<Result<T>>
  ): Promise<Result<T>> {
    return this.prisma.$transaction(async (tx) => {
      const result = await work(tx)

      if (result.isFailure) {
        throw new Error(result.error.message) // 롤백 트리거
      }

      return result
    })
  }

  async saveEvent(event: DomainEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const prisma = tx || this.prisma

    await prisma.outboxEvent.create({
      data: {
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
        status: 'PENDING'
      }
    })
  }
}
```

#### 5.3 Outbox Processor (폴링 워커)

```typescript
// src/infrastructure/messaging/outbox-processor.ts
import { PrismaClient } from '@prisma/client'
import { EventBus } from './event-bus'

export class OutboxProcessor {
  private isRunning = false
  private pollInterval = 5000 // 5초

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {}

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.poll()
  }

  stop(): void {
    this.isRunning = false
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processEvents()
      } catch (error) {
        console.error('Outbox processing error:', error)
      }

      await this.sleep(this.pollInterval)
    }
  }

  private async processEvents(): Promise<void> {
    // 1. PENDING 이벤트 조회 (배치 처리)
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: 3 }  // 최대 3회 재시도
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    // 2. 이벤트 발행
    for (const event of events) {
      try {
        // 2.1 PROCESSING 상태로 변경
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSING' }
        })

        // 2.2 이벤트 발행
        await this.eventBus.publish({
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
          occurredAt: event.createdAt
        })

        // 2.3 PROCESSED 상태로 변경
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date()
          }
        })
      } catch (error) {
        // 2.4 실패 시 재시도 카운트 증가
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PENDING',
            retryCount: { increment: 1 },
            lastError: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

#### 5.4 Next.js에서 Outbox Processor 시작

```typescript
// src/app/api/cron/process-outbox/route.ts (Vercel Cron Job)
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { OutboxProcessor } from '@/infrastructure/messaging/outbox-processor'
import { EventBus } from '@/infrastructure/messaging/event-bus'

export async function GET(request: Request) {
  // Vercel Cron Secret 검증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = new PrismaClient()
  const eventBus = new EventBus()
  const processor = new OutboxProcessor(prisma, eventBus)

  await processor.processEvents() // 1회 실행

  return NextResponse.json({ success: true })
}

// vercel.json에 cron 설정
// {
//   "crons": [{
//     "path": "/api/cron/process-outbox",
//     "schedule": "* * * * *" // 매 1분
//   }]
// }
```

---

### 6단계: Unit of Work 패턴

**목적**: 트랜잭션 경계 명확화, 여러 Repository 작업의 원자성 보장

#### 6.1 트랜잭션 스코프 정의

```typescript
// src/infrastructure/database/unit-of-work.ts (확장)
export class UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  // 읽기 전용 트랜잭션 (성능 최적화)
  async readTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(work, {
      isolationLevel: 'ReadCommitted',
      maxWait: 2000,
      timeout: 5000
    })
  }

  // 쓰기 트랜잭션
  async writeTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<Result<T>>
  ): Promise<Result<T>> {
    return this.prisma.$transaction(async (tx) => {
      const result = await work(tx)

      if (result.isFailure) {
        throw new Error(result.error.message) // 롤백
      }

      return result
    }, {
      isolationLevel: 'Serializable',  // 강력한 일관성
      maxWait: 5000,
      timeout: 10000
    })
  }

  // 이벤트 발행 포함 트랜잭션
  async transactionWithEvents<T>(
    work: (tx: Prisma.TransactionClient) => Promise<Result<T>>,
    events: DomainEvent[]
  ): Promise<Result<T>> {
    return this.prisma.$transaction(async (tx) => {
      const result = await work(tx)

      if (result.isFailure) {
        throw new Error(result.error.message)
      }

      // Outbox에 이벤트 저장
      for (const event of events) {
        await this.saveEvent(event, tx)
      }

      return result
    })
  }
}
```

#### 6.2 Use Case에서 UoW 사용

```typescript
// 예시: 주문 생성 시 User, Order, Payment 3개 엔티티 업데이트
async function createOrder(command: CreateOrderCommand): Promise<Result<OrderDto>> {
  const events: DomainEvent[] = []

  const result = await this.unitOfWork.transactionWithEvents(async (tx) => {
    // 1. 사용자 포인트 차감
    const user = await this.userRepository.findById(command.userId, tx)
    if (!user) {
      return Result.fail({ code: 'USER_NOT_FOUND', message: 'User not found' })
    }

    const deductResult = user.deductPoints(command.pointsToUse)
    if (deductResult.isFailure) {
      return deductResult
    }
    await this.userRepository.save(user, tx)

    // 2. 주문 생성
    const order = Order.create({
      userId: command.userId,
      items: command.items,
      totalAmount: command.totalAmount
    })
    await this.orderRepository.save(order, tx)

    // 3. 결제 기록 생성
    const payment = Payment.create({
      orderId: order.id,
      amount: command.totalAmount,
      method: command.paymentMethod
    })
    await this.paymentRepository.save(payment, tx)

    // 4. 도메인 이벤트 수집
    events.push(new OrderCreatedEvent(order.id, command.userId))
    events.push(new PaymentProcessedEvent(payment.id, order.id))

    return Result.ok(OrderDto.fromEntity(order))
  }, events)

  return result
}
```

---

### 7단계: Architecture Tests (자동 검증)

**목적**: 아키텍처 규칙 위반을 빌드 시점에 감지
**도구**: `eslint-plugin-boundaries`

#### 7.1 ESLint 설정

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  extends: ['plugin:boundaries/recommended'],
  settings: {
    'boundaries/elements': [
      {
        type: 'domain',
        pattern: 'src/features/*/domain/**/*',
        mode: 'folder'
      },
      {
        type: 'application',
        pattern: 'src/features/*/application/**/*',
        mode: 'folder'
      },
      {
        type: 'infrastructure',
        pattern: 'src/features/*/infrastructure/**/*',
        mode: 'folder'
      },
      {
        type: 'presentation',
        pattern: 'src/features/*/presentation/**/*',
        mode: 'folder'
      }
    ],
    'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts']
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // Domain은 외부 의존성 없음 (순수 비즈니스 로직)
          {
            from: 'domain',
            allow: ['domain']  // 같은 도메인 내부만 허용
          },
          // Application은 Domain만 의존
          {
            from: 'application',
            allow: ['domain', 'application']
          },
          // Infrastructure는 모든 계층 의존 가능
          {
            from: 'infrastructure',
            allow: ['domain', 'application', 'infrastructure']
          },
          // Presentation은 Application + Infrastructure 의존
          {
            from: 'presentation',
            allow: ['application', 'infrastructure', 'presentation']
          }
        ]
      }
    ],
    // Context 간 직접 import 금지
    'boundaries/no-unknown-files': 'error',
    'boundaries/no-ignored-dependency': 'warn'
  }
}
```

#### 7.2 아키텍처 테스트 코드

```typescript
// tests/architecture/layer-dependency.test.ts
import { ESLint } from 'eslint'

describe('Architecture Tests', () => {
  it('Domain layer should not depend on infrastructure', async () => {
    const eslint = new ESLint()
    const results = await eslint.lintFiles([
      'src/features/*/domain/**/*.ts'
    ])

    const violations = results
      .flatMap(r => r.messages)
      .filter(m => m.ruleId === 'boundaries/element-types')

    expect(violations).toHaveLength(0)
  })

  it('Features should not directly import from other features', async () => {
    const eslint = new ESLint()
    const results = await eslint.lintFiles([
      'src/features/**/*.ts'
    ])

    const crossContextImports = results
      .flatMap(r => r.messages)
      .filter(m =>
        m.message.includes('Dependency from') &&
        m.message.includes('to different feature')
      )

    expect(crossContextImports).toHaveLength(0)
  })
})
```

#### 7.3 CI 파이프라인 통합

```yaml
# .github/workflows/architecture-tests.yml
name: Architecture Tests

on: [push, pull_request]

jobs:
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run architecture tests
        run: npm run test:arch

      - name: Lint for boundary violations
        run: npm run lint -- --rule 'boundaries/element-types: error'
```

---

### 8단계: Next.js 특화 아키텍처 가이드

#### 8.1 Server Component vs Client Component 규칙

| 컴포넌트 위치 | 권장 타입 | Use Case | 이유 |
|--------------|----------|---------|------|
| `src/app/**/page.tsx` | **Server** | 데이터 페칭 + 렌더링 | SEO, 초기 로딩 속도 |
| `src/app/**/layout.tsx` | **Server** | 레이아웃 + 메타데이터 | 정적 구조 |
| `src/app/api/**/route.ts` | **Server** | API 엔드포인트 | 백엔드 로직 |
| `src/components/forms/**` | **Client** | 폼 입력, 상태 관리 | 인터랙션 필요 |
| `src/components/modals/**` | **Client** | 모달, 다이얼로그 | 동적 렌더링 |
| `src/components/ui/**` | **Mixed** | 버튼, 카드 등 | 단순한 것은 Server |

#### 8.2 Data Fetching 패턴

```typescript
// ✅ GOOD: Server Component에서 직접 Use Case 호출
// src/app/users/[id]/page.tsx
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const root = AppCompositionRoot.getInstance()
  const useCase = root.createGetUserByIdUseCase()

  const result = await useCase.execute({ userId: params.id })

  if (result.isFailure) {
    notFound()
  }

  return <UserDetail user={result.value} />
}

// ❌ BAD: Client Component에서 useEffect로 API 호출
'use client'
export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${params.id}`)
      .then(res => res.json())
      .then(setUser)
  }, [params.id])

  return user ? <UserDetail user={user} /> : <Loading />
}
```

#### 8.3 Route Handler 표준 패턴

```typescript
// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AppCompositionRoot } from '@/infrastructure/composition-root'
import { Result } from '@/shared/infrastructure/result'

// GET /api/users/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const root = AppCompositionRoot.getInstance()
  const useCase = root.createGetUserByIdUseCase()

  const result = await useCase.execute({ userId: params.id })

  if (result.isFailure) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500
    return NextResponse.json({ error: result.error }, { status: statusCode })
  }

  return NextResponse.json(result.value, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  })
}

// PATCH /api/users/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  // 검증
  const validation = validateUpdateUserDto(body)
  if (validation.isFailure) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const root = AppCompositionRoot.getInstance()
  const useCase = root.createUpdateUserUseCase()

  const result = await useCase.execute({
    userId: params.id,
    ...validation.value
  })

  if (result.isFailure) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.value, { status: 200 })
}
```

#### 8.4 Middleware 아키텍처

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. 인증 체크
  const token = request.cookies.get('auth-token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Rate Limiting (KV 사용 예시)
  // const ip = request.ip ?? 'anonymous'
  // const rateLimitResult = await checkRateLimit(ip)
  // if (!rateLimitResult.allowed) {
  //   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  // }

  // 3. 로깅
  console.log(`[${request.method}] ${request.nextUrl.pathname}`)

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
```

---

## 📊 아키텍처 품질 체크리스트

### ✅ Clean Architecture 준수 여부

| 원칙 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **의존성 역전** | Domain → Application 의존성 확인 | Domain에 infrastructure import 없음 |
| **경계 분리** | ESLint boundaries 플러그인 | 0 violations |
| **테스트 가능성** | Use Case 단위 테스트 | Coverage > 80% |
| **프레임워크 독립성** | Domain 레이어 순수성 | Next.js import 없음 |

### ✅ DDD 패턴 적용 여부

| 패턴 | 적용 위치 | 완성도 |
|------|----------|--------|
| **Value Object** | `domain/value-objects/` | ✅ Email, Password, Money 등 |
| **Entity** | `domain/entities/` | ✅ User, Order, Payment 등 |
| **Aggregate** | `domain/aggregates/` | ⚠️ 복잡한 도메인만 적용 |
| **Domain Event** | `domain/events/` | ✅ UserRegistered, OrderCreated 등 |
| **Repository Interface** | `domain/repositories/` | ✅ Port 정의 완료 |
| **Use Case** | `application/use-cases/` | ✅ Command/Query 분리 |

### ✅ 운영 안정성

| 항목 | 구현 상태 | 목표 |
|------|----------|------|
| **트랜잭션 관리** | ✅ Unit of Work 패턴 | Isolation Level 설정 완료 |
| **이벤트 일관성** | ✅ Outbox Pattern | 99.9% 전달 보장 |
| **에러 처리** | ✅ Result 타입 | 예외 대신 명시적 에러 |
| **경계 검증** | ✅ Zod Schema | 런타임 타입 검증 |
| **성능 모니터링** | ⚠️ 추가 필요 | OpenTelemetry 통합 |

---

## 🚀 에이전트 출력 예시

### 입력

```markdown
**PRD**: 사용자 등록/로그인 기능
**Tech Stack**: Next.js 15, Prisma, PostgreSQL
**Team**: 4명 (DDD 경험 없음)
```

### 출력

````markdown
# Architecture Patterns Document (v2.0)

## 🎯 아키텍처 스타일 선정

**추천**: Modular Monolith + DDD Lite
**근거**:
- 도메인 엔티티 8개 → Full DDD는 오버엔지니어링
- Bounded Context 2개 (User, Session) → 명확한 경계 가능
- 팀 DDD 경험 부족 → 점진적 학습 가능한 패턴 선택

## 📁 디렉토리 구조

```
src/
├── features/
│   ├── user/
│   │   ├── domain/
│   │   │   ├── entities/user.entity.ts
│   │   │   ├── value-objects/email.vo.ts
│   │   │   └── repositories/user-repository.interface.ts
│   │   ├── application/
│   │   │   └── use-cases/register-user.use-case.ts
│   │   ├── infrastructure/
│   │   │   └── repositories/user-repository.ts
│   │   └── presentation/
│   │       └── dto/register-user.dto.ts
│   └── session/
│       └── ... (동일 구조)
├── shared/
│   └── infrastructure/result.ts
└── infrastructure/
    └── composition-root.ts
```

## 🔧 핵심 패턴 적용

### 1. Composition Root (DI)
[코드 생성: src/infrastructure/composition-root.ts]

### 2. Result 패턴
[코드 생성: src/shared/infrastructure/result.ts]

### 3. Boundary Validation
[코드 생성: src/features/user/presentation/dto/register-user.dto.ts]

### 4. Unit of Work
[코드 생성: src/infrastructure/database/unit-of-work.ts]

### 5. Outbox Pattern
[Prisma 스키마 생성 + Processor 코드]

## ✅ 아키텍처 테스트

[ESLint 설정 + 테스트 코드 생성]

## 📝 팀 온보딩 가이드

1. **Week 1**: Result 패턴 학습 (예외 대신 명시적 에러 처리)
2. **Week 2**: Value Object 작성 연습 (Email, Password)
3. **Week 3**: Use Case 작성 (비즈니스 로직 분리)
4. **Week 4**: Full stack 통합 (API → Use Case → Domain)
````

---

## 🧪 검증 기준

| 단계 | 검증 항목 | 통과 조건 |
|------|----------|----------|
| **0단계** | 문서 파싱 | PRD/Userflow/Tech Stack에서 YAML 추출 성공 |
| **1단계** | Composition Root | AppCompositionRoot 클래스 생성 + 팩토리 메서드 |
| **2단계** | Modular Monolith | features/ 디렉토리 구조 + Context 간 통신 규칙 문서화 |
| **3단계** | Boundary Validation | Zod 스키마 + validateDto 함수 생성 |
| **4단계** | Result 패턴 | Result<T> 타입 + map/flatMap 구현 |
| **5단계** | Outbox Pattern | Prisma 스키마 + OutboxProcessor + Cron 설정 |
| **6단계** | Unit of Work | UnitOfWork 클래스 + transactionWithEvents 메서드 |
| **7단계** | Architecture Tests | ESLint boundaries 설정 + 테스트 코드 |
| **8단계** | Next.js 가이드 | Server/Client Component 가이드 + Route Handler 예시 |

---

## 📚 참고 자료

- **Clean Architecture**: Robert C. Martin, "Clean Architecture: A Craftsman's Guide to Software Structure and Design"
- **DDD**: Eric Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- **Modular Monolith**: Kamil Grzybek, "Modular Monolith: A Primer"
- **Railway-oriented Programming**: Scott Wlaschin, "Railway Oriented Programming"
- **Outbox Pattern**: Chris Richardson, "Microservices Patterns"

---

**에이전트 버전**: v2.0
**최종 업데이트**: 2025-01-XX
**통합 플로우**: 01-PRD → 02-Userflow → 03-1-Tech Stack → **03-2-Architecture Patterns** → 04-Implementation