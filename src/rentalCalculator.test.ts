import { describe, expect, it } from 'vitest'
import {
  calculateRental,
  calculateScenario,
  compareManagedVsDirect,
  deriveScenarioDefaults,
  type RentalCalculatorInput,
} from './rentalCalculator'

const base: RentalCalculatorInput = {
  nightlyPriceManwon: 0,
  occupancyPercent: 0,
  airbnbFeePercent: 15.5,
  depositManwon: 0,
  interiorCostManwon: 0,
  rentManwon: 0,
  electricityManwon: 10,
  gasManwon: 10,
  internetManwon: 2,
  waterManwon: 3,
  cleaningManwon: 0,
  suppliesManwon: 0,
  pestControlManwon: 0,
  maintenanceManwon: 0,
}

describe('rental calculator', () => {
  it('computes monthly revenue, fees, and net profit using the spec formula', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 20,
      occupancyPercent: 60,
      depositManwon: 1000,
      interiorCostManwon: 3000,
      rentManwon: 100,
    })

    // 20 * 30 * 0.6 = 360
    expect(result.monthlyRevenueManwon).toBe(360)
    // 360 * 0.155 = 55.8 → 56
    expect(result.airbnbFeeManwon).toBe(56)
    // 10 + 10 + 2 + 3
    expect(result.supplyTotalManwon).toBe(25)
    expect(result.operatingTotalManwon).toBe(0)
    // 360 - 56 - 100 - 25 - 0 = 179
    expect(result.monthlyNetManwon).toBe(179)
    expect(result.annualNetManwon).toBe(2148)
    // 2148 / (1000 + 3000) * 100 = 53.7
    expect(result.annualYieldPercent).toBe(53.7)
    // 3000 / 179 = 16.759 → 16.8
    expect(result.paybackMonths).toBe(16.8)
  })

  it('sums operating costs across all four operating categories', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 15,
      occupancyPercent: 50,
      cleaningManwon: 20,
      suppliesManwon: 10,
      pestControlManwon: 5,
      maintenanceManwon: 8,
    })

    expect(result.operatingTotalManwon).toBe(43)
  })

  it('returns null annual yield when there is no deposit and no interior cost', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 10,
      occupancyPercent: 50,
    })

    expect(result.annualYieldPercent).toBeNull()
  })

  it('returns null payback months when interior cost is zero', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 20,
      occupancyPercent: 60,
      depositManwon: 1000,
      interiorCostManwon: 0,
    })

    expect(result.paybackMonths).toBeNull()
    expect(result.annualYieldPercent).not.toBeNull()
  })

  it('returns null payback months when monthly net is zero or negative', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 5,
      occupancyPercent: 20,
      rentManwon: 500,
      interiorCostManwon: 2000,
    })

    expect(result.monthlyNetManwon).toBeLessThanOrEqual(0)
    expect(result.paybackMonths).toBeNull()
  })

  it('allows the airbnb fee percentage to be overridden', () => {
    const result = calculateRental({
      ...base,
      nightlyPriceManwon: 20,
      occupancyPercent: 60,
      airbnbFeePercent: 0,
    })

    expect(result.airbnbFeeManwon).toBe(0)
    expect(result.monthlyNetManwon).toBe(360 - 25)
  })
})

describe('scenario defaults', () => {
  it('uses fixed fallback when current price/occupancy missing', () => {
    const defaults = deriveScenarioDefaults(0, 0)
    expect(defaults.conservative).toEqual({ nightlyPriceManwon: 17, occupancyPercent: 45 })
    expect(defaults.base).toEqual({ nightlyPriceManwon: 20, occupancyPercent: 60 })
    expect(defaults.optimistic).toEqual({ nightlyPriceManwon: 23, occupancyPercent: 75 })
  })

  it('derives scenarios around the current input when present', () => {
    const defaults = deriveScenarioDefaults(22, 65)
    expect(defaults.conservative).toEqual({ nightlyPriceManwon: 19, occupancyPercent: 50 })
    expect(defaults.base).toEqual({ nightlyPriceManwon: 22, occupancyPercent: 65 })
    expect(defaults.optimistic).toEqual({ nightlyPriceManwon: 25, occupancyPercent: 80 })
  })

  it('clamps occupancy within 0–100', () => {
    const high = deriveScenarioDefaults(30, 92)
    expect(high.optimistic.occupancyPercent).toBe(100)
    const low = deriveScenarioDefaults(10, 10)
    expect(low.conservative.occupancyPercent).toBe(0)
    expect(low.conservative.nightlyPriceManwon).toBe(7)
  })

  it('keeps prices from going negative', () => {
    const defaults = deriveScenarioDefaults(2, 40)
    expect(defaults.conservative.nightlyPriceManwon).toBe(0)
  })
})

describe('calculateScenario', () => {
  it('reuses base cost assumptions and only overrides price/occupancy', () => {
    const baseInput: RentalCalculatorInput = {
      ...base,
      nightlyPriceManwon: 20,
      occupancyPercent: 60,
      depositManwon: 1000,
      interiorCostManwon: 3000,
      rentManwon: 100,
      cleaningManwon: 30,
    }

    // 15 * 30 * 0.5 = 225 (exact in float because 0.5 is exact)
    const conservative = calculateScenario(baseInput, {
      nightlyPriceManwon: 15,
      occupancyPercent: 50,
    })

    expect(conservative.monthlyRevenueManwon).toBe(225)
    // base cost assumptions reused: cleaning 30, supply 25 (electricity 10 + gas 10 + internet 2 + water 3)
    expect(conservative.operatingTotalManwon).toBe(30)
    expect(conservative.supplyTotalManwon).toBe(25)
    // 225 * 0.155 = 34.875 → 35
    expect(conservative.airbnbFeeManwon).toBe(35)
    // 225 - 35 - 100 (rent) - 25 - 30 = 35
    expect(conservative.monthlyNetManwon).toBe(35)
  })
})

describe('managed vs direct comparison', () => {
  it('subtracts managed fee from direct net and divides by direct hours for hourly reward', () => {
    const result = compareManagedVsDirect({
      monthlyRevenueManwon: 360,
      monthlyNetManwon: 179,
      managedFeePercent: 20,
      directHours: 28,
      hourlyValueManwon: 2,
    })

    // 360 * 0.2 = 72
    expect(result.managedFeeManwon).toBe(72)
    expect(result.directNetManwon).toBe(179)
    // 179 - 72 = 107
    expect(result.managedNetManwon).toBe(107)
    // diff = 72
    expect(result.differenceManwon).toBe(72)
    // 72 / 28 ≈ 2.571 → 2.6
    expect(result.hourlyRewardManwon).toBe(2.6)
  })

  it('returns null hourly reward when direct hours is zero', () => {
    const result = compareManagedVsDirect({
      monthlyRevenueManwon: 360,
      monthlyNetManwon: 179,
      managedFeePercent: 20,
      directHours: 0,
      hourlyValueManwon: 2,
    })

    expect(result.hourlyRewardManwon).toBeNull()
  })

  it('handles zero managed fee as no difference', () => {
    const result = compareManagedVsDirect({
      monthlyRevenueManwon: 360,
      monthlyNetManwon: 179,
      managedFeePercent: 0,
      directHours: 20,
      hourlyValueManwon: 2,
    })

    expect(result.managedFeeManwon).toBe(0)
    expect(result.differenceManwon).toBe(0)
    expect(result.hourlyRewardManwon).toBe(0)
  })
})
