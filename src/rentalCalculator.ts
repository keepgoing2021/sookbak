export interface RentalCalculatorInput {
  roomCount?: number
  nightlyPriceManwon: number
  occupancyPercent: number
  airbnbFeePercent: number
  depositManwon: number
  interiorCostManwon: number
  rentManwon: number
  electricityManwon: number
  gasManwon: number
  internetManwon: number
  waterManwon: number
  cleaningManwon: number
  suppliesManwon: number
  pestControlManwon: number
  maintenanceManwon: number
}

export interface RentalCalculatorResult {
  monthlyRevenueManwon: number
  airbnbFeeManwon: number
  supplyTotalManwon: number
  operatingTotalManwon: number
  monthlyNetManwon: number
  annualNetManwon: number
  annualYieldPercent: number | null
  paybackMonths: number | null
}

export const DEFAULT_AIRBNB_FEE_PERCENT = 15.5
export const DEFAULT_ELECTRICITY_MANWON = 10
export const DEFAULT_GAS_MANWON = 10
export const DEFAULT_INTERNET_MANWON = 2
export const DEFAULT_WATER_MANWON = 3

export const DEFAULT_SCENARIO_FALLBACKS = {
  conservative: { nightlyPriceManwon: 17, occupancyPercent: 45 },
  base: { nightlyPriceManwon: 20, occupancyPercent: 60 },
  optimistic: { nightlyPriceManwon: 23, occupancyPercent: 75 },
} as const

export const DEFAULT_MANAGED_FEE_PERCENT = 5
export const DEFAULT_DIRECT_HOURS = 28
export const DEFAULT_HOURLY_VALUE_MANWON = 2

export type ScenarioKey = 'conservative' | 'base' | 'optimistic'

export interface ScenarioOverride {
  nightlyPriceManwon: number
  occupancyPercent: number
}

export interface ScenarioDefaults {
  conservative: ScenarioOverride
  base: ScenarioOverride
  optimistic: ScenarioOverride
}

export function deriveScenarioDefaults(
  currentNightlyPriceManwon: number,
  currentOccupancyPercent: number,
): ScenarioDefaults {
  if (currentNightlyPriceManwon > 0 && currentOccupancyPercent > 0) {
    return {
      conservative: {
        nightlyPriceManwon: roundManwon(Math.max(0, currentNightlyPriceManwon - 3)),
        occupancyPercent: clampPercent(currentOccupancyPercent - 15),
      },
      base: {
        nightlyPriceManwon: roundManwon(currentNightlyPriceManwon),
        occupancyPercent: clampPercent(currentOccupancyPercent),
      },
      optimistic: {
        nightlyPriceManwon: roundManwon(currentNightlyPriceManwon + 3),
        occupancyPercent: clampPercent(currentOccupancyPercent + 15),
      },
    }
  }
  return {
    conservative: { ...DEFAULT_SCENARIO_FALLBACKS.conservative },
    base: { ...DEFAULT_SCENARIO_FALLBACKS.base },
    optimistic: { ...DEFAULT_SCENARIO_FALLBACKS.optimistic },
  }
}

export function calculateScenario(
  baseInput: RentalCalculatorInput,
  override: ScenarioOverride,
): RentalCalculatorResult {
  return calculateRental({
    ...baseInput,
    nightlyPriceManwon: override.nightlyPriceManwon,
    occupancyPercent: override.occupancyPercent,
  })
}

export interface ManagedComparisonInput {
  monthlyRevenueManwon: number
  monthlyNetManwon: number
  managedFeePercent: number
  directHours: number
  hourlyValueManwon: number
}

export interface ManagedComparisonResult {
  directNetManwon: number
  managedFeeManwon: number
  managedNetManwon: number
  differenceManwon: number
  hourlyRewardManwon: number | null
  hourlyValueManwon: number
}

export function compareManagedVsDirect(input: ManagedComparisonInput): ManagedComparisonResult {
  const managedFeeManwon = roundManwon(
    input.monthlyRevenueManwon * (input.managedFeePercent / 100),
  )
  const directNetManwon = roundManwon(input.monthlyNetManwon)
  const managedNetManwon = roundManwon(directNetManwon - managedFeeManwon)
  const differenceManwon = roundManwon(directNetManwon - managedNetManwon)
  const hourlyRewardManwon =
    input.directHours > 0
      ? roundHourly(differenceManwon / input.directHours)
      : null
  return {
    directNetManwon,
    managedFeeManwon,
    managedNetManwon,
    differenceManwon,
    hourlyRewardManwon,
    hourlyValueManwon: input.hourlyValueManwon,
  }
}

export function calculateRental(input: RentalCalculatorInput): RentalCalculatorResult {
  const roomCount = input.roomCount && input.roomCount > 0 ? input.roomCount : 1
  const monthlyRevenueManwon = roundManwon(
    input.nightlyPriceManwon * roomCount * 30 * (input.occupancyPercent / 100),
  )
  const airbnbFeeManwon = roundManwon(
    monthlyRevenueManwon * (input.airbnbFeePercent / 100),
  )
  const supplyTotalManwon = roundManwon(
    input.electricityManwon + input.gasManwon + input.internetManwon + input.waterManwon,
  )
  const operatingTotalManwon = roundManwon(
    input.cleaningManwon + input.suppliesManwon + input.pestControlManwon + input.maintenanceManwon,
  )
  const monthlyNetManwon = roundManwon(
    monthlyRevenueManwon - airbnbFeeManwon - input.rentManwon - supplyTotalManwon - operatingTotalManwon,
  )
  const annualNetManwon = roundManwon(monthlyNetManwon * 12)

  const investmentBaseManwon = input.depositManwon + input.interiorCostManwon
  const annualYieldPercent =
    investmentBaseManwon > 0
      ? roundPercent((annualNetManwon / investmentBaseManwon) * 100)
      : null

  const paybackMonths =
    input.interiorCostManwon > 0 && monthlyNetManwon > 0
      ? roundMonths(input.interiorCostManwon / monthlyNetManwon)
      : null

  return {
    monthlyRevenueManwon,
    airbnbFeeManwon,
    supplyTotalManwon,
    operatingTotalManwon,
    monthlyNetManwon,
    annualNetManwon,
    annualYieldPercent,
    paybackMonths,
  }
}

export function formatManwonSigned(value: number): string {
  const rounded = Math.round(value)
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(rounded))
  return rounded < 0 ? `-${formatted}만원` : `${formatted}만원`
}

export function formatYieldPercent(value: number | null): string {
  if (value === null) return '-'
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}%`
}

export function formatPaybackMonths(value: number | null): string {
  if (value === null) return '-'
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}개월`
}

export function formatHourlyManwon(value: number | null): string {
  if (value === null) return '-'
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}만원/시간`
}

function roundManwon(value: number): number {
  return Math.round(value)
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function roundMonths(value: number): number {
  return Math.round(value * 10) / 10
}

function roundHourly(value: number): number {
  return Math.round(value * 10) / 10
}

function clampPercent(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
}
