import { useEffect, useMemo, useState } from 'react'
import { logout } from '../../api/auth'
import { getRoutines, getTodayRoutine } from '../../api/routine'
import BottomNav from '../../components/layout/BottomNav'
import { homeMockData } from '../../mocks/homeData'
import './Home.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getWeekDates() {
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + index)
    return {
      key: date.toISOString().slice(0, 10),
      day: WEEKDAYS[date.getDay()],
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}

function toRoutineCard(routine) {
  const start = new Date(routine.startDate)
  const end = new Date(routine.endDate)
  const now = new Date()
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.round((now - start) / 86400000) + 1))
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))

  return {
    ...routine,
    badge: `${elapsedDays}일차`,
    progress: Math.round((elapsedDays / totalDays) * 100),
    currentWeek: Math.min(totalWeeks, Math.ceil(elapsedDays / 7)),
    totalWeeks,
  }
}

function getTodayItems(routine) {
  return (routine?.days || []).flatMap((day) =>
    (day.sections || []).flatMap((section) =>
      (section.exercises || []).map((exercise) => ({
        id: exercise.exerciseId,
        type: section.title || '운동',
        time: `${day.estimatedMinutes || 0}분`,
        title: exercise.name,
        detail: `${exercise.targetValue ?? ''} ${exercise.targetUnit ?? ''}`.trim(),
      })),
    ),
  )
}

export default function Home({ onOpenRoutine, onCreateRoutine, onLoggedOut }) {
  const weekDates = useMemo(getWeekDates, [])
  const [selectedDate, setSelectedDate] = useState(
    weekDates.find((date) => date.isToday)?.key || weekDates[0].key,
  )
  const [water, setWater] = useState(homeMockData.condition.water.current)
  const [activeRoutines, setActiveRoutines] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    Promise.allSettled([getRoutines(), getTodayRoutine()]).then(([listResult, todayResult]) => {
      if (!active) return

      if (listResult.status === 'fulfilled') {
        setActiveRoutines((listResult.value?.data?.content || []).map(toRoutineCard))
      }
      if (todayResult.status === 'fulfilled') {
        setTodayItems(getTodayItems(todayResult.value?.data))
      }
      if (listResult.status === 'rejected' && todayResult.status === 'rejected') {
        setError('루틴 정보를 불러오지 못했습니다.')
      }
      setIsLoading(false)
    })

    return () => { active = false }
  }, [])

  async function handleLogout() {
    await logout()
    onLoggedOut?.()
  }

  return (
    <section className="home-page">
      <div className="home-scroll-content">
        <header className="home-topbar">
          <strong>리뉴</strong>
          <button type="button" onClick={handleLogout}>로그아웃</button>
        </header>

        <div className="week-selector" aria-label="이번 주 날짜 선택">
          {weekDates.map((item) => (
            <button
              type="button"
              key={item.key}
              className={selectedDate === item.key ? 'selected' : ''}
              onClick={() => setSelectedDate(item.key)}
            >
              <small>{item.day}</small><span>{item.date}</span>
            </button>
          ))}
        </div>

        <section className="home-section active-routine-section">
          <h2>진행 중인 루틴 <span>{activeRoutines.length}개</span></h2>
          {isLoading && <p className="home-api-message">루틴을 불러오는 중…</p>}
          {!isLoading && activeRoutines.length === 0 && (
            <button type="button" className="empty-routine-card" onClick={onCreateRoutine}>
              아직 루틴이 없어요. 첫 맞춤 루틴 만들기 ›
            </button>
          )}
          <div className="active-routine-slider">
            {activeRoutines.map((currentRoutine) => (
              <button
                type="button"
                className="active-routine-card"
                key={currentRoutine.id}
                onClick={() => onOpenRoutine?.(currentRoutine)}
              >
                <div><strong>{currentRoutine.title}</strong><em>{currentRoutine.badge}</em><span>›</span></div>
                <div className="routine-progress"><i style={{ width: `${currentRoutine.progress}%` }} /></div>
                <div className="routine-weeks">
                  {Array.from({ length: currentRoutine.totalWeeks }, (_, index) => (
                    <span className={index + 1 === currentRoutine.currentWeek ? 'current' : ''} key={index}>{index + 1}주</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="today-timeline">
          {todayItems.map((item, index) => (
            <article className={`today-card ${index === 0 ? 'primary' : ''}`} key={item.id}>
              <span className="timeline-dot" />
              {index === 0 ? (
                <>
                  <div className="today-meta"><em>● {item.type}</em><span>{item.time}</span><b>›</b></div>
                  <h2>{item.title}</h2><p>{item.detail}</p>
                  <button type="button" className="routine-start-button">시작하기</button>
                </>
              ) : (
                <div className="compact-routine"><span>⌁</span><div><strong>{item.type} · {item.title}</strong><small>{item.time} · {item.detail}</small></div></div>
              )}
            </article>
          ))}
        </section>

        {error && <p className="home-api-message error" role="alert">{error}</p>}

        <section className="condition-section">
          <h2>오늘의 컨디션 기록</h2>
          <article className="condition-card water-card">
            <div className="condition-title"><span>♢</span><strong>물</strong><small>{water}잔 / {homeMockData.condition.water.target}잔</small><button type="button" onClick={() => setWater(Math.max(0, water - 1))}>−</button><button type="button" onClick={() => setWater(Math.min(8, water + 1))}>+</button></div>
            <div className="water-glasses">{Array.from({ length: 8 }, (_, index) => <i className={index < water ? 'filled' : ''} key={index} />)}</div>
            <p>한 잔 250ml · 목표까지 {Math.max(0, 8 - water)}잔 남았어요</p>
          </article>

          <article className="condition-card sleep-card">
            <div className="condition-title"><span>◔</span><strong>수면</strong><small>{homeMockData.condition.sleep.total}</small><em>건강 앱 연동</em></div>
            <div className="sleep-track"><i /></div>
            <div className="sleep-labels"><span>{homeMockData.condition.sleep.asleepAt} 취침</span><strong>깊은 잠 {homeMockData.condition.sleep.deepSleep}</strong><span>{homeMockData.condition.sleep.wakeAt} 기상</span></div>
            <div className="sleep-times"><span>00:00</span><span>12:00</span></div>
          </article>
        </section>
      </div>
      <BottomNav active="home" />
    </section>
  )
}
