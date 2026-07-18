import { describe, expect, it } from 'vitest'
import {
  calculateRoomRevenue,
  calculateRoomRevenueScenario,
  DEFAULT_ROOM_REVENUE_ASSUMPTIONS,
  ROOM_REVENUE_SCENARIOS,
} from './roomRevenueCalculator'

const baseInput = {
  roomTypes: [
    { name: '더블', roomCount: 6, adrManwon: 12 },
    { name: '패밀리', roomCount: 4, adrManwon: 18 },
  ],
  occupancyPercent: 70,
  otaFeePercent: 15,
  variableCostPerOccupiedRoomManwon: 2,
  monthlyFixedCostManwon: 500,
  totalInvestmentEok: 5,
  targetMonthlyYieldPercent: 3,
}

describe('room revenue simulator', () => {
  it('aggregates multiple room types into one monthly operating waterfall', () => {
    const result = calculateRoomRevenue(baseInput)

    expect(result.totalRoomCount).toBe(10)
    expect(result.availableRoomNights).toBe(300)
    expect(result.occupiedRoomNights).toBe(210)
    expect(result.monthlyRevenueManwon).toBe(3024)
    expect(result.otaFeeManwon).toBe(454)
    expect(result.variableCostManwon).toBe(420)
    expect(result.totalOperatingCostManwon).toBe(1374)
    expect(result.monthlyNetManwon).toBe(1650)
    expect(result.annualNetManwon).toBe(19800)
    expect(result.annualYieldPercent).toBe(39.6)
    expect(result.targetMonthlyNetManwon).toBe(1500)
    expect(result.targetGapManwon).toBe(150)
  })

  it('applies conservative/base/optimistic scenario adjustments without mutating the base input', () => {
    const conservative = calculateRoomRevenueScenario(baseInput, 'conservative')
    const standard = calculateRoomRevenueScenario(baseInput, 'standard')
    const optimistic = calculateRoomRevenueScenario(baseInput, 'optimistic')

    expect(ROOM_REVENUE_SCENARIOS.conservative).toEqual({ adrPercent: -10, occupancyPoint: -5 })
    expect(ROOM_REVENUE_SCENARIOS.optimistic).toEqual({ adrPercent: 10, occupancyPoint: 0 })
    expect(conservative.monthlyRevenueManwon).toBe(2527)
    expect(standard.monthlyRevenueManwon).toBe(3024)
    expect(optimistic.monthlyRevenueManwon).toBe(3326)
    expect(baseInput.roomTypes[0].adrManwon).toBe(12)
  })

  it('clamps occupancy and ignores invalid room rows', () => {
    const result = calculateRoomRevenue({
      ...baseInput,
      occupancyPercent: 140,
      roomTypes: [
        { name: '정상', roomCount: 2, adrManwon: 10 },
        { name: '제외', roomCount: -3, adrManwon: 20 },
      ],
    })

    expect(result.totalRoomCount).toBe(2)
    expect(result.occupiedRoomNights).toBe(60)
    expect(result.monthlyRevenueManwon).toBe(600)
  })

  it('uses unrounded occupied room nights for variable cost while displaying rounded nights', () => {
    const result = calculateRoomRevenue({
      ...baseInput,
      roomTypes: [{ name: '소형', roomCount: 1, adrManwon: 10 }],
      occupancyPercent: 1,
      otaFeePercent: 0,
      variableCostPerOccupiedRoomManwon: 2,
      monthlyFixedCostManwon: 0,
    })

    expect(result.occupiedRoomNights).toBe(0)
    expect(result.variableCostManwon).toBe(1)
  })

  it('normalizes room counts to nonnegative integers at fractional boundaries', () => {
    const result = calculateRoomRevenue({
      ...baseInput,
      occupancyPercent: 100,
      roomTypes: [
        { name: '음수', roomCount: -0.1, adrManwon: 10 },
        { name: '1 미만', roomCount: 0.9, adrManwon: 10 },
        { name: '정수', roomCount: 1, adrManwon: 10 },
        { name: '양의 소수', roomCount: 1.9, adrManwon: 10 },
      ],
    })

    expect(result.totalRoomCount).toBe(2)
    expect(result.availableRoomNights).toBe(60)
    expect(result.monthlyRevenueManwon).toBe(600)
  })

  it('keeps the screening assumptions explicit and editable', () => {
    expect(DEFAULT_ROOM_REVENUE_ASSUMPTIONS).toEqual({
      occupancyPercent: 70,
      otaFeePercent: 15,
      variableCostPerOccupiedRoomManwon: 2,
      monthlyFixedCostManwon: 500,
      targetMonthlyYieldPercent: 3,
    })
  })
})
