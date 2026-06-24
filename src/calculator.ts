export type PropertyType = 'commercial' | 'housing' | 'land'

export interface CalculatorInput {
  propertyType: PropertyType
  purchasePriceEok: number
  acquisitionTaxEok: number
  legalFeeEok: number
  brokerageFeeEok: number
  otherCostEok: number
  loanAmountEok: number
  annualInterestRate: number
  tourismLoanAmountEok?: number
  tourismLoanAnnualInterestRate?: number
  monthlyRevenueManwon: number
}

export interface CalculatorResult {
  sideCostsEok: number
  totalInvestmentEok: number
  cashInvestedWithLoanEok: number
  monthlyInterestManwon: number
  tourismLoanMonthlyInterestManwon: number
  totalMonthlyInterestManwon: number
  monthlyNetManwon: number
  annualNetManwon: number
  annualRevenueManwon: number
  roiWithLoanPercent: number | null
  roiNoLoanPercent: number | null
}

const TAX_RATES: Record<PropertyType, number> = {
  commercial: 0.046,
  housing: 0.011,
  land: 0.046,
}

export function toNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function defaultAcquisitionTaxEok(
  propertyType: PropertyType,
  purchasePriceEok: number,
): number {
  return roundEok(purchasePriceEok * TAX_RATES[propertyType])
}

export function defaultLegalFeeEok(purchasePriceEok: number): number {
  if (purchasePriceEok <= 0) return 0
  const rate = purchasePriceEok < 3 ? 0.003 : purchasePriceEok <= 10 ? 0.002 : 0.0015
  return roundEok(purchasePriceEok * rate)
}

export function defaultBrokerageFeeEok(purchasePriceEok: number): number {
  return roundEok(purchasePriceEok * 0.009)
}

export function defaultLoanAmountEok(purchasePriceEok: number, ltvPercent = 70): number {
  return roundEok(purchasePriceEok * (ltvPercent / 100))
}

export function defaultLtvPercent(purchasePriceEok: number, loanAmountEok: number): number {
  if (purchasePriceEok <= 0) return 0
  return roundPercent((loanAmountEok / purchasePriceEok) * 100)
}

export function calculateInvestment(input: CalculatorInput): CalculatorResult {
  const sideCostsEok = roundEok(
    input.acquisitionTaxEok + input.legalFeeEok + input.brokerageFeeEok + input.otherCostEok,
  )
  const totalInvestmentEok = roundEok(input.purchasePriceEok + sideCostsEok)
  const cashInvestedWithLoanEok = roundEok(totalInvestmentEok - input.loanAmountEok)
  const monthlyInterestManwon = roundManwon(
    (input.loanAmountEok * 10000 * (input.annualInterestRate / 100)) / 12,
  )
  const tourismLoanMonthlyInterestManwon = roundManwon(
    ((input.tourismLoanAmountEok ?? 0) *
      10000 *
      ((input.tourismLoanAnnualInterestRate ?? 0) / 100)) /
      12,
  )
  const totalMonthlyInterestManwon = roundManwon(
    monthlyInterestManwon + tourismLoanMonthlyInterestManwon,
  )
  const monthlyNetManwon = roundManwon(input.monthlyRevenueManwon - totalMonthlyInterestManwon)
  const annualNetManwon = roundManwon(monthlyNetManwon * 12)
  const annualRevenueManwon = roundManwon(input.monthlyRevenueManwon * 12)
  const roiWithLoanPercent = cashInvestedWithLoanEok > 0
    ? roundPercent((annualNetManwon / (cashInvestedWithLoanEok * 10000)) * 100)
    : null
  const roiNoLoanPercent = totalInvestmentEok > 0
    ? roundPercent((annualRevenueManwon / (totalInvestmentEok * 10000)) * 100)
    : null

  return {
    sideCostsEok,
    totalInvestmentEok,
    cashInvestedWithLoanEok,
    monthlyInterestManwon,
    tourismLoanMonthlyInterestManwon,
    totalMonthlyInterestManwon,
    monthlyNetManwon,
    annualNetManwon,
    annualRevenueManwon,
    roiWithLoanPercent,
    roiNoLoanPercent,
  }
}

export function formatEok(value: number): string {
  return `${formatNumber(value, 3)}억`
}

export function formatManwon(value: number): string {
  return `${formatNumber(value, 0)}만원`
}

export function formatPercent(value: number | null): string {
  if (value === null) return '-'
  return `${formatNumber(value, 2)}%`
}

function roundEok(value: number): number {
  return Math.round(value * 1000) / 1000
}

function roundManwon(value: number): number {
  return Math.round(value)
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function formatNumber(value: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(1, maxFractionDigits),
  }).format(value)
}
