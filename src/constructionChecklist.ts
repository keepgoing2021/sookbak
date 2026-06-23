export interface ConstructionChecklistInput {
  roomCount: number
  bathroomCount: number
  fireWindowLikely: boolean
  masonryTub: boolean
  windowReduction: boolean
}

export type ChecklistPriority = '기본 확인' | '중점 확인' | '필수 확인'

export interface ConstructionChecklistItem {
  category: string
  title: string
  priority: ChecklistPriority
  summary: string
  checks: string[]
}

export function buildConstructionChecklist(
  input: ConstructionChecklistInput,
): ConstructionChecklistItem[] {
  const roomLabel = input.roomCount > 0 ? `${input.roomCount}실` : '방 미입력'
  const bathroomLabel = input.bathroomCount > 0 ? `${input.bathroomCount}욕실` : '욕실 미입력'
  const manyRooms = input.roomCount >= 6 || input.bathroomCount >= 4
  const hasMultipleWetZones = input.bathroomCount >= 2 || input.masonryTub

  return [
    {
      category: '규모 산정',
      title: '방·화장실 수량 기준 견적 재확인',
      priority: manyRooms ? '중점 확인' : '기본 확인',
      summary: `${roomLabel} / ${bathroomLabel} 기준으로 반복 공정, 자재 양, 작업 기간을 다시 산정하세요.`,
      checks: [
        '방·욕실별 단가가 아니라 반복 공정 할인 가능 여부 확인',
        '동시 작업 가능한 공정과 순차 작업 공정 분리',
        '객실 수 증가에 따른 청소·린넨·소모품 보관 동선 확인',
      ],
    },
    {
      category: '소방',
      title: '소방 기준·방화창·피난 동선 선확정',
      priority: '필수 확인',
      summary: input.fireWindowLikely
        ? '방화창 가능성이 있으므로 소방서·설계자 확인 전 견적 확정은 보류하세요.'
        : '소방 기준은 현장마다 달라질 수 있으므로 공사 전 확인이 필요해요.',
      checks: [
        '소방서 또는 소방 설계자에게 용도·객실 수 기준 확인',
        '피난 동선, 감지기, 유도등, 방염 자재 범위 확인',
        '방화창 필요 여부와 적용 위치를 도면에 표시',
      ],
    },
    {
      category: '전기',
      title: '전기 용량·분전반·개별 회로 검토',
      priority: '필수 확인',
      summary: '객실 수가 늘면 냉난방·온수·드라이기 사용량 때문에 전기 증설 여부가 중요해져요.',
      checks: [
        '계약전력과 분전반 여유 용량 확인',
        '객실별 에어컨·콘센트·조명 회로 분리 가능 여부 확인',
        '전기 필증과 면허업체 비용 별도 반영',
      ],
    },
    {
      category: '급배수',
      title: '급수·배수·온수 용량 검토',
      priority: input.bathroomCount >= 3 ? '중점 확인' : '필수 확인',
      summary: '화장실 수보다 실제 동시 샤워 가능 여부와 배수 구배가 운영 만족도를 좌우해요.',
      checks: [
        '동시 샤워 기준 온수 용량 확인',
        '배수 구배와 바닥 레벨 상승 필요 여부 확인',
        '공용부와 객실부 배관 점검구 위치 확보',
      ],
    },
    {
      category: '방수',
      title: '욕실·조적욕조·창호 주변 방수 계획',
      priority: hasMultipleWetZones ? '중점 확인' : '기본 확인',
      summary: '방수는 하자 발생 시 운영 중단으로 이어지므로 견적에서 줄이면 안 되는 항목이에요.',
      checks: [
        '욕실 바닥·벽체 방수 범위와 담수 테스트 일정 확인',
        ...(input.masonryTub ? ['조적욕조 적용 시 2중 방수·담수 테스트 일정 확보'] : []),
        '창호 주변 누수 가능성과 외벽 실리콘 보수 범위 확인',
      ],
    },
    {
      category: '환기·냉난방',
      title: '객실별 냉난방·환기·냄새 관리',
      priority: '중점 확인',
      summary: '호스텔은 객실 간 냄새, 습기, 소음 민원이 리뷰에 바로 반영돼요.',
      checks: [
        '객실별 에어컨 실외기 위치와 배관 경로 확인',
        '욕실·공용부 환기팬 풍량 확인',
        '도시가스/LPG/전기 난방 방식별 운영비 비교',
      ],
    },
    {
      category: '인허가',
      title: '필증·면허업체·행정대행 비용 분리',
      priority: '필수 확인',
      summary: '기본 인테리어 견적에 빠지기 쉬운 항목이라 별도 예산 라인으로 관리하세요.',
      checks: [
        '소방·전기 필증 발급 주체와 비용 확인',
        '숙박업 관련 행정대행 범위와 일정 확인',
        '준공 전 검사 지연 시 오픈 일정 영향 확인',
      ],
    },
    {
      category: '가구·운영',
      title: '제작가구·수납·운영 동선 검토',
      priority: '기본 확인',
      summary: '예쁜 객실보다 청소, 보관, 교체가 쉬운 구조가 장기 운영에 유리해요.',
      checks: [
        '제작가구는 사진 포인트와 수납 핵심 구간에만 적용',
        '침구·소모품·청소도구 보관 위치 확보',
        '파손 시 교체 가능한 기성품 비중 확인',
      ],
    },
    {
      category: '외벽·창호',
      title: '창문 축소·단열·외부 장비 작업 범위 확인',
      priority: input.windowReduction ? '중점 확인' : '기본 확인',
      summary: input.windowReduction
        ? '창문 축소는 단순 목공이 아니라 외벽·방수·단열·장비비가 묶이는 공정이에요.'
        : '창호는 단열, 누수, 소음에 직접 영향을 주므로 공사 전 상태 점검이 필요해요.',
      checks: [
        ...(input.windowReduction ? ['창문 축소 시 조적·방수·단열·스카이차 포함 견적 확인'] : []),
        '창호 교체/보수 범위와 외부 작업 가능 시간 확인',
        '객실별 채광·환기 저하 여부 확인',
      ],
    },
  ]
}
