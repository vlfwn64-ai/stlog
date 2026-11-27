// 프로그램 6종 (초급·중급·고급 × 2). 화면과 무관한 순수 함수만 둔다.
// 모든 프로그램은 같은 LiftProgress를 쓰고, stage = 이번 사이클의 몇 번째 줄인지.
// top·backoff는 화면에 보여줄 대표 무게(withMain으로 맞춘다), tm은 5/3/1 방식의 트레이닝 맥스.
import { L } from '../i18n'
import type { LiftKey, LiftProgress, Rpe, SetType, Stage } from './program'
import { STAGES, advanceStage, e1rm, nextAfterSession, roundDown, stagePrescription, topDelta } from './program'

export type ProgramId = 'linear' | 'gzclp' | 'stlog' | '531' | 'rpe1' | 'block6'
export type Level = 0 | 1 | 2

/** 처방 세트 하나. type 'A'는 암렙(정한 횟수 이상 할 수 있는 만큼) */
export interface WorkSet {
  type: SetType
  weight: number
  reps: number
  /** 완료할 때 RPE를 묻는지 */
  rpe: boolean
}

/** 기록된 세트 (세션 결과 판정용) */
export interface DoneSet {
  type: SetType
  weight: number
  reps: number
  done: boolean
  rpe?: Rpe
  goal?: number
  /** 실패한 세트에서 실제로 든 개수 */
  got?: number
}

export interface Phase {
  n: Stage
  label: string
  /** 줄 이름 아래 작은 글씨 (예: 5+) */
  sub?: string
  test?: boolean
}

export interface AfterResult {
  next: LiftProgress
  /** 대표 무게 변화 */
  change: number
  /** 백오프 무게 변화 (ST LOG 기본만) */
  boChange: number
  /** 다음 줄(단계·주)로 넘어갔는지 */
  advanced: boolean
  /** 새 사이클이 시작됐는지 (5/3/1 방식 4주 끝) */
  newCycle: boolean
}

export interface Program {
  id: ProgramId
  level: Level
  /** 이 수준의 추천 프로그램 */
  rec: boolean
  name: () => string
  desc: () => string
  flow: () => string
  phases: (lift: LiftKey) => Phase[]
  /** 이 줄이면 오늘은 1RM 테스트 (없으면 null) */
  testStage: Stage | null
  /** '다음 단계로' 버튼 */
  canAdvance: boolean
  advanceLabel: () => string
  init: (lift: LiftKey, oneRM: number, step: number) => LiftProgress
  /** 1RM을 직접 바꿨을 때 지금 줄 처방을 다시 계산 */
  rebase: (lift: LiftKey, p: LiftProgress, oneRM: number, step: number) => LiftProgress
  sets: (lift: LiftKey, p: LiftProgress, step: number) => WorkSet[]
  after: (lift: LiftKey, p: LiftProgress, done: DoneSet[], step: number) => AfterResult
  advance: (lift: LiftKey, p: LiftProgress, step: number) => AfterResult
  /** 웜업을 92%까지 하는지 */
  heavy: (p: LiftProgress) => boolean
}

const work = (done: DoneSet[]) => done.filter((r) => r.type !== 'W')
const lastRpe = (done: DoneSet[], type: SetType) => [...done].reverse().find((r) => r.type === type && r.done && r.rpe !== undefined)
/** 하체(스쿼트·데드)는 증량 2배 */
const incOf = (lift: LiftKey, step: number) => (lift === 'B' ? step : 2 * step)
const add = (w: number, d: number, step: number) => Math.max(step, +(w + d).toFixed(2))
const same = (p: LiftProgress): AfterResult => ({ next: p, change: 0, boChange: 0, advanced: false, newCycle: false })
const rep = (n: number, s: WorkSet) => Array.from({ length: n }, () => ({ ...s }))
/** 정한 횟수를 다 했는지 (세트를 안 했거나, 횟수가 모자라거나, 실패면 false) */
const allMade = (done: DoneSet[], goal: number) => {
  const w = work(done)
  return w.length > 0 && w.every((r) => r.done && r.reps >= (r.goal ?? goal) && r.rpe !== 'fail')
}

// ───────── 중급: ST LOG 기본 (탑세트 + 백오프, RPE) ─────────
const stlog: Program = {
  id: 'stlog',
  level: 1,
  rec: true,
  name: () => L('ST LOG 기본', 'ST LOG Classic'),
  desc: () => L('탑세트 하나와 백오프. 세트가 끝나면 RPE만 고르면 다음 무게를 앱이 정해요.', 'One top set plus back-offs. Just pick an RPE and the app sets your next weights.'),
  flow: () => L('5회 → 3회 → 2회 → 테스트', '5s → 3s → 2s → test'),
  phases: () => [
    { n: 1, label: L('5회', '5s') },
    { n: 2, label: L('3회', '3s') },
    { n: 3, label: L('2회', '2s') },
    { n: 4, label: L('1회', '1RM'), test: true },
  ],
  testStage: 4,
  canAdvance: true,
  advanceLabel: () => L('다음 단계로', 'Next stage'),
  init: (_l, oneRM, step) => ({ oneRM, stage: 1, stall: 0, ...stagePrescription(oneRM, 1, step) }),
  rebase: (_l, p, oneRM, step) => ({ ...p, oneRM, ...(p.stage < 4 ? stagePrescription(oneRM, p.stage as 1 | 2 | 3, step) : {}) }),
  sets: (lift, p) => {
    const c = STAGES[Math.min(3, p.stage) as 1 | 2 | 3]
    return [{ type: 'T', weight: p.top, reps: c.topReps, rpe: true }, ...rep(c.boSets, { type: 'B', weight: p.backoff, reps: c.boReps[lift], rpe: true })]
  },
  after: (_l, p, done, step) => {
    const top = lastRpe(done, 'T')
    if (!top || top.rpe === undefined) return same(p)
    const bo = lastRpe(done, 'B')
    const r = nextAfterSession(p, { topWeight: top.weight, topRpe: top.rpe, boWeight: bo?.weight ?? p.backoff, boRpe: bo?.rpe ?? 9 }, step)
    return { next: r.next, change: r.topChange, boChange: bo ? r.boChange : 0, advanced: r.advanced, newCycle: false }
  },
  advance: (_l, p, step) => ({ ...same(advanceStage(p, step)), advanced: true }),
  heavy: (p) => p.stage >= 3,
}

// ───────── 초급: 선형 5×5 (성공하면 매번 증량) ─────────
const linear: Program = {
  id: 'linear',
  level: 0,
  rec: true,
  name: () => L('선형 5×5', 'Linear 5×5'),
  desc: () => L('성공하면 매 훈련 무게를 조금씩 올려요. 막 시작했을 때 가장 빨리 늘어요.', 'Add a little weight every session you make it. The fastest way to grow when you’re new.'),
  flow: () => L('5회 × 5세트 · 매번 증량', '5×5 · add weight each time'),
  phases: (lift) => [{ n: 1, label: lift === 'D' ? '1×5' : '5×5' }],
  testStage: null,
  canAdvance: false,
  advanceLabel: () => '',
  init: (_l, oneRM, step) => {
    const top = roundDown(oneRM * 0.7, step)
    return { oneRM, stage: 1, stall: 0, top, backoff: top }
  },
  rebase: (l, p, oneRM, step) => ({ ...p, ...linear.init(l, oneRM, step), stage: p.stage }),
  sets: (lift, p) => {
    const n = lift === 'D' ? 1 : 5
    return Array.from({ length: n }, (_, i) => ({ type: 'T' as SetType, weight: p.top, reps: 5, rpe: i === n - 1 }))
  },
  after: (lift, p, done, step) => {
    if (!work(done).some((r) => r.done)) return same(p)
    let top = p.top
    let stall = p.stall
    if (allMade(done, 5)) {
      top = add(top, incOf(lift, step), step)
      stall = 0
    } else if (++stall >= 3) {
      // 같은 무게에서 3번 실패하면 10% 내려서 다시
      top = Math.max(step, roundDown(top * 0.9, step))
      stall = 0
    }
    return { next: { ...p, top, backoff: top, stall }, change: +(top - p.top).toFixed(2), boChange: 0, advanced: false, newCycle: false }
  },
  advance: (_l, p) => same(p),
  heavy: () => false,
}

// ───────── 초급: GZCLP 방식 (막히면 세트 구성을 바꿔서 이어감) ─────────
const GZ: Record<1 | 2 | 3, [number, number]> = { 1: [5, 3], 2: [6, 2], 3: [10, 1] }
const gzclp: Program = {
  id: 'gzclp',
  level: 0,
  rec: false,
  name: () => L('GZCLP 방식', 'GZCLP-style'),
  desc: () => L('무거운 세트로 시작하고, 막히면 세트 구성을 바꿔서 계속 올려요.', 'Start heavy, and when you stall, change the set scheme and keep adding weight.'),
  flow: () => '5×3 → 6×2 → 10×1',
  phases: () => [
    { n: 1, label: '5×3', sub: '3+' },
    { n: 2, label: '6×2', sub: '2+' },
    { n: 3, label: '10×1', sub: '1+' },
    { n: 4, label: L('1회', '1RM'), test: true },
  ],
  testStage: 4,
  canAdvance: true,
  advanceLabel: () => L('다음 단계로', 'Next stage'),
  init: (_l, oneRM, step) => {
    const top = roundDown(oneRM * 0.75, step)
    return { oneRM, stage: 1, stall: 0, top, backoff: top }
  },
  rebase: (l, p, oneRM, step) => ({ ...p, ...gzclp.init(l, oneRM, step), stage: p.stage }),
  sets: (_l, p) => {
    const [n, reps] = GZ[Math.min(3, p.stage) as 1 | 2 | 3]
    return [...rep(n - 1, { type: 'T', weight: p.top, reps, rpe: false }), { type: 'A', weight: p.top, reps, rpe: false }]
  },
  after: (lift, p, done, step) => {
    if (!work(done).some((r) => r.done)) return same(p)
    const reps = GZ[Math.min(3, p.stage) as 1 | 2 | 3][1]
    if (allMade(done, reps)) {
      const top = add(p.top, incOf(lift, step), step)
      return { next: { ...p, top, backoff: top, stall: 0 }, change: +(top - p.top).toFixed(2), boChange: 0, advanced: false, newCycle: false }
    }
    // 실패: 같은 무게로 다음 구성 (10×1에서도 실패하면 테스트)
    return gzclp.advance(lift, p, step)
  },
  advance: (_l, p) => ({ ...same({ ...p, stage: Math.min(4, p.stage + 1) as Stage, stall: 0 }), advanced: true }),
  heavy: (p) => p.stage >= 3,
}

// ───────── 중급: 5/3/1 방식 (트레이닝 맥스 × 주차별 %) ─────────
const W531: Record<1 | 2 | 3 | 4, [number, number][]> = {
  1: [
    [0.65, 5],
    [0.75, 5],
    [0.85, 5],
  ],
  2: [
    [0.7, 3],
    [0.8, 3],
    [0.9, 3],
  ],
  3: [
    [0.75, 5],
    [0.85, 3],
    [0.95, 1],
  ],
  4: [
    [0.4, 5],
    [0.5, 5],
    [0.6, 5],
  ],
}
const tmOf = (p: LiftProgress, step: number) => p.tm ?? roundDown(p.oneRM * 0.9, step)
const p531: Program = {
  id: '531',
  level: 1,
  rec: false,
  name: () => L('5/3/1 방식', '5/3/1-style'),
  desc: () => L('4주 단위로 돌아요. 주마다 마지막 세트는 할 수 있는 만큼(암렙).', 'Runs in 4-week waves. The last set each week is as many reps as you can (AMRAP).'),
  flow: () => L('1주 5+ → 2주 3+ → 3주 1+ → 디로드', 'Wk1 5+ → Wk2 3+ → Wk3 1+ → deload'),
  phases: () => [
    { n: 1, label: L('1주', 'Wk 1'), sub: '5+' },
    { n: 2, label: L('2주', 'Wk 2'), sub: '3+' },
    { n: 3, label: L('3주', 'Wk 3'), sub: '1+' },
    { n: 4, label: L('디로드', 'Deload'), sub: '5' },
  ],
  testStage: null,
  canAdvance: true,
  advanceLabel: () => L('다음 주로', 'Next week'),
  init: (_l, oneRM, step) => ({ oneRM, stage: 1, stall: 0, tm: roundDown(oneRM * 0.9, step), fail: false, top: 0, backoff: 0 }),
  rebase: (_l, p, oneRM, step) => ({ ...p, oneRM, tm: roundDown(oneRM * 0.9, step) }),
  sets: (_l, p, step) => {
    const tm = tmOf(p, step)
    const wk = W531[p.stage as 1 | 2 | 3 | 4]
    const main: WorkSet[] = wk.map(([pct, reps], i) => ({ type: i === 2 && p.stage < 4 ? 'A' : 'T', weight: roundDown(tm * pct, step), reps, rpe: false }))
    // 첫 세트 무게로 5×5 (FSL)
    const fsl = p.stage < 4 ? rep(5, { type: 'B', weight: main[0].weight, reps: 5, rpe: false }) : []
    return [...main, ...fsl]
  },
  after: (lift, p, done, step) => {
    if (!work(done).some((r) => r.done)) return same(p)
    let fail = p.fail ?? false
    if (p.stage === 3) {
      const a = done.find((r) => r.type === 'A')
      fail = !a || !a.done || a.reps < 1 || a.rpe === 'fail'
    }
    return p531.advance(lift, { ...p, fail }, step)
  },
  advance: (lift, p, step) => {
    if (p.stage < 4) return { ...same({ ...p, stage: (p.stage + 1) as Stage }), advanced: true }
    // 4주가 끝나면 새 사이클: TM을 올린다 (3주차 암렙을 못 했으면 10% 내림)
    const tm0 = tmOf(p, step)
    const tm = p.fail ? roundDown(tm0 * 0.9, step) : add(tm0, incOf(lift, step), step)
    return { next: { ...p, stage: 1, tm, fail: false }, change: 0, boChange: 0, advanced: true, newCycle: true }
  },
  heavy: () => false,
}

// ───────── 고급: RPE 탑싱글 (RPE 8 싱글 + 백오프) ─────────
const SINGLE: Record<string, number> = { 6: 2, 7: 1, 8: 1, 9: 0, 9.5: -1, 10: -2, fail: -2 }
const rpe1: Program = {
  id: 'rpe1',
  level: 2,
  rec: true,
  name: () => L('RPE 탑싱글', 'RPE Top Single'),
  desc: () => L('RPE 8 싱글로 그날 컨디션을 재고, 그 무게를 기준으로 백오프를 해요.', 'Gauge the day with a single at RPE 8, then do back-offs off that weight.'),
  flow: () => L('탑싱글 @8 → 백오프', 'Top single @8 → back-offs'),
  phases: () => [{ n: 1, label: L('싱글', 'Single'), sub: '@8' }],
  testStage: null,
  canAdvance: false,
  advanceLabel: () => '',
  init: (_l, oneRM, step) => {
    const top = roundDown(oneRM * 0.9, step)
    return { oneRM, stage: 1, stall: 0, top, backoff: roundDown(top * 0.82, step) }
  },
  rebase: (l, p, oneRM, step) => ({ ...p, ...rpe1.init(l, oneRM, step), stage: p.stage }),
  sets: (lift, p, step) => [
    { type: 'T', weight: p.top, reps: 1, rpe: true },
    ...rep(lift === 'D' ? 3 : 4, { type: 'B', weight: roundDown(p.top * 0.82, step), reps: lift === 'D' ? 4 : 5, rpe: false }),
  ],
  after: (_l, p, done, step) => {
    const t = lastRpe(done, 'T')
    if (!t || t.rpe === undefined) return same(p)
    const top = add(t.weight, (SINGLE[String(t.rpe)] ?? 0) * step, step)
    return { next: { ...p, top, backoff: roundDown(top * 0.82, step) }, change: +(top - t.weight).toFixed(2), boChange: 0, advanced: false, newCycle: false }
  },
  advance: (_l, p) => same(p),
  heavy: () => true,
}

// ───────── 고급: 6주 블록 (볼륨 → 강도 → 피킹 → 테스트) ─────────
const BLOCK: Record<1 | 2 | 3, { pct: number; sets: number; reps: number; n: number }> = {
  1: { pct: 0.75, sets: 4, reps: 6, n: 2 },
  2: { pct: 0.85, sets: 4, reps: 3, n: 2 },
  3: { pct: 0.9, sets: 3, reps: 2, n: 1 },
}
const blockAt = (p: LiftProgress, stage: Stage, step: number): LiftProgress => {
  if (stage >= 4) return { ...p, stage: 4, count: 0 }
  const top = roundDown(p.oneRM * BLOCK[stage as 1 | 2 | 3].pct, step)
  return { ...p, stage, count: 0, top, backoff: top }
}
const block6: Program = {
  id: 'block6',
  level: 2,
  rec: false,
  name: () => L('6주 블록', '6-Week Block'),
  desc: () => L('볼륨에서 강도로 무게를 끌어올리고 6주째에 1RM을 테스트해요.', 'Build from volume to intensity, then test your 1RM in week 6.'),
  flow: () => L('볼륨 2주 → 강도 2주 → 피킹 → 테스트', 'Volume 2 wk → Intensity 2 wk → Peak → Test'),
  phases: (lift) => [
    { n: 1, label: L('볼륨', 'Vol.'), sub: `${BLOCK[1].sets - (lift === 'D' ? 1 : 0)}×${BLOCK[1].reps}` },
    { n: 2, label: L('강도', 'Int.'), sub: `${BLOCK[2].sets - (lift === 'D' ? 1 : 0)}×${BLOCK[2].reps}` },
    { n: 3, label: L('피킹', 'Peak'), sub: `${BLOCK[3].sets - (lift === 'D' ? 1 : 0)}×${BLOCK[3].reps}` },
    { n: 4, label: L('1회', '1RM'), test: true },
  ],
  testStage: 4,
  canAdvance: true,
  advanceLabel: () => L('다음 단계로', 'Next stage'),
  init: (_l, oneRM, step) => blockAt({ oneRM, stage: 1, stall: 0, top: 0, backoff: 0 }, 1, step),
  rebase: (_l, p, oneRM, step) => ({ ...blockAt({ ...p, oneRM }, p.stage, step), count: p.count ?? 0 }),
  sets: (lift, p) => {
    const b = BLOCK[Math.min(3, p.stage) as 1 | 2 | 3]
    const n = b.sets - (lift === 'D' ? 1 : 0)
    return Array.from({ length: n }, (_, i) => ({ type: 'T' as SetType, weight: p.top, reps: b.reps, rpe: i === n - 1 }))
  },
  after: (_l, p, done, step) => {
    if (!work(done).some((r) => r.done)) return same(p)
    const t = lastRpe(done, 'T')
    const top = t && t.rpe !== undefined ? add(t.weight, topDelta(t.rpe) * step, step) : p.top
    const count = (p.count ?? 0) + 1
    if (p.stage < 4 && count >= BLOCK[Math.min(3, p.stage) as 1 | 2 | 3].n) {
      const next = blockAt(p, (p.stage + 1) as Stage, step)
      return { next, change: +((next.top || p.top) - p.top).toFixed(2), boChange: 0, advanced: true, newCycle: false }
    }
    return { next: { ...p, top, backoff: top, count }, change: +(top - p.top).toFixed(2), boChange: 0, advanced: false, newCycle: false }
  },
  advance: (_l, p, step) => ({ ...same(blockAt(p, Math.min(4, p.stage + 1) as Stage, step)), advanced: true }),
  heavy: (p) => p.stage >= 3,
}

export const PROGRAMS: Program[] = [linear, gzclp, stlog, p531, rpe1, block6]
export const programOf = (id?: ProgramId): Program => PROGRAMS.find((x) => x.id === id) ?? stlog
export const byLevel = (lv: Level) => PROGRAMS.filter((x) => x.level === lv)
export const levelName = (lv: Level) => [L('초급', 'Novice'), L('중급', 'Intermediate'), L('고급', 'Advanced')][lv]
export const levelHint = (lv: Level) =>
  [L('3대를 해본 지 6개월 미만', 'Under 6 months of lifting'), L('6개월~2년, 매번 증량이 어려워졌을 때', '6 months–2 years, when adding weight every time gets hard'), L('2년 이상', 'Over 2 years')][lv]

export type Sex = 'm' | 'f'
/** 3대 합계 ÷ 체중으로 추천 수준 (남성 3.5·5배, 여성 2.5·3.75배) */
export function recommendLevel(total: number, bodyweight: number, sex: Sex): Level {
  const r = bodyweight > 0 ? total / bodyweight : 0
  const [a, b] = sex === 'f' ? [2.5, 3.75] : [3.5, 5]
  return r < a ? 0 : r < b ? 1 : 2
}

/** 오늘 1RM 테스트 날인지 */
export const atTest = (prog: Program, p: LiftProgress) => prog.testStage !== null && p.stage === prog.testStage

/** 대표(가장 무거운) 처방 세트 */
export function mainSet(prog: Program, lift: LiftKey, p: LiftProgress, step: number): WorkSet | null {
  if (atTest(prog, p)) return null
  const s = prog.sets(lift, p, step)
  return s.reduce<WorkSet | null>((m, x) => (!m || x.weight > m.weight ? x : m), null)
}

/** "3" / "3+" */
export const repsText = (s: WorkSet) => `${s.reps}${s.type === 'A' ? '+' : ''}`

/** 화면에 보여줄 대표 무게(top)·백오프(backoff)를 처방에 맞춘다 */
export function withMain(prog: Program, lift: LiftKey, p: LiftProgress, step: number): LiftProgress {
  if (atTest(prog, p)) return p
  const s = prog.sets(lift, p, step)
  const m = mainSet(prog, lift, p, step)
  const bo = s.find((x) => x.type === 'B')
  return { ...p, top: m?.weight ?? p.top, backoff: bo?.weight ?? m?.weight ?? p.backoff }
}

/** 원판 단위가 바뀌었을 때 지금 처방을 새 단위로 내림 */
export function toPlate(prog: Program, lift: LiftKey, p: LiftProgress, step: number): LiftProgress {
  const q = { ...p, top: roundDown(p.top, step), backoff: roundDown(p.backoff, step), ...(p.tm !== undefined ? { tm: roundDown(p.tm, step) } : {}) }
  return withMain(prog, lift, q, step)
}

/** 줄 이름 (기록·결과 화면 부제목용) */
export function phaseTitle(prog: Program, lift: LiftKey, stage: number): string {
  const ph = prog.phases(lift).find((x) => x.n === stage)
  if (!ph) return ''
  if (ph.test) return L('1RM 테스트', '1RM test')
  if (prog.id === 'stlog') {
    const reps = STAGES[Math.min(3, stage) as 1 | 2 | 3].topReps
    return L(`${stage}단계 · ${reps}회 탑`, `Stage ${stage} · Top ${reps}`)
  }
  return ph.sub ? `${ph.label} ${ph.sub}` : ph.label
}

/** 세션 추정 1RM: RPE 있는 탑세트, 없으면 암렙 세트 */
export function sessionE1rm(sets: DoneSet[]): number | null {
  const top = [...sets].reverse().find((r) => r.done && r.type === 'T' && r.rpe !== undefined)
  if (top && top.rpe === 'fail') {
    // 실패: 실제로 든 개수가 있으면 그 개수를 한계(RPE 10)로 본다
    if (top.got) return e1rm(top.weight, top.got, 10)
  } else if (top && top.rpe !== undefined) return e1rm(top.weight, top.reps, top.rpe)
  const a = [...sets].reverse().find((r) => r.done && r.type === 'A' && r.reps > 0 && r.rpe !== 'fail')
  return a ? e1rm(a.weight, a.reps, 10) : null
}

/** 같은 종류·무게·횟수 세트를 묶는다 (예: 백오프 85 × 6 × 3) */
export function groupSets(sets: WorkSet[]): (WorkSet & { count: number })[] {
  const out: (WorkSet & { count: number })[] = []
  for (const s of sets) {
    const last = out[out.length - 1]
    if (last && last.type === s.type && last.weight === s.weight && last.reps === s.reps) last.count++
    else out.push({ ...s, count: 1 })
  }
  return out
}

/** 줄 짧은 이름 (결과 칩용): ST LOG 기본은 "2단계", 나머지는 "2주 3+" */
export function phaseChip(prog: Program, lift: LiftKey, stage: number): string {
  const ph = prog.phases(lift).find((x) => x.n === stage)
  if (!ph) return ''
  if (ph.test) return 'TEST'
  if (prog.id === 'stlog') return L(`${stage}단계`, `Stage ${stage}`)
  return ph.sub ? `${ph.label} ${ph.sub}` : ph.label
}
