import type { LiftKey } from './logic/program'

/** 목업(Claude Design 캔버스)의 종목 색 표 그대로 */
export interface Theme {
  acc: string
  on: string
  text: string
  line: string
  tint: string
  deep: string
  /** 사이클 박스 테두리 */
  boxLine: string
  /** 이번 사이클에서 지금 단계 줄 배경 */
  rowBg: string
  shadow: string
  name: string
  /** 종목 탭 이름 */
  tab: string
  /** 기록 중·테스트 화면 제목 */
  title: string
  /** 그래프 선 끝 글씨 색 */
  label: string
  /** 홈 카드 글자 색 */
  letter: string
  /** 테스트 화면 */
  testBg: string
  testFg: string
  solidBg: string
  solidFg: string
  /** 세트 편집 카드 숫자 버튼 (다크에서도 밝은 색 그대로) */
  soft: string
  strong: string
  /** 다크 모드 세트 편집 숫자 버튼 (짙은 원색 + 흰 글씨) */
  press: string
}

const LIGHT: Record<LiftKey, Theme> = {
  B: {
    acc: '#D92B3A', on: '#ffffff', text: '#D92B3A', line: '#D92B3A', tint: '#FDECEE', deep: '#B4232F',
    boxLine: '#F3B6BC', rowBg: '#FFF4F5', shadow: '0 3px 10px rgba(217,43,58,0.35)',
    name: '벤치프레스', tab: 'Bench', title: 'Bench Press', label: '#D92B3A', letter: '#D92B3A',
    testBg: '#D92B3A', testFg: '#ffffff', solidBg: '#ffffff', solidFg: '#B4232F', soft: '#FDECEE', strong: '#B4232F', press: '#B4232F',
  },
  D: {
    acc: '#F5B800', on: '#191f28', text: '#9A6B00', line: '#C99700', tint: '#FFF6DB', deep: '#7A5500',
    boxLine: '#F5D27A', rowBg: '#FFF9E6', shadow: '0 3px 10px rgba(245,184,0,0.4)',
    name: '데드리프트', tab: 'Deadlift', title: 'Deadlift', label: '#9A6B00', letter: '#9A6B00',
    testBg: '#F5B800', testFg: '#191f28', solidBg: '#191f28', solidFg: '#ffffff', soft: '#FFF6DB', strong: '#7A5500', press: '#9A6B00',
  },
  S: {
    acc: '#0B8048', on: '#ffffff', text: '#0B8048', line: '#0B8048', tint: '#E6F6EE', deep: '#0B6B3C',
    boxLine: '#9FD9B9', rowBg: '#EEF8F2', shadow: '0 3px 10px rgba(11,128,72,0.3)',
    name: '스쿼트', tab: 'Squat', title: 'Squat', label: '#0B8048', letter: '#0B7A45',
    testBg: '#0B8048', testFg: '#ffffff', solidBg: '#ffffff', solidFg: '#0B6B3C', soft: '#E6F6EE', strong: '#0B6B3C', press: '#0B6B3C',
  },
}

/** 다크 모드에서 바뀌는 값 (목업 다크 화면 기준) */
const DARK: Record<LiftKey, Partial<Theme>> = {
  B: { text: '#FF6B76', line: '#FF6B76', tint: '#3A1D22', deep: '#FF8A93', boxLine: '#6B2A31', rowBg: '#2A1B1F', label: '#FF6B76', letter: '#FF6B76', shadow: '0 3px 10px rgba(217,43,58,0.45)' },
  D: { text: '#FFC93D', line: '#FFC93D', tint: '#3A2F12', deep: '#FFD566', boxLine: '#6B5418', rowBg: '#2A2414', label: '#FFC93D', letter: '#FFC93D', shadow: '0 3px 10px rgba(245,184,0,0.35)' },
  S: { text: '#3DD68C', line: '#3DD68C', tint: '#12301F', deep: '#5EE0A2', boxLine: '#1F5A3B', rowBg: '#15261D', label: '#3DD68C', letter: '#3DD68C', shadow: '0 3px 10px rgba(11,128,72,0.45)' },
}

/** 지금 테마의 종목 색 표 (다크 모드면 setDark로 바뀐다) */
export const TH: Record<LiftKey, Theme> = {
  B: { ...LIGHT.B },
  D: { ...LIGHT.D },
  S: { ...LIGHT.S },
}

let darkOn = false
export const isDark = () => darkOn

export function setDark(dark: boolean) {
  darkOn = dark
  for (const k of ['B', 'D', 'S'] as LiftKey[]) Object.assign(TH[k], LIGHT[k], dark ? DARK[k] : {})
}

/** 홈 카드·종목 탭 순서 */
export const CARD_ORDER: LiftKey[] = ['B', 'D', 'S']

export const SET_TYPES: [string, string, string][] = [
  ['W', '워밍업', '무게 계산에 들어가지 않아요'],
  ['T', '탑세트', 'RPE로 다음 무게를 정해요'],
  ['B', '백오프', '탑세트 뒤에 하는 볼륨 세트'],
  ['A', '암렙 (AMRAP)', '정한 무게로 할 수 있는 만큼 최대 반복'],
  ['D', '드롭세트', '무게를 줄여 쉬지 않고 이어서'],
  ['S', '보조세트', '메인 세트 외에 추가로 하는 세트'],
  ['F', '실패세트', '더 이상 못 할 때까지 반복'],
]

export const typeName = (k: string) => SET_TYPES.find(([t]) => t === k)?.[1] ?? k

/** 세트 종류 칩 색 (목업 TYPES 표) */
export function chipColors(k: string, lift: LiftKey): { bg: string; fg: string } {
  const th = TH[lift]
  if (k === 'W') return { bg: 'var(--fill)', fg: 'var(--sub)' }
  if (k === 'T') return { bg: th.acc, fg: th.on }
  if (k === 'B') return { bg: th.tint, fg: th.deep }
  return { bg: 'var(--line)', fg: 'var(--ink2)' }
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))

/** "11/25" 형식 */
export const md = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`
