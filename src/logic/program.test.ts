import { describe, expect, it } from 'vitest'
import {
  advanceStage,
  backoffDelta,
  deloadSets,
  e1rm,
  firstAttempt,
  nextAfterSession,
  roundDown,
  stagePrescription,
  testResult,
  topDelta,
  warmups,
} from './program'

describe('처방', () => {
  it('S 단위 내림', () => {
    expect(roundDown(117.6, 5)).toBe(115)
    expect(roundDown(100, 2.5)).toBe(100)
    expect(roundDown(101.9, 2.5)).toBe(100)
  })
  it('1단계: 탑 84%, 백오프 69%', () => {
    expect(stagePrescription(140, 1, 5)).toEqual({ top: 115, backoff: 95 })
  })
  it('3단계: 탑 92%, 백오프 77%', () => {
    expect(stagePrescription(140, 3, 5)).toEqual({ top: 125, backoff: 105 })
  })
})

describe('RPE 조정', () => {
  it('탑세트: ≤8 +S, 9 유지, 9.5·10·실패 −S', () => {
    expect([6, 7, 8, 9, 9.5, 10, 'fail'].map((r) => topDelta(r as never))).toEqual([1, 1, 1, 0, -1, -1, -1])
  })
  it('백오프: ≤8 +S, 9 이상 유지, 실패 −S', () => {
    expect([8, 9, 9.5, 10, 'fail'].map((r) => backoffDelta(r as never))).toEqual([1, 0, 0, 0, -1])
  })
})

describe('추정 1RM', () => {
  it('115×3 @9 → 115×(1+4/30)', () => {
    expect(e1rm(115, 3, 9)).toBe(130.5)
  })
  it('실패는 제외', () => {
    expect(e1rm(115, 3, 'fail')).toBeNull()
  })
})

describe('웜업', () => {
  it('벤치 115 (2단계)', () => {
    expect(warmups(115, { lift: 'B', step: 5, bar: 20, unit: 'kg', heavy: false })).toEqual([
      { weight: 20, reps: 10 },
      { weight: 45, reps: 5 },
      { weight: 65, reps: 3 },
      { weight: 85, reps: 2 },
      { weight: 95, reps: 1 },
    ])
  })
  it('데드는 60kg×5로 시작, 40% 생략, 3단계면 92% 추가', () => {
    expect(warmups(180, { lift: 'D', step: 5, bar: 20, unit: 'kg', heavy: true })).toEqual([
      { weight: 60, reps: 5 },
      { weight: 105, reps: 3 },
      { weight: 135, reps: 2 },
      { weight: 150, reps: 1 },
      { weight: 165, reps: 1 },
    ])
  })
  it('가벼운 무게는 겹치는 단계 생략', () => {
    const w = warmups(40, { lift: 'B', step: 5, bar: 20, unit: 'kg', heavy: false })
    expect(w.map((s) => s.weight)).toEqual([20, 30])
  })
})

describe('세션 후 다음 처방', () => {
  const base = { oneRM: 140, stage: 2 as const, top: 125, backoff: 105, stall: 0 }
  it('탑 RPE 8 → +S, 백오프 9 → 유지', () => {
    const r = nextAfterSession(base, { topWeight: 125, topRpe: 8, boWeight: 105, boRpe: 9 }, 5)
    expect(r.next.top).toBe(130)
    expect(r.next.backoff).toBe(105)
    expect(r.next.stall).toBe(0)
    expect(r.advanced).toBe(false)
  })
  it('증량 없는 세션 2번 연속 → 다음 단계', () => {
    const r1 = nextAfterSession(base, { topWeight: 125, topRpe: 9, boWeight: 105, boRpe: 9 }, 5)
    expect(r1.next.stall).toBe(1)
    const r2 = nextAfterSession(r1.next, { topWeight: 125, topRpe: 10, boWeight: 105, boRpe: 9 }, 5)
    expect(r2.advanced).toBe(true)
    expect(r2.next.stage).toBe(3)
    expect(r2.next.top).toBe(125) // 140×0.92 = 128.8 → 125
  })
  it('3단계 다음은 테스트', () => {
    expect(advanceStage({ ...base, stage: 3 }, 5).stage).toBe(4)
  })
})

describe('테스트·디로드', () => {
  it('1차 시도 = 96%', () => {
    expect(firstAttempt(140, 5)).toBe(130)
  })
  it('최고 성공 중량, 낮으면 기존 유지', () => {
    expect(testResult(140, [{ weight: 135, ok: true }, { weight: 145, ok: true }, { weight: 150, ok: false }])).toBe(145)
    expect(testResult(140, [{ weight: 135, ok: true }, { weight: 140, ok: false }])).toBe(140)
  })
  it('디로드 65%, 데드는 2세트', () => {
    expect(deloadSets('B', 140, 5)).toEqual(Array(3).fill({ weight: 90, reps: 5 }))
    expect(deloadSets('D', 200, 5)).toHaveLength(2)
  })
})
