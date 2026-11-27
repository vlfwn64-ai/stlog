import { useSyncExternalStore } from 'react'
import type { LiftKey, LiftProgress, Rpe, SetType, Unit } from './logic/program'
import { stepOf } from './logic/program'
import type { ProgramId, Sex } from './logic/programs'
import { programOf, withMain } from './logic/programs'

export interface Settings {
  unit: Unit
  minPlate: number
  bar: number
  gear: string[]
  /** 직접 추가한 장비 이름 */
  customGear: string[]
  /** 목록에서 지운 기본 장비 */
  removedGear?: string[]
  goal: Record<LiftKey, number>
  /** 화면 테마 */
  theme: 'light' | 'dark' | 'system'
  /** 사용자가 테마를 직접 골랐는지 (안 골랐으면 시스템을 따른다) */
  themeChosen?: boolean
  /** 쉬는 시간 끝 알림음 (기본 켬) */
  sound?: boolean
  /** 언어 (없으면 기기 언어) */
  lang?: 'ko' | 'en'
  /** 훈련 프로그램 (없으면 ST LOG 기본) */
  program?: ProgramId
  /** 성별·키(cm)·몸무게(설정 단위) */
  body?: Body
}

export interface Body {
  sex: Sex
  height: number
  weight: number
}

export interface SetRow {
  id: string
  type: SetType
  weight: number
  reps: number
  done: boolean
  rpe?: Rpe
  gear: string[]
  /** 완료할 때 RPE를 묻지 않는 세트 */
  noRpe?: boolean
  /** 처방 횟수 (기록한 횟수와 비교해 성공·실패 판정) */
  goal?: number
  /** 실패한 세트에서 실제로 든 개수, 보조세트에서 혼자 든 개수 */
  got?: number
  /** 드롭세트: 이어서 내린 무게·횟수 */
  drops?: { weight: number; reps: number }[]
}

export interface ActiveWorkout {
  lift: LiftKey
  program?: ProgramId
  date: string
  stage: number
  deload: boolean
  sets: SetRow[]
  /** 쉬는 시간: endAt이 있으면 도는 중(끝나는 시각 ms), 없으면 멈춤(left초) */
  rest?: RestState
}

export interface RestState {
  base: number
  endAt: number | null
  left: number
}

export interface SessionLog {
  id: string
  date: string
  lift: LiftKey
  stage: number
  deload: boolean
  sets: SetRow[]
  e1rm: number | null
  cycle?: number
  /** 이 세션을 한 프로그램 */
  program?: ProgramId
  /** 자유 운동 (프로그램 밖에서 지난 날짜에 추가한 기록) */
  free?: boolean
  next?: { top: number; backoff: number; topChange: number; boChange: number; advanced: boolean; stage: number; newCycle?: boolean }
}

export interface TestLog {
  id: string
  date: string
  lift: LiftKey
  attempts: { weight: number; ok: boolean }[]
  prevRM: number
  newRM: number
  /** 이 테스트로 끝난 사이클의 시작일 (새 사이클을 시작한 경우) */
  endedCycle?: string
  /** 끝난 사이클 번호 */
  cycleNo?: number
  /** 테스트할 때 프로그램 */
  program?: ProgramId
}

export interface LiftState extends LiftProgress {
  cycleStart: string
  /** 사이클 번호 (1부터) */
  cycle?: number
}

export interface AppState {
  version: 1
  onboarded: boolean
  settings: Settings
  lifts: Record<LiftKey, LiftState>
  sessions: SessionLog[]
  tests: TestLog[]
  /** 실제 1RM 기록 (온보딩·테스트) */
  rmHistory: { date: string; lift: LiftKey; rm: number }[]
  active?: ActiveWorkout
  /** 마지막으로 바뀐 시각 (동기화 비교용, ms) */
  updatedAt?: number
}

const KEY = 'stlog:v1'

export const GEAR = ['벨트', '스트랩', '니슬리브', '니랩', '리스트랩', '엘보슬리브', '역도화']

/** 고를 수 있는 장비 전체 (기본 + 직접 추가) */
export const allGear = (s: Settings) => [...GEAR.filter((g) => !(s.removedGear ?? []).includes(g)), ...s.customGear.filter((g) => !GEAR.includes(g))]

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** 프로그램 첫 처방 (대표 무게까지 맞춘 것) */
export function initLift(program: ProgramId | undefined, lift: LiftKey, oneRM: number, step: number): LiftProgress {
  const prog = programOf(program)
  return withMain(prog, lift, prog.init(lift, oneRM, step), step)
}

export function initialLifts(now: Record<LiftKey, number>, minPlate: number, program?: ProgramId): Record<LiftKey, LiftState> {
  const step = stepOf(minPlate)
  const mk = (k: LiftKey): LiftState => ({ ...initLift(program, k, now[k], step), cycleStart: today(), cycle: 1 })
  return { S: mk('S'), B: mk('B'), D: mk('D') }
}

/** 지금 프로그램 */
export const progOf = (s: AppState) => programOf(s.settings.program)

function defaults(): AppState {
  const now = { S: 140, B: 100, D: 180 }
  return {
    version: 1,
    onboarded: false,
    settings: { unit: 'kg', minPlate: 2.5, bar: 20, gear: [], customGear: [], goal: { S: 200, B: 150, D: 250 }, theme: 'system' },
    lifts: initialLifts(now, 2.5),
    sessions: [],
    tests: [],
    rmHistory: [],
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = defaults()
      const p = JSON.parse(raw)
      const settings = { ...d.settings, ...p.settings }
      // 테마를 직접 고른 적이 없으면 기본은 시스템 설정
      if (!settings.themeChosen) settings.theme = 'system'
      return { ...d, ...p, settings }
    }
  } catch {
    /* 저장소를 못 읽으면 기본값 */
  }
  return defaults()
}

let state: AppState = load()
const listeners = new Set<() => void>()

export function getState() {
  return state
}

type ChangeListener = (fromCloud: boolean) => void
const changeListeners = new Set<ChangeListener>()
/** 기록이 바뀔 때마다 알림 (동기화용). fromCloud면 서버에서 받아온 변경 */
export function onChange(cb: ChangeListener) {
  changeListeners.add(cb)
  return () => changeListeners.delete(cb)
}

export function setState(fn: (s: AppState) => AppState, opts?: { fromCloud?: boolean }) {
  state = fn(state)
  if (!opts?.fromCloud) state = { ...state, updatedAt: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패는 무시 (사파리 개인정보 보호 모드 등) */
  }
  listeners.forEach((l) => l())
  changeListeners.forEach((l) => l(!!opts?.fromCloud))
}

export function resetAll() {
  setState(() => defaults())
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

export const step = (s: AppState) => stepOf(s.settings.minPlate)
