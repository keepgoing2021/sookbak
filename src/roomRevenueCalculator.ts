export type RoomRevenueScenarioKey = 'conservative' | 'standard' | 'optimistic'

export interface RoomTypeInput {
  name: string
  roomCount: number
  adrManwon: number
}

export interface RoomRevenueInput {
  roomTypes: RoomTypeInput[]
  occupancyPercent: number
  otaFeePercent: number
  variableCostPerOccupiedRoomManwon: number
  monthlyFixedCostManwon: number
  totalProjectCostEok: number
  myInvestmentEok: number
  targetMonthlyYieldPercent: number
}

export interface RoomRevenueResult {
  totalRoomCount: number
  availableRoomNights: number
  occupiedRoomNights: number
  monthlyRevenueManwon: number
  otaFeeManwon: number
  variableCostManwon: number
  totalOperatingCostManwon: number
  monthlyNetManwon: number
  annualNetManwon: number
  equitySharePercent: number | null
  monthlyExpectedDividendManwon: number | null
  annualYieldPercent: number | null
  paybackMonths: number | null
  targetMonthlyNetManwon: number
  targetGapManwon: number | null
}

export const DEFAULT_ROOM_REVENUE_ASSUMPTIONS = {
  occupancyPercent: 70,
  otaFeePercent: 15,
  variableCostPerOccupiedRoomManwon: 2,
  monthlyFixedCostManwon: 500,
  targetMonthlyYieldPercent: 3,
} as const

export const ROOM_REVENUE_SCENARIOS = {
  conservative: { adrPercent: -10, occupancyPoint: -5 },
  standard: { adrPercent: 0, occupancyPoint: 0 },
  optimistic: { adrPercent: 10, occupancyPoint: 0 },
} as const

export function calculateRoomRevenue(input: RoomRevenueInput): RoomRevenueResult {
  const occupancyPercent = clampPercent(input.occupancyPercent)
  const validRoomTypes = input.roomTypes
    .map((room) => ({ ...room, roomCount: normalizeRoomCount(room.roomCount) }))
    .filter((room) => room.roomCount > 0 && room.adrManwon >= 0)
  const totalRoomCount = validRoomTypes.reduce((sum, room) => sum + room.roomCount, 0)
  const availableRoomNights = roundManwon(totalRoomCount * 30)
  const unroundedOccupiedRoomNights = availableRoomNights * (occupancyPercent / 100)
  const occupiedRoomNights = roundManwon(unroundedOccupiedRoomNights)
  const monthlyRevenueManwon = roundManwon(
    validRoomTypes.reduce(
      (sum, room) => sum + room.roomCount * 30 * (occupancyPercent / 100) * room.adrManwon,
      0,
    ),
  )
  const otaFeeManwon = roundManwon(monthlyRevenueManwon * (Math.max(0, input.otaFeePercent) / 100))
  const variableCostManwon = roundManwon(
    unroundedOccupiedRoomNights * Math.max(0, input.variableCostPerOccupiedRoomManwon),
  )
  const totalOperatingCostManwon = roundManwon(
    otaFeeManwon + variableCostManwon + Math.max(0, input.monthlyFixedCostManwon),
  )
  const monthlyNetManwon = roundManwon(monthlyRevenueManwon - totalOperatingCostManwon)
  const annualNetManwon = roundManwon(monthlyNetManwon * 12)
  const rawEquityShare = input.totalProjectCostEok > 0 && input.myInvestmentEok > 0
    ? Math.min(1, input.myInvestmentEok / input.totalProjectCostEok)
    : null
  const equitySharePercent = rawEquityShare === null
    ? null
    : roundPercent(rawEquityShare * 100)
  const rawMonthlyExpectedDividendManwon = rawEquityShare === null
    ? null
    : monthlyNetManwon * rawEquityShare
  const monthlyExpectedDividendManwon = rawMonthlyExpectedDividendManwon === null
    ? null
    : roundDividend(rawMonthlyExpectedDividendManwon)
  const annualYieldPercent = rawMonthlyExpectedDividendManwon !== null && input.myInvestmentEok > 0
    ? roundPercent(((rawMonthlyExpectedDividendManwon * 12) / (input.myInvestmentEok * 10000)) * 100)
    : null
  const paybackMonths = rawMonthlyExpectedDividendManwon !== null && rawMonthlyExpectedDividendManwon > 0
    ? roundMonths((input.myInvestmentEok * 10000) / rawMonthlyExpectedDividendManwon)
    : null
  const targetMonthlyNetManwon = roundManwon(
    Math.max(0, input.myInvestmentEok) * 10000 * (Math.max(0, input.targetMonthlyYieldPercent) / 100),
  )

  return {
    totalRoomCount,
    availableRoomNights,
    occupiedRoomNights,
    monthlyRevenueManwon,
    otaFeeManwon,
    variableCostManwon,
    totalOperatingCostManwon,
    monthlyNetManwon,
    annualNetManwon,
    equitySharePercent,
    monthlyExpectedDividendManwon,
    annualYieldPercent,
    paybackMonths,
    targetMonthlyNetManwon,
    targetGapManwon: monthlyExpectedDividendManwon === null
      ? null
      : roundManwon(monthlyExpectedDividendManwon - targetMonthlyNetManwon),
  }
}

export function calculateRoomRevenueScenario(
  input: RoomRevenueInput,
  scenario: RoomRevenueScenarioKey,
): RoomRevenueResult {
  const adjustment = ROOM_REVENUE_SCENARIOS[scenario]
  return calculateRoomRevenue({
    ...input,
    occupancyPercent: clampPercent(input.occupancyPercent + adjustment.occupancyPoint),
    roomTypes: input.roomTypes.map((room) => ({
      ...room,
      adrManwon: Math.max(0, room.adrManwon * (1 + adjustment.adrPercent / 100)),
    })),
  })
}

function roundManwon(value: number): number {
  return Math.round(value)
}

function roundDividend(value: number): number {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function roundMonths(value: number): number {
  return Math.round(value * 10) / 10
}

function normalizeRoomCount(value: number): number {
  return Number.isFinite(value) ? Math.floor(Math.max(0, value)) : 0
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}
