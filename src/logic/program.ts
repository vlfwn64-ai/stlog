// ST LOG 훈련 로직 — 화면과 무관한 순수 함수만 둔다.

export type LiftKey = 'S' | 'B' | 'D'
export type Unit = 'kg' | 'lb'
export type Stage = 1 | 2 | 3 | 4
export type SetType = 'W' | 'T' | 'B' | 'A' | 'D' | 'S' | 'F'
/** RPE 값. 'fail'은 실패 */
export type Rpe = 6 | 7 | 8 | 9 | 9.5 | 10 | 'fail'

export const LIFTS: LiftKey[] = ['S', 'B', 'D']

/** 단계별 탑세트 횟수·비율, 백오프 비율·세트수×횟수 */
export const STAGES = {
  1: { topReps: 5, topPct: 0.84, boPct: 0.69, boSets: 3, boReps: { S: 8, B: 8, D: 6 } },
  2: { topReps: 3, topPct: 0.89, boPct: 0.74, boSets: 3, boReps: { S: 6, B: 6, D: 5 } },
  3: { topReps: 2, topPct: 0.92, boPct: 0.77, boSets: 3, boReps: { S: 5, B: 5, D: 4 } },
} as const

/** 디로드 세트 (오늘 1RM의 65%) */
export const DELOAD = { pct: 0.65, sets: 3, reps: { S: 5, B: 5, D: 5 }, setsD: 2 }

/** 증량 폭 S = 최소 원판 × 2 */
export const stepOf = (minPlate: number) => minPlate * 2

/** S 단위로 내림 (부동소수 오차 보정) */
export function roundDown(w: number, step: number): number {
  const n = Math.floor(w / step + 1e-9)
  return +(n * step).toFixed(2)
}

export interface Prescription {
  top: number
  backoff: number
}

/** 단계 시작 시 처방 = 1RM × 단계 비율 (S 단위 내림) */
export function stagePrescription(oneRM: number, stage: 1 | 2 | 3, step: number): Prescription {
  const s = STAGES[stage]
  return { top: roundDown(oneRM * s.topPct, step), backoff: roundDown(oneRM * s.boPct, step) }
}

/** 탑세트 RPE → 다음 세션 증감 (+1 / 0 / −1 단위 S) */
export function topDelta(rpe: Rpe): -1 | 0 | 1 {
  if (rpe === 'fail') return -1
  if (rpe <= 8) return 1
  if (rpe === 9) return 0
  return -1 // 9.5, 10
}

/** 백오프 마지막 세트 RPE → 다음 세션 증감 */
export function backoffDelta(rpe: Rpe): -1 | 0 | 1 {
  if (rpe === 'fail') return -1
  if (rpe <= 8) return 1
  return 0
}

/** 추정 1RM: w × (1 + (reps + RIR)/30). 실패면 null */
export function e1rm(weight: number, reps: number, rpe: Rpe): number | null {
  if (rpe === 'fail' || reps <= 0) return null
  const rir = 10 - rpe
  return Math.round(weight * (1 + (reps + rir) / 30) * 2) / 2
}

export interface WarmSet {
  weight: number
  reps: number
}

/**
 * 웜업 계산 (탑세트/1차 시도 무게 기준)
 * 빈 바×10 (데드는 60kg/135lb×5) → 40%×5(데드 제외) → 60%×3 → 75%×2 → 85%×1 → 92%×1(3단계·테스트)
 * S 단위 내림, 중복·이전보다 가볍거나 같은 단계·목표 이상은 생략
 */
export function warmups(
  target: number,
  opts: { lift: LiftKey; step: number; bar: number; unit: Unit; heavy: boolean },
): WarmSet[] {
  const { lift, step, bar, unit, heavy } = opts
  const out: WarmSet[] = []
  const first = lift === 'D' ? { weight: unit === 'kg' ? 60 : 135, reps: 5 } : { weight: bar, reps: 10 }
  if (first.weight < target) out.push(first)
  const steps: [number, number][] = [
    [0.4, 5],
    [0.6, 3],
    [0.75, 2],
    [0.85, 1],
  ]
  if (heavy) steps.push([0.92, 1])
  for (const [pct, reps] of steps) {
    if (lift === 'D' && pct === 0.4) continue
    const w = roundDown(target * pct, step)
    const last = out.length ? out[out.length - 1].weight : bar
    if (w <= last || w <= bar || w >= target) continue
    out.push({ weight: w, reps })
  }
  return out
}

/** 테스트 1차 시도 = 지금 1RM의 96% (S 단위 내림) */
export const firstAttempt = (oneRM: number, step: number) => roundDown(oneRM * 0.96, step)

export interface SessionOutcome {
  /** 탑세트 실제 무게 */
  topWeight: number
  topRpe: Rpe
  /** 백오프 마지막 세트 실제 무게 */
  boWeight: number
  boRpe: Rpe
}

export interface LiftProgress {
  oneRM: number
  stage: Stage
  top: number
  backoff: number
  /** 증량 없이 끝난 연속 세션 수 */
  stall: number
}

/**
 * 세션 결과로 다음 처방 계산.
 * 탑세트 증량이 없던 세션이 2번 연속이면 다음 단계로 자동 전환.
 */
export function nextAfterSession(
  p: LiftProgress,
  o: SessionOutcome,
  step: number,
): { next: LiftProgress; topChange: number; boChange: number; advanced: boolean } {
  const td = topDelta(o.topRpe)
  const bd = backoffDelta(o.boRpe)
  const top = Math.max(step, +(o.topWeight + td * step).toFixed(2))
  const backoff = Math.max(step, +(o.boWeight + bd * step).toFixed(2))
  const stall = td > 0 ? 0 : p.stall + 1
  let next: LiftProgress = { ...p, top, backoff, stall }
  let advanced = false
  if (stall >= 2 && p.stage < 4) {
    next = advanceStage(next, step)
    advanced = true
  }
  return { next, topChange: +(top - o.topWeight).toFixed(2), boChange: +(backoff - o.boWeight).toFixed(2), advanced }
}

/** 다음 단계로 (1→2→3→4 테스트) */
export function advanceStage(p: LiftProgress, step: number): LiftProgress {
  if (p.stage >= 3) return { ...p, stage: 4, stall: 0 }
  const stage = (p.stage + 1) as 1 | 2 | 3
  return { ...p, stage, stall: 0, ...stagePrescription(p.oneRM, stage, step) }
}

/** 새 사이클 시작 (1단계) */
export function newCycle(oneRM: number, step: number): LiftProgress {
  return { oneRM, stage: 1, stall: 0, ...stagePrescription(oneRM, 1, step) }
}

/** 테스트 결과 → 새 1RM (최고 성공 중량, 기존보다 낮으면 유지) */
export function testResult(prevRM: number, attempts: { weight: number; ok: boolean }[]): number {
  const best = attempts.filter((a) => a.ok).reduce((m, a) => Math.max(m, a.weight), 0)
  return Math.max(prevRM, best)
}

/** 오늘 디로드 세트 */
export function deloadSets(lift: LiftKey, oneRM: number, step: number): WarmSet[] {
  const w = roundDown(oneRM * DELOAD.pct, step)
  const n = lift === 'D' ? DELOAD.setsD : DELOAD.sets
  return Array.from({ length: n }, () => ({ weight: w, reps: DELOAD.reps[lift] }))
}
