import { useEffect, useMemo, useState } from 'react'
import { getRoutine } from '../../api/routine'
import exerciseIcon from '../../assets/icons/routine/exercise.png'
import mealIcon from '../../assets/icons/routine/meal.png'
import nextIcon from '../../assets/icons/next.png'
import './RoutineDetail.css'

const MOCK_MEAL_DAYS = [
  {
    id: 'meal-day-1', week: 3, dayNumber: 1, label: '오늘', summary: '3끼 · 1,820 kcal', meta: '탄 210 · 단 128 · 지 54',
    items: [
      { id: 'breakfast', mealType: '아침', name: '그릭요거트볼', meta: '420 kcal · 탄 38 단 26 지 12' },
      { id: 'lunch', mealType: '점심', name: '간장계란밥 외 2개', meta: '610 kcal · 탄 82 단 41 지 18' },
      { id: 'dinner', mealType: '저녁', name: '닭가슴살 샐러드', meta: '510 kcal · 탄 32 단 41 지 18' },
    ],
  },
  {
    id: 'meal-day-2', week: 3, dayNumber: 2, summary: '3끼 · 1,760 kcal', meta: '탄 198 · 단 121 · 지 51',
    items: [
      { id: 'meal-2-1', mealType: '아침', name: '오트밀', meta: '410 kcal · 탄 62 단 22 지 9' },
      { id: 'meal-2-2', mealType: '점심', name: '연어 포케', meta: '690 kcal · 탄 74 단 46 지 24' },
      { id: 'meal-2-3', mealType: '저녁', name: '두부 스테이크', meta: '660 kcal · 탄 62 단 53 지 18' },
    ],
  },
]

const MOCK_EXERCISE_DAYS = [
  {
    id: 'exercise-day-1', week: 3, dayNumber: 1, label: '오늘', summary: '팔', meta: '8동작 · 24분 · 이두/삼두',
    items: [
      { id: 'dumbbell-curl', name: '덤벨 컬', meta: '12회 3세트 · 7kg' },
      { id: 'hammer-curl', name: '해머 컬', meta: '12회 3세트 · 7kg' },
      { id: 'overhead-press', name: '오버헤드 프레스', meta: '10회 3세트 · 12kg' },
    ],
  },
  {
    id: 'exercise-day-2', week: 3, dayNumber: 2, summary: '하체', meta: '6동작 · 38분 · 대퇴/둔근',
    items: [
      { id: 'squat', name: '스쿼트', meta: '12회 3세트' },
      { id: 'lunge', name: '런지', meta: '10회 3세트' },
    ],
  },
]

function isMealRoutine(routine) {
  return routine?.type === 'MEAL' || /식단|식사|지중해/.test(routine?.title || '')
}

function exerciseDaysFromApi(detail) {
  return (detail?.days || []).map((day, index) => {
    const sections = day.sections || []
    const items = sections.flatMap((section) =>
      (section.exercises || []).map((exercise) => ({
        id: exercise.exerciseId,
        name: exercise.name,
        meta: [
          `${exercise.targetValue}${exercise.targetUnit === 'SECONDS' ? '초' : exercise.targetUnit === 'MINUTES' ? '분' : '회'}`,
          `${exercise.sets || 1}세트`,
          exercise.restSeconds ? `휴식 ${exercise.restSeconds}초` : null,
        ].filter(Boolean).join(' · '),
      })),
    )
    const totalSets = sections.reduce((total, section) =>
      total + (section.exercises || []).reduce((sum, exercise) => sum + (exercise.sets || 1), 0), 0)
    const sectionNames = sections
      .map((section) => section.title)
      .filter(Boolean)
      .filter((title, titleIndex, titles) => titles.indexOf(title) === titleIndex)
    const focus = sectionNames[0] || '운동 루틴'
    return {
      id: day.routineDayId,
      week: day.week,
      dayNumber: index + 1,
      label: day.scheduledDate === new Date().toISOString().slice(0, 10) ? '오늘' : '',
      summary: focus,
      meta: `${items.length}동작 · ${day.estimatedMinutes || 0}분 · 총 ${totalSets}세트`,
      items,
    }
  }).filter((day) => day.items.length)
}

export default function RoutineDetail({ routine, onBack, onOpenAi }) {
  const [detail, setDetail] = useState(null)
  const [activeTab, setActiveTab] = useState(isMealRoutine(routine) ? 'meal' : 'exercise')
  const [expandedDays, setExpandedDays] = useState(new Set())

  useEffect(() => {
    if (!routine?.id) return
    let active = true
    getRoutine(routine.id).then((response) => {
      if (active) setDetail(response?.data || null)
    }).catch(() => {})
    return () => { active = false }
  }, [routine?.id])

  const apiExerciseDays = useMemo(() => exerciseDaysFromApi(detail), [detail])
  const days = activeTab === 'meal'
    ? MOCK_MEAL_DAYS
    : apiExerciseDays.length ? apiExerciseDays : MOCK_EXERCISE_DAYS
  const currentWeek = days[0]?.week || routine?.currentWeek || 1

  useEffect(() => {
    const todayDay = days.find((day) => day.label === '오늘')
    setExpandedDays(todayDay ? new Set([todayDay.id]) : new Set())
  }, [activeTab, days])

  function toggleDay(dayId) {
    setExpandedDays((current) => {
      const next = new Set(current)
      if (next.has(dayId)) next.delete(dayId)
      else next.add(dayId)
      return next
    })
  }

  if (!routine) return null

  return (
    <section className="my-routine-page">
      <header className="my-routine-header">
        <button type="button" onClick={onBack} aria-label="뒤로 가기">‹</button>
        <h1>나의 루틴</h1>
      </header>

      <article className="my-routine-summary">
        <div><strong>{detail?.title || routine.title}</strong><em>{routine.badge}</em><span>›</span></div>
        <div className="routine-progress"><i style={{ width: `${routine.progress}%` }} /></div>
        <div className="routine-weeks">{Array.from({ length: routine.totalWeeks }, (_, index) => <span className={index + 1 === routine.currentWeek ? 'current' : ''} key={index}>{index + 1}주</span>)}</div>
      </article>

      <button type="button" className="routine-ai-summary" onClick={onOpenAi}>AI 요약 <img src={nextIcon} alt="" /></button>

      <div className="routine-type-tabs">
        <button type="button" className={activeTab === 'meal' ? 'active' : ''} onClick={() => setActiveTab('meal')}>식사 루틴</button>
        <button type="button" className={activeTab === 'exercise' ? 'active' : ''} onClick={() => setActiveTab('exercise')}>운동 루틴</button>
      </div>

      <h2 className="routine-week-heading">이번 주 · {currentWeek}주차</h2>

      <div className="routine-day-list">
        {days.map((day) => {
          const isExpanded = expandedDays.has(day.id)
          return (
          <article className={`routine-day-schedule ${isExpanded ? 'expanded' : 'collapsed'} ${day.label === '오늘' ? 'today' : ''}`} key={day.id}>
            <button type="button" className="routine-day-header" onClick={() => toggleDay(day.id)} aria-expanded={isExpanded}>
              <span className="routine-day-number">
                <strong>{day.dayNumber}</strong>
                <small>일차</small>
              </span>
              <span className="routine-day-copy"><span><strong>{day.summary}</strong>{day.label && <em>{day.label}</em>}</span><small>{isExpanded ? day.meta : day.items.map((item) => item.name).join(' · ')}</small></span>
              <span className="routine-day-chevron">{isExpanded ? '⌃' : '⌄'}</span>
            </button>
            {isExpanded && <div className="routine-schedule-items">
              {day.items.map((item) => (
                <div key={item.id}>
                  <span className="schedule-icon"><img src={activeTab === 'meal' ? mealIcon : exerciseIcon} alt="" /></span>
                  <p><strong>{item.mealType && <em className="meal-type-label">{item.mealType}</em>}{item.name}</strong><small>{item.meta}</small></p>
                </div>
              ))}
            </div>}
            {isExpanded && <button type="button" className="routine-day-detail">{day.dayNumber}일차 자세히 보기 <span>›</span></button>}
          </article>
        )})}
      </div>
    </section>
  )
}
