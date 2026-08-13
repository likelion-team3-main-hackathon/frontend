// 백엔드에는 현재 "여러 추천안" 조회 API가 없습니다.
// 추천 선택 UI 개발 동안만 사용하는 데이터이며, API가 추가되면 교체합니다.
export const routineRecommendationGroups = [
  {
    title: '활력이 걱정인 당신을 위해',
    routines: [
      { id: 'metabolic-4', title: '지중해식 4주', duration: '4주 / 주 4회', tags: ['식단', '혈당·LDL'], description: '생활활동·LDL 관리 주치의 맞춤 추천' },
      { id: 'core-rehab', title: '허리 중심 재활 3주', duration: '3주 / 주 3회', tags: ['재활', '허리 보호'], description: '허리 부담을 줄인 가벼운 근력 루틴' },
      { id: 'light-cardio', title: '가벼운 유산소 2주', duration: '2주 / 주 5회', tags: ['걷기', '초급'], description: '숨차지 않게 시작하는 일상 운동' },
    ],
  },
  {
    title: '허리가 조심스러운 당신을 위해',
    routines: [
      { id: 'core-4', title: '허리 중심 재활 4주', duration: '4주 / 주 3회', tags: ['재활', '허리 보호'], description: '허리 부담을 줄인 재활운동·코어 강화' },
      { id: 'core-stable', title: '코어 안정화 3주', duration: '3주 / 주 3회', tags: ['재활'], description: '자세를 잡아 주는 저강도 근력 루틴' },
      { id: 'stretch-2', title: '통증 완화 스트레칭 2주', duration: '2주 / 매일', tags: ['스트레칭'], description: '굳은 몸을 부드럽게 푸는 회복 루틴' },
    ],
  },
]
