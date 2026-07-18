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
  totalInvestmentEok: number
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
  annualYieldPercent: number | null
  targetMonthlyNetManwon: number
  targetGapManwon: number
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
  const annualYieldPercent = input.totalInvestmentEok > 0
    ? roundPercent((annualNetManwon / (input.totalInvestmentEok * 10000)) * 100)
    : null
  const targetMonthlyNetManwon = roundManwon(
    Math.max(0, input.totalInvestmentEok) * 10000 * (Math.max(0, input.targetMonthlyYieldPercent) / 100),
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
    annualYieldPercent,
    targetMonthlyNetManwon,
    targetGapManwon: roundManwon(monthlyNetManwon - targetMonthlyNetManwon),
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

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeRoomCount(value: number): number {
  return Number.isFinite(value) ? Math.floor(Math.max(0, value)) : 0
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}
