import type { LiftKey, Rpe, Unit } from './logic/program'
import { deloadSets, e1rm, roundDown, stepOf, testResult, warmups } from './logic/program'
import type { AfterResult, ProgramId } from './logic/programs'
import { atTest, programOf, sessionE1rm, toPlate, withMain } from './logic/programs'
import type { AppState, Body, LiftState, RestState, SessionLog, SetRow } from './store'
import { getState, initLift, progOf, setState, step, today, uid } from './store'

const row = (type: SetRow['type'], weight: number, reps: number, extra?: Partial<SetRow>): SetRow => ({
  id: uid(),
  type,
  weight,
  reps,
  done: false,
  gear: [],
  ...extra,
})

/** 오늘 훈련 시작 (정규 세션 또는 디로드) */
export function startWorkout(lift: LiftKey, deload = false) {
  const s = getState()
  const p = s.lifts[lift]
  const prog = progOf(s)
  const st = step(s)
  const { bar, unit } = s.settings
  let sets: SetRow[]
  if (deload) {
    const work = deloadSets(lift, p.oneRM, st)
    sets = [
      ...warmups(work[0].weight, { lift, step: st, bar, unit, heavy: false }).map((w) => row('W', w.weight, w.reps)),
      ...work.map((w) => row('B', w.weight, w.reps)),
    ]
  } else {
    const work = prog.sets(lift, p, st)
    const top = Math.max(...work.map((w) => w.weight))
    sets = [
      ...warmups(top, { lift, step: st, bar, unit, heavy: prog.heavy(p) }).map((w) => row('W', w.weight, w.reps)),
      ...work.map((w) => row(w.type, w.weight, w.reps, { goal: w.reps, ...(w.rpe ? {} : { noRpe: true }) })),
    ]
  }
  setState((x) => ({ ...x, active: { lift, program: prog.id, date: today(), stage: p.stage, deload, sets } }))
}

export function updateSets(fn: (sets: SetRow[]) => SetRow[]) {
  setState((x) => (x.active ? { ...x, active: { ...x.active, sets: fn(x.active.sets) } } : x))
}

export function cancelWorkout() {
  setState((x) => ({ ...x, active: undefined }))
}

/** 탑세트 RPE 10이면 그날 백오프 −S (아직 안 한 세트만, 한 번만) */
export function applyTopRpe(rowId: string, rpe: Rpe, got?: number) {
  const st = step(getState())
  updateSets((sets) => {
    const prev = sets.find((r) => r.id === rowId)
    const wasTen = prev?.rpe === 10
    let out = sets.map((r) => (r.id === rowId ? { ...r, rpe, got: rpe === 'fail' ? got : undefined, done: true } : r))
    if (prev?.type === 'T' && rpe === 10 && !wasTen) {
      out = out.map((r) => (r.type === 'B' && !r.done ? { ...r, weight: Math.max(st, +(r.weight - st).toFixed(2)) } : r))
    }
    return out
  })
}

/** 프로그램 결과를 종목 상태에 반영 (새 사이클이면 사이클 번호·시작일도) */
function applyResult(prog: ReturnType<typeof programOf>, lift: LiftKey, p: LiftState, r: AfterResult, st: number): LiftState {
  const next = withMain(prog, lift, r.next, st)
  return r.newCycle ? { ...p, ...next, cycleStart: today(), cycle: (p.cycle ?? 1) + 1 } : { ...p, ...next }
}

/** 기록 완료 → 세션 저장, 다음 처방 계산. 저장된 세션 id 반환 */
export function finishWorkout(): string | null {
  const s = getState()
  const a = s.active
  if (!a) return null
  const st = step(s)
  const p = s.lifts[a.lift]
  const prog = programOf(a.program)
  const est = sessionE1rm(a.sets)
  const log: SessionLog = { id: uid(), date: a.date, lift: a.lift, stage: a.stage, deload: a.deload, sets: a.sets, e1rm: est, cycle: p.cycle ?? 1, program: prog.id }
  let lifts = s.lifts
  if (!a.deload) {
    const r = prog.after(a.lift, p, a.sets, st)
    const np = applyResult(prog, a.lift, p, r, st)
    if (r !== null && (r.advanced || r.change !== 0 || r.next !== p)) {
      log.next = { top: np.top, backoff: np.backoff, topChange: r.change, boChange: r.boChange, advanced: r.advanced, stage: np.stage, newCycle: r.newCycle }
    }
    lifts = { ...lifts, [a.lift]: np }
  }
  setState((x) => ({ ...x, lifts, sessions: [...x.sessions, log], active: undefined }))
  return log.id
}

/** 다음 단계(주)로 */
export function goNextStage(lift: LiftKey) {
  const s = getState()
  const p = s.lifts[lift]
  const prog = progOf(s)
  const st = step(s)
  const np = applyResult(prog, lift, p, prog.advance(lift, p, st), st)
  setState((x) => ({ ...x, lifts: { ...x.lifts, [lift]: np } }))
}

/** 다음 단계로 넘기면 어떻게 되는지 (확인 팝업용) */
export function previewNextStage(s: AppState, lift: LiftKey) {
  const p = s.lifts[lift]
  const prog = progOf(s)
  const st = step(s)
  const r = prog.advance(lift, p, st)
  return { next: withMain(prog, lift, r.next, st), newCycle: r.newCycle }
}

/** 테스트 저장. mode: new = 새 사이클(처음부터), keep = 1RM만 갱신 */
export function finishTest(lift: LiftKey, attempts: { weight: number; ok: boolean }[], mode: 'new' | 'keep'): string {
  const s = getState()
  const p = s.lifts[lift]
  const newRM = testResult(p.oneRM, attempts)
  const id = uid()
  const lp: LiftState =
    mode === 'new' ? { ...initLift(s.settings.program, lift, newRM, step(s)), cycleStart: today(), cycle: (p.cycle ?? 1) + 1 } : { ...p, oneRM: newRM }
  setState((x) => ({
    ...x,
    lifts: { ...x.lifts, [lift]: lp },
    tests: [
      ...x.tests,
      {
        id,
        date: today(),
        lift,
        attempts,
        prevRM: p.oneRM,
        newRM,
        endedCycle: mode === 'new' ? p.cycleStart : undefined,
        cycleNo: mode === 'new' ? (p.cycle ?? 1) : undefined,
        program: s.settings.program ?? 'stlog',
      },
    ],
    rmHistory: [...x.rmHistory, { date: today(), lift, rm: newRM }],
  }))
  return id
}

/** 설정에서 1RM을 직접 바꾸면 지금 줄 처방도 다시 계산 */
export function setOneRM(lift: LiftKey, rm: number) {
  const s = getState()
  const p = s.lifts[lift]
  const prog = progOf(s)
  const st = step(s)
  const np = withMain(prog, lift, prog.rebase(lift, p, rm, st), st)
  setState((x) => ({
    ...x,
    lifts: { ...x.lifts, [lift]: { ...p, ...np } },
    rmHistory: [...x.rmHistory, { date: today(), lift, rm }],
  }))
}

/** 프로그램 바꾸기: 세 종목 모두 지금 1RM으로 새 사이클 */
export function setProgram(id: ProgramId) {
  const s = getState()
  const st = step(s)
  const lifts = Object.fromEntries(
    (Object.keys(s.lifts) as LiftKey[]).map((k) => {
      const p = s.lifts[k]
      return [k, { ...initLift(id, k, p.oneRM, st), cycleStart: today(), cycle: (p.cycle ?? 1) + 1 }]
    }),
  ) as typeof s.lifts
  setState((x) => ({ ...x, settings: { ...x.settings, program: id }, lifts }))
}

/** 성별·키·몸무게 */
export function setBody(body: Body) {
  setState((x) => ({ ...x, settings: { ...x.settings, body } }))
}

/** 오늘 1RM 테스트 날인지 */
export const testDay = (s: AppState, lift: LiftKey) => atTest(progOf(s), s.lifts[lift])

/** kg ↔ lb 바꾸기: 저장된 모든 무게를 환산 */
export function changeUnit(to: Unit) {
  const s = getState()
  if (s.settings.unit === to) return
  const f = to === 'lb' ? 2.2046 : 1 / 2.2046
  const half = (w: number) => Math.round(w * f * 2) / 2
  const five = (w: number) => Math.round((w * f) / 5) * 5
  const minPlate = 2.5
  const st = stepOf(minPlate)
  const conv = <T extends { weight: number }>(r: T): T => ({ ...r, weight: half(r.weight) })
  const lifts = Object.fromEntries(
    (Object.keys(s.lifts) as LiftKey[]).map((k) => {
      const p = s.lifts[k]
      const q = { ...p, oneRM: five(p.oneRM), top: roundDown(p.top * f, st), backoff: roundDown(p.backoff * f, st), ...(p.tm !== undefined ? { tm: roundDown(p.tm * f, st) } : {}) }
      return [k, withMain(progOf(s), k, q, st)]
    }),
  ) as typeof s.lifts
  setState((x) => ({
    ...x,
    settings: {
      ...x.settings,
      unit: to,
      minPlate,
      bar: to === 'lb' ? 45 : 20,
      goal: { S: five(x.settings.goal.S), B: five(x.settings.goal.B), D: five(x.settings.goal.D) },
      body: x.settings.body ? { ...x.settings.body, weight: Math.round(x.settings.body.weight * f * 2) / 2 } : undefined,
    },
    lifts,
    sessions: x.sessions.map((ss) => ({
      ...ss,
      sets: ss.sets.map(conv),
      e1rm: ss.e1rm === null ? null : half(ss.e1rm),
      next: ss.next ? { ...ss.next, top: half(ss.next.top), backoff: half(ss.next.backoff), topChange: half(ss.next.topChange), boChange: half(ss.next.boChange) } : undefined,
    })),
    tests: x.tests.map((t) => ({ ...t, attempts: t.attempts.map(conv), prevRM: five(t.prevRM), newRM: five(t.newRM) })),
    rmHistory: x.rmHistory.map((r) => ({ ...r, rm: five(r.rm) })),
    active: x.active ? { ...x.active, sets: x.active.sets.map(conv) } : undefined,
  }))
}

/** 원판 단위를 바꾸면 지금 처방이 어떻게 되는지 */
export function liftsAtPlate(s: AppState, minPlate: number): AppState['lifts'] {
  const st = stepOf(minPlate)
  const prog = progOf(s)
  return Object.fromEntries((Object.keys(s.lifts) as LiftKey[]).map((k) => [k, { ...s.lifts[k], ...toPlate(prog, k, s.lifts[k], st) }])) as AppState['lifts']
}

/** 원판 최소 단위 바꾸기. adjust면 지금 처방도 새 단위로 내림 */
export function setMinPlate(minPlate: number, adjust: boolean) {
  setState((x) => ({ ...x, settings: { ...x.settings, minPlate }, lifts: adjust ? liftsAtPlate(x, minPlate) : x.lifts }))
}

/** 쉬는 시간 상태 저장 (기록 중 화면을 나갔다 와도 이어진다) */
export function setRest(rest: RestState) {
  setState((x) => (x.active ? { ...x, active: { ...x.active, rest } } : x))
}

/** 지난 기록 수정 (기록만 바뀌고 지금 처방은 그대로) */
export function saveSession(id: string, sets: SetRow[]) {
  setState((x) => ({ ...x, sessions: x.sessions.map((ss) => (ss.id === id ? { ...ss, sets, e1rm: sessionE1rm(sets) ?? (ss.free ? roughE1rm(sets) : null) } : ss)) }))
}

/** RPE가 없는 기록: 가장 무거운 세트를 끝까지 한 것으로 보고 추정 */
function roughE1rm(sets: SetRow[]): number | null {
  const m = sets.filter((r) => r.type !== 'W' && r.done && r.reps > 0).reduce<SetRow | undefined>((a, r) => (!a || r.weight > a.weight ? r : a), undefined)
  return m ? e1rm(m.weight, m.reps, 10) : null
}

/** 지난 날짜에 기록 추가 (지금 처방은 그대로) */
export function addSession(d: { lift: LiftKey; program?: ProgramId; date: string; stage: number; deload: boolean; free?: boolean; sets: SetRow[] }) {
  const sets = d.sets.filter((r) => r.done)
  if (!sets.length) return
  setState((x) => ({
    ...x,
    sessions: [...x.sessions, { id: uid(), date: d.date, lift: d.lift, stage: d.stage as SessionLog['stage'], deload: d.deload, sets, e1rm: sessionE1rm(sets) ?? roughE1rm(sets), cycle: x.lifts[d.lift].cycle ?? 1, program: d.program, ...(d.free ? { free: true } : {}) }].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    ),
  }))
}

/** 지난 기록 삭제 (지금 처방은 그대로) */
export function deleteSession(id: string) {
  setState((x) => ({ ...x, sessions: x.sessions.filter((ss) => ss.id !== id) }))
}

/** 테스트 기록 수정 (기록만 바뀌고 지금 1RM·처방은 그대로) */
export function saveTest(id: string, attempts: { weight: number; ok: boolean }[]) {
  setState((x) => {
    const t = x.tests.find((tt) => tt.id === id)
    if (!t) return x
    const newRM = testResult(t.prevRM, attempts)
    // 이 테스트로 남긴 실제 1RM 기록도 같이 고친다
    let done = false
    const rmHistory = [...x.rmHistory]
      .reverse()
      .map((r) => {
        if (!done && r.lift === t.lift && r.date === t.date && r.rm === t.newRM) {
          done = true
          return { ...r, rm: newRM }
        }
        return r
      })
      .reverse()
    return { ...x, tests: x.tests.map((tt) => (tt.id === id ? { ...tt, attempts, newRM } : tt)), rmHistory }
  })
}

/** 테스트 기록 삭제 (지금 1RM·처방은 그대로) */
export function deleteTest(id: string) {
  setState((x) => {
    const t = x.tests.find((tt) => tt.id === id)
    if (!t) return x
    let done = false
    const rmHistory = [...x.rmHistory]
      .reverse()
      .filter((r) => {
        if (!done && r.lift === t.lift && r.date === t.date && r.rm === t.newRM) {
          done = true
          return false
        }
        return true
      })
      .reverse()
    return { ...x, tests: x.tests.filter((tt) => tt.id !== id), rmHistory }
  })
}
