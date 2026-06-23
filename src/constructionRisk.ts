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
  perExtraRoom: 4,
  perExtraBathroom: 15,
  fireWindow: 12,
  masonryTub: 10,
  windowReduction: 14,
} as const

export function calculateConstructionRisk(input: ConstructionRiskInput): ConstructionRiskResult {
  const drivers: string[] = []
  let score = 0

  const extraRooms = Math.max(0, input.roomCount - 1)
  const extraBathrooms = Math.max(0, input.bathroomCount - 1)

  if (extraRooms > 0) {
    score += extraRooms * RISK_WEIGHTS.perExtraRoom
    drivers.push(`방 ${input.roomCount}개 — 기본 1개 초과분이 공사 범위를 키움`)
  }
  if (extraBathrooms > 0) {
    score += extraBathrooms * RISK_WEIGHTS.perExtraBathroom
    drivers.push(`화장실 ${input.bathroomCount}개 — 기본 1개 초과분이 견적 변동 폭을 키움`)
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
