import { useEffect, useMemo, useState } from 'react'
import { getRoutineRecords } from '../../api/record'
import BottomNav from '../../components/layout/BottomNav'
import smileIcon from '../../assets/icons/smile_big.png'
import bellIcon from '../../assets/icons/bell.png'
import { homeMockData } from '../../mocks/homeData'
import './TodayReport.css'

const REPORT_CONFETTI = [
  ['10%', '0s', 'orange'], ['24%', '.7s', 'green'], ['39%', '.25s', 'yellow'],
  ['60%', '.9s', 'orange'], ['76%', '.4s', 'green'], ['91%', '1.1s', 'yellow'],
]

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function detailsOf(record) {
  if (record?.details && typeof record.details === 'object') return record.details
  try { return JSON.parse(record?.detailsJson || record?.details || '{}') } catch { return {} }
}

function nutrientTotals(records, sessionCalories) {
  const meals = records.filter((record) => record.activityType === 'MEAL' || record.type === 'MEAL')
  if (!meals.length) return { calories: sessionCalories, carbs: 0, protein: 0, fat: 0 }
  return meals.reduce((sum, record) => {
    const details = detailsOf(record)
    return {
      calories: sum.calories + Number(details.calories || 0),
      carbs: sum.carbs + Number(details.carbohydrateGrams || details.carbs || 0),
      protein: sum.protein + Number(details.proteinGrams || details.protein || 0),
      fat: sum.fat + Number(details.fatGrams || details.fat || 0),
    }
  }, { calories: 0, carbs: 0, protein: 0, fat: 0 })
}

export default function TodayReport({ items = [], statuses = {}, calories = {}, exerciseResults = {}, reportDate, onBack, onNavigate }) {
  const [records, setRecords] = useState([])
  const [streakDays, setStreakDays] = useState(0)
  const [currentDate] = useState(() => new Date())
  const selectedDate = useMemo(() => reportDate ? new Date(`${reportDate}T00:00:00`) : currentDate, [reportDate, currentDate])
  const selectedDateKey = dateKey(selectedDate)
  const isToday = selectedDateKey === dateKey(currentDate)
  const completed = items.filter((item) => statuses[item.id] === 'completed').length
  const decided = items.filter((item) => statuses[item.id]).length
  const allCompleted = items.length > 0 && completed === items.length
  const sessionCalories = items.reduce((sum, item) => sum + Number(calories[item.id] || 0), 0)

  useEffect(() => {
    let active = true
    getRoutineRecords(selectedDateKey).then((response) => { if (active) setRecords(response?.data || []) }).catch(() => {})
    return () => { active = false }
  }, [selectedDateKey])

  useEffect(() => {
    let active = true
    const dates = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(selectedDate)
      date.setDate(selectedDate.getDate() - index)
      return dateKey(date)
    })
    Promise.allSettled(dates.map((date) => getRoutineRecords(date))).then((results) => {
      if (!active) return
      let streak = 0
      for (const result of results) {
        if (result.status !== 'fulfilled') break
        const hasActivity = (result.value?.data || []).some((record) => {
          const details = detailsOf(record)
          return record.routineItemId && !details.skipped && (details.completed || record.status === 'COMPLETED')
        })
        if (!hasActivity) break
        streak += 1
      }
      setStreakDays(streak)
    })
    return () => { active = false }
  }, [selectedDate])

  const nutrients = useMemo(() => nutrientTotals(records, sessionCalories), [records, sessionCalories])
  const waterRecord = records.find((record) => detailsOf(record).category === 'WATER')
  const water = Number(detailsOf(waterRecord).glasses || (isToday ? homeMockData.condition.water.current : 0))
  const exercises = items.filter((item) => item.activityType === 'EXERCISE' && statuses[item.id] === 'completed')
  const recordedExerciseResults = records
    .filter((record) => record.activityType === 'EXERCISE' || record.type === 'EXERCISE')
    .map(detailsOf)
  const savedExerciseResults = recordedExerciseResults.filter((result) => result.exerciseCount || result.minutes || result.calories)
  const sessionExerciseResults = items.map((item) => exerciseResults[item.id]).filter(Boolean)
  const resultValues = savedExerciseResults.length ? savedExerciseResults : sessionExerciseResults
  const completedExerciseCount = resultValues.reduce((sum, result) => sum + Number(result.exerciseCount || 0), 0)
    || new Set(exercises.flatMap((item) => item.exercises?.map((exercise) => exercise.exerciseId || exercise.id) || [])).size
  const exerciseMinutes = resultValues.reduce((sum, result) => sum + Number(result.minutes || result.durationMinutes || 0), 0)
    || exercises.reduce((sum, item) => sum + Number(String(item.time).match(/\d+/)?.[0] || 0), 0)
  const burnedCalories = resultValues.reduce((sum, result) => sum + Number(result.calories || 0), 0)
    || Math.round(exerciseMinutes * 9.1)
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]

  return (
    <section className="today-report-page">
      <div className="today-report-scroll">
        <header className="report-topbar"><button type="button" onClick={onBack}>리뉴</button><img src={bellIcon} alt="" /></header>
        <div className="report-title"><h1>{isToday ? '오늘의 리포트' : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 리포트`}</h1><span>{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 {weekday}요일</span></div>

        <article className="report-hero">
          <div className="report-confetti" aria-hidden="true">{REPORT_CONFETTI.map(([left, delay, color], index) => <i className={color} style={{ left, animationDelay: delay }} key={index} />)}</div>
          <img src={smileIcon} alt="" /><b>{completed} / {items.length} 완료</b>
          <h2>{allCompleted ? '오늘 루틴, 다 끝냈어요' : '오늘도 잘 해내고 있어요'}</h2>
          <p>{streakDays > 0 ? `${streakDays}일차 연속 기록이에요.` : completed ? '오늘부터 연속 기록을 시작했어요.' : '첫 루틴부터 가볍게 시작해볼까요?'}</p>
          <small>{allCompleted ? '내일은 오늘 기록에 맞춰 조금 조정해볼까요?' : `현재 ${decided}/${items.length}개 활동을 확인했어요.`}</small>
        </article>

        <div className="report-metric-grid">
          <article className="report-meal-metric"><small>먹은 양</small><strong>{nutrients.calories.toLocaleString()} <em>kcal</em></strong><div><i /><i /><i /></div><p>탄 {nutrients.carbs}　 단 {nutrients.protein}　 지 {nutrients.fat}</p></article>
          <article><small>운동</small><strong>{exerciseMinutes} <em>분</em></strong><b>{burnedCalories} kcal 소모</b><p>{completedExerciseCount}동작 완료</p></article>
          <article className="report-small-metric"><span>♢</span><div><small>물</small><strong>{water} / 8 잔</strong></div></article>
          <article className="report-small-metric"><span>☾</span><div><small>수면</small><strong>{isToday ? homeMockData.condition.sleep.total : '기록 없음'}</strong></div></article>
        </div>

        <article className="report-coaching"><span>!</span><p><strong>연구원 한마디</strong>단백질이 {Math.max(0, 135 - nutrients.protein)}g 부족했어요. 내일 아침에 계란 2개를 더하면 딱 맞아요.</p></article>
        <button type="button" className="prepare-tomorrow-button" onClick={() => onNavigate?.('ai-chat')}>내일 루틴 대비하기</button>

        <div className="report-activity-heading"><h2>오늘 할 일 <b>{completed} / {items.length}</b></h2><span>3개 루틴 종합</span></div>
        <div className="report-activity-list">
          {items.map((item) => <article className={statuses[item.id] || ''} key={item.id}><i /><div><strong>{item.type} · {item.title}</strong><small>{item.time} · {item.activityType === 'MEAL' && statuses[item.id] === 'completed' ? `섭취 ${(calories[item.id] || 0).toLocaleString()} kcal` : item.detail}</small></div><span>{statuses[item.id] === 'completed' ? '✓' : statuses[item.id] === 'cancelled' ? '−' : ''}</span></article>)}
        </div>
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </section>
  )
}
