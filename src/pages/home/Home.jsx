import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '../../components/layout/BottomNav'
import AiFloatingButton from '../../components/layout/AiFloatingButton'
import { getLatestCoaching } from '../../api/home'
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

function getWeekDates(focusDate = new Date()) {
  const today = new Date()
  const mondayOffset = focusDate.getDay() === 0 ? -6 : 1 - focusDate.getDay()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(focusDate)
    date.setDate(focusDate.getDate() + mondayOffset + index)
    return { key: localDateKey(date), day: WEEKDAYS[date.getDay()], date: date.getDate(), isToday: localDateKey(date) === localDateKey(today) }
  })
}

function routineSummary(routine) {
  const start = new Date(`${routine.startDate}T00:00:00`)
  const end = new Date(`${routine.endDate}T00:00:00`)
  const now = new Date()
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const elapsed = Math.max(0, Math.min(totalDays, Math.round((now - start) / 86400000) + 1))
  const scheduledDays = routine.days || []
  const todayKey = localDateKey(now)
  const todayIndex = scheduledDays.findIndex((day) => day.scheduledDate === todayKey)
  const latestIndex = scheduledDays.reduce((result, day, index) => day.scheduledDate <= todayKey ? index : result, -1)
  const currentDay = scheduledDays.length ? Math.max(1, (todayIndex >= 0 ? todayIndex : latestIndex >= 0 ? latestIndex : 0) + 1) : elapsed
  const totalWeeks = scheduledDays.length
    ? Math.max(1, ...scheduledDays.map((day) => Number(day.week || 1)))
    : Math.max(1, Math.ceil(totalDays / 7))
  const currentWeek = scheduledDays[currentDay - 1]?.week || Math.max(1, Math.ceil(currentDay / 7))
  const progressTotal = scheduledDays.length || totalDays
  return { ...routine, badge: `${currentDay}일차`, progress: Math.round(currentDay / progressTotal * 100), currentWeek, totalWeeks }
}

function scheduledItems(routines, date) {
  return (routines || []).flatMap((routine) => (routine.days || []).map((day) => ({ routine, day })))
    .filter(({ day }) => day?.scheduledDate === date)
    .flatMap(({ routine, day }) => {
      const dayNumber = Math.max(1, Math.round((new Date(`${date}T00:00:00`) - new Date(`${routine.startDate}T00:00:00`)) / 86400000) + 1)
      const exercises = (day.sections || []).flatMap((section) => (section.exercises || []).map((exercise) => ({
          id: exercise.exerciseId,
          exerciseId: exercise.exerciseId,
          activityType: exercise.activityType || 'EXERCISE',
          name: exercise.name,
          targetValue: Number(exercise.targetValue || 0),
          targetUnit: exercise.targetUnit || 'REPETITIONS',
          sets: Number(exercise.sets || 1),
          restSeconds: Number(exercise.restSeconds || 0),
          videoUrl: exercise.videoUrl || '',
          thumbnailUrl: exercise.thumbnailUrl || '',
          content: exercise.content,
          scheduledAt: exercise.scheduledAt,
          estimatedMinutes: Number(exercise.estimatedMinutes || 0),
          sectionType: section.sectionType,
          sectionTitle: section.title,
          sectionId: section.sectionId,
        })))
      const meals = exercises.filter((exercise) => exercise.activityType === 'MEAL').map((meal) => {
        const details = parseDetails({ details: meal.content })
        const scheduledTime = meal.scheduledAt
          ? new Date(meal.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' })
          : '시간 미정'
        return {
          id: meal.id,
          routineItemId: meal.id,
          routineItemIds: [meal.id],
          activityType: 'MEAL',
          routineId: routine.id,
          routineTitle: routine.title,
          scheduledDate: date,
          dayNumber,
          type: meal.sectionTitle?.replace(' 식단', '') || '식단',
          time: scheduledTime,
          title: meal.name,
          detail: `${Number(details.calories || meal.targetValue || 0).toLocaleString()} kcal`,
          foods: details.foods || [],
          details,
        }
      })
      const movements = exercises.filter((exercise) => exercise.activityType !== 'MEAL')
      if (!movements.length) return meals
      const activityType = movements.every((exercise) => exercise.activityType === 'REHABILITATION')
        ? 'REHABILITATION'
        : 'EXERCISE'
      return [...meals, {
        id: `routine-${routine.id}-day-${day.routineDayId}-movement`,
        routineItemId: movements[0].id,
        routineItemIds: movements.map((exercise) => exercise.id),
        activityType,
        routineId: routine.id,
        routineTitle: routine.title,
        scheduledDate: date,
        dayNumber,
        type: activityType === 'REHABILITATION' ? '재활' : '운동',
        time: `${Math.max(...movements.map((exercise) => exercise.estimatedMinutes), Number(day.estimatedMinutes || 0))}분 예정`,
        title: routine.title,
        detail: `${movements.length}동작 · ${movements.reduce((sum, exercise) => sum + exercise.sets, 0)}세트`,
        exercises: movements,
      }]
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

function mealFirst(items) {
  return [...items].sort((left, right) => Number(isMealActivity(right)) - Number(isMealActivity(left)))
}

function routineContainsMeal(routine) {
  if (routine?.type === 'MEAL' || routine?.category === 'MEAL') return true
  if (/식단|식사/.test(routine?.title || '')) return true
  return (routine?.days || []).some((day) => (day.sections || []).some((section) =>
    (section.exercises || []).some((exercise) => exercise.activityType === 'MEAL'),
  ))
}

function mealRoutineFirst(routines) {
  return routines
    .map((routine, index) => ({ routine, index }))
    .sort((left, right) => Number(routineContainsMeal(right.routine)) - Number(routineContainsMeal(left.routine)) || left.index - right.index)
    .map(({ routine }) => routine)
}

function statusForItem(item, statuses) {
  if (statuses[item.id]) return statuses[item.id]
  const ids = item.routineItemIds || [item.routineItemId]
  const values = ids.filter(Boolean).map((id) => statuses[id])
  if (!values.length || values.some((status) => !status)) return null
  return values.every((status) => status === 'completed') ? 'completed' : 'cancelled'
}

function recordForItem(item, records) {
  const ids = new Set((item.routineItemIds || [item.routineItemId]).filter(Boolean).map(String))
  return records.find((record) => ids.has(String(record.routineItemId)))
}

function uniqueItems(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = String(item.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function Home({
  onOpenRoutine,
  onNavigate,
  onStartRoutine,
  onPassRoutine,
  onOpenReport,
  onCreateRoutine,
  onOpenNotifications,
  routineStatuses = {},
  routineCalories = {},
  onStatusesLoaded,
  onOpenAi,
  initialSelectedDate,
  onDateOverrideConsumed,
}) {
  const statusesLoadedRef = useRef(onStatusesLoaded)
  const weekSliderRef = useRef(null)
  const routineSliderRef = useRef(null)
  statusesLoadedRef.current = onStatusesLoaded
  const initialDateRef = useRef(initialSelectedDate)
  const todayKey = localDateKey(new Date())
  const weekGroups = useMemo(() => [-7, 0, 7].map((offset) => {
    const focusDate = new Date()
    focusDate.setDate(focusDate.getDate() + offset)
    return getWeekDates(focusDate)
  }), [])
  const weekDates = useMemo(() => weekGroups.flat(), [weekGroups])
  const [selectedDate, setSelectedDate] = useState(initialDateRef.current || todayKey)
  const [activeRoutines, setActiveRoutines] = useState([])
  const [routineDetails, setRoutineDetails] = useState([])
  const [coaching, setCoaching] = useState(homeMockData.condition.coaching)
  const [water, setWater] = useState(0)
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [routineSlide, setRoutineSlide] = useState(0)
  const [activeDateKeys, setActiveDateKeys] = useState(new Set())
  const [isHealthAppLinked, setIsHealthAppLinked] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState([])
  const [dateStatuses, setDateStatuses] = useState({})

  useEffect(() => {
    setRoutineSlide(0)
    const slider = routineSliderRef.current
    if (slider) slider.scrollTo({ left: 0, behavior: 'auto' })
  }, [activeRoutines.length, activeRoutines[0]?.id])

  useEffect(() => {
    if (initialDateRef.current) onDateOverrideConsumed?.()
  }, [onDateOverrideConsumed])

  useEffect(() => {
    const slider = weekSliderRef.current
    if (!slider) return
    const initialWeekIndex = Math.max(0, weekGroups.findIndex((week) => week.some((item) => item.key === selectedDate)))
    slider.scrollLeft = slider.clientWidth * initialWeekIndex
  }, [weekGroups])

  useEffect(() => {
    let active = true
    Promise.allSettled([getRoutines(), getLatestCoaching()]).then(async ([routines, coachingResult]) => {
      if (!active) return
      if (coachingResult.status === 'fulfilled') setCoaching(coachingResult.value?.data?.message || homeMockData.condition.coaching)
      if (routines.status !== 'fulfilled') return

      const hiddenRoutineIds = new Set(JSON.parse(localStorage.getItem('renewHiddenRoutineIds') || '[]').map(String))
      const latestGeneratedRoutineId = sessionStorage.getItem('latestGeneratedRoutineId')
      if (latestGeneratedRoutineId) {
        hiddenRoutineIds.delete(String(latestGeneratedRoutineId))
        localStorage.setItem('renewHiddenRoutineIds', JSON.stringify([...hiddenRoutineIds]))
        sessionStorage.removeItem('latestGeneratedRoutineId')
      }
      const allList = routines.value?.data?.content || []
      const list = allList.filter((routine) => !hiddenRoutineIds.has(String(routine.id)))
      setIsApiConnected(true)
      setActiveRoutines(mealRoutineFirst(list.map(routineSummary)))
      if (allList.length === 0) {
        setRoutineDetails([])
        return
      }
      const details = await Promise.allSettled(allList.map((routine) => getRoutine(routine.id)))
      if (active) {
        const detailList = details.filter((result) => result.status === 'fulfilled').map((result) => result.value.data)
        setRoutineDetails(detailList)
        setActiveRoutines(mealRoutineFirst(list.map((routine) => {
          const detail = detailList.find((item) => String(item.id) === String(routine.id))
          return routineSummary(detail ? { ...routine, ...detail } : routine)
        })))
      }
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
      setSelectedRecords(nextRecords)
      const loadedStatuses = nextRecords.reduce((statuses, record) => {
        if (!record.routineItemId || statuses[record.routineItemId]) return statuses
        const details = parseDetails(record)
        statuses[record.routineItemId] = details.skipped || record.status === 'SKIPPED'
          ? 'cancelled'
          : 'completed'
        return statuses
      }, {})
      setDateStatuses(loadedStatuses)
      const loadedCalories = nextRecords.reduce((calories, record) => {
        if (!record.routineItemId || calories[record.routineItemId] != null) return calories
        const details = parseDetails(record)
        if (record.activityType === 'MEAL' || record.type === 'MEAL') calories[record.routineItemId] = Number(details.calories || 0)
        return calories
      }, {})
      statusesLoadedRef.current?.(loadedStatuses, loadedCalories)
      const latestWater = [...nextRecords].find((record) => parseDetails(record).category === 'WATER')
      setWater(latestWater ? Number(parseDetails(latestWater).glasses) : 0)
    }).catch(() => {
      if (active) {
        setWater(0)
        setSelectedRecords([])
        setDateStatuses({})
      }
    })
    return () => { active = false }
  }, [selectedDate])

  const allScheduledRoutines = scheduledItems(routineDetails, selectedDate)
  const activeRoutineIds = new Set(activeRoutines.map((routine) => String(routine.id)))
  const activeScheduledRoutines = allScheduledRoutines.filter((item) => activeRoutineIds.has(String(item.routineId)))
  const selectedRoutineId = activeRoutines[routineSlide]?.id
  const selectedRoutineItems = selectedRoutineId == null
    ? activeScheduledRoutines
    : activeScheduledRoutines.filter((item) => String(item.routineId) === String(selectedRoutineId))
  const recordedItems = allScheduledRoutines
    .filter((item) => recordForItem(item, selectedRecords))
    .map((item) => {
      const record = recordForItem(item, selectedRecords)
      const recordedDetails = parseDetails(record)
      return item.activityType === 'MEAL'
        ? { ...item, details: recordedDetails, foods: recordedDetails.foods || item.foods }
        : item
    })
    .sort((left, right) => new Date(recordForItem(left, selectedRecords)?.recordedAt || 0) - new Date(recordForItem(right, selectedRecords)?.recordedAt || 0))
  const isSelectedToday = selectedDate === todayKey
  const isPastDate = selectedDate < todayKey
  const displayedRoutines = isPastDate
    ? recordedItems
    : isSelectedToday ? uniqueItems([...recordedItems, ...mealFirst(selectedRoutineItems)]) : mealFirst(selectedRoutineItems)
  const nextRoutineIndex = isSelectedToday ? displayedRoutines.findIndex((item) => !statusForItem(item, dateStatuses)) : -1
  const currentReportItems = uniqueItems([...recordedItems, ...activeScheduledRoutines])
  let issuedReportItems = []
  try { issuedReportItems = JSON.parse(localStorage.getItem(`renew-report-items:${selectedDate}`) || '[]') } catch { issuedReportItems = [] }
  const reportWasIssued = localStorage.getItem(`renew-report-issued:${selectedDate}`) === 'true'
  const reportItems = reportWasIssued
    ? (issuedReportItems.length ? issuedReportItems : recordedItems)
    : currentReportItems
  const totalCompletedCount = reportItems.filter((item) => statusForItem(item, dateStatuses) === 'completed').length
  const allDecided = currentReportItems.length > 0 && currentReportItems.every((item) => statusForItem(item, dateStatuses))

  function openRoutineSession(item, viewOnly = false) {
    if (!isMealActivity(item)) {
      onStartRoutine?.(item, viewOnly)
      return
    }

    const dayMeals = allScheduledRoutines
      .filter((meal) => isMealActivity(meal)
        && String(meal.routineId) === String(item.routineId)
        && meal.scheduledDate === item.scheduledDate)
      .map((meal) => {
        const record = recordForItem(meal, selectedRecords)
        if (!record) return meal
        const recordedDetails = parseDetails(record)
        return { ...meal, details: recordedDetails, foods: recordedDetails.foods || meal.foods }
      })

    onStartRoutine?.({ ...item, dayMeals: dayMeals.length ? dayMeals : [item] }, viewOnly)
  }

  async function changeWater(change) {
    const next = Math.max(0, Math.min(8, water + change))
    setWater(next)
    try { await recordWater(next, selectedDate) } catch { /* API 실패 시 화면 상태만 유지 */ }
  }

  return (
    <section className="home-page">
      <div className="home-scroll-content">
        <header className="home-topbar">
          <strong>리뉴</strong>
          <div className="home-topbar-actions">
            <button type="button" aria-label="알림" onClick={() => onOpenNotifications?.(mealFirst(scheduledItems(routineDetails, todayKey)), todayKey)}><img src={bellIcon} alt="" /></button>
          </div>
        </header>

        <div className="week-slider" ref={weekSliderRef} aria-label="주별 날짜 선택">
          {weekGroups.map((week, weekIndex) => (
            <div className="week-selector" key={week[0].key} aria-label={weekIndex === 0 ? '지난 주' : weekIndex === 1 ? '이번 주' : '다음 주'}>
              {week.map((item) => {
                const hasActivity = activeDateKeys.has(item.key)
                  || (item.key === selectedDate && totalCompletedCount > 0)
                return <button type="button" key={item.key} className={`${selectedDate === item.key ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}`} onClick={() => setSelectedDate(item.key)}><small>{item.day}</small><span>{item.date}</span></button>
              })}
            </div>
          ))}
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
            ref={routineSliderRef}
            onScroll={(event) => {
              const slider = event.currentTarget
              if (!activeRoutines.length) {
                setRoutineSlide(0)
                return
              }
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
          {(allDecided || reportWasIssued) && (
            <article className="today-completion-card">
              <h2>오늘 {totalCompletedCount} / {reportItems.length} 완료</h2>
              <p>오늘의 루틴 진행 결과를 확인해 보세요</p>
              <button type="button" onClick={() => onOpenReport?.(reportItems, selectedDate)}>오늘의 리포트</button>
            </article>
          )}
          {displayedRoutines.length === 0 && <div className="empty-day-card">이 날짜에 예정된 루틴이 없어요.</div>}
          {displayedRoutines.map((item, index) => {
            const status = statusForItem(item, dateStatuses)
            const isPrimary = index === nextRoutineIndex
            const mealActivity = isMealActivity(item)
            const activityIcon = mealActivity && status === 'completed'
              ? mealActiveIcon
              : mealActivity ? mealIcon : exerciseIcon
            const compactDetail = mealActivity && status === 'completed'
              ? `섭취 ${(routineCalories[item.id] ?? item.calories ?? 0).toLocaleString()} kcal`
              : item.detail
            return <article className={`today-card ${isPrimary ? 'primary' : ''} ${status || ''}`} key={item.id}><span className="timeline-dot" />{isPrimary ? <><button type="button" className="today-primary-content" onClick={() => mealActivity && openRoutineSession(item, false)}><div className="today-meta"><em>● {item.type}</em><b>›</b></div><h2>{item.title}</h2><p>{item.detail}</p></button><button type="button" className="routine-start-button" onClick={() => openRoutineSession(item, false)}>시작하기</button><button type="button" className="routine-pass-button" onClick={() => onPassRoutine?.(item)}>패스하기</button></> : <button type="button" className="compact-routine" onClick={() => openRoutineSession(item, !isSelectedToday || Boolean(status))}><img className="routine-activity-icon" src={activityIcon} alt="" /><div><strong>{item.type} · {item.title}</strong><small>{compactDetail}</small></div>{status === 'completed' && <span className="routine-status-icon completed">✓</span>}</button>}</article>
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
      <AiFloatingButton onClick={onOpenAi} />
      <BottomNav active="home" onNavigate={onNavigate} />
    </section>
  )
}
