import { DEFAULT_ROOM_REVENUE_ASSUMPTIONS, type RoomRevenueScenarioKey } from './roomRevenueCalculator'

export type RoomRevenueValues = {
  roomTypes: Array<{ id: number; name: string; roomCount: string; adrManwon: string }>
  occupancyPercent: string
  otaFeePercent: string
  variableCostPerOccupiedRoomManwon: string
  monthlyFixedCostManwon: string
  totalInvestmentEok: string
  targetMonthlyYieldPercent: string
  scenario: RoomRevenueScenarioKey
}

export const initialRoomRevenueValues: RoomRevenueValues = {
  roomTypes: [{ id: 1, name: '더블룸', roomCount: '10', adrManwon: '8' }],
  occupancyPercent: String(DEFAULT_ROOM_REVENUE_ASSUMPTIONS.occupancyPercent),
  otaFeePercent: String(DEFAULT_ROOM_REVENUE_ASSUMPTIONS.otaFeePercent),
  variableCostPerOccupiedRoomManwon: String(DEFAULT_ROOM_REVENUE_ASSUMPTIONS.variableCostPerOccupiedRoomManwon),
  monthlyFixedCostManwon: String(DEFAULT_ROOM_REVENUE_ASSUMPTIONS.monthlyFixedCostManwon),
  totalInvestmentEok: '',
  targetMonthlyYieldPercent: String(DEFAULT_ROOM_REVENUE_ASSUMPTIONS.targetMonthlyYieldPercent),
  scenario: 'standard',
}
