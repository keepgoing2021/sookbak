import { describe, expect, it } from 'vitest'
import { calculateConstructionRisk } from './constructionRisk'

const baseInput = {
  roomCount: 0,
  bathroomCount: 0,
  fireWindowLikely: false,
  masonryTub: false,
  windowReduction: false,
}

describe('calculateConstructionRisk', () => {
  it('treats one room and one bathroom as the baseline with no added score', () => {
    const result = calculateConstructionRisk({
      ...baseInput,
      roomCount: 1,
      bathroomCount: 1,
    })

    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.drivers).toEqual([])
  })

  it('only scores rooms and bathrooms above the baseline count', () => {
    const result = calculateConstructionRisk({
      ...baseInput,
      roomCount: 3,
      bathroomCount: 2,
    })

    expect(result.score).toBe(23)
    expect(result.drivers).toEqual([
      '방 3개 — 기본 1개 초과분이 공사 범위를 키움',
      '화장실 2개 — 기본 1개 초과분이 견적 변동 폭을 키움',
    ])
  })

  it('still adds explicit construction risk toggles to the baseline', () => {
    const result = calculateConstructionRisk({
      ...baseInput,
      roomCount: 1,
      bathroomCount: 1,
      fireWindowLikely: true,
      masonryTub: true,
      windowReduction: true,
    })

    expect(result.score).toBe(36)
    expect(result.level).toBe('medium')
  })
})
