import { describe, expect, it } from 'vitest'
import type { LiftProgress } from './program'
import type { DoneSet } from './programs'
import { atTest, mainSet, programOf, recommendLevel, sessionE1rm, withMain } from './programs'

const S = 5
const made = (sets: { type: DoneSet['type']; weight: number; reps: number }[], extra: Partial<DoneSet> = {}): DoneSet[] =>
  sets.map((x) => ({ ...x, done: true, goal: x.reps, ...extra }))

describe('추천 수준', () => {
  it('남성 3.5·5배, 여성 2.5·3.75배', () => {
    expect(recommendLevel(250, 80, 'm')).toBe(0)
    expect(recommendLevel(340, 80, 'm')).toBe(1)
    expect(recommendLevel(420, 80, 'm')).toBe(2)
    expect(recommendLevel(150, 60, 'f')).toBe(1)
    expect(recommendLevel(140, 60, 'f')).toBe(0)
  })
})

describe('선형 5×5', () => {
  const pr = programOf('linear')
  it('1RM의 70%에서 시작, 성공하면 벤치 +S, 스쿼트 +2S', () => {
    const p = pr.init('B', 100, S)
    expect(p.top).toBe(70)
    const sets = pr.sets('B', p, S)
    expect(sets).toHaveLength(5)
    const r = pr.after('B', p, made(sets), S)
    expect(r.next.top).toBe(75)
    const q = pr.init('S', 100, S)
    expect(pr.after('S', q, made(pr.sets('S', q, S)), S).next.top).toBe(80)
  })
  it('3번 실패하면 10% 내림', () => {
    let p = pr.init('B', 100, S)
    const fail = made(pr.sets('B', p, S)).map((x, i) => (i === 4 ? { ...x, reps: 3 } : x))
    p = pr.after('B', p, fail, S).next
    p = pr.after('B', p, fail, S).next
    expect(p.top).toBe(70)
    p = pr.after('B', p, fail, S).next
    expect(p.top).toBe(60)
  })
})

describe('GZCLP 방식', () => {
  const pr = programOf('gzclp')
  it('실패하면 같은 무게로 6×2, 10×1, 그다음 테스트', () => {
    let p = pr.init('B', 100, S)
    expect(pr.sets('B', p, S).map((x) => x.type).join('')).toBe('TTTTA')
    const fail = (q: typeof p) => made(pr.sets('B', q, S)).map((x) => (x.type === 'A' ? { ...x, reps: 0 } : x))
    p = pr.after('B', p, fail(p), S).next
    expect(p.stage).toBe(2)
    expect(pr.sets('B', p, S)).toHaveLength(6)
    p = pr.after('B', p, fail(p), S).next
    expect(p.stage).toBe(3)
    p = pr.after('B', p, fail(p), S).next
    expect(atTest(pr, p)).toBe(true)
  })
})

describe('5/3/1 방식', () => {
  const pr = programOf('531')
  it('TM 90%, 주차별 세트, 4주 뒤 TM 증가와 새 사이클', () => {
    let p = withMain(pr, 'B', pr.init('B', 125, 2.5), 2.5)
    expect(p.tm).toBe(112.5)
    const w1 = pr.sets('B', p, 2.5)
    expect(w1.slice(0, 3).map((x) => x.weight)).toEqual([72.5, 82.5, 95])
    expect(w1[2].type).toBe('A')
    expect(w1.filter((x) => x.type === 'B')).toHaveLength(5)
    expect(p.top).toBe(95)
    for (let wk = 1; wk <= 3; wk++) {
      const r = pr.after('B', p, made(pr.sets('B', p, 2.5)), 2.5)
      expect(r.advanced).toBe(true)
      p = r.next
    }
    expect(p.stage).toBe(4)
    const r = pr.after('B', p, made(pr.sets('B', p, 2.5)), 2.5)
    expect(r.newCycle).toBe(true)
    expect(r.next.stage).toBe(1)
    expect(r.next.tm).toBe(115)
  })
  it('3주차 암렙을 못 하면 TM 10% 내림', () => {
    let p: LiftProgress = { ...pr.init('S', 200, 5), stage: 3 }
    p = pr.after('S', p, made(pr.sets('S', p, 5)).map((x) => (x.type === 'A' ? { ...x, done: false } : x)), 5).next
    const r = pr.after('S', p, made(pr.sets('S', p, 5)), 5)
    expect(r.next.tm).toBe(160)
  })
})

describe('RPE 탑싱글', () => {
  const pr = programOf('rpe1')
  it('RPE로 다음 싱글, 백오프는 82%', () => {
    const p = pr.init('D', 200, S)
    expect(p.top).toBe(180)
    const sets = pr.sets('D', p, S)
    expect(sets[1].weight).toBe(145)
    expect(pr.after('D', p, made(sets.slice(0, 1), { rpe: 7 }), S).next.top).toBe(185)
    expect(pr.after('D', p, made(sets.slice(0, 1), { rpe: 9.5 }), S).next.top).toBe(175)
  })
})

describe('6주 블록', () => {
  const pr = programOf('block6')
  it('볼륨 2회 → 강도 2회 → 피킹 1회 → 테스트', () => {
    let p = pr.init('B', 100, S)
    expect(p.top).toBe(75)
    const run = () => (p = pr.after('B', p, made(pr.sets('B', p, S)).map((x, i, a) => (i === a.length - 1 ? { ...x, rpe: 8 as const } : x)), S).next)
    run()
    expect(p.stage).toBe(1)
    expect(p.top).toBe(80)
    run()
    expect(p.stage).toBe(2)
    expect(p.top).toBe(85)
    run()
    run()
    expect(p.stage).toBe(3)
    run()
    expect(atTest(pr, p)).toBe(true)
    expect(mainSet(pr, 'B', p, S)).toBeNull()
  })
})

describe('추정 1RM', () => {
  it('RPE 탑세트가 없으면 암렙으로', () => {
    expect(sessionE1rm([{ type: 'A', weight: 100, reps: 6, done: true }])).toBe(120)
    expect(sessionE1rm([{ type: 'T', weight: 100, reps: 5, done: true }])).toBeNull()
  })
})
