import { describe, expect, it } from 'vitest'
import {
  calculateInvestment,
  calculatePurchaseDecision,
  calculateRecommendedPurchasePriceEok,
  DEFAULT_ANNUAL_INTEREST_RATE,
  DEFAULT_EXIT_BUYER_LTV_PERCENT,
  DEFAULT_EXIT_MONTHLY_YIELD_PERCENT,
  DEFAULT_LTV_PERCENT,
  DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE,
  defaultAcquisitionTaxEok,
  defaultBrokerageFeeEok,
  defaultLegalFeeEok,
  defaultLoanAmountEok,
  defaultLtvPercent,
} from './calculator'

describe('direct purchase calculator', () => {
  it('uses the requested editable default financing assumptions', () => {
    expect(DEFAULT_LTV_PERCENT).toBe(80)
    expect(DEFAULT_ANNUAL_INTEREST_RATE).toBe(5)
    expect(DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE).toBe(2.55)
  })

  it('auto-calculates default fees from purchase price', () => {
    expect(defaultAcquisitionTaxEok('commercial', 12)).toBe(0.552)
    expect(defaultLegalFeeEok(12)).toBe(0.018)
    expect(defaultBrokerageFeeEok(12)).toBe(0.108)
    expect(defaultLoanAmountEok(12)).toBe(9.6)
  })

  it('auto-calculates default loan amount from a custom LTV percent', () => {
    expect(defaultLoanAmountEok(12, 60)).toBe(7.2)
    expect(defaultLoanAmountEok(12, 80)).toBe(9.6)
  })

  it('auto-calculates LTV percent from a manually edited loan amount', () => {
    expect(defaultLtvPercent(12, 6)).toBe(50)
    expect(defaultLtvPercent(12, 8.4)).toBe(70)
    expect(defaultLtvPercent(0, 8.4)).toBe(0)
  })

  it('calculates leverage and no-loan ROI in manwon/eok units', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 12,
      acquisitionTaxEok: 0.552,
      legalFeeEok: 0.018,
      brokerageFeeEok: 0.108,
      otherCostEok: 0,
      loanAmountEok: 8.4,
      annualInterestRate: 4.5,
      tourismLoanAmountEok: 0,
      tourismLoanAnnualInterestRate: 0,
      monthlyRevenueManwon: 600,
    })

    expect(result.sideCostsEok).toBe(0.678)
    expect(result.totalInvestmentEok).toBe(12.678)
    expect(result.cashInvestedWithLoanEok).toBe(4.278)
    expect(result.monthlyInterestManwon).toBe(315)
    expect(result.tourismLoanMonthlyInterestManwon).toBe(0)
    expect(result.totalMonthlyInterestManwon).toBe(315)
    expect(result.monthlyNetManwon).toBe(285)
    expect(result.loanResilienceRatio).toBe(0.9)
    expect(result.loanResilienceStatus).toBe('deficit')
    expect(result.loanResilienceLabel).toBe('적자')
    expect(result.loanResilienceMessage).toBe('현재 수익으로는 이자 부담을 감당하기 어려워요.')
    expect(result.targetMonthlyNetManwon).toBe(1283)
    expect(result.targetMonthlyNetGapManwon).toBe(-998)
    expect(result.annualNetManwon).toBe(3420)
    expect(result.annualRevenueManwon).toBe(7200)
    expect(result.roiWithLoanPercent).toBe(7.99)
    expect(result.monthlyCashYieldPercent).toBe(0.67)
    expect(result.exitBuyerRequiredCashEok).toBe(0.95)
    expect(result.exitEstimatedSalePriceEok).toBe(4.75)
    expect(result.exitSalePriceGapEok).toBe(-7.25)
    expect(result.roiNoLoanPercent).toBe(5.68)
  })

  it('estimates exit sale price from monthly net, buyer 80% LTV, and 3% monthly yield', () => {
    expect(DEFAULT_EXIT_BUYER_LTV_PERCENT).toBe(80)
    expect(DEFAULT_EXIT_MONTHLY_YIELD_PERCENT).toBe(3)

    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 40,
      acquisitionTaxEok: 1.84,
      legalFeeEok: 0.06,
      brokerageFeeEok: 0.36,
      otherCostEok: 0,
      loanAmountEok: 32,
      annualInterestRate: 5,
      tourismLoanAmountEok: 0,
      tourismLoanAnnualInterestRate: DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE,
      monthlyRevenueManwon: 5833,
    })

    expect(result.monthlyNetManwon).toBe(4500)
    expect(result.exitBuyerRequiredCashEok).toBe(15)
    expect(result.exitEstimatedSalePriceEok).toBe(75)
    expect(result.exitSalePriceGapEok).toBe(35)
  })

  it('shows plain-language loan resilience from monthly net versus interest', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 40,
      acquisitionTaxEok: 1.84,
      legalFeeEok: 0.06,
      brokerageFeeEok: 0.36,
      otherCostEok: 0,
      loanAmountEok: 32,
      annualInterestRate: 5,
      tourismLoanAmountEok: 0,
      tourismLoanAnnualInterestRate: DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE,
      monthlyRevenueManwon: 5833,
    })

    expect(result.totalMonthlyInterestManwon).toBe(1333)
    expect(result.monthlyNetManwon).toBe(4500)
    expect(result.loanResilienceRatio).toBe(3.38)
    expect(result.loanResilienceStatus).toBe('stable')
    expect(result.loanResilienceLabel).toBe('안정')
    expect(result.loanResilienceMessage).toBe('이자 부담을 충분히 감당하는 편이에요.')
  })

  it('includes tourism fund construction loan interest in total monthly interest', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 12,
      acquisitionTaxEok: 0.552,
      legalFeeEok: 0.018,
      brokerageFeeEok: 0.108,
      otherCostEok: 0,
      loanAmountEok: 8.4,
      annualInterestRate: 4.5,
      tourismLoanAmountEok: 2,
      tourismLoanAnnualInterestRate: 2,
      monthlyRevenueManwon: 600,
    })

    expect(result.monthlyInterestManwon).toBe(315)
    expect(result.tourismLoanMonthlyInterestManwon).toBe(33)
    expect(result.totalMonthlyInterestManwon).toBe(348)
    expect(result.monthlyNetManwon).toBe(252)
  })

  it('uses cash invested after LTV loan as the monthly net target base', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 40,
      acquisitionTaxEok: 1.84,
      legalFeeEok: 0.06,
      brokerageFeeEok: 0.36,
      otherCostEok: 0,
      loanAmountEok: 32,
      annualInterestRate: 4.5,
      tourismLoanAmountEok: 0,
      tourismLoanAnnualInterestRate: 0,
      monthlyRevenueManwon: 5000,
    })

    expect(result.totalInvestmentEok).toBe(42.26)
    expect(result.cashInvestedWithLoanEok).toBe(10.26)
    expect(result.targetMonthlyNetManwon).toBe(3078)
  })

  it('classifies purchase decision from expected monthly net versus required monthly net', () => {
    expect(calculatePurchaseDecision(1832, 1154, 4.76)).toMatchObject({
      status: 'excellent',
      label: '매우 좋음',
      gapManwon: 678,
    })
    expect(calculatePurchaseDecision(1200, 1000, 3.6)).toMatchObject({
      status: 'reviewable',
      label: '검토 가능',
      gapManwon: 200,
    })
    expect(calculatePurchaseDecision(850, 1000, 2.55)).toMatchObject({
      status: 'needs-adjustment',
      label: '조건 조정 필요',
      gapManwon: -150,
    })
    expect(calculatePurchaseDecision(700, 1000, 2.1)).toMatchObject({
      status: 'expensive',
      label: '보수적으로 비쌈',
      gapManwon: -300,
    })
  })

  it('reverse-calculates the maximum purchase price from current monthly net and financing assumptions', () => {
    const recommendedPrice = calculateRecommendedPurchasePriceEok({
      propertyType: 'commercial',
      monthlyNetManwon: 1200,
      ltvPercent: 80,
      otherCostEok: 0,
    })

    expect(recommendedPrice).toBe(15.598)
  })

  it('returns null ROI when there is no purchase price input', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 0,
      acquisitionTaxEok: 0,
      legalFeeEok: 0,
      brokerageFeeEok: 0,
      otherCostEok: 0,
      loanAmountEok: 0,
      annualInterestRate: 4.5,
      monthlyRevenueManwon: 0,
    })

    expect(result.totalInvestmentEok).toBe(0)
    expect(result.targetMonthlyNetManwon).toBe(0)
    expect(result.targetMonthlyNetGapManwon).toBe(0)
    expect(result.roiWithLoanPercent).toBeNull()
    expect(result.monthlyCashYieldPercent).toBeNull()
    expect(result.loanResilienceRatio).toBeNull()
    expect(result.loanResilienceStatus).toBe('no-loan')
    expect(result.loanResilienceLabel).toBe('대출 없음')
    expect(result.exitBuyerRequiredCashEok).toBeNull()
    expect(result.exitEstimatedSalePriceEok).toBeNull()
    expect(result.exitSalePriceGapEok).toBeNull()
    expect(result.roiNoLoanPercent).toBeNull()
  })

  it('treats a fully cash-funded purchase identically to the no-loan scenario', () => {
    const result = calculateInvestment({
      propertyType: 'commercial',
      purchasePriceEok: 10,
      acquisitionTaxEok: 0.46,
      legalFeeEok: 0.015,
      brokerageFeeEok: 0.09,
      otherCostEok: 0,
      loanAmountEok: 0,
      annualInterestRate: 4.5,
      monthlyRevenueManwon: 500,
    })

    expect(result.monthlyInterestManwon).toBe(0)
    expect(result.monthlyNetManwon).toBe(500)
    expect(result.loanResilienceRatio).toBeNull()
    expect(result.loanResilienceStatus).toBe('no-loan')
    expect(result.loanResilienceLabel).toBe('대출 없음')
    expect(result.roiWithLoanPercent).toBe(result.roiNoLoanPercent)
  })
})
