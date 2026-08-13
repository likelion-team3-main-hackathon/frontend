export const homeMockData = {
  userName: '김종국',
  activeRoutines: [
    { id: 51, title: '김종국 종합 루틴', badge: '16일차', progress: 43, currentWeek: 2, totalWeeks: 4 },
    { id: 52, title: '허리 중심 재활 루틴', badge: '8일차', progress: 28, currentWeek: 2, totalWeeks: 6 },
    { id: 53, title: '지중해식 식단 루틴', badge: '3일차', progress: 12, currentWeek: 1, totalWeeks: 4 },
  ],
  todayRoutines: [
    { id: 101, type: '점심', time: '12:30', title: '간장계란밥 외 2개', detail: '탄수화물 210g · 단백질 100g · 지방 50g', primary: true },
    { id: 102, type: '점심', time: '12:30 예정', title: '연어 구이', detail: '1,200 kcal' },
    { id: 103, type: '운동종류', time: '12:30 예정', title: '루틴이름', detail: '1,200 kcal' },
    { id: 104, type: '끼니', time: '시간 미정', title: '메뉴', detail: '칼로리' },
  ],
  condition: {
    water: { current: 5, target: 8 },
    sleep: { total: '7시간 20분', asleepAt: '23:40', wakeAt: '07:00', deepSleep: '1시간 40분' },
    coaching: '수면이 3일째 7시간 아래예요. 저녁 운동을 30분 앞당겨 볼까요?',
    recommendation: '연구원 한마디 · 단백질 −12g',
  },
}
