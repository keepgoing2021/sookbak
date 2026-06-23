import { describe, expect, it } from 'vitest'
import { buildConstructionChecklist } from './constructionChecklist'

const baseInput = {
  roomCount: 0,
  bathroomCount: 0,
  fireWindowLikely: false,
  masonryTub: false,
  windowReduction: false,
}

describe('buildConstructionChecklist', () => {
  it('returns senior-planner checklist items without numeric risk scoring', () => {
    const checklist = buildConstructionChecklist(baseInput)

    expect(checklist.length).toBeGreaterThan(5)
    expect(checklist[0]).toMatchObject({ category: '규모 산정', title: '방·화장실 수량 기준 견적 재확인' })
    expect(checklist.some((item) => item.title.includes('필증'))).toBe(true)
    expect(checklist).not.toHaveProperty('score')
  })

  it('elevates review priority for many rooms and bathrooms without labeling it high risk', () => {
    const checklist = buildConstructionChecklist({
      ...baseInput,
      roomCount: 8,
      bathroomCount: 8,
    })

    const quantityItem = checklist.find((item) => item.category === '규모 산정')
    expect(quantityItem?.priority).toBe('중점 확인')
    expect(quantityItem?.summary).toContain('8실 / 8욕실')
    expect(quantityItem?.checks).toContain('방·욕실별 단가가 아니라 반복 공정 할인 가능 여부 확인')
  })

  it('adds focused checks for fire windows, masonry tubs, and window reduction', () => {
    const checklist = buildConstructionChecklist({
      ...baseInput,
      fireWindowLikely: true,
      masonryTub: true,
      windowReduction: true,
    })

    expect(checklist.find((item) => item.category === '소방')?.priority).toBe('필수 확인')
    expect(checklist.find((item) => item.category === '방수')?.checks).toContain('조적욕조 적용 시 2중 방수·담수 테스트 일정 확보')
    expect(checklist.find((item) => item.category === '외벽·창호')?.checks).toContain('창문 축소 시 조적·방수·단열·스카이차 포함 견적 확인')
  })
})
