import type { LiftKey } from './logic/program'

/** 운동 목록 한 줄 (src/data/exercises.json) */
export interface Exercise {
  id: string
  /** 한국어 이름 */
  ko: string
  /** 영어 이름 */
  en: string
  /** 장비 */
  eq: string
  /** 주동근 */
  mus: string[]
  /** 보조근 */
  sec: string[]
  /** 종류: 근력 / 파워리프팅 / 역도 */
  cat: string
  /** 난이도: 초급 / 중급 / 고급 */
  lv: string
  /** 색을 빌려 쓸 3대 종목: 하체 S, 밀기 B, 당기기 D */
  k: LiftKey
  /** 운동 방법 (3~4단계) */
  steps: string[]
  tip: string
}

/** 기록에 같이 저장하는 운동 이름표 (목록 파일 없이도 보이게) */
export interface ExerciseRef {
  id: string
  ko: string
  en: string
}

let cache: Promise<Exercise[]> | null = null

/** 목록은 처음 열 때만 불러온다 (앱 첫 화면을 무겁게 하지 않게) */
export function loadExercises(): Promise<Exercise[]> {
  cache ??= import('./data/exercises.json').then((m) => m.default as Exercise[])
  return cache
}

export const refOf = (e: Exercise): ExerciseRef => ({ id: e.id, ko: e.ko, en: e.en })

/** 검색: 띄어쓰기 무시, 한국어·영어 이름 둘 다 */
export const matches = (e: Exercise, q: string) => {
  const t = q.replace(/\s+/g, '').toLowerCase()
  return !t || (e.ko + e.en).replace(/\s+/g, '').toLowerCase().includes(t)
}

/** 화면에 보이는 근육 이름: 광배·등 중앙은 '등'으로 묶는다 */
const SHOW: Record<string, string> = { 광배: '등', '등 중앙': '등' }
export const showMus = (m: string) => SHOW[m] ?? m
/** 주동근 칩 하나 + 협력근 칩 하나 (목업: 짙은 칸 / 옅은 칸) */
export const chipsOf = (e: { mus: string[]; sec: string[] }) => {
  const p = e.mus.map(showMus)[0]
  const q = e.sec.map(showMus).find((m) => m !== p)
  return { primary: p, secondary: q }
}

/** 종목 선택 칩 (분류) */
export const EQUIP: { ko: string; en: string; test: (e: Exercise) => boolean }[] = [
  { ko: '바벨', en: 'Barbell', test: (e) => e.eq === '바벨' || e.eq === 'EZ바' },
  { ko: '덤벨', en: 'Dumbbell', test: (e) => e.eq === '덤벨' },
  { ko: '머신', en: 'Machine', test: (e) => e.eq === '머신' && !e.ko.includes('스미스') },
  { ko: '케이블', en: 'Cable', test: (e) => e.eq === '케이블' },
  { ko: '스미스머신', en: 'Smith', test: (e) => e.ko.includes('스미스') || e.eq === '스미스머신' },
  { ko: '맨몸운동', en: 'Bodyweight', test: (e) => e.eq === '맨몸' || e.eq === '맨몸운동' },
  { ko: '케틀벨', en: 'Kettlebell', test: (e) => e.eq === '케틀벨' },
  { ko: '기타', en: 'Other', test: (e) => !['바벨', 'EZ바', '덤벨', '머신', '케이블', '스미스머신', '맨몸', '맨몸운동', '케틀벨'].includes(e.eq) },
]

/** 직접 추가할 때 고르는 칩 (목업 운동 추가) */
export const ADD_EQUIP = ['바벨', '덤벨', '머신', '케이블', '스미스머신', '맨몸운동']
export const ADD_MUS = ['가슴', '등', '어깨', '전면 어깨', '후면 어깨', '이두', '삼두', '전완', '대퇴사두', '햄스트링', '둔근', '종아리', '복근']
