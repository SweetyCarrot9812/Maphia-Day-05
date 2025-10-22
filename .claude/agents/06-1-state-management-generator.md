# 06-1 State Management Generator (v2.0)

**역할**: 프론트엔드 상태관리 설계 + SSOT 원칙 강화 + FSM 기반 안정성 확보
**목적**: 최소 상태 원칙 + 결정적 동작 + 이벤트 로그 기반 추적성
**통합**: PRD → Userflow → Tech Stack → Architecture → Dataflow → UseCase → **State Management** → Implementation

---

## 📋 핵심 원칙

### 1. 상태 최소화 (Minimal State) 📦

```yaml
principle:
  rule: "저장 vs 계산 명확히 구분, 파생 상태는 계산으로"
  anti_pattern:
    ❌ "rankings를 상태로 영구 저장"
    ❌ "roundText를 별도 상태로 관리"
  pattern:
    ✅ "rankings는 결과 시 계산 + 필요 시만 스냅샷 저장"
    ✅ "roundText는 currentRound에서 파생"

conflict_resolution:
  issue: "SSOT 원칙 vs rankings 영구 보존"
  solution: "계산 + 스냅샷 모델 (computeRankings + snapshot)"
```

### 2. 결정적 동작 (Deterministic Behavior) 🎲

```yaml
principle:
  rule: "동일 seed → 동일 결과, 재현성 + 테스트 용이성 확보"
  implementation:
    - seed: "string (timestamp or user-provided)"
    - shuffle: "deterministic shuffle (LCG/hash-based)"
    - bracket: "seed 기반 고정 매칭"

benefits:
  - 테스트: "seed='test-123' → 항상 동일한 브래킷"
  - 디버깅: "사용자 신고 시 seed로 재현"
  - 공유: "seed 기반 결과 공유 가능"
```

### 3. FSM 기반 상태 전이 (Finite State Machine) 🔄

```yaml
principle:
  rule: "loading/error/paused를 1급 상태로 격상, 전이 오류 방지"
  modes:
    - idle: "초기 상태"
    - loading: "데이터 로딩 중"
    - playing: "게임 진행 중"
    - paused: "일시 정지"
    - result: "결과 표시"
    - error: "오류 발생"

  transitions:
    idle → loading: "loadActors()"
    loading → playing: "로딩 완료"
    loading → error: "로딩 실패"
    playing → paused: "pause()"
    paused → playing: "resume()"
    playing → result: "마지막 선택 완료"
    result → playing: "restart()"
    error → idle: "retry()"
```

### 4. 이벤트 로그 (Event Sourcing Lite) 📜

```yaml
principle:
  rule: "모든 사용자 액션 기록 → Undo/Redo + 통계 + 리플레이"
  events:
    - type: "ACTOR_SELECTED"
      payload: { actorId, matchIndex, round, timestamp }
    - type: "ROUND_COMPLETED"
      payload: { round, winners, timestamp }
    - type: "GAME_STARTED"
      payload: { seed, timestamp }

benefits:
  - Undo/Redo: "이벤트 역재생"
  - 통계: "평균 선택 시간, 인기 배우"
  - 리플레이: "전체 게임 재생"
  - 디버깅: "사용자 행동 추적"
```

---

## 🚀 에이전트 실행 플로우

### 0단계: 입력 문서 자동 파싱

**필수 입력**: 사용자 요구사항 (텍스트 or `/docs/requirement.md`)
**사용자 프롬프트 형식**:

```
다음 요구사항에 대한 상태관리를 설계하라.

[요구사항 상세히 작성]

요구사항을 `/docs/requirement.md`에 저장하고,
상태 설계를 `/docs/state-management.md`에 작성하라.
```

**자동 추출 항목**:

```yaml
state_context:
  # 데이터 구조
  entities: [Actor, Match, Round]
  initial_data: { actors: 32, matches: 16, rounds: 5 }

  # 모드/상태
  modes: [idle, loading, playing, paused, result, error]
  fsm_transitions: [idle→loading, loading→playing, ...]

  # 진행 상태
  tracking: [currentRound, currentMatchIndex, progress]

  # 액션/이벤트
  actions: [startGame, selectActor, pause, resume, restart]
  events: [GAME_STARTED, ACTOR_SELECTED, ROUND_COMPLETED]

  # 엣지케이스
  edge_cases:
    - N≠2^k: "부전승(bye) 처리"
    - duplicate_click: "연속 클릭 방지"
    - loading_error: "데이터 로딩 실패"
```

---

## 📄 상태관리 문서 구조 (v2.0)

### 파일명 규칙

```
/docs/requirement.md         (요구사항 원본)
/docs/state-management.md    (상태 설계)
```

### 문서 템플릿

````markdown
# State Management Design (v2.0)

## 문서 정보
- **작성일**: YYYY-MM-DD
- **버전**: 2.0
- **프레임워크**: React
- **상태관리 라이브러리**: Zustand
- **원칙**: SSOT + Minimal State + FSM + Event Sourcing Lite

---

## 요구사항 요약

[사용자 요구사항 요약]

**데이터**:
- 32명의 배우 (이름, 사진)
- 토너먼트 브래킷 (32강 → 16강 → ... → 2강)

**기능**:
- 게임 시작 (랜덤 or 결정적 셔플)
- 배우 선택 (1:1 대결)
- 라운드 진행 (승자 → 다음 라운드)
- 결과 표시 (1~32등 순위)
- 다시하기

**엣지케이스**:
- 참가자 수가 2^k가 아닐 때 (부전승 처리)
- 연속 클릭 방지
- 로딩 중/오류 상태
- Undo/Redo 지원 (선택)

---

## 데이터 모델

### Type Definitions

```typescript
// Core Types
type Actor = {
  id: string
  name: string
  photo: string
}

type Mode = 'idle' | 'loading' | 'playing' | 'paused' | 'result' | 'error'

type Round = 32 | 16 | 8 | 4 | 2

// Event Types
type GameEvent =
  | { type: 'GAME_STARTED'; payload: { seed: string; ts: number } }
  | { type: 'ACTOR_SELECTED'; payload: { actorId: string; matchIndex: number; round: Round; ts: number } }
  | { type: 'ROUND_COMPLETED'; payload: { round: Round; winners: Actor[]; ts: number } }
  | { type: 'GAME_PAUSED'; payload: { ts: number } }
  | { type: 'GAME_RESUMED'; payload: { ts: number } }

// State Type
interface GameState {
  // FSM 상태
  mode: Mode
  error?: { code: string; message: string }

  // 데이터
  actors: Actor[]

  // 결정적 동작
  seed: string  // 재현성을 위한 seed

  // 진행 상태
  currentRound: Round
  currentMatchIndex: number
  matchPairs: ([Actor, Actor] | [Actor, null])[]  // bye 지원

  // 선택 결과
  winners: Actor[]
  snapshotRankings?: Actor[]  // 결과 스냅샷 (옵션)

  // 이벤트 로그
  eventLog: GameEvent[]

  // UI 상태
  isSelecting: boolean  // 연속 클릭 잠금
}
```

---

## Core State (저장 상태)

### 1. mode
- **타입**: `'idle' | 'loading' | 'playing' | 'paused' | 'result' | 'error'`
- **초기값**: `'idle'`
- **설명**: FSM 상태
- **변경 조건**:
  - `idle` → `loading`: loadActors()
  - `loading` → `playing`: 로딩 완료
  - `loading` → `error`: 로딩 실패
  - `playing` → `paused`: pause()
  - `paused` → `playing`: resume()
  - `playing` → `result`: 마지막 선택 완료
  - `result` → `playing`: restart()
  - `error` → `idle`: retry()

### 2. error
- **타입**: `{ code: string; message: string } | undefined`
- **초기값**: `undefined`
- **설명**: 오류 상태 (mode='error' 시 존재)
- **예시**: `{ code: 'LOAD_FAILED', message: '데이터 로딩 실패' }`

### 3. actors
- **타입**: `Actor[]`
- **초기값**: `[]`
- **설명**: 전체 배우 데이터
- **변경 조건**: loadActors() 호출 시

### 4. seed
- **타입**: `string`
- **초기값**: `Date.now().toString()` or user-provided
- **설명**: 결정적 셔플을 위한 시드 (재현성 확보)
- **변경 조건**: startGame() 호출 시 생성

### 5. currentRound
- **타입**: `32 | 16 | 8 | 4 | 2`
- **초기값**: `32`
- **설명**: 현재 진행 중인 라운드
- **변경 조건**: 라운드 완료 시 절반으로

### 6. currentMatchIndex
- **타입**: `number`
- **초기값**: `0`
- **설명**: 현재 라운드 내에서 몇 번째 매치인지
- **변경 조건**: selectActor() 호출 시 +1

### 7. matchPairs
- **타입**: `([Actor, Actor] | [Actor, null])[]`
- **초기값**: seed 기반 결정적 생성
- **설명**: 현재 라운드의 매치 쌍들 (bye 허용)
- **변경 조건**: 라운드 종료 시 winners로 재구성

### 8. winners
- **타입**: `Actor[]`
- **초기값**: `[]`
- **설명**: 현재 라운드의 승자들
- **변경 조건**: selectActor() 호출 시 추가

### 9. snapshotRankings (옵션)
- **타입**: `Actor[] | undefined`
- **초기값**: `undefined`
- **설명**: 결과 스냅샷 (계산 비용 절감 or 통계용)
- **변경 조건**: result 모드 진입 시 계산 후 저장

### 10. eventLog
- **타입**: `GameEvent[]`
- **초기값**: `[]`
- **설명**: 모든 사용자 액션 기록 (Undo/Redo + 통계)
- **변경 조건**: 모든 액션 시 이벤트 추가

### 11. isSelecting
- **타입**: `boolean`
- **초기값**: `false`
- **설명**: 연속 클릭 방지 플래그
- **변경 조건**: selectActor() 시작 시 true, 완료 시 false

---

## Derived State (파생 상태)

### 1. currentMatchPair
- **계산**: `matchPairs[currentMatchIndex] || null`
- **설명**: 현재 화면에 표시할 두 배우 (or bye)

### 2. totalMatches
- **계산**: `matchPairs.length`
- **설명**: 현재 라운드의 총 매치 수

### 3. progressText
- **계산**: `${currentMatchIndex + 1}/${totalMatches}`
- **설명**: 진행률 텍스트 (예: "1/16")

### 4. roundText
- **계산**: `${currentRound}강`
- **설명**: 라운드 텍스트 (예: "32강")

### 5. isLastRound
- **계산**: `currentRound === 2`
- **설명**: 마지막 라운드 여부

### 6. rankings (계산)
- **계산**: `computeRankingsFromEventLog(eventLog, actors)`
- **설명**: 이벤트 로그 기반 순위 계산 (상태 저장 X)
- **스냅샷**: 결과 화면에서 snapshotRankings에 저장 (옵션)

---

## Helper Functions

### 1. 결정적 셔플 (Deterministic Shuffle)

```typescript
function hash32(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function lcg(seed: number): number {
  // Linear Congruential Generator
  return (seed * 1664525 + 1013904223) >>> 0
}

function shuffleDeterministic<T>(arr: T[], seed: string): T[] {
  let s = hash32(seed)
  const result = [...arr]

  for (let i = result.length - 1; i > 0; i--) {
    s = lcg(s)
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
```

### 2. 브래킷 생성 (Bye 지원)

```typescript
function createBracket(
  actors: Actor[],
  seed: string
): ([Actor, Actor] | [Actor, null])[] {
  const shuffled = shuffleDeterministic(actors, seed)
  const pairs: ([Actor, Actor] | [Actor, null])[] = []

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      pairs.push([shuffled[i], shuffled[i + 1]])
    } else {
      pairs.push([shuffled[i], null]) // bye
    }
  }

  return pairs
}
```

### 3. 순위 계산 (이벤트 로그 기반)

```typescript
function computeRankingsFromEventLog(
  eventLog: GameEvent[],
  actors: Actor[]
): Actor[] {
  // 선택 이벤트 재생산으로 최종 순위 계산
  const selections = eventLog.filter(
    e => e.type === 'ACTOR_SELECTED'
  ) as { type: 'ACTOR_SELECTED'; payload: { actorId: string; round: Round } }[]

  // 역순으로 정렬 (마지막 선택 = 1등)
  const sortedByRound = selections.sort((a, b) => {
    if (a.payload.round !== b.payload.round) {
      return a.payload.round - b.payload.round
    }
    return 0
  })

  const rankedActorIds = sortedByRound.map(s => s.payload.actorId).reverse()
  const unrankedActorIds = actors
    .map(a => a.id)
    .filter(id => !rankedActorIds.includes(id))

  const allIds = [...rankedActorIds, ...unrankedActorIds]
  return allIds.map(id => actors.find(a => a.id === id)!)
}
```

---

## Actions (액션)

### 1. loadActors(actors: Actor[])
**트리거**: 초기 데이터 로딩

**로직**:
```typescript
async function loadActors(actors: Actor[]) {
  set({ mode: 'loading' })

  try {
    // 데이터 검증
    if (actors.length < 2) {
      throw new Error('최소 2명의 배우가 필요합니다')
    }

    set({
      mode: 'idle',
      actors,
      error: undefined
    })
  } catch (error) {
    set({
      mode: 'error',
      error: {
        code: 'LOAD_FAILED',
        message: error.message
      }
    })
  }
}
```

**상태 변경**:
- `mode`: `idle` → `loading` → `idle` (성공) or `error` (실패)
- `actors`: 로드된 데이터
- `error`: 오류 시 설정

---

### 2. startGame(seed?: string)
**트리거**: 사용자가 "시작하기" 버튼 클릭

**로직**:
```typescript
function startGame(seed?: string) {
  const gameSeed = seed || Date.now().toString()

  // 이벤트 로그 초기화
  const startEvent: GameEvent = {
    type: 'GAME_STARTED',
    payload: { seed: gameSeed, ts: Date.now() }
  }

  set({
    mode: 'playing',
    seed: gameSeed,
    matchPairs: createBracket(state.actors, gameSeed),
    currentRound: 32,
    currentMatchIndex: 0,
    winners: [],
    eventLog: [startEvent],
    isSelecting: false
  })
}
```

**상태 변경**:
- `mode`: `idle` → `playing`
- `seed`: 생성 or 사용자 제공
- `matchPairs`: 결정적 생성
- `eventLog`: 초기화 + GAME_STARTED 이벤트

---

### 3. selectActor(actorId: string)
**트리거**: 사용자가 배우 선택지 클릭

**로직**:
```typescript
function selectActor(actorId: string) {
  const { currentMatchIndex, matchPairs, winners, currentRound, eventLog, isSelecting } = get()

  // 연속 클릭 방지
  if (isSelecting) return

  set({ isSelecting: true })

  const currentPair = matchPairs[currentMatchIndex]
  const selectedActor = currentPair[0]?.id === actorId
    ? currentPair[0]
    : currentPair[1]?.id === actorId
    ? currentPair[1]
    : null

  if (!selectedActor) {
    set({ isSelecting: false })
    return
  }

  // bye 처리
  const opponent = currentPair[0]?.id === actorId ? currentPair[1] : currentPair[0]
  const isBye = opponent === null

  // 이벤트 로그 추가
  const selectionEvent: GameEvent = {
    type: 'ACTOR_SELECTED',
    payload: {
      actorId: selectedActor.id,
      matchIndex: currentMatchIndex,
      round: currentRound,
      ts: Date.now()
    }
  }

  const newWinners = [...winners, selectedActor]
  const newEventLog = [...eventLog, selectionEvent]
  const nextMatchIndex = currentMatchIndex + 1

  // 라운드 종료 체크
  if (nextMatchIndex >= matchPairs.length) {
    const roundCompleteEvent: GameEvent = {
      type: 'ROUND_COMPLETED',
      payload: { round: currentRound, winners: newWinners, ts: Date.now() }
    }

    const finalEventLog = [...newEventLog, roundCompleteEvent]

    // 마지막 라운드?
    if (currentRound === 2) {
      set({
        mode: 'result',
        winners: newWinners,
        snapshotRankings: computeRankingsFromEventLog(finalEventLog, get().actors),
        eventLog: finalEventLog,
        isSelecting: false
      })
    } else {
      // 다음 라운드
      const nextRound = (currentRound / 2) as Round
      set({
        currentRound: nextRound,
        matchPairs: createBracket(newWinners, get().seed + `-round-${nextRound}`),
        currentMatchIndex: 0,
        winners: [],
        eventLog: finalEventLog,
        isSelecting: false
      })
    }
  } else {
    // 다음 매치
    set({
      winners: newWinners,
      currentMatchIndex: nextMatchIndex,
      eventLog: newEventLog,
      isSelecting: false
    })
  }
}
```

**상태 변경**:
- `winners`: 선택된 배우 추가
- `currentMatchIndex`: +1
- `eventLog`: ACTOR_SELECTED 이벤트 추가
- 라운드 종료 시:
  - `currentRound`: 절반으로
  - `matchPairs`: winners로 재구성
  - `eventLog`: ROUND_COMPLETED 이벤트 추가
- 게임 종료 시:
  - `mode`: `playing` → `result`
  - `snapshotRankings`: 계산 후 저장

---

### 4. pause()
**트리거**: 사용자가 일시 정지 버튼 클릭

**로직**:
```typescript
function pause() {
  const pauseEvent: GameEvent = {
    type: 'GAME_PAUSED',
    payload: { ts: Date.now() }
  }

  set({
    mode: 'paused',
    eventLog: [...get().eventLog, pauseEvent]
  })
}
```

**상태 변경**:
- `mode`: `playing` → `paused`
- `eventLog`: GAME_PAUSED 이벤트 추가

---

### 5. resume()
**트리거**: 사용자가 재개 버튼 클릭

**로직**:
```typescript
function resume() {
  const resumeEvent: GameEvent = {
    type: 'GAME_RESUMED',
    payload: { ts: Date.now() }
  }

  set({
    mode: 'playing',
    eventLog: [...get().eventLog, resumeEvent]
  })
}
```

**상태 변경**:
- `mode`: `paused` → `playing`
- `eventLog`: GAME_RESUMED 이벤트 추가

---

### 6. restart()
**트리거**: 사용자가 "다시하기" 버튼 클릭

**로직**:
```typescript
function restart() {
  const newSeed = Date.now().toString()
  const startEvent: GameEvent = {
    type: 'GAME_STARTED',
    payload: { seed: newSeed, ts: Date.now() }
  }

  set({
    mode: 'playing',
    seed: newSeed,
    currentRound: 32,
    currentMatchIndex: 0,
    matchPairs: createBracket(get().actors, newSeed),
    winners: [],
    snapshotRankings: undefined,
    eventLog: [startEvent],
    isSelecting: false
  })
}
```

**상태 변경**:
- `mode`: `result` → `playing`
- `seed`: 새로 생성
- `matchPairs`: 재생성
- `eventLog`: 초기화
- `snapshotRankings`: undefined

---

### 7. retry()
**트리거**: 오류 화면에서 재시도 버튼 클릭

**로직**:
```typescript
function retry() {
  set({
    mode: 'idle',
    error: undefined
  })
}
```

**상태 변경**:
- `mode`: `error` → `idle`
- `error`: undefined

---

## FSM Diagram (Finite State Machine)

```
                    ┌─────────┐
                    │  idle   │
                    └────┬────┘
                         │ loadActors()
                         ↓
                    ┌─────────┐
             ┌─────→│ loading │─────┐
             │      └────┬────┘     │
             │           │ 성공      │ 실패
  retry()    │           ↓          ↓
             │      ┌─────────┐ ┌───────┐
             └──────│  error  │ │ idle  │
                    └─────────┘ └───┬───┘
                                    │ startGame()
                                    ↓
                    ┌───────────────────────┐
            ┌───────│      playing          │───────┐
            │       └───┬───────────────┬───┘       │
            │           │               │           │
  resume()  │  pause()  │               │ 마지막    │
            │           ↓               │ 선택     │
            │       ┌────────┐          │          │
            └───────│ paused │          │          │
                    └────────┘          ↓          │
                                   ┌────────┐      │
                                   │ result │←─────┘
                                   └───┬────┘
                                       │ restart()
                                       └──────→ (playing)
```

---

## Zustand 구현 (v2.0)

```typescript
import { create } from 'zustand'
import { persist, subscribeWithSelector, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface GameStore extends GameState {
  // Actions
  loadActors: (actors: Actor[]) => Promise<void>
  startGame: (seed?: string) => void
  selectActor: (actorId: string) => void
  pause: () => void
  resume: () => void
  restart: () => void
  retry: () => void

  // Derived State (Selectors)
  getCurrentMatchPair: () => [Actor, Actor] | [Actor, null] | null
  getRankings: () => Actor[]
}

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial State
          mode: 'idle',
          error: undefined,
          actors: [],
          seed: '',
          currentRound: 32,
          currentMatchIndex: 0,
          matchPairs: [],
          winners: [],
          snapshotRankings: undefined,
          eventLog: [],
          isSelecting: false,

          // Actions
          loadActors: async (actors) => {
            set({ mode: 'loading' })

            try {
              if (actors.length < 2) {
                throw new Error('최소 2명의 배우가 필요합니다')
              }

              set({
                mode: 'idle',
                actors,
                error: undefined
              })
            } catch (error: any) {
              set({
                mode: 'error',
                error: {
                  code: 'LOAD_FAILED',
                  message: error.message
                }
              })
            }
          },

          startGame: (seed) => {
            const state = get()
            const gameSeed = seed || Date.now().toString()

            const startEvent: GameEvent = {
              type: 'GAME_STARTED',
              payload: { seed: gameSeed, ts: Date.now() }
            }

            set({
              mode: 'playing',
              seed: gameSeed,
              matchPairs: createBracket(state.actors, gameSeed),
              currentRound: 32,
              currentMatchIndex: 0,
              winners: [],
              eventLog: [startEvent],
              isSelecting: false,
              snapshotRankings: undefined
            })
          },

          selectActor: (actorId) => {
            const state = get()

            if (state.isSelecting) return

            set({ isSelecting: true })

            const currentPair = state.matchPairs[state.currentMatchIndex]
            const selectedActor =
              currentPair[0]?.id === actorId
                ? currentPair[0]
                : currentPair[1]?.id === actorId
                ? currentPair[1]
                : null

            if (!selectedActor) {
              set({ isSelecting: false })
              return
            }

            const selectionEvent: GameEvent = {
              type: 'ACTOR_SELECTED',
              payload: {
                actorId: selectedActor.id,
                matchIndex: state.currentMatchIndex,
                round: state.currentRound,
                ts: Date.now()
              }
            }

            const newWinners = [...state.winners, selectedActor]
            const newEventLog = [...state.eventLog, selectionEvent]
            const nextMatchIndex = state.currentMatchIndex + 1

            if (nextMatchIndex >= state.matchPairs.length) {
              const roundCompleteEvent: GameEvent = {
                type: 'ROUND_COMPLETED',
                payload: {
                  round: state.currentRound,
                  winners: newWinners,
                  ts: Date.now()
                }
              }

              const finalEventLog = [...newEventLog, roundCompleteEvent]

              if (state.currentRound === 2) {
                set({
                  mode: 'result',
                  winners: newWinners,
                  snapshotRankings: computeRankingsFromEventLog(
                    finalEventLog,
                    state.actors
                  ),
                  eventLog: finalEventLog,
                  isSelecting: false
                })
              } else {
                const nextRound = (state.currentRound / 2) as Round
                set({
                  currentRound: nextRound,
                  matchPairs: createBracket(
                    newWinners,
                    state.seed + `-round-${nextRound}`
                  ),
                  currentMatchIndex: 0,
                  winners: [],
                  eventLog: finalEventLog,
                  isSelecting: false
                })
              }
            } else {
              set({
                winners: newWinners,
                currentMatchIndex: nextMatchIndex,
                eventLog: newEventLog,
                isSelecting: false
              })
            }
          },

          pause: () => {
            const pauseEvent: GameEvent = {
              type: 'GAME_PAUSED',
              payload: { ts: Date.now() }
            }

            set({
              mode: 'paused',
              eventLog: [...get().eventLog, pauseEvent]
            })
          },

          resume: () => {
            const resumeEvent: GameEvent = {
              type: 'GAME_RESUMED',
              payload: { ts: Date.now() }
            }

            set({
              mode: 'playing',
              eventLog: [...get().eventLog, resumeEvent]
            })
          },

          restart: () => {
            const state = get()
            const newSeed = Date.now().toString()
            const startEvent: GameEvent = {
              type: 'GAME_STARTED',
              payload: { seed: newSeed, ts: Date.now() }
            }

            set({
              mode: 'playing',
              seed: newSeed,
              currentRound: 32,
              currentMatchIndex: 0,
              matchPairs: createBracket(state.actors, newSeed),
              winners: [],
              snapshotRankings: undefined,
              eventLog: [startEvent],
              isSelecting: false
            })
          },

          retry: () => {
            set({
              mode: 'idle',
              error: undefined
            })
          },

          // Derived State Selectors
          getCurrentMatchPair: () => {
            const state = get()
            return state.matchPairs[state.currentMatchIndex] || null
          },

          getRankings: () => {
            const state = get()
            // 스냅샷이 있으면 사용, 없으면 계산
            return (
              state.snapshotRankings ||
              computeRankingsFromEventLog(state.eventLog, state.actors)
            )
          }
        }))
      ),
      {
        name: 'game-store',
        partialize: (state) => ({
          seed: state.seed,
          eventLog: state.eventLog,
          snapshotRankings: state.snapshotRankings
        })
      }
    )
  )
)

// Custom Hooks for Derived State
export const useCurrentMatchPair = () =>
  useGameStore((state) => state.getCurrentMatchPair())

export const useRoundText = () =>
  useGameStore((state) => `${state.currentRound}강`)

export const useProgressText = () =>
  useGameStore((state) => {
    const total = state.matchPairs.length
    return `${state.currentMatchIndex + 1}/${total}`
  })

export const useRankings = () =>
  useGameStore((state) => state.getRankings())
```

---

## Edge Cases & Error Handling

### 1. N≠2^k (부전승 처리)
**문제**: 참가자 수가 2의 거듭제곱이 아닐 때 (예: 30명)
**처리**:
- `matchPairs`에 `[Actor, null]` 형태로 저장
- `selectActor()`에서 bye 자동 처리 (opponent === null)
- UI에서 "부전승" 표시

### 2. 연속 클릭 방지
**문제**: selectActor() 빠른 연속 클릭
**처리**:
- `isSelecting` 플래그로 잠금
- 처리 완료 후 false로 전환

### 3. 로딩 중/오류 상태
**문제**: 데이터 로딩 실패 or 네트워크 오류
**처리**:
- FSM `loading` → `error` 전이
- `error` 객체에 코드 + 메시지 저장
- `retry()` 액션 제공

### 4. Undo/Redo (옵션)
**문제**: 실수로 잘못 선택
**처리**:
- `eventLog` 기반 역재생
- `undo()`: 마지막 이벤트 제거 + 상태 재계산
- `redo()`: 제거된 이벤트 복원

---

## 통계 & 리플레이 (이벤트 로그 활용)

### 1. 통계 계산
```typescript
function getStatistics(eventLog: GameEvent[]) {
  const selections = eventLog.filter(e => e.type === 'ACTOR_SELECTED')
  const pauseCount = eventLog.filter(e => e.type === 'GAME_PAUSED').length

  const selectionTimes = selections.map((e, i) => {
    if (i === 0) return 0
    return e.payload.ts - selections[i - 1].payload.ts
  })

  const avgSelectionTime =
    selectionTimes.reduce((a, b) => a + b, 0) / selectionTimes.length

  const popularActors = selections
    .map(e => e.payload.actorId)
    .reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  return {
    totalSelections: selections.length,
    avgSelectionTime,
    pauseCount,
    popularActors
  }
}
```

### 2. 리플레이
```typescript
function replayGame(eventLog: GameEvent[], actors: Actor[]) {
  // 이벤트를 순차적으로 재생
  let currentState = initialState(actors)

  for (const event of eventLog) {
    switch (event.type) {
      case 'GAME_STARTED':
        currentState = handleGameStart(currentState, event)
        break
      case 'ACTOR_SELECTED':
        currentState = handleActorSelection(currentState, event)
        break
      // ...
    }
  }

  return currentState
}
```

---

## 접근성 (Accessibility) 상태

### 1. ARIA States
```typescript
interface A11yState {
  // 스크린 리더 안내
  announcements: string[]  // 실시간 안내 메시지

  // 포커스 관리
  focusedActorId: string | null

  // 키보드 내비게이션
  keyboardMode: boolean  // true일 때 키보드 전용 UI
}
```

### 2. 상태 통합
```typescript
interface GameState {
  // ... (기존 상태)
  a11y: A11yState
}
```

### 3. 액션 추가
```typescript
actions: {
  // ... (기존 액션)
  announce: (message: string) => void
  setFocus: (actorId: string) => void
  toggleKeyboardMode: () => void
}
```

---

## 🔧 작업 원칙

1. **SSOT 강화**: rankings 계산 + 스냅샷 모델 (영구 저장 최소화)
2. **결정적 브래킷**: seed 기반 셔플 (재현성 + 테스트 용이성)
3. **FSM 전이 안정화**: loading/error/paused 1급 상태로 관리
4. **이벤트 로그**: Undo/Redo + 통계 + 리플레이 기반
5. **N≠2^k 처리**: 부전승(bye) 코어 설계에 포함
6. **접근성 상태**: announce/focus/keyboard 1급 관리

---

## 🚀 시작 방법

1. **요구사항 수신**: 사용자 요구사항 + `/docs/requirement.md` 저장
2. **분석**: 데이터, FSM, 액션, 엣지케이스 추출
3. **상태 설계**: Core State (최소화) + Derived State (계산)
4. **FSM 설계**: 모드 전이 다이어그램 작성
5. **이벤트 로그**: 액션 → 이벤트 매핑
6. **문서 작성**: `/docs/state-management.md` 생성
7. **구현 예시**: Zustand + 미들웨어 (persist, devtools, immer)
8. **피드백**: 사용자 확인 및 수정

---

**에이전트 버전**: v2.0
**최종 업데이트**: 2025-01-XX
**통합 플로우**: 01-PRD → 02-Userflow → 03-1-Tech Stack → 03-2-Architecture → 04-Dataflow & Schema → 05-UseCase → **06-1-State Management** → 06-2-Implementation
````