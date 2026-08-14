import { useEffect, useMemo, useState } from 'react'
import { getRoutine } from '../../api/routine'
import exerciseIcon from '../../assets/icons/routine/exercise.png'
import mealIcon from '../../assets/icons/routine/meal.png'
import nextIcon from '../../assets/icons/next.png'
import './RoutineDetail.css'

function isMealRoutine(routine) {
  return routine?.type === 'MEAL' || /식단|식사|지중해/.test(routine?.title || '')
}

function parseContent(content) {
  if (content && typeof content === 'object') return content
  try { return JSON.parse(content || '{}') } catch { return {} }
}

function routineDaysFromApi(detail, tab) {
  return (detail?.days || []).map((day, index) => {
    const sections = day.sections || []
    const items = sections.flatMap((section) =>
      (section.exercises || [])
        .filter((exercise) => tab === 'meal' ? exercise.activityType === 'MEAL' : exercise.activityType !== 'MEAL')
        .map((exercise) => {
          const content = parseContent(exercise.content)
          return tab === 'meal'
            ? {
                id: exercise.exerciseId,
                mealType: section.title?.replace(' 식단', '') || '식단',
                name: exercise.name,
                meta: `${Number(content.calories || exercise.targetValue || 0).toLocaleString()} kcal · 탄 ${content.carbohydrateGrams || 0} 단 ${content.proteinGrams || 0} 지 ${content.fatGrams || 0}`,
              }
            : {
                id: exercise.exerciseId,
                name: exercise.name,
                sets: exercise.sets || 1,
                meta: [
                  `${exercise.targetValue}${exercise.targetUnit === 'SECONDS' ? '초' : exercise.targetUnit === 'MINUTES' ? '분' : '회'}`,
                  `${exercise.sets || 1}세트`,
                  exercise.restSeconds ? `휴식 ${exercise.restSeconds}초` : null,
                ].filter(Boolean).join(' · '),
              }
        }),
    )
    const totalSets = items.reduce((total, item) => total + Number(item.sets || 0), 0)
    const sectionNames = sections
      .map((section) => section.title)
      .filter(Boolean)
      .filter((title, titleIndex, titles) => titles.indexOf(title) === titleIndex)
    const focus = sectionNames[0] || (tab === 'meal' ? '식단 루틴' : '운동 루틴')
    const calories = items.reduce((sum, item) => sum + Number(String(item.meta).match(/[\d,]+(?= kcal)/)?.[0]?.replaceAll(',', '') || 0), 0)
    return {
      id: day.routineDayId,
      week: day.week,
      dayNumber: index + 1,
      label: day.scheduledDate === new Date().toISOString().slice(0, 10) ? '오늘' : '',
      summary: focus,
      meta: tab === 'meal'
        ? `${items.length}끼 · ${calories.toLocaleString()} kcal`
        : `${items.length}동작 · ${day.estimatedMinutes || 0}분 · 총 ${totalSets}세트`,
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

  const apiExerciseDays = useMemo(() => routineDaysFromApi(detail, 'exercise'), [detail])
  const apiMealDays = useMemo(() => routineDaysFromApi(detail, 'meal'), [detail])
  const days = activeTab === 'meal'
    ? apiMealDays
    : apiExerciseDays
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
        {detail && days.length === 0 && <p>이 루틴에는 {activeTab === 'meal' ? '식단' : '운동'} 일정이 없어요.</p>}
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
