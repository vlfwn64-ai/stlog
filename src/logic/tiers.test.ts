import { describe, expect, it } from 'vitest'
import { dots, tierInfo, tierTable } from './tiers'

describe('티어', () => {
  it('DOTS: 80kg 남성 3대 505 = 348', () => {
    expect(Math.round(dots(505, 80, 'm', 'kg'))).toBe(348)
  })
  it('3대 티어와 다음까지 필요한 무게', () => {
    const t = tierInfo(505, 80, 'm', 'kg')
    expect(t.tier.min).toBe(300)
    expect(t.next?.min).toBe(350)
    expect(t.need).toBe(3)
    expect(t.progress).toBeGreaterThan(0.95)
  })
  it('종목별: 벤치 125 다이아, 스쿼트 180·데드 200 플래티넘', () => {
    expect(tierInfo(125, 80, 'm', 'kg', 'B').tier.min).toBe(350)
    expect(tierInfo(125, 80, 'm', 'kg', 'B').need).toBe(15)
    expect(tierInfo(180, 80, 'm', 'kg', 'S').tier.min).toBe(300)
    expect(tierInfo(200, 80, 'm', 'kg', 'D').need).toBe(4)
  })
  it('티어 표 (80kg 남성, 1kg 단위)', () => {
    expect(tierTable(80, 'm', 'kg').map((x) => x.from)).toEqual([0, 218, 291, 363, 436, 508, 581, 653, 726])
  })
  it('lb도 kg과 같은 점수', () => {
    expect(Math.round(dots(505 * 2.20462, 80 * 2.20462, 'm', 'lb'))).toBe(348)
  })
})
