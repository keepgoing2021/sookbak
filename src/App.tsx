import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import './App.css'
import {
  type PropertyType,
  calculateInvestment,
  defaultAcquisitionTaxEok,
  defaultBrokerageFeeEok,
  defaultLegalFeeEok,
  defaultLoanAmountEok,
  formatEok,
  formatManwon,
  formatPercent,
  toNumber,
} from './calculator'
import {
  DEFAULT_AIRBNB_FEE_PERCENT,
  DEFAULT_DIRECT_HOURS,
  DEFAULT_ELECTRICITY_MANWON,
  DEFAULT_GAS_MANWON,
  DEFAULT_HOURLY_VALUE_MANWON,
  DEFAULT_INTERNET_MANWON,
  DEFAULT_MANAGED_FEE_PERCENT,
  DEFAULT_WATER_MANWON,
  calculateRental,
  calculateScenario,
  compareManagedVsDirect,
  deriveScenarioDefaults,
  formatHourlyManwon,
  formatManwonSigned,
  formatPaybackMonths,
  formatYieldPercent,
  type RentalCalculatorInput,
  type ScenarioKey,
} from './rentalCalculator'
import {
  calculateConstructionRisk,
  describeRiskLevel,
  type ConstructionRiskInput,
} from './constructionRisk'

type CalculatorTab = 'direct' | 'rental' | 'risk'
type RiskSourceMode = Exclude<CalculatorTab, 'risk'>

type Values = {
  purchasePriceEok: string
  acquisitionTaxEok: string | null
  legalFeeEok: string | null
  brokerageFeeEok: string | null
  otherCostEok: string
  loanAmountEok: string | null
  annualInterestRate: string
  monthlyRevenueManwon: string
}

type AutoFieldKey = 'acquisitionTaxEok' | 'legalFeeEok' | 'brokerageFeeEok' | 'loanAmountEok'
type FreeFieldKey =
  | 'purchasePriceEok'
  | 'otherCostEok'
  | 'annualInterestRate'
  | 'monthlyRevenueManwon'

const propertyTypes: Array<{ key: PropertyType; label: string; description: string }> = [
  { key: 'commercial', label: '상가/오피스텔', description: '업무·상업용 기준' },
  { key: 'housing', label: '주택', description: '단순 1.1% 기준' },
  { key: 'land', label: '토지', description: '토지 취득세 기준' },
]

const initialValues: Values = {
  purchasePriceEok: '',
  acquisitionTaxEok: null,
  legalFeeEok: null,
  brokerageFeeEok: null,
  otherCostEok: '',
  loanAmountEok: null,
  annualInterestRate: '4.5',
  monthlyRevenueManwon: '',
}

const tabs: Array<{ key: CalculatorTab; label: string; eyebrow: string }> = [
  { key: 'direct', label: '직접 매입', eyebrow: '직접 매입 투자 의사결정 도구' },
  { key: 'rental', label: '임대 운영', eyebrow: '임대 운영 수익률 의사결정 도구' },
  { key: 'risk', label: '공사·인허가', eyebrow: '공사·인허가 리스크 체크 도구' },
]

function App() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('direct')
  const [riskInitialMode, setRiskInitialMode] = useState<RiskSourceMode>('direct')
  const [directPropertyType, setDirectPropertyType] = useState<PropertyType>('commercial')
  const [directValues, setDirectValues] = useState<Values>(initialValues)
  const [rentalValues, setRentalValues] = useState<RentalValues>(initialRentalValues)

  const selectTab = (tab: CalculatorTab) => {
    setActiveTab(tab)
    if (tab !== 'risk') {
      setRiskInitialMode(tab)
    }
  }

  return (
    <main className="page-shell">
      <section className="calculator-card" aria-labelledby="calculator-title">
        <button className="close-button" type="button" aria-label="닫기">
          ×
        </button>

        <div className="tab-bar" role="tablist" aria-label="계산기 종류">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'direct' ? (
          <DirectPurchaseCalculator
            propertyType={directPropertyType}
            setPropertyType={setDirectPropertyType}
            values={directValues}
            setValues={setDirectValues}
          />
        ) : activeTab === 'rental' ? (
          <RentalCalculator values={rentalValues} setValues={setRentalValues} />
        ) : (
          <ConstructionRiskSection
            directValues={directValues}
            directPropertyType={directPropertyType}
            rentalValues={rentalValues}
            initialMode={riskInitialMode}
          />
        )}
      </section>
    </main>
  )
}

function DirectPurchaseCalculator({
  propertyType,
  setPropertyType,
  values,
  setValues,
}: {
  propertyType: PropertyType
  setPropertyType: (value: PropertyType) => void
  values: Values
  setValues: Dispatch<SetStateAction<Values>>
}) {
  const purchasePriceEok = toNumber(values.purchasePriceEok)
  const hasPurchasePrice = purchasePriceEok > 0

  const autoDefaults = useMemo(() => {
    if (!hasPurchasePrice) {
      return { acquisitionTaxEok: '', legalFeeEok: '', brokerageFeeEok: '', loanAmountEok: '' }
    }
    return {
      acquisitionTaxEok: stringify(defaultAcquisitionTaxEok(propertyType, purchasePriceEok)),
      legalFeeEok: stringify(defaultLegalFeeEok(purchasePriceEok)),
      brokerageFeeEok: stringify(defaultBrokerageFeeEok(purchasePriceEok)),
      loanAmountEok: stringify(defaultLoanAmountEok(purchasePriceEok)),
    }
  }, [propertyType, purchasePriceEok, hasPurchasePrice])

  const effective = {
    acquisitionTaxEok: values.acquisitionTaxEok ?? autoDefaults.acquisitionTaxEok,
    legalFeeEok: values.legalFeeEok ?? autoDefaults.legalFeeEok,
    brokerageFeeEok: values.brokerageFeeEok ?? autoDefaults.brokerageFeeEok,
    loanAmountEok: values.loanAmountEok ?? autoDefaults.loanAmountEok,
  }

  const input = useMemo(
    () => ({
      propertyType,
      purchasePriceEok,
      acquisitionTaxEok: toNumber(effective.acquisitionTaxEok),
      legalFeeEok: toNumber(effective.legalFeeEok),
      brokerageFeeEok: toNumber(effective.brokerageFeeEok),
      otherCostEok: toNumber(values.otherCostEok),
      loanAmountEok: toNumber(effective.loanAmountEok),
      annualInterestRate: toNumber(values.annualInterestRate),
      monthlyRevenueManwon: toNumber(values.monthlyRevenueManwon),
    }),
    [
      propertyType,
      purchasePriceEok,
      effective.acquisitionTaxEok,
      effective.legalFeeEok,
      effective.brokerageFeeEok,
      effective.loanAmountEok,
      values.otherCostEok,
      values.annualInterestRate,
      values.monthlyRevenueManwon,
    ],
  )

  const result = useMemo(() => calculateInvestment(input), [input])

  const updateFree = (key: FreeFieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const updateAuto = (key: AutoFieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <header className="hero-copy">
        <p className="eyebrow">직접 매입 투자 의사결정 도구</p>
        <h1 id="calculator-title">직접 매입 수익률 계산기</h1>
        <p>
          매물 종류 선택 → 매매가 입력하면 부대비용·대출이 자동 채워지고, 대출 시·무대출 기준
          수익률이 동시에 계산돼요. <strong>(단위: 억원 / 만원)</strong>
        </p>
      </header>

      <div className="form-grid">
        <section className="panel investment-panel" aria-labelledby="investment-title">
          <div className="panel-heading">
            <span className="section-index">01</span>
            <h2 id="investment-title">투자 비용 입력</h2>
          </div>

          <label className="field-label">매물 종류</label>
          <div className="segmented" role="tablist" aria-label="매물 종류 선택">
            {propertyTypes.map((item) => (
              <button
                key={item.key}
                type="button"
                className={propertyType === item.key ? 'active' : ''}
                onClick={() => setPropertyType(item.key)}
                aria-selected={propertyType === item.key}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </div>

          <div className="primary-input-block">
            <MoneyInput
              label="매매가"
              placeholder="예: 12"
              unit="억원"
              value={values.purchasePriceEok}
              onChange={(value) => updateFree('purchasePriceEok', value)}
              help="먼저 계약가만 넣으면 나머지 비용은 자동으로 잡혀요."
            />
          </div>

          <details className="details-card" open={hasPurchasePrice}>
            <summary>
              <span>상세 비용 수정</span>
              <small>자동 계산값 확인·수정</small>
            </summary>
            <div className="details-body">
              <MoneyInput
                label="취득세"
                unit="억원"
                value={effective.acquisitionTaxEok}
                onChange={(value) => updateAuto('acquisitionTaxEok', value)}
                help="매매가 × 세율 자동 입력"
              />
              <MoneyInput
                label="법무사 비용"
                unit="억원"
                value={effective.legalFeeEok}
                onChange={(value) => updateAuto('legalFeeEok', value)}
                help="3억미만 0.3% / 3~10억 0.2% / 10억+ 0.15%"
              />
              <MoneyInput
                label="중개수수료"
                unit="억원"
                value={effective.brokerageFeeEok}
                onChange={(value) => updateAuto('brokerageFeeEok', value)}
                help="매매가 × 0.9% 자동 입력"
              />
              <MoneyInput
                label="기타비용 (권리금 등)"
                unit="억원"
                value={values.otherCostEok}
                onChange={(value) => updateFree('otherCostEok', value)}
                help="회수 보장 안 되는 자금은 별도로 보수적으로 잡으세요."
              />
            </div>
          </details>
        </section>

        <section className="right-column">
          <div className="panel loan-panel" aria-labelledby="loan-title">
            <div className="panel-heading blue">
              <span className="section-index">02</span>
              <h2 id="loan-title">대출 & 운영 입력</h2>
            </div>
            <MoneyInput
              label="대출금액"
              unit="억원"
              value={effective.loanAmountEok}
              onChange={(value) => updateAuto('loanAmountEok', value)}
              help="매매가 × 70% 자동 입력 (수정 가능)"
            />
            <MoneyInput
              label="대출 금리 (연)"
              unit="%"
              value={values.annualInterestRate}
              onChange={(value) => updateFree('annualInterestRate', value)}
              inputMode="decimal"
            />
            <MoneyInput
              label="월 매출 (에어비앤비)"
              unit="만원"
              value={values.monthlyRevenueManwon}
              onChange={(value) => updateFree('monthlyRevenueManwon', value)}
              help="운영비·수수료를 미리 뺀 순매출 기준을 권장해요."
            />
          </div>

          <DirectResultPanel hasPurchasePrice={hasPurchasePrice} result={result} />
        </section>
      </div>

      <aside className="notice">
        <strong>읽는 법</strong>
        <span>
          ①번은 대출 이자까지 반영한 실제 운영 수익률, ②번은 비교용 무대출 기준이에요. 월 매출은 운영비·수수료를 미리 뺀 순매출로 입력해야 정확해요. 기타비용(권리금 등)은 회수 보장이 없는데도 자기자본에 묶이는 돈이라 수익률 숫자와 별개로 같이 보셔야 해요.
        </span>
      </aside>
    </>
  )
}

type RentalValues = {
  roomCount: string
  nightlyPriceManwon: string
  occupancyPercent: string
  airbnbFeePercent: string
  depositManwon: string
  interiorCostManwon: string
  rentManwon: string
  electricityManwon: string
  gasManwon: string
  internetManwon: string
  waterManwon: string
  cleaningManwon: string
  suppliesManwon: string
  pestControlManwon: string
  maintenanceManwon: string
}

const initialRentalValues: RentalValues = {
  roomCount: '1',
  nightlyPriceManwon: '',
  occupancyPercent: '',
  airbnbFeePercent: String(DEFAULT_AIRBNB_FEE_PERCENT),
  depositManwon: '',
  interiorCostManwon: '',
  rentManwon: '',
  electricityManwon: String(DEFAULT_ELECTRICITY_MANWON),
  gasManwon: String(DEFAULT_GAS_MANWON),
  internetManwon: String(DEFAULT_INTERNET_MANWON),
  waterManwon: String(DEFAULT_WATER_MANWON),
  cleaningManwon: '',
  suppliesManwon: '',
  pestControlManwon: '',
  maintenanceManwon: '',
}

function RentalCalculator({
  values,
  setValues,
}: {
  values: RentalValues
  setValues: Dispatch<SetStateAction<RentalValues>>
}) {
  const roomCount = toNumber(values.roomCount)
  const nightlyPrice = toNumber(values.nightlyPriceManwon)
  const occupancy = toNumber(values.occupancyPercent)
  const hasRevenueInputs = nightlyPrice > 0 && occupancy > 0

  const input = useMemo(
    () => ({
      roomCount,
      nightlyPriceManwon: nightlyPrice,
      occupancyPercent: occupancy,
      airbnbFeePercent: toNumber(values.airbnbFeePercent),
      depositManwon: toNumber(values.depositManwon),
      interiorCostManwon: toNumber(values.interiorCostManwon),
      rentManwon: toNumber(values.rentManwon),
      electricityManwon: toNumber(values.electricityManwon),
      gasManwon: toNumber(values.gasManwon),
      internetManwon: toNumber(values.internetManwon),
      waterManwon: toNumber(values.waterManwon),
      cleaningManwon: toNumber(values.cleaningManwon),
      suppliesManwon: toNumber(values.suppliesManwon),
      pestControlManwon: toNumber(values.pestControlManwon),
      maintenanceManwon: toNumber(values.maintenanceManwon),
    }),
    [
      roomCount,
      nightlyPrice,
      occupancy,
      values.airbnbFeePercent,
      values.depositManwon,
      values.interiorCostManwon,
      values.rentManwon,
      values.electricityManwon,
      values.gasManwon,
      values.internetManwon,
      values.waterManwon,
      values.cleaningManwon,
      values.suppliesManwon,
      values.pestControlManwon,
      values.maintenanceManwon,
    ],
  )

  const result = useMemo(() => calculateRental(input), [input])

  const update = (key: keyof RentalValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <header className="hero-copy">
        <p className="eyebrow">임대 운영 수익률 의사결정 도구</p>
        <h1 id="calculator-title">임대 운영 수익률 계산기</h1>
        <p>
          1박 가격·점유율을 입력하면 월 매출에서 비용을 차감해 월 순수익·연수익률·회수기간이 계산돼요. <strong>(단위: 만원 / %)</strong>
        </p>
      </header>

      <div className="form-grid">
        <section className="left-column">
          <div className="panel income-panel" aria-labelledby="income-title">
            <div className="panel-heading blue">
              <span className="section-index">01</span>
              <h2 id="income-title">수입</h2>
            </div>
            <MoneyInput
              label="방 개수"
              unit="개"
              placeholder="예: 3"
              value={values.roomCount}
              onChange={(value) => update('roomCount', value)}
              help="방별 판매가 같다는 가정으로 전체 월 매출에 곱해져요."
              inputMode="numeric"
            />
            <MoneyInput
              label="1박 가격"
              unit="만원"
              placeholder="예: 20"
              value={values.nightlyPriceManwon}
              onChange={(value) => update('nightlyPriceManwon', value)}
            />
            <MoneyInput
              label="점유율"
              unit="%"
              placeholder="예: 60"
              value={values.occupancyPercent}
              onChange={(value) => update('occupancyPercent', value)}
            />
            <MoneyInput
              label="에어비앤비 수수료"
              unit="%"
              value={values.airbnbFeePercent}
              onChange={(value) => update('airbnbFeePercent', value)}
              help="에어비앤비 표준 약 15.5% (호스트 등급별 다름)"
            />
          </div>

          <div className="panel investment-panel-purple" aria-labelledby="invest-title">
            <div className="panel-heading purple">
              <span className="section-index">02</span>
              <h2 id="invest-title">투자</h2>
            </div>
            <MoneyInput
              label="보증금"
              unit="만원"
              value={values.depositManwon}
              onChange={(value) => update('depositManwon', value)}
            />
            <MoneyInput
              label="인테리어비용"
              unit="만원"
              value={values.interiorCostManwon}
              onChange={(value) => update('interiorCostManwon', value)}
            />
          </div>
        </section>

        <section className="right-column">
          <div className="panel cost-panel" aria-labelledby="cost-title">
            <div className="panel-heading orange">
              <span className="section-index">03</span>
              <h2 id="cost-title">비용</h2>
            </div>
            <MoneyInput
              label="월세"
              unit="만원"
              value={values.rentManwon}
              onChange={(value) => update('rentManwon', value)}
            />

            <div className="cost-group">
              <div className="cost-group-head">
                <span>공급금 합계</span>
                <strong>{formatManwonSigned(result.supplyTotalManwon)}</strong>
              </div>
              <MoneyInput
                label="전기"
                unit="만원"
                value={values.electricityManwon}
                onChange={(value) => update('electricityManwon', value)}
              />
              <MoneyInput
                label="가스"
                unit="만원"
                value={values.gasManwon}
                onChange={(value) => update('gasManwon', value)}
              />
              <MoneyInput
                label="인터넷"
                unit="만원"
                value={values.internetManwon}
                onChange={(value) => update('internetManwon', value)}
              />
              <MoneyInput
                label="정수기"
                unit="만원"
                value={values.waterManwon}
                onChange={(value) => update('waterManwon', value)}
              />
            </div>

            <div className="cost-group">
              <div className="cost-group-head">
                <span>운영비 합계</span>
                <strong>{formatManwonSigned(result.operatingTotalManwon)}</strong>
              </div>
              <MoneyInput
                label="청소"
                unit="만원"
                value={values.cleaningManwon}
                onChange={(value) => update('cleaningManwon', value)}
              />
              <MoneyInput
                label="비품"
                unit="만원"
                value={values.suppliesManwon}
                onChange={(value) => update('suppliesManwon', value)}
              />
              <MoneyInput
                label="방역"
                unit="만원"
                value={values.pestControlManwon}
                onChange={(value) => update('pestControlManwon', value)}
              />
              <MoneyInput
                label="유지보수"
                unit="만원"
                value={values.maintenanceManwon}
                onChange={(value) => update('maintenanceManwon', value)}
              />
            </div>
          </div>

          <RentalResultPanel hasRevenueInputs={hasRevenueInputs} result={result} />
        </section>
      </div>

      <ScenarioComparisonSection
        baseInput={input}
        currentNightlyPriceManwon={nightlyPrice}
        currentOccupancyPercent={occupancy}
      />

      <ManagedVsDirectSection
        hasRevenueInputs={hasRevenueInputs}
        monthlyRevenueManwon={result.monthlyRevenueManwon}
        monthlyNetManwon={result.monthlyNetManwon}
      />

      <aside className="notice">
        <strong>읽는 법</strong>
        <span>
          ①번이 실제 운영 시 체감 수익이에요. 점유율은 비수기 평균을 보수적으로 잡으세요. ②번은 비교용 상한이라 의사결정은 ①번 기준으로 보세요. 공급·운영비 디폴트값은 일반 평균이라 본인 매물에 맞게 수정하세요. 회수기간은 매월 비용(인테리어)만 대상이에요. 보증금은 임대 종료 시 회수되므로 제외했어요.
        </span>
      </aside>
    </>
  )
}

type ScenarioMeta = {
  key: ScenarioKey
  title: string
  caption: string
  tone: 'conservative' | 'base' | 'optimistic'
}

const SCENARIO_META: ScenarioMeta[] = [
  { key: 'conservative', title: '보수', caption: '비수기·낮은 점유 가정', tone: 'conservative' },
  { key: 'base', title: '기본', caption: '평균 가정', tone: 'base' },
  { key: 'optimistic', title: '낙관', caption: '성수기·높은 점유 가정', tone: 'optimistic' },
]

type ScenarioFormState = Record<ScenarioKey, { nightlyPriceManwon: string; occupancyPercent: string }>

function ScenarioComparisonSection({
  baseInput,
  currentNightlyPriceManwon,
  currentOccupancyPercent,
}: {
  baseInput: RentalCalculatorInput
  currentNightlyPriceManwon: number
  currentOccupancyPercent: number
}) {
  const defaults = useMemo(
    () => deriveScenarioDefaults(currentNightlyPriceManwon, currentOccupancyPercent),
    [currentNightlyPriceManwon, currentOccupancyPercent],
  )

  const [overrides, setOverrides] = useState<Partial<Record<ScenarioKey, { nightlyPriceManwon?: string; occupancyPercent?: string }>>>({})

  const formState: ScenarioFormState = useMemo(() => {
    const build = (key: ScenarioKey) => ({
      nightlyPriceManwon:
        overrides[key]?.nightlyPriceManwon ?? String(defaults[key].nightlyPriceManwon || ''),
      occupancyPercent:
        overrides[key]?.occupancyPercent ?? String(defaults[key].occupancyPercent || ''),
    })
    return {
      conservative: build('conservative'),
      base: build('base'),
      optimistic: build('optimistic'),
    }
  }, [defaults, overrides])

  const updateField = (key: ScenarioKey, field: 'nightlyPriceManwon' | 'occupancyPercent', value: string) => {
    setOverrides((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }))
  }

  const scenarios = SCENARIO_META.map((meta) => {
    const override = {
      nightlyPriceManwon: toNumber(formState[meta.key].nightlyPriceManwon),
      occupancyPercent: toNumber(formState[meta.key].occupancyPercent),
    }
    const result = calculateScenario(baseInput, override)
    return { meta, override, result }
  })

  return (
    <section className="advanced-panel scenario-panel" aria-labelledby="scenario-title">
      <div className="advanced-heading">
        <span className="section-index">04</span>
        <div>
          <h2 id="scenario-title">시나리오 비교</h2>
          <p>1박 가격·점유율을 보수/기본/낙관으로 비교해 월 순수익과 인테리어 회수기간을 한눈에 보세요.</p>
        </div>
      </div>

      <div className="scenario-comparison-grid">
        {scenarios.map(({ meta, result }) => (
          <article key={meta.key} className={`scenario-card scenario-${meta.tone}`}>
            <header>
              <span className="scenario-tag">{meta.title}</span>
              <p>{meta.caption}</p>
            </header>
            <div className="scenario-inputs">
              <ScenarioMiniInput
                label="1박"
                unit="만원"
                value={formState[meta.key].nightlyPriceManwon}
                onChange={(value) => updateField(meta.key, 'nightlyPriceManwon', value)}
              />
              <ScenarioMiniInput
                label="점유율"
                unit="%"
                value={formState[meta.key].occupancyPercent}
                onChange={(value) => updateField(meta.key, 'occupancyPercent', value)}
              />
            </div>
            <dl className="scenario-metrics">
              <div>
                <dt>월 매출</dt>
                <dd>{formatManwonSigned(result.monthlyRevenueManwon)}</dd>
              </div>
              <div>
                <dt>월 순수익</dt>
                <dd className="emphasis">{formatManwonSigned(result.monthlyNetManwon)}</dd>
              </div>
              <div>
                <dt>인테리어 회수기간</dt>
                <dd>{formatPaybackMonths(result.paybackMonths)}</dd>
              </div>
              <div>
                <dt>연수익률</dt>
                <dd>{formatYieldPercent(result.annualYieldPercent)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <p className="advanced-caveat">
        ※ 각 시나리오는 현재 입력된 비용·보증금·인테리어 가정을 그대로 재사용해요. 의사결정은 보수 기준을 먼저 보세요.
      </p>
    </section>
  )
}

function ScenarioMiniInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="scenario-mini-input">
      <span>{label}</span>
      <div>
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <em>{unit}</em>
      </div>
    </label>
  )
}

function ManagedVsDirectSection({
  hasRevenueInputs,
  monthlyRevenueManwon,
  monthlyNetManwon,
}: {
  hasRevenueInputs: boolean
  monthlyRevenueManwon: number
  monthlyNetManwon: number
}) {
  const [managedFeePercent, setManagedFeePercent] = useState(String(DEFAULT_MANAGED_FEE_PERCENT))
  const [directHours, setDirectHours] = useState(String(DEFAULT_DIRECT_HOURS))
  const [hourlyValue, setHourlyValue] = useState(String(DEFAULT_HOURLY_VALUE_MANWON))

  const result = useMemo(
    () =>
      compareManagedVsDirect({
        monthlyRevenueManwon,
        monthlyNetManwon,
        managedFeePercent: toNumber(managedFeePercent),
        directHours: toNumber(directHours),
        hourlyValueManwon: toNumber(hourlyValue),
      }),
    [monthlyRevenueManwon, monthlyNetManwon, managedFeePercent, directHours, hourlyValue],
  )

  const hourlyValueNum = toNumber(hourlyValue)
  const verdict = (() => {
    if (!hasRevenueInputs) return null
    if (result.hourlyRewardManwon === null) return null
    if (hourlyValueNum <= 0) return null
    return result.hourlyRewardManwon >= hourlyValueNum ? 'direct' : 'managed'
  })()

  return (
    <section className="advanced-panel managed-panel" aria-labelledby="managed-title">
      <div className="advanced-heading">
        <span className="section-index">05</span>
        <div>
          <h2 id="managed-title">위탁운영 vs 직접운영</h2>
          <p>위탁수수료로 잃는 금액을 직접운영에 들이는 시간으로 나눠 시간당 보상을 따져봐요.</p>
        </div>
      </div>

      <div className="managed-grid">
        <div className="managed-inputs">
          <MoneyInput
            label="위탁운영 수수료율"
            unit="%"
            value={managedFeePercent}
            onChange={setManagedFeePercent}
            help="업계 평균 약 15–25%, 디폴트 20%"
          />
          <MoneyInput
            label="직접운영 예상시간"
            unit="시간/월"
            value={directHours}
            onChange={setDirectHours}
            help="청소 일정 조율·메시지 응대·체크인 등"
          />
          <MoneyInput
            label="내 시간당 가치"
            unit="만원"
            value={hourlyValue}
            onChange={setHourlyValue}
            help="기회비용 기준으로 입력하세요"
          />
        </div>

        <div className="managed-result">
          {hasRevenueInputs ? (
            <>
              <div className="managed-metrics">
                <ManagedMetric label="직접운영 월 순수익" value={formatManwonSigned(result.directNetManwon)} highlight />
                <ManagedMetric label="위탁운영 월 순수익" value={formatManwonSigned(result.managedNetManwon)} />
                <ManagedMetric label="차이 (위탁수수료)" value={formatManwonSigned(result.differenceManwon)} />
                <ManagedMetric label="시간당 보상" value={formatHourlyManwon(result.hourlyRewardManwon)} />
              </div>
              {verdict === 'direct' && (
                <p className="managed-verdict positive">
                  시간당 보상이 내 시간당 가치({formatHourlyManwon(hourlyValueNum)})보다 커요 → 직접운영이 유리해요.
                </p>
              )}
              {verdict === 'managed' && (
                <p className="managed-verdict negative">
                  시간당 보상이 내 시간당 가치({formatHourlyManwon(hourlyValueNum)})보다 작아요 → 위탁운영이 유리할 수 있어요.
                </p>
              )}
              {verdict === null && hasRevenueInputs && (
                <p className="managed-verdict neutral">
                  직접운영 예상시간과 내 시간당 가치를 입력하면 어느 쪽이 유리한지 판정해드려요.
                </p>
              )}
            </>
          ) : (
            <div className="managed-empty">
              <strong>1박 가격·점유율을 입력하면</strong>
              <span>위탁운영 vs 직접운영의 월 순수익 차이와 시간당 보상이 계산돼요.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ManagedMetric({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={highlight ? 'managed-metric highlight' : 'managed-metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type RiskFormState = {
  roomCount: string
  bathroomCount: string
  fireWindowLikely: boolean
  masonryTub: boolean
  windowReduction: boolean
}

const RISK_GUIDANCE: Array<{ title: string; body: string }> = [
  {
    title: '방·화장실 개수',
    body: '기본 1실·1욕실은 일반 난이도로 보고, 2개 이상부터 견적·일정 변동 리스크로 봐요.',
  },
  {
    title: '난방 방식',
    body: '도시가스 보일러가 LPG보다 운영에 유리해요. 화장실 바닥난방은 만족도 대비 효율이 높은 옵션이에요.',
  },
  {
    title: '소방·전기·방염',
    body: '법적 의무 항목이라 별도 예산으로 잡아야 해요. 검사 통과 전에는 영업을 시작하기 어려워요.',
  },
  {
    title: '제작가구',
    body: '기성품보다 비싸지만 좁은 공간 효율과 디자인 일관성에 유리해요. 핵심 포인트 위주 적용을 권장해요.',
  },
  {
    title: '방수',
    body: '누수·재공사 리스크를 줄이는 항목이에요. 화장실·욕조·창호 주변은 견적에서 빼지 않는 편이 안전해요.',
  },
  {
    title: '조적욕조',
    body: '사진 효과와 차별화는 강하지만 방수 난이도와 누수 리스크가 커요. 검증된 시공팀이 필요해요.',
  },
  {
    title: '필증·행정대행',
    body: '소방·전기 필증, 행정대행, 면허업체 비용은 기본 견적에 빠지는 경우가 많아요. 별도 라인으로 확보하세요.',
  },
  {
    title: '방화창',
    body: '소방서 판단이나 건축 연한에 따라 갑자기 의무가 될 수 있어요. 예비비 5–10%를 권장해요.',
  },
  {
    title: '창문 축소',
    body: '조적·방수·단열·스카이차가 묶여 비용이 커질 수 있어요. 꼭 필요한 경우인지 먼저 확인하세요.',
  },
]

function ConstructionRiskSection({
  directValues,
  directPropertyType,
  rentalValues,
  initialMode,
}: {
  directValues: Values
  directPropertyType: PropertyType
  rentalValues: RentalValues
  initialMode: RiskSourceMode
}) {
  const [sourceMode, setSourceMode] = useState<RiskSourceMode>(initialMode)
  const [form, setForm] = useState<RiskFormState>({
    roomCount: '',
    bathroomCount: '',
    fireWindowLikely: false,
    masonryTub: false,
    windowReduction: false,
  })

  useEffect(() => {
    setSourceMode(initialMode)
  }, [initialMode])

  const rentalRoomCount = toNumber(rentalValues.roomCount)
  const syncedRoomCount = sourceMode === 'rental' && rentalRoomCount > 0
    ? rentalRoomCount
    : toNumber(form.roomCount)

  const directPurchasePrice = toNumber(directValues.purchasePriceEok)
  const directEffective = {
    acquisitionTaxEok:
      directValues.acquisitionTaxEok === null
        ? defaultAcquisitionTaxEok(directPropertyType, directPurchasePrice)
        : toNumber(directValues.acquisitionTaxEok),
    legalFeeEok:
      directValues.legalFeeEok === null
        ? defaultLegalFeeEok(directPurchasePrice)
        : toNumber(directValues.legalFeeEok),
    brokerageFeeEok:
      directValues.brokerageFeeEok === null
        ? defaultBrokerageFeeEok(directPurchasePrice)
        : toNumber(directValues.brokerageFeeEok),
    loanAmountEok:
      directValues.loanAmountEok === null
        ? defaultLoanAmountEok(directPurchasePrice)
        : toNumber(directValues.loanAmountEok),
  }
  const directResult = calculateInvestment({
    propertyType: directPropertyType,
    purchasePriceEok: directPurchasePrice,
    acquisitionTaxEok: directEffective.acquisitionTaxEok,
    legalFeeEok: directEffective.legalFeeEok,
    brokerageFeeEok: directEffective.brokerageFeeEok,
    otherCostEok: toNumber(directValues.otherCostEok),
    loanAmountEok: directEffective.loanAmountEok,
    annualInterestRate: toNumber(directValues.annualInterestRate),
    monthlyRevenueManwon: toNumber(directValues.monthlyRevenueManwon),
  })

  const rentalInput: RentalCalculatorInput = {
    roomCount: rentalRoomCount,
    nightlyPriceManwon: toNumber(rentalValues.nightlyPriceManwon),
    occupancyPercent: toNumber(rentalValues.occupancyPercent),
    airbnbFeePercent: toNumber(rentalValues.airbnbFeePercent),
    depositManwon: toNumber(rentalValues.depositManwon),
    interiorCostManwon: toNumber(rentalValues.interiorCostManwon),
    rentManwon: toNumber(rentalValues.rentManwon),
    electricityManwon: toNumber(rentalValues.electricityManwon),
    gasManwon: toNumber(rentalValues.gasManwon),
    internetManwon: toNumber(rentalValues.internetManwon),
    waterManwon: toNumber(rentalValues.waterManwon),
    cleaningManwon: toNumber(rentalValues.cleaningManwon),
    suppliesManwon: toNumber(rentalValues.suppliesManwon),
    pestControlManwon: toNumber(rentalValues.pestControlManwon),
    maintenanceManwon: toNumber(rentalValues.maintenanceManwon),
  }
  const rentalResult = calculateRental(rentalInput)

  const riskInput: ConstructionRiskInput = useMemo(
    () => ({
      roomCount: syncedRoomCount,
      bathroomCount: toNumber(form.bathroomCount),
      fireWindowLikely: form.fireWindowLikely,
      masonryTub: form.masonryTub,
      windowReduction: form.windowReduction,
    }),
    [form, syncedRoomCount],
  )

  const risk = useMemo(() => calculateConstructionRisk(riskInput), [riskInput])
  const badge = describeRiskLevel(risk.level)
  const hasAnyInput =
    riskInput.roomCount > 0 ||
    riskInput.bathroomCount > 0 ||
    riskInput.fireWindowLikely ||
    riskInput.masonryTub ||
    riskInput.windowReduction
  const sourceLabel = sourceMode === 'direct' ? '직접매입 데이터' : '임대 데이터'

  return (
    <>
      <header className="hero-copy">
        <p className="eyebrow">공사·인허가 리스크 체크 도구</p>
        <h1 id="calculator-title">공사·인허가 리스크 체크</h1>
        <p>
          직접 매입 또는 임대 운영 탭에 넣은 숫자를 불러와 방 개수·화장실·방화창 같은 공사 난이도와 인허가 변수를 따로 점검해요.
        </p>
      </header>

      <section className="advanced-panel risk-panel" aria-labelledby="risk-title">
        <div className="advanced-heading">
          <span className="section-index">06</span>
          <div>
            <h2 id="risk-title">6번 공사·인허가 리스크</h2>
            <p>앞 탭의 데이터를 참고하되, 리스크 판단은 이 탭에서 별도로 입력·확인해요.</p>
          </div>
        </div>

      <div className="linked-data-tabs" role="tablist" aria-label="리스크 연동 데이터 선택">
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === 'direct'}
          className={sourceMode === 'direct' ? 'active' : ''}
          onClick={() => setSourceMode('direct')}
        >
          직접매입 데이터
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === 'rental'}
          className={sourceMode === 'rental' ? 'active' : ''}
          onClick={() => setSourceMode('rental')}
        >
          임대 데이터
        </button>
      </div>

      <div className="linked-data-panel">
        {sourceMode === 'direct' ? (
          <>
            <LinkedMetric label="매물 종류" value={propertyTypes.find((item) => item.key === directPropertyType)?.label ?? '-'} />
            <LinkedMetric label="매매가" value={directPurchasePrice > 0 ? formatEok(directPurchasePrice) : '미입력'} />
            <LinkedMetric label="총투입금" value={directPurchasePrice > 0 ? formatEok(directResult.totalInvestmentEok) : '미입력'} />
            <LinkedMetric label="월 순수익" value={directPurchasePrice > 0 ? formatManwon(directResult.monthlyNetManwon) : '미입력'} />
          </>
        ) : (
          <>
            <LinkedMetric label="방 개수" value={rentalRoomCount > 0 ? `${rentalRoomCount}개` : '미입력'} />
            <LinkedMetric label="월 매출" value={rentalResult.monthlyRevenueManwon > 0 ? formatManwonSigned(rentalResult.monthlyRevenueManwon) : '미입력'} />
            <LinkedMetric label="월 순수익" value={rentalResult.monthlyNetManwon !== 0 ? formatManwonSigned(rentalResult.monthlyNetManwon) : '미입력'} />
            <LinkedMetric label="회수기간" value={formatPaybackMonths(rentalResult.paybackMonths)} />
          </>
        )}
      </div>

      <div className="risk-inputs">
        <ScenarioMiniInput
          label={sourceMode === 'rental' && rentalRoomCount > 0 ? '방 개수 · 임대 입력 연동' : '방 개수'}
          unit="개"
          value={sourceMode === 'rental' && rentalRoomCount > 0 ? String(rentalRoomCount) : form.roomCount}
          onChange={(value) => setForm((prev) => ({ ...prev, roomCount: value }))}
        />
        <ScenarioMiniInput
          label="화장실 개수"
          unit="개"
          value={form.bathroomCount}
          onChange={(value) => setForm((prev) => ({ ...prev, bathroomCount: value }))}
        />
        <RiskToggle
          label="방화창 가능성"
          checked={form.fireWindowLikely}
          onChange={(checked) => setForm((prev) => ({ ...prev, fireWindowLikely: checked }))}
        />
        <RiskToggle
          label="조적욕조"
          checked={form.masonryTub}
          onChange={(checked) => setForm((prev) => ({ ...prev, masonryTub: checked }))}
        />
        <RiskToggle
          label="창문 축소"
          checked={form.windowReduction}
          onChange={(checked) => setForm((prev) => ({ ...prev, windowReduction: checked }))}
        />
      </div>

      <div className={`risk-summary risk-tone-${badge.tone}`}>
        <div>
          <span>리스크 점수</span>
          <strong>{risk.score}</strong>
        </div>
        <div className={`risk-badge risk-badge-${badge.tone}`}>{badge.label}</div>
        <ul>
          {hasAnyInput && risk.drivers.length > 0 ? (
            risk.drivers.map((driver) => <li key={driver}>{driver}</li>)
          ) : (
            <li className="muted">{sourceLabel} 기준 두드러지는 리스크 드라이버 없음</li>
          )}
        </ul>
      </div>

      <div className="risk-cards">
        {RISK_GUIDANCE.map((card, index) => (
          <article key={card.title} className="risk-card">
            <span className="risk-card-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="advanced-caveat">
        ※ 점수는 변동성 큰 항목을 빠르게 가늠하기 위한 스크리닝 지표예요. 실제 견적은 시공사 현장 실사가 필수예요.
      </p>
      </section>
    </>
  )
}
function LinkedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="linked-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function RiskToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`risk-toggle ${checked ? 'on' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

function MoneyInput({
  label,
  unit,
  value,
  placeholder,
  help,
  onChange,
  inputMode = 'decimal',
}: {
  label: string
  unit: string
  value: string
  placeholder?: string
  help?: string
  onChange: (value: string) => void
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <div className="input-row">
      <div>
        <label>{label}</label>
        {help ? <p>{help}</p> : null}
      </div>
      <div className="input-wrap">
        <input
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
    </div>
  )
}

function DirectResultPanel({
  hasPurchasePrice,
  result,
}: {
  hasPurchasePrice: boolean
  result: ReturnType<typeof calculateInvestment>
}) {
  if (!hasPurchasePrice) {
    return (
      <section className="result-panel empty-state" aria-live="polite">
        <strong>매매가를 입력하면</strong>
        <p>부대비용·대출이 자동 계산되고 수익률 시나리오가 표시돼요</p>
      </section>
    )
  }

  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-summary">
        <Metric label="부대비용 합계" value={formatEok(result.sideCostsEok)} />
        <Metric label="총투입금" value={formatEok(result.totalInvestmentEok)} />
        <Metric label="월 이자" value={formatManwon(result.monthlyInterestManwon)} />
        <Metric label="월 순수익" value={formatManwon(result.monthlyNetManwon)} highlight />
      </div>

      <div className="scenario-grid">
        <article className="scenario leverage">
          <span>① 대출 시나리오</span>
          <strong>{formatPercent(result.roiWithLoanPercent)}</strong>
          <p>자기자본 기준 수익률</p>
          <dl>
            <div>
              <dt>투입 자기자본</dt>
              <dd>{formatEok(result.cashInvestedWithLoanEok)}</dd>
            </div>
            <div>
              <dt>연 순수익</dt>
              <dd>{formatManwon(result.annualNetManwon)}</dd>
            </div>
          </dl>
        </article>

        <article className="scenario no-loan">
          <span>② 무대출 비교</span>
          <strong>{formatPercent(result.roiNoLoanPercent)}</strong>
          <p>총투입금 기준 수익률</p>
          <dl>
            <div>
              <dt>투입금</dt>
              <dd>{formatEok(result.totalInvestmentEok)}</dd>
            </div>
            <div>
              <dt>연 순매출</dt>
              <dd>{formatManwon(result.annualRevenueManwon)}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  )
}

function RentalResultPanel({
  hasRevenueInputs,
  result,
}: {
  hasRevenueInputs: boolean
  result: ReturnType<typeof calculateRental>
}) {
  if (!hasRevenueInputs) {
    return (
      <section className="result-panel empty-state" aria-live="polite">
        <strong>1박 가격과 점유율을 입력하면</strong>
        <p>월 매출에서 비용을 차감한 월 순수익과 연수익률·회수기간이 계산돼요</p>
      </section>
    )
  }

  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-summary rental">
        <Metric label="월 매출" value={formatManwonSigned(result.monthlyRevenueManwon)} />
        <Metric label="에어비앤비 수수료" value={formatManwonSigned(-result.airbnbFeeManwon)} />
        <Metric label="공급금 합계" value={formatManwonSigned(-result.supplyTotalManwon)} />
        <Metric label="운영비 합계" value={formatManwonSigned(-result.operatingTotalManwon)} />
      </div>

      <div className="scenario-grid">
        <article className="scenario leverage">
          <span>① 월 순수익</span>
          <strong>{formatManwonSigned(result.monthlyNetManwon)}</strong>
          <p>실제 운영 시 체감 수익</p>
          <dl>
            <div>
              <dt>연 순수익</dt>
              <dd>{formatManwonSigned(result.annualNetManwon)}</dd>
            </div>
            <div>
              <dt>인테리어 회수기간</dt>
              <dd>{formatPaybackMonths(result.paybackMonths)}</dd>
            </div>
          </dl>
        </article>

        <article className="scenario no-loan">
          <span>② 연수익률</span>
          <strong>{formatYieldPercent(result.annualYieldPercent)}</strong>
          <p>(보증금 + 인테리어) 기준</p>
          <dl>
            <div>
              <dt>연 순수익</dt>
              <dd>{formatManwonSigned(result.annualNetManwon)}</dd>
            </div>
            <div>
              <dt>월 순수익</dt>
              <dd>{formatManwonSigned(result.monthlyNetManwon)}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  )
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'metric highlight' : 'metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function stringify(value: number): string {
  if (!value) return ''
  return String(value)
}

export default App
