import type { LiftKey, Rpe, Unit } from './logic/program'
import {
  STAGES,
  advanceStage,
  deloadSets,
  e1rm,
  newCycle,
  nextAfterSession,
  roundDown,
  stagePrescription,
  stepOf,
  testResult,
  warmups,
} from './logic/program'
import type { AppState, RestState, SessionLog, SetRow } from './store'
import { getState, setState, step, today, uid } from './store'

const row = (type: SetRow['type'], weight: number, reps: number): SetRow => ({
  id: uid(),
  type,
  weight,
  reps,
  done: false,
  gear: [],
})

/** 오늘 훈련 시작 (정규 세션 또는 디로드) */
export function startWorkout(lift: LiftKey, deload = false) {
  const s = getState()
  const p = s.lifts[lift]
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
    const stage = Math.min(3, p.stage) as 1 | 2 | 3
    const cfg = STAGES[stage]
    sets = [
      ...warmups(p.top, { lift, step: st, bar, unit, heavy: stage === 3 }).map((w) => row('W', w.weight, w.reps)),
      row('T', p.top, cfg.topReps),
      ...Array.from({ length: cfg.boSets }, () => row('B', p.backoff, cfg.boReps[lift])),
    ]
  }
  setState((x) => ({ ...x, active: { lift, date: today(), stage: p.stage, deload, sets } }))
}

export function updateSets(fn: (sets: SetRow[]) => SetRow[]) {
  setState((x) => (x.active ? { ...x, active: { ...x.active, sets: fn(x.active.sets) } } : x))
}

export function cancelWorkout() {
  setState((x) => ({ ...x, active: undefined }))
}

/** 탑세트 RPE 10이면 그날 백오프 −S (아직 안 한 세트만, 한 번만) */
export function applyTopRpe(rowId: string, rpe: Rpe) {
  const st = step(getState())
  updateSets((sets) => {
    const prev = sets.find((r) => r.id === rowId)
    const wasTen = prev?.rpe === 10
    let out = sets.map((r) => (r.id === rowId ? { ...r, rpe, done: true } : r))
    if (prev?.type === 'T' && rpe === 10 && !wasTen) {
      out = out.map((r) => (r.type === 'B' && !r.done ? { ...r, weight: Math.max(st, +(r.weight - st).toFixed(2)) } : r))
    }
    return out
  })
}

/** 기록 완료 → 세션 저장, 다음 처방 계산. 저장된 세션 id 반환 */
export function finishWorkout(): string | null {
  const s = getState()
  const a = s.active
  if (!a) return null
  const st = step(s)
  const p = s.lifts[a.lift]
  const done = a.sets.filter((r) => r.done)
  const top = [...done].reverse().find((r) => r.type === 'T' && r.rpe !== undefined)
  const bos = done.filter((r) => r.type === 'B' && r.rpe !== undefined)
  const bo = bos[bos.length - 1]
  const est = top && top.rpe !== undefined ? e1rm(top.weight, top.reps, top.rpe) : null

  const log: SessionLog = { id: uid(), date: a.date, lift: a.lift, stage: a.stage, deload: a.deload, sets: a.sets, e1rm: est, cycle: p.cycle ?? 1 }
  let lifts = s.lifts
  if (!a.deload && top && top.rpe !== undefined) {
    const r = nextAfterSession(
      p,
      { topWeight: top.weight, topRpe: top.rpe, boWeight: bo?.weight ?? p.backoff, boRpe: bo?.rpe ?? 9 },
      st,
    )
    log.next = {
      top: r.next.top,
      backoff: r.next.backoff,
      topChange: r.topChange,
      boChange: bo ? r.boChange : 0,
      advanced: r.advanced,
      stage: r.next.stage,
    }
    lifts = { ...lifts, [a.lift]: { ...p, ...r.next } }
  }
  setState((x) => ({ ...x, lifts, sessions: [...x.sessions, log], active: undefined }))
  return log.id
}

export function goNextStage(lift: LiftKey) {
  const s = getState()
  const p = s.lifts[lift]
  setState((x) => ({ ...x, lifts: { ...x.lifts, [lift]: { ...p, ...advanceStage(p, step(s)) } } }))
}

/** 테스트 저장. mode: new = 새 사이클(1단계), keep = 1RM만 갱신 */
export function finishTest(lift: LiftKey, attempts: { weight: number; ok: boolean }[], mode: 'new' | 'keep'): string {
  const s = getState()
  const p = s.lifts[lift]
  const newRM = testResult(p.oneRM, attempts)
  const id = uid()
  const lp =
    mode === 'new' ? { ...newCycle(newRM, step(s)), cycleStart: today(), cycle: (p.cycle ?? 1) + 1 } : { ...p, oneRM: newRM }
  setState((x) => ({
    ...x,
    lifts: { ...x.lifts, [lift]: lp },
    tests: [
      ...x.tests,
      { id, date: today(), lift, attempts, prevRM: p.oneRM, newRM, endedCycle: mode === 'new' ? p.cycleStart : undefined, cycleNo: mode === 'new' ? (p.cycle ?? 1) : undefined },
    ],
    rmHistory: [...x.rmHistory, { date: today(), lift, rm: newRM }],
  }))
  return id
}

/** 설정에서 1RM을 직접 바꾸면 지금 단계 처방도 다시 계산 */
export function setOneRM(lift: LiftKey, rm: number) {
  const s = getState()
  const p = s.lifts[lift]
  const presc = p.stage < 4 ? stagePrescription(rm, p.stage as 1 | 2 | 3, step(s)) : {}
  setState((x) => ({
    ...x,
    lifts: { ...x.lifts, [lift]: { ...p, oneRM: rm, ...presc } },
    rmHistory: [...x.rmHistory, { date: today(), lift, rm }],
  }))
}

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
      return [k, { ...p, oneRM: five(p.oneRM), top: roundDown(p.top * f, st), backoff: roundDown(p.backoff * f, st) }]
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

/** 쉬는 시간 상태 저장 (기록 중 화면을 나갔다 와도 이어진다) */
export function setRest(rest: RestState) {
  setState((x) => (x.active ? { ...x, active: { ...x.active, rest } } : x))
}

/** 세트 완료 여부·탑세트로 추정 1RM 다시 계산 */
function estOf(sets: SetRow[]): number | null {
  const top = [...sets].reverse().find((r) => r.done && r.type === 'T' && r.rpe !== undefined)
  return top && top.rpe !== undefined ? e1rm(top.weight, top.reps, top.rpe) : null
}

/** 지난 기록 수정 (기록만 바뀌고 지금 처방은 그대로) */
export function saveSession(id: string, sets: SetRow[]) {
  setState((x) => ({ ...x, sessions: x.sessions.map((ss) => (ss.id === id ? { ...ss, sets, e1rm: estOf(sets) } : ss)) }))
}

/** 지난 기록 삭제 (지금 처방은 그대로) */
export function deleteSession(id: string) {
  setState((x) => ({ ...x, sessions: x.sessions.filter((ss) => ss.id !== id) }))
}

/** 백업 파일 내용 */
export function backupJson(): string {
  return JSON.stringify({ app: 'stlog', version: 1, exportedAt: new Date().toISOString(), data: getState() })
}

/** 백업 파일 읽기: 맞으면 상태, 아니면 null */
export function parseBackup(text: string): { data: AppState; exportedAt: string } | null {
  try {
    const j = JSON.parse(text)
    if (j?.app !== 'stlog' || !j.data?.lifts || !Array.isArray(j.data.sessions)) return null
    return { data: j.data as AppState, exportedAt: String(j.exportedAt ?? '') }
  } catch {
    return null
  }
}

export function restoreBackup(data: AppState) {
  setState((x) => ({ ...x, ...data, onboarded: true, active: undefined, settings: { ...x.settings, ...data.settings } }))
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
