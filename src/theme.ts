import type { LiftKey } from './logic/program'

export interface Theme {
  acc: string
  on: string
  text: string
  tint: string
  deep: string
  name: string
}

export const TH: Record<LiftKey, Theme> = {
  B: { acc: '#D92B3A', on: '#FFFFFF', text: '#D92B3A', tint: '#FDECEE', deep: '#B4232F', name: '벤치프레스' },
  D: { acc: '#F5B800', on: '#191F28', text: '#9A6B00', tint: '#FFF6DB', deep: '#7A5500', name: '데드리프트' },
  S: { acc: '#0B8048', on: '#FFFFFF', text: '#0B8048', tint: '#E6F6EE', deep: '#0B6B3C', name: '스쿼트' },
}

export const CARD_ORDER: LiftKey[] = ['B', 'D', 'S']

export const SET_TYPES = [
  ['W', '워밍업'],
  ['T', '탑세트'],
  ['B', '백오프'],
  ['A', '암렙'],
  ['D', '드롭세트'],
  ['S', '보조세트'],
  ['F', '실패세트'],
] as const

export const typeName = (k: string) => SET_TYPES.find(([t]) => t === k)?.[1] ?? k

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2))
