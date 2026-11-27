// 티어: DOTS 점수(체중·성별을 보정한 파워리프팅 점수)로 9단계 (엘리트 위에 마스터·레전드).
// 종목별 티어는 3대 티어 기준 합계를 스쿼트 36% · 벤치 24% · 데드 40%로 나눈 값.
import { L } from '../i18n'
import type { LiftKey, Unit } from './program'
import type { Sex } from './programs'

export interface Tier {
  i: number
  /** 이 티어가 시작하는 DOTS */
  min: number
  name: () => string
  /** 배지·막대 색 */
  color: string
  /** 글자 색 (CSS 변수, 라이트·다크 따로) */
  text: string
  /** 승급 화면 배경 (흰 글씨가 잘 보이는 짙은 색) */
  deep: string
  /** 영어 이름 (공유 카드) */
  en: string
}

const DEEP = ['#4E5968', '#8A4F28', '#5B6678', '#8A6500', '#1F7F7D', '#1D5FD1', '#191F28', '#5B21B6', '#9F1239']
const T = (i: number, min: number, ko: string, en: string, color: string): Tier => ({ i, min, name: () => L(ko, en), color, text: `var(--tier${i})`, deep: DEEP[i], en })

export const TIERS: Tier[] = [
  T(0, 0, '아이언', 'Iron', '#6B7684'),
  T(1, 150, '브론즈', 'Bronze', '#B26B3C'),
  T(2, 200, '실버', 'Silver', '#8E9AAF'),
  T(3, 250, '골드', 'Gold', '#D4A017'),
  T(4, 300, '플래티넘', 'Platinum', '#2BA6A4'),
  T(5, 350, '다이아', 'Diamond', '#3B82F6'),
  T(6, 400, '엘리트', 'Elite', 'var(--ink)'),
  T(7, 450, '마스터', 'Master', '#8B5CF6'),
  T(8, 500, '레전드', 'Legend', '#E11D48'),
]

/**
 * 미라클: 무게가 아니라 관리자가 정하는 특별 티어 (3대 티어 자리에 나온다).
 * 배지는 무지개(홀로그램) 그라데이션.
 */
export const MIRACLE: Tier = { i: 9, min: Infinity, name: () => L('미라클', 'Miracle'), color: '#EEE8F1', text: 'var(--tier9)', deep: '#2A2730', en: 'Miracle' }
/** 미라클 자개빛: 우윳빛 바탕에 굴 껍데기 안쪽처럼 옅은 무지개가 돈다 */
export const PEARL = ['#FFFFFF', '#F8D9EA', '#E4DBFA', '#D2EBFA', '#D9F5E8', '#FAF0D2', '#FFFFFF']
/** 우윳빛 배지 테두리·안쪽 띠 */
export const PEARL_LINE = '#C4B8DA'
/** 무게로 나온 티어를 미라클로 바꾼다 (점수는 그대로) */
export const asMiracle = (t: TierInfo): TierInfo => ({ ...t, tier: MIRACLE, next: null, need: 0, progress: 1, base: t })

export const SHARE: Record<LiftKey, number> = { S: 0.36, B: 0.24, D: 0.4 }

const LB = 2.20462

/** DOTS 분모 (kg 체중) */
function dotsDen(bwKg: number, sex: Sex): number {
  const [a, b, c, d, e] = sex === 'f' ? [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706] : [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
  const w = Math.min(Math.max(bwKg, 40), sex === 'f' ? 150 : 210)
  return a + b * w + c * w ** 2 + d * w ** 3 + e * w ** 4
}

/** DOTS 점수 (무게·체중은 설정 단위) */
export function dots(total: number, bw: number, sex: Sex, unit: Unit): number {
  const k = unit === 'lb' ? 1 / LB : 1
  return (total * k * 500) / dotsDen(bw * k, sex)
}

/** 이 DOTS가 되려면 필요한 3대 합계 (설정 단위) */
export function totalFor(score: number, bw: number, sex: Sex, unit: Unit): number {
  const k = unit === 'lb' ? 1 / LB : 1
  return (score * dotsDen(bw * k, sex)) / 500 / k
}

export const tierOf = (score: number): Tier => [...TIERS].reverse().find((t) => score >= t.min) ?? TIERS[0]

export interface TierInfo {
  tier: Tier
  next: Tier | null
  score: number
  /** 다음 티어까지 필요한 무게 (1 단위로 올림: 1kg 또는 1lb) */
  need: number
  /** 지금 티어 안에서 얼마나 왔는지 0~1 */
  progress: number
  /** 미라클일 때 무게로 낸 원래 티어 (상위 %는 이걸로) */
  base?: TierInfo
}

/**
 * 3대(lift 없음) 또는 종목별 티어.
 * 종목별은 그 종목 1RM을 비율로 나눠 3대 합계처럼 보고 같은 기준을 쓴다.
 */
/** 티어 기준 무게는 원판 단위와 상관없이 1kg(lb) 단위 */
const STEP = 1

export function tierInfo(weight: number, bw: number, sex: Sex, unit: Unit, lift?: LiftKey): TierInfo {
  const step = STEP
  const share = lift ? SHARE[lift] : 1
  const score = dots(weight / share, bw, sex, unit)
  const tier = tierOf(score)
  const next = TIERS[tier.i + 1] ?? null
  const lo = totalFor(tier.min, bw, sex, unit) * share
  const hi = next ? totalFor(next.min, bw, sex, unit) * share : lo
  const need = next ? Math.max(step, Math.ceil((hi - weight) / step - 1e-6) * step) : 0
  const progress = next ? Math.min(1, Math.max(0, (weight - lo) / (hi - lo))) : 1
  return { tier, next, score, need: +need.toFixed(2), progress }
}

/** 티어 표: 각 티어가 시작하는 무게 (1 단위로 올림) */
export function tierTable(bw: number, sex: Sex, unit: Unit, lift?: LiftKey) {
  const step = STEP
  const share = lift ? SHARE[lift] : 1
  return TIERS.map((t) => ({ tier: t, from: t.min === 0 ? 0 : Math.ceil((totalFor(t.min, bw, sex, unit) * share) / step - 1e-6) * step }))
}
