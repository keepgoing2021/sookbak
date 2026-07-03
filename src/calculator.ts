export type PropertyType = 'commercial' | 'housing' | 'land'
export type LoanResilienceStatus = 'stable' | 'caution' | 'danger' | 'deficit' | 'no-loan'
export type PurchaseDecisionStatus = 'excellent' | 'reviewable' | 'needs-adjustment' | 'expensive' | 'empty'

export interface PurchaseDecision {
  status: PurchaseDecisionStatus
  label: string
  headline: string
  message: string
  action: string
  gapManwon: number
}

export interface RecommendedPurchasePriceInput {
  propertyType: PropertyType
  monthlyNetManwon: number
  ltvPercent: number
  otherCostEok: number
}

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
  targetMonthlyNetManwon?: number
}

export interface CalculatorResult {
  sideCostsEok: number
  totalInvestmentEok: number
  cashInvestedWithLoanEok: number
  monthlyInterestManwon: number
  tourismLoanMonthlyInterestManwon: number
  totalMonthlyInterestManwon: number
  monthlyNetManwon: number
  targetMonthlyNetManwon: number
  targetMonthlyNetGapManwon: number
  annualNetManwon: number
  annualRevenueManwon: number
  roiWithLoanPercent: number | null
  monthlyCashYieldPercent: number | null
  loanResilienceRatio: number | null
  loanResilienceStatus: LoanResilienceStatus
  loanResilienceLabel: string
  loanResilienceMessage: string
  exitBuyerRequiredCashEok: number | null
  exitEstimatedSalePriceEok: number | null
  exitSalePriceGapEok: number | null
  roiNoLoanPercent: number | null
}

const TAX_RATES: Record<PropertyType, number> = {
  commercial: 0.046,
  housing: 0.011,
  land: 0.046,
}

export const DEFAULT_LTV_PERCENT = 80
export const DEFAULT_ANNUAL_INTEREST_RATE = 5
export const DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE = 2.55
export const DEFAULT_EXIT_BUYER_LTV_PERCENT = 80
export const DEFAULT_EXIT_MONTHLY_YIELD_PERCENT = 3

export const DEFAULT_TARGET_MONTHLY_NET_MANWON_PER_EOK = 300

export function toNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function defaultAcquisitionTaxEok(
  propertyType: PropertyType,
  purchasePriceEok: number,
  overrideRatePercent?: number,
): number {
  const rate = overrideRatePercent !== undefined && Number.isFinite(overrideRatePercent) && overrideRatePercent > 0
    ? overrideRatePercent / 100
    : TAX_RATES[propertyType]
  return roundEok(purchasePriceEok * rate)
}

export function defaultLegalFeeEok(purchasePriceEok: number): number {
  if (purchasePriceEok <= 0) return 0
  const rate = purchasePriceEok < 3 ? 0.003 : purchasePriceEok <= 10 ? 0.002 : 0.0015
  return roundEok(purchasePriceEok * rate)
}

export function defaultBrokerageFeeEok(purchasePriceEok: number): number {
  return roundEok(purchasePriceEok * 0.009)
}

export function defaultLoanAmountEok(
  purchasePriceEok: number,
  ltvPercent = DEFAULT_LTV_PERCENT,
): number {
  return roundEok(purchasePriceEok * (ltvPercent / 100))
}

export function defaultLtvPercent(purchasePriceEok: number, loanAmountEok: number): number {
  if (purchasePriceEok <= 0) return 0
  return roundPercent((loanAmountEok / purchasePriceEok) * 100)
}

export function calculatePurchaseDecision(
  monthlyNetManwon: number,
  targetMonthlyNetManwon: number,
  monthlyCashYieldPercent: number | null = null,
): PurchaseDecision {
  const gapManwon = roundManwon(monthlyNetManwon - targetMonthlyNetManwon)

  if (targetMonthlyNetManwon <= 0) {
    return {
      status: 'empty',
      label: '판단 대기',
      headline: '매매가와 예상 수익을 넣으면 판단할 수 있어요',
      message: '실투입금 기준으로 필요한 월순수익과 예상 월순수익을 비교합니다.',
      action: '먼저 매매가와 월 매출을 입력해보세요.',
      gapManwon,
    }
  }

  if (monthlyNetManwon >= targetMonthlyNetManwon && monthlyCashYieldPercent !== null && monthlyCashYieldPercent >= 4) {
    return {
      status: 'excellent',
      label: '매우 좋음',
      headline: '월 수익률 기준으로 매우 좋은 매물입니다',
      message: `월 수익률 ${formatPercent(monthlyCashYieldPercent)}로 목표 기준을 충분히 넘습니다.`,
      action: '가격보다 인허가·소방·공사비 리스크를 우선 실사하세요.',
      gapManwon,
    }
  }

  if (monthlyNetManwon >= targetMonthlyNetManwon) {
    return {
      status: 'reviewable',
      label: '검토 가능',
      headline: '현재 조건에서는 검토해볼 만한 매물입니다',
      message: `필요 월순수익보다 ${formatManwon(gapManwon)} 여유가 있습니다.`,
      action: '건축물대장·소방·공사비 실사로 넘어가세요.',
      gapManwon,
    }
  }

  if (monthlyNetManwon >= targetMonthlyNetManwon * 0.8) {
    return {
      status: 'needs-adjustment',
      label: '조건 조정 필요',
      headline: '수익 구조나 매입가 조정이 필요합니다',
      message: `목표 월순수익보다 ${formatManwon(Math.abs(gapManwon))} 부족합니다.`,
      action: '매입가 협상·객실 수익·공사비 가정을 다시 확인하세요.',
      gapManwon,
    }
  }

  return {
    status: 'expensive',
    label: '보수적으로 비쌈',
    headline: '보수적으로 보면 아직 비싼 매물입니다',
    message: `목표 월순수익보다 ${formatManwon(Math.abs(gapManwon))} 부족합니다.`,
    action: '현재 가격에서는 보류하거나 큰 폭의 가격 조정이 필요합니다.',
    gapManwon,
  }
}

export function calculateRecommendedPurchasePriceEok(
  input: RecommendedPurchasePriceInput,
): number | null {
  if (input.monthlyNetManwon <= 0 || input.ltvPercent >= 100) return null

  const targetCashEok = input.monthlyNetManwon / DEFAULT_TARGET_MONTHLY_NET_MANWON_PER_EOK
  let low = 0
  let high = Math.max(1, targetCashEok / Math.max(0.01, 1 - input.ltvPercent / 100))

  while (cashInvestedForPriceEok(input, high) < targetCashEok && high < 10000) {
    high *= 2
  }

  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2
    if (cashInvestedForPriceEok(input, mid) <= targetCashEok) {
      low = mid
    } else {
      high = mid
    }
  }

  return roundEok(low)
}

function cashInvestedForPriceEok(input: RecommendedPurchasePriceInput, purchasePriceEok: number): number {
  const sideCostsEok =
    defaultAcquisitionTaxEok(input.propertyType, purchasePriceEok) +
    defaultLegalFeeEok(purchasePriceEok) +
    defaultBrokerageFeeEok(purchasePriceEok) +
    input.otherCostEok
  return purchasePriceEok + sideCostsEok - purchasePriceEok * (input.ltvPercent / 100)
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
  const autoTargetMonthlyNetManwon = roundManwon(
    cashInvestedWithLoanEok * DEFAULT_TARGET_MONTHLY_NET_MANWON_PER_EOK,
  )
  const targetMonthlyNetManwon = normalizePositive(
    input.targetMonthlyNetManwon,
    autoTargetMonthlyNetManwon,
  )
  const targetMonthlyNetGapManwon = roundManwon(monthlyNetManwon - targetMonthlyNetManwon)
  const annualNetManwon = roundManwon(monthlyNetManwon * 12)
  const annualRevenueManwon = roundManwon(input.monthlyRevenueManwon * 12)
  const roiWithLoanPercent = cashInvestedWithLoanEok > 0
    ? roundPercent((annualNetManwon / (cashInvestedWithLoanEok * 10000)) * 100)
    : null
  const monthlyCashYieldPercent = cashInvestedWithLoanEok > 0
    ? roundPercent((monthlyNetManwon / (cashInvestedWithLoanEok * 10000)) * 100)
    : null
  const loanResilience = calculateLoanResilience(monthlyNetManwon, totalMonthlyInterestManwon)
  const exitBuyerRequiredCashEok = monthlyNetManwon > 0
    ? roundEok(monthlyNetManwon / (DEFAULT_EXIT_MONTHLY_YIELD_PERCENT * 100))
    : null
  const exitEstimatedSalePriceEok = exitBuyerRequiredCashEok !== null
    ? roundEok(exitBuyerRequiredCashEok / (1 - DEFAULT_EXIT_BUYER_LTV_PERCENT / 100))
    : null
  const exitSalePriceGapEok = exitEstimatedSalePriceEok !== null
    ? roundEok(exitEstimatedSalePriceEok - input.purchasePriceEok)
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
    targetMonthlyNetManwon,
    targetMonthlyNetGapManwon,
    annualNetManwon,
    annualRevenueManwon,
    roiWithLoanPercent,
    monthlyCashYieldPercent,
    loanResilienceRatio: loanResilience.ratio,
    loanResilienceStatus: loanResilience.status,
    loanResilienceLabel: loanResilience.label,
    loanResilienceMessage: loanResilience.message,
    exitBuyerRequiredCashEok,
    exitEstimatedSalePriceEok,
    exitSalePriceGapEok,
    roiNoLoanPercent,
  }
}

function calculateLoanResilience(
  monthlyNetManwon: number,
  totalMonthlyInterestManwon: number,
): {
  ratio: number | null
  status: LoanResilienceStatus
  label: string
  message: string
} {
  if (totalMonthlyInterestManwon <= 0) {
    return {
      ratio: null,
      status: 'no-loan',
      label: '대출 없음',
      message: '대출 이자 부담이 없어요.',
    }
  }

  const ratio = roundPercent(monthlyNetManwon / totalMonthlyInterestManwon)
  if (ratio >= 2) {
    return {
      ratio,
      status: 'stable',
      label: '안정',
      message: '이자 부담을 충분히 감당하는 편이에요.',
    }
  }
  if (ratio >= 1.2) {
    return {
      ratio,
      status: 'caution',
      label: '주의',
      message: '버틸 수는 있지만 매출이 흔들리면 부담이 커질 수 있어요.',
    }
  }
  if (ratio >= 1) {
    return {
      ratio,
      status: 'danger',
      label: '위험',
      message: '이자를 내고 나면 남는 여유가 거의 없어요.',
    }
  }

  return {
    ratio,
    status: 'deficit',
    label: '적자',
    message: '현재 수익으로는 이자 부담을 감당하기 어려워요.',
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

function normalizePositive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback
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
