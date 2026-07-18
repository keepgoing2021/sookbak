import { useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  calculateRoomRevenueScenario,
  type RoomRevenueScenarioKey,
} from './roomRevenueCalculator'
import type { RoomRevenueValues } from './roomRevenueState'

const scenarios: Array<{ key: RoomRevenueScenarioKey; label: string; caption: string }> = [
  { key: 'conservative', label: '보수', caption: 'ADR -10% · OCC -5%p' },
  { key: 'standard', label: '기준', caption: '입력값 그대로' },
  { key: 'optimistic', label: '낙관', caption: 'ADR +10%' },
]

export function RoomRevenueCalculator({
  values,
  setValues,
}: {
  values: RoomRevenueValues
  setValues: Dispatch<SetStateAction<RoomRevenueValues>>
}) {
  const input = useMemo(() => ({
    roomTypes: values.roomTypes.map((room) => ({
      name: room.name,
      roomCount: toNumber(room.roomCount),
      adrManwon: toNumber(room.adrManwon),
    })),
    occupancyPercent: toNumber(values.occupancyPercent),
    otaFeePercent: toNumber(values.otaFeePercent),
    variableCostPerOccupiedRoomManwon: toNumber(values.variableCostPerOccupiedRoomManwon),
    monthlyFixedCostManwon: toNumber(values.monthlyFixedCostManwon),
    totalProjectCostEok: toNumber(values.totalProjectCostEok),
    myInvestmentEok: toNumber(values.myInvestmentEok),
    targetMonthlyYieldPercent: toNumber(values.targetMonthlyYieldPercent),
  }), [values])

  const result = useMemo(() => calculateRoomRevenueScenario(input, values.scenario), [input, values.scenario])
  const scenarioResults = useMemo(() => scenarios.map((scenario) => ({
    ...scenario,
    result: calculateRoomRevenueScenario(input, scenario.key),
  })), [input])
  const hasRoomInput = input.roomTypes.some((room) => room.roomCount > 0 && room.adrManwon > 0)
  const hasInvestment = input.totalProjectCostEok > 0 && input.myInvestmentEok > 0
  const activeScenario = scenarios.find((scenario) => scenario.key === values.scenario) ?? scenarios[1]
  const targetGap = result.targetGapManwon
  const judgment = !hasInvestment || targetGap === null
    ? { label: '투자 조건 입력 대기', tone: 'neutral', copy: '총 사업비와 내 투자금을 입력하면 예상 배당과 비교해요.' }
    : targetGap >= 0
      ? { label: '목표 초과', tone: 'positive', copy: `목표 배당보다 ${formatManwon(Math.abs(targetGap))} 여유가 있어요.` }
      : { label: '조건 조정 필요', tone: 'negative', copy: `목표 배당보다 ${formatManwon(Math.abs(targetGap))} 부족해요.` }

  const updateRoom = (id: number, key: 'name' | 'roomCount' | 'adrManwon', value: string) => {
    setValues((current) => ({
      ...current,
      roomTypes: current.roomTypes.map((room) => room.id === id ? { ...room, [key]: value } : room),
    }))
  }

  const update = (key: keyof Omit<RoomRevenueValues, 'roomTypes' | 'scenario'>, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <header className="hero-copy room-revenue-hero">
        <div className="room-hero-main">
          <p className="eyebrow">다객실 매출·수익 시뮬레이터</p>
          <h1 id="calculator-title">객실 수익 시뮬레이터</h1>
          <p className="room-hero-description">객실별 가격과 가동률을 조합해 월 손익과 투자 배당을 빠르게 비교하세요.</p>
        </div>
        <div className="room-hero-units" aria-label="입력 단위 안내">
          <span>입력 단위</span>
          <p>ADR·운영비 <strong>만원</strong></p>
          <p>사업비·투자금 <strong>억원</strong></p>
        </div>
      </header>

      <div className="room-scenario-tabs" role="tablist" aria-label="객실 수익 시나리오">
        {scenarios.map((scenario) => (
          <button key={scenario.key} type="button" role="tab" aria-selected={values.scenario === scenario.key} className={values.scenario === scenario.key ? 'active' : ''} onClick={() => setValues((current) => ({ ...current, scenario: scenario.key }))}>
            <strong>{scenario.label}</strong><span>{scenario.caption}</span>
          </button>
        ))}
      </div>

      <div className="room-revenue-grid">
        <section className="panel room-config-panel" aria-labelledby="room-config-title">
          <div className="panel-heading blue"><span className="section-index">01</span><h2 id="room-config-title">객실 구성</h2></div>
          <div className="room-type-head" aria-hidden="true"><span>객실 타입</span><span>객실 수</span><span>ADR</span><span /></div>
          <div className="room-type-list">
            {values.roomTypes.map((room) => (
              <div className="room-type-row" key={room.id}>
                <input aria-label="객실 타입" value={room.name} onChange={(event) => updateRoom(room.id, 'name', event.target.value)} />
                <CompactInput ariaLabel={`${room.name} 객실 수`} unit="개" value={room.roomCount} onChange={(value) => updateRoom(room.id, 'roomCount', value)} />
                <CompactInput ariaLabel={`${room.name} ADR`} unit="만원" value={room.adrManwon} onChange={(value) => updateRoom(room.id, 'adrManwon', value)} />
                <button type="button" className="room-remove" aria-label={`${room.name} 삭제`} disabled={values.roomTypes.length === 1} onClick={() => setValues((current) => ({ ...current, roomTypes: current.roomTypes.filter((item) => item.id !== room.id) }))}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="room-add" disabled={values.roomTypes.length >= 3} onClick={() => setValues((current) => ({ ...current, roomTypes: [...current.roomTypes, { id: Date.now(), name: `객실 ${current.roomTypes.length + 1}`, roomCount: '', adrManwon: '' }] }))}>+ 객실 타입 추가 <span>최대 3개</span></button>
        </section>

        <section className="panel room-assumption-panel" aria-labelledby="room-assumption-title">
          <div className="panel-heading"><span className="section-index">02</span><h2 id="room-assumption-title">운영 가정</h2></div>
          <div className="occupancy-control">
            <div><strong>가동률 (OCC)</strong><b>{values.occupancyPercent || 0}%</b></div>
            <input aria-label="가동률" type="range" min="0" max="100" step="1" value={values.occupancyPercent || '0'} onChange={(event) => update('occupancyPercent', event.target.value)} />
          </div>
          <details className="details-card">
            <summary><span>상세 비용</span><small>수수료·변동비·고정비</small></summary>
            <div className="details-body">
              <SimpleInput id="room-ota-fee" label="OTA 수수료" unit="%" value={values.otaFeePercent} onChange={(value) => update('otaFeePercent', value)} help="예약 채널 수수료 평균" />
              <SimpleInput id="room-variable-cost" label="판매 객실당 변동비" unit="만원" value={values.variableCostPerOccupiedRoomManwon} onChange={(value) => update('variableCostPerOccupiedRoomManwon', value)} help="청소·세탁·어메니티" />
              <SimpleInput id="room-monthly-fixed-cost" label="월 고정비" unit="만원" value={values.monthlyFixedCostManwon} onChange={(value) => update('monthlyFixedCostManwon', value)} help="인건비·공과금·임차료 등" />
            </div>
          </details>
        </section>
      </div>

      {!hasRoomInput ? (
        <section className="room-result-empty" aria-live="polite"><strong>객실 수와 ADR을 입력하면</strong><span>월 매출부터 운영비·월 순수익까지 바로 계산됩니다.</span></section>
      ) : (
        <section className="room-result-board" aria-live="polite">
          <header><div><span>{activeScenario.label} 시나리오</span><h2>월 순수익 {formatManwon(result.monthlyNetManwon)}</h2></div><p>객실 {result.totalRoomCount}개 · 판매 {result.occupiedRoomNights}박/월</p></header>
          <div className="room-kpi-grid">
            <RoomMetric label="월 객실 매출" value={formatManwon(result.monthlyRevenueManwon)} />
            <RoomMetric label="OTA 수수료" value={`-${formatManwon(result.otaFeeManwon)}`} />
            <RoomMetric label="객실 변동비" value={`-${formatManwon(result.variableCostManwon)}`} />
            <RoomMetric label="총 운영비" value={`-${formatManwon(result.totalOperatingCostManwon)}`} />
            <RoomMetric label="연 순수익" value={formatManwon(result.annualNetManwon)} />
          </div>
        </section>
      )}

      <section className="room-investment-panel" aria-labelledby="room-investment-title">
        <div className="room-investment-input">
          <div className="room-investment-heading"><span>03</span><div><h2 id="room-investment-title">지분 투자 수익</h2><p>사업비와 내 투자금을 기준으로 실제 배당 수익을 계산해요.</p></div></div>
          <div className="room-investment-fields">
            <SimpleInput id="room-total-project-cost" label="총 사업비" unit="억원" placeholder="예: 10" value={values.totalProjectCostEok} onChange={(value) => update('totalProjectCostEok', value)} />
            <SimpleInput id="room-my-investment" label="내 투자금" unit="억원" placeholder="예: 5" value={values.myInvestmentEok} onChange={(value) => update('myInvestmentEok', value)} />
            <SimpleInput id="room-target-monthly-yield" label="목표 월 수익률" unit="%" value={values.targetMonthlyYieldPercent} onChange={(value) => update('targetMonthlyYieldPercent', value)} help="내 투자금 대비 목표 배당률" />
          </div>
        </div>
        <div className={`room-investment-result ${judgment.tone}`}>
          <div className="room-investment-verdict"><span>현재 조건 판단</span><strong>{judgment.label}</strong><p>{judgment.copy}</p></div>
          <dl className="room-investor-metrics">
            <div><dt>지분율</dt><dd>{formatPercent(result.equitySharePercent)}</dd></div>
            <div><dt>월 예상 배당</dt><dd>{formatNullableManwon(result.monthlyExpectedDividendManwon)}</dd></div>
            <div><dt>연 수익률 (세전)</dt><dd>{formatPercent(result.annualYieldPercent)}</dd></div>
            <div><dt>원금 회수</dt><dd>{formatPayback(result.paybackMonths)}</dd></div>
          </dl>
          <p className="room-investment-target">목표 월 배당 <strong>{hasInvestment ? formatManwon(result.targetMonthlyNetManwon) : '-'}</strong></p>
        </div>
      </section>

      <section className="room-scenario-comparison" aria-labelledby="room-comparison-title">
        <div className="advanced-heading"><span className="section-index">04</span><div><h2 id="room-comparison-title">세 시나리오 한눈에 비교</h2><p>비용 가정은 그대로 두고 ADR과 OCC만 바꿔 손익 민감도를 확인해요.</p></div></div>
        <div className="room-comparison-grid">
          {scenarioResults.map((scenario) => (
            <article key={scenario.key} className={scenario.key === values.scenario ? 'active' : ''}><span>{scenario.label}</span><strong>{formatManwon(scenario.result.monthlyNetManwon)}</strong><p>매출 {formatManwon(scenario.result.monthlyRevenueManwon)}</p><small>연 {formatManwon(scenario.result.annualNetManwon)}</small></article>
          ))}
        </div>
      </section>

      <aside className="notice"><strong>읽는 법</strong><ul className="notice-list"><li>ADR은 객실 타입별 실제 평균 판매가로 입력하세요.</li><li>보수 시나리오는 ADR -10%, OCC -5%p를 적용합니다.</li><li>예상 배당은 월 순수익을 지분율대로 단순 안분한 값입니다.</li><li>세금·감가상각·대출 원금은 제외한 1차 스크리닝 값입니다.</li></ul></aside>
    </>
  )
}

function CompactInput({ ariaLabel, unit, value, onChange }: { ariaLabel: string; unit: string; value: string; onChange: (value: string) => void }) {
  return <div className="compact-input"><input aria-label={ariaLabel} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /><span>{unit}</span></div>
}

function SimpleInput({ id, label, unit, value, placeholder, help, onChange }: { id: string; label: string; unit: string; value: string; placeholder?: string; help?: string; onChange: (value: string) => void }) {
  return <div className="input-row"><div><label htmlFor={id}>{label}</label>{help ? <p>{help}</p> : null}</div><div className="input-wrap"><input id={id} inputMode="decimal" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /><span>{unit}</span></div></div>
}

function RoomMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={highlight ? 'room-metric highlight' : 'room-metric'}><span>{label}</span><strong>{value}</strong></div>
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function formatManwon(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}만원`
}

function formatPercent(value: number | null): string {
  if (value === null) return '–'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)}%`
}

function formatNullableManwon(value: number | null): string {
  if (value === null) return '–'
  const maximumFractionDigits = Math.abs(value) < 100 ? 2 : 0
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(value)}만원`
}

function formatPayback(months: number | null): string {
  if (months === null) return '–'
  if (months >= 24) return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(months / 12)}년`
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(months)}개월`
}
