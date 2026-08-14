import { useEffect, useMemo, useRef, useState } from 'react'
import { logout } from '../../api/auth'
import BottomNav from '../../components/layout/BottomNav'
import { getHome, getLatestCoaching } from '../../api/home'
import { getRoutineRecords, recordWater } from '../../api/record'
import { getRoutine, getRoutines } from '../../api/routine'
import { homeMockData } from '../../mocks/homeData'
import bellIcon from '../../assets/icons/bell.png'
import exerciseIcon from '../../assets/icons/routine/exercise.png'
import mealIcon from '../../assets/icons/routine/meal.png'
import mealActiveIcon from '../../assets/icons/routine/meal_a.png'
import './Home.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekDates() {
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + index)
    return { key: localDateKey(date), day: WEEKDAYS[date.getDay()], date: date.getDate(), isToday: localDateKey(date) === localDateKey(today) }
  })
}

function routineSummary(routine) {
  const start = new Date(`${routine.startDate}T00:00:00`)
  const end = new Date(`${routine.endDate}T00:00:00`)
  const now = new Date()
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const elapsed = Math.max(0, Math.min(totalDays, Math.round((now - start) / 86400000) + 1))
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))
  return { ...routine, badge: `${elapsed}일차`, progress: Math.round(elapsed / totalDays * 100), currentWeek: Math.max(1, Math.ceil(elapsed / 7)), totalWeeks }
}

function scheduledItems(routines, date) {
  return (routines || []).flatMap((routine) => (routine.days || []).map((day) => ({ routine, day })))
    .filter(({ day }) => day?.scheduledDate === date)
    .flatMap(({ routine, day }) => {
      const dayNumber = Math.max(1, Math.round((new Date(`${date}T00:00:00`) - new Date(`${routine.startDate}T00:00:00`)) / 86400000) + 1)
      const exercises = (day.sections || []).flatMap((section) => (section.exercises || []).map((exercise) => ({
        id: exercise.exerciseId,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        targetValue: Number(exercise.targetValue || 0),
        targetUnit: exercise.targetUnit || 'REPETITIONS',
        sets: Number(exercise.sets || 1),
        restSeconds: Number(exercise.restSeconds || 0),
        videoUrl: exercise.videoUrl || '',
        thumbnailUrl: exercise.thumbnailUrl || '',
        sectionType: section.sectionType,
      })))
      return exercises.map((exercise) => ({
        id: exercise.exerciseId,
        routineItemId: exercise.exerciseId,
        activityType: 'EXERCISE',
        routineId: routine.id,
        routineTitle: routine.title,
        dayNumber,
        type: exercise.sectionType === 'COOL_DOWN' ? '마무리' : '운동',
        time: `${day.estimatedMinutes || 0}분 예정`,
        title: exercise.name,
        detail: `${exercise.targetValue} ${exercise.targetUnit === 'SECONDS' ? '초' : '회'} · ${exercise.sets}세트`,
        exercises,
      }))
    })
    .filter((item) => item.id != null && item.title)
}

function parseDetails(record) {
  const value = record.details || record.detailsJson
  if (typeof value === 'object' && value) return value
  try { return JSON.parse(value || '{}') } catch { return {} }
}

function isMealActivity(item) {
  if (item.activityType === 'MEAL') return true
  return ['아침', '점심', '저녁', '끼니', '식단'].some((keyword) => item.type?.includes(keyword))
}

export default function Home({
  onOpenRoutine,
  onNavigate,
  onStartRoutine,
  onPassRoutine,
  onOpenReport,
  onCreateRoutine,
  onLoggedOut,
  routineStatuses = {},
  routineCalories = {},
  onStatusesLoaded,
}) {
  const statusesLoadedRef = useRef(onStatusesLoaded)
  statusesLoadedRef.current = onStatusesLoaded
  const weekDates = useMemo(getWeekDates, [])
  const todayKey = weekDates.find((date) => date.isToday)?.key || weekDates[0].key
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [userName, setUserName] = useState(homeMockData.userName)
  const [activeRoutines, setActiveRoutines] = useState(homeMockData.activeRoutines)
  const [routineDetails, setRoutineDetails] = useState([])
  const [coaching, setCoaching] = useState(homeMockData.condition.coaching)
  const [water, setWater] = useState(homeMockData.condition.water.current)
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [routineSlide, setRoutineSlide] = useState(0)
  const [activeDateKeys, setActiveDateKeys] = useState(new Set())
  const [isHealthAppLinked, setIsHealthAppLinked] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([getHome(), getRoutines(), getLatestCoaching()]).then(async ([home, routines, coachingResult]) => {
      if (!active) return
      if (home.status === 'fulfilled') setUserName(home.value?.data?.user?.name || homeMockData.userName)
      if (coachingResult.status === 'fulfilled') setCoaching(coachingResult.value?.data?.message || homeMockData.condition.coaching)
      if (routines.status !== 'fulfilled') return

      const list = routines.value?.data?.content || []
      setIsApiConnected(true)
      setActiveRoutines(list.map(routineSummary))
      if (list.length === 0) {
        setRoutineDetails([])
        return
      }
      const details = await Promise.allSettled(list.map((routine) => getRoutine(routine.id)))
      if (active) setRoutineDetails(details.filter((result) => result.status === 'fulfilled').map((result) => result.value.data))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true

    Promise.allSettled(weekDates.map((item) => getRoutineRecords(item.key)))
      .then((results) => {
        if (!active) return

        const nextActiveDates = new Set()
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return
          const dayRecords = result.value?.data || []
          const hasCompletedRoutine = dayRecords.some((record) => {
            if (!record.routineItemId) return false
            const details = parseDetails(record)
            return !details.skipped && (details.completed || record.status === 'COMPLETED')
          })
          if (hasCompletedRoutine) nextActiveDates.add(weekDates[index].key)
        })
        setActiveDateKeys(nextActiveDates)
      })

    return () => { active = false }
  }, [weekDates])

  useEffect(() => {
    let active = true
    getRoutineRecords(selectedDate).then((response) => {
      if (!active) return
      const nextRecords = response?.data || []
      const loadedStatuses = nextRecords.reduce((statuses, record) => {
        if (!record.routineItemId) return statuses
        const details = parseDetails(record)
        statuses[record.routineItemId] = details.skipped || record.status === 'SKIPPED'
          ? 'cancelled'
          : 'completed'
        return statuses
      }, {})
      const loadedCalories = nextRecords.reduce((calories, record) => {
        if (!record.routineItemId) return calories
        const details = parseDetails(record)
        if (record.activityType === 'MEAL' || record.type === 'MEAL') calories[record.routineItemId] = Number(details.calories || 0)
        return calories
      }, {})
      statusesLoadedRef.current?.(loadedStatuses, loadedCalories)
      const latestWater = [...nextRecords].find((record) => parseDetails(record).category === 'WATER')
      setWater(latestWater ? Number(parseDetails(latestWater).glasses) : 0)
    }).catch(() => {
      if (active) setWater(0)
    })
    return () => { active = false }
  }, [selectedDate])

  const apiScheduled = scheduledItems(routineDetails, selectedDate)
  const displayedRoutines = apiScheduled.length
    ? apiScheduled
    : selectedDate === todayKey
      ? homeMockData.todayRoutines
      : []
  const nextRoutineIndex = displayedRoutines.findIndex((item) => !routineStatuses[item.id])
  const completedCount = displayedRoutines.filter((item) => routineStatuses[item.id] === 'completed').length
  const allDecided = displayedRoutines.length > 0 && displayedRoutines.every((item) => routineStatuses[item.id])

  async function changeWater(change) {
    const next = Math.max(0, Math.min(8, water + change))
    setWater(next)
    try { await recordWater(next, selectedDate) } catch { /* API 실패 시 화면 상태만 유지 */ }
  }

  async function handleLogout() {
    await logout()
    onLoggedOut?.()
  }

  return (
    <section className="home-page">
      <div className="home-scroll-content">
        <header className="home-topbar">
          <strong>리뉴</strong>
          <div className="home-topbar-actions">
            <button type="button" aria-label="알림"><img src={bellIcon} alt="" /></button>
            <button type="button" onClick={handleLogout}>로그아웃</button>
          </div>
        </header>
        <p className="home-user-greeting">{userName} 님, 오늘도 가볍게 시작해요</p>

        <div className="week-selector" aria-label="이번 주 날짜 선택">
          {weekDates.map((item) => {
            const hasActivity = activeDateKeys.has(item.key)
              || (item.key === selectedDate && completedCount > 0)
            return <button type="button" key={item.key} className={`${selectedDate === item.key ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}`} onClick={() => setSelectedDate(item.key)}><small>{item.day}</small><span>{item.date}</span></button>
          })}
        </div>

        <section className="home-section active-routine-section">
          <h2>진행 중인 루틴 <span>{activeRoutines.length ? routineSlide + 1 : 0} / {activeRoutines.length}</span></h2>
          {isApiConnected && activeRoutines.length === 0 && (
            <button type="button" className="empty-routine-card" onClick={onCreateRoutine}>
              아직 루틴이 없어요. 첫 맞춤 루틴 만들기 ›
            </button>
          )}
          <div
            className="active-routine-slider"
            onScroll={(event) => {
              const slider = event.currentTarget
              const cardWidth = slider.firstElementChild?.getBoundingClientRect().width || slider.clientWidth
              setRoutineSlide(Math.max(0, Math.min(activeRoutines.length - 1, Math.round(slider.scrollLeft / (cardWidth + 10)))))
            }}
          >
            {activeRoutines.map((routine) => <button type="button" className="active-routine-card" key={routine.id} onClick={() => onOpenRoutine?.(routine)}><div><strong>{routine.title}</strong><em>{routine.badge}</em><span>›</span></div><div className="routine-progress"><i style={{ width: `${routine.progress}%` }} /></div><div className="routine-weeks">{Array.from({ length: routine.totalWeeks }, (_, index) => <span className={index + 1 === routine.currentWeek ? 'current' : ''} key={index}>{index + 1}주</span>)}</div></button>)}
          </div>
          <div className="slider-dots">
            {activeRoutines.map((routine, index) => <i className={index === routineSlide ? 'active' : ''} key={routine.id} />)}
          </div>
        </section>

        <section className="today-timeline">
          {allDecided && (
            <article className="today-completion-card">
              <h2>오늘 {completedCount} / {displayedRoutines.length} 완료</h2>
              <p>오늘의 루틴 진행 결과를 확인해 보세요</p>
              <button type="button" onClick={() => onOpenReport?.(displayedRoutines, selectedDate)}>오늘의 리포트</button>
            </article>
          )}
          {displayedRoutines.length === 0 && <div className="empty-day-card">이 날짜에 예정된 루틴이 없어요.</div>}
          {displayedRoutines.map((item, index) => {
            const status = routineStatuses[item.id]
            const isPrimary = index === nextRoutineIndex
            const mealActivity = isMealActivity(item)
            const activityIcon = mealActivity && status === 'completed'
              ? mealActiveIcon
              : mealActivity ? mealIcon : exerciseIcon
            const compactDetail = mealActivity && status === 'completed'
              ? `${item.time} · 섭취 ${(routineCalories[item.id] ?? item.calories ?? 0).toLocaleString()} kcal`
              : `${item.time} · ${item.detail}`
            return <article className={`today-card ${isPrimary ? 'primary' : ''} ${status || ''}`} key={item.id}><span className="timeline-dot" />{isPrimary ? <><div className="today-meta"><em>● {item.type}</em><span>{item.time}</span><b>›</b></div><h2>{item.title}</h2><p>{item.detail}</p><button type="button" className="routine-start-button" onClick={() => onStartRoutine?.(item)}>시작하기</button><button type="button" className="routine-pass-button" onClick={() => onPassRoutine?.(item)}>패스하기</button></> : <button type="button" className="compact-routine" disabled={Boolean(status)} onClick={() => onStartRoutine?.(item)}><img className="routine-activity-icon" src={activityIcon} alt="" /><div><strong>{item.type} · {item.title}</strong><small>{compactDetail}</small></div>{status === 'completed' && <span className="routine-status-icon completed">✓</span>}</button>}</article>
          })}
        </section>

        <section className="condition-section">
          <h2>오늘의 컨디션 기록</h2>
          <article className="condition-card water-card"><div className="condition-title"><span>◊</span><strong>물</strong><small>{water}잔 / 8잔</small><button type="button" onClick={() => changeWater(-1)}>−</button><button type="button" onClick={() => changeWater(1)}>+</button></div><div className="water-glasses">{Array.from({ length: 8 }, (_, index) => <i className={index < water ? 'filled' : ''} key={index} />)}</div><p>한 잔 250ml · 목표까지 {Math.max(0, 8 - water)}잔 남았어요</p></article>
          <article className="condition-card sleep-card"><div className="condition-title"><span>☾</span><strong>수면</strong><small>{homeMockData.condition.sleep.total}</small><button type="button" className={`health-link-button ${isHealthAppLinked ? 'linked' : ''}`} onClick={() => setIsHealthAppLinked((linked) => !linked)}>{isHealthAppLinked ? '연결됨' : '건강 앱 연동'}</button></div><div className="sleep-track"><i /></div><div className="sleep-labels"><span>{homeMockData.condition.sleep.asleepAt} 취침</span><strong>깊은 잠 {homeMockData.condition.sleep.deepSleep}</strong><span>{homeMockData.condition.sleep.wakeAt} 기상</span></div><div className="sleep-times"><span>00:00</span><span>12:00</span></div></article>
          <article className="coaching-card"><span>!</span><p>{coaching}</p></article>
          <button type="button" className="research-note">{homeMockData.condition.recommendation}<span>›</span></button>
        </section>
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </section>
  )
}
