import { describe, expect, it } from 'vitest'
import {
  calculateInvestment,
  DEFAULT_ANNUAL_INTEREST_RATE,
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
    expect(DEFAULT_TOURISM_LOAN_ANNUAL_INTEREST_RATE).toBe(2.1)
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
    expect(result.targetMonthlyNetManwon).toBe(1283)
    expect(result.targetMonthlyNetGapManwon).toBe(-998)
    expect(result.annualNetManwon).toBe(3420)
    expect(result.annualRevenueManwon).toBe(7200)
    expect(result.roiWithLoanPercent).toBe(7.99)
    expect(result.monthlyCashYieldPercent).toBe(0.67)
    expect(result.roiNoLoanPercent).toBe(5.68)
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
    expect(result.roiWithLoanPercent).toBe(result.roiNoLoanPercent)
  })
})
