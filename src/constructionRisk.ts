export interface ConstructionRiskInput {
  roomCount: number
  bathroomCount: number
  fireWindowLikely: boolean
  masonryTub: boolean
  windowReduction: boolean
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface ConstructionRiskResult {
  score: number
  level: RiskLevel
  drivers: string[]
}

export const RISK_WEIGHTS = {
  perRoom: 4,
  perBathroom: 15,
  fireWindow: 12,
  masonryTub: 10,
  windowReduction: 14,
} as const

export function calculateConstructionRisk(input: ConstructionRiskInput): ConstructionRiskResult {
  const drivers: string[] = []
  let score = 0

  if (input.roomCount > 0) {
    score += input.roomCount * RISK_WEIGHTS.perRoom
  }
  if (input.bathroomCount > 0) {
    score += input.bathroomCount * RISK_WEIGHTS.perBathroom
    if (input.bathroomCount >= 2) {
      drivers.push(`화장실 ${input.bathroomCount}개 — 견적 변동 폭이 가장 큰 항목`)
    }
  }
  if (input.fireWindowLikely) {
    score += RISK_WEIGHTS.fireWindow
    drivers.push('방화창 의무 가능성 — 돌발 변수')
  }
  if (input.masonryTub) {
    score += RISK_WEIGHTS.masonryTub
    drivers.push('조적욕조 — 방수·시공 난이도 상승')
  }
  if (input.windowReduction) {
    score += RISK_WEIGHTS.windowReduction
    drivers.push('창문 축소 — 조적/방수/단열/스카이차 부대공사')
  }

  const level: RiskLevel = score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low'
  return { score, level, drivers }
}

export function describeRiskLevel(level: RiskLevel): { label: string; tone: string } {
  switch (level) {
    case 'high':
      return { label: '높음', tone: 'red' }
    case 'medium':
      return { label: '중간', tone: 'amber' }
    default:
      return { label: '낮음', tone: 'green' }
  }
}
