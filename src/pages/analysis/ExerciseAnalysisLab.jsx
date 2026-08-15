import { useEffect, useMemo, useState } from 'react'
import { getRoutineRecords } from '../../api/record'
import { getRoutine, getRoutines } from '../../api/routine'
import { aggregateExerciseByRoutineWeek, BODY_PARTS, dateKey } from '../../utils/analysisMetrics'
import './ExerciseAnalysisLab.css'

export default function ExerciseAnalysisLab({ onBack }) {
  const [dailyRecords, setDailyRecords] = useState([])
  const [routineDetail, setRoutineDetail] = useState(null)
  const dates = useMemo(() => Array.from({ length: 28 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() - (27 - offset)); return date }), [])

  useEffect(() => {
    let active = true
    Promise.allSettled([...dates.map((date) => getRoutineRecords(dateKey(date))), getRoutines()]).then((results) => {
      if (!active) return
      setDailyRecords(results.slice(0, 28).map((result, index) => ({ date: dates[index], records: result.status === 'fulfilled' ? result.value?.data || [] : [] })))
      const routineResult = results[28]
      const routines = routineResult.status === 'fulfilled' ? routineResult.value?.data?.content || [] : []
      const exerciseRoutine = routines.find((item) => item.status === 'ACTIVE' && (item.type === 'EXERCISE' || item.type === 'MIXED')) || routines.find((item) => item.type === 'EXERCISE' || item.type === 'MIXED')
      if (exerciseRoutine) getRoutine(exerciseRoutine.id).then((response) => { if (active) setRoutineDetail(response?.data || null) }).catch(() => {})
    })
    return () => { active = false }
  }, [dates])

  const report = useMemo(() => aggregateExerciseByRoutineWeek(dailyRecords, routineDetail), [dailyRecords, routineDetail])
  const hasRecords = report.completed.length > 0
  const partValues = report.parts
  const maxWeekly = Math.max(...report.weeks.map((week) => week.volume), 1)
  const maxPart = Math.max(...Object.values(partValues), 1)
  const displayWeeks = Array.from({ length: report.totalWeeks }, (_, index) => report.weeks.find((week) => week.week === index + 1) || { week: index + 1, volume: 0, future: index + 1 > report.currentWeek })
  const lowestPart = BODY_PARTS.reduce((lowest, part) => partValues[part] < partValues[lowest] ? part : lowest, BODY_PARTS[0])
  const score = hasRecords ? Math.min(100, Math.round(55 + report.current.count * 3 + Math.min(20, report.current.sets))) : 0
  const previousWeek = report.weeks.find((week) => week.week === report.currentWeek - 1)
  const increase = previousWeek?.volume ? Math.round((report.current.volume - previousWeek.volume) / previousWeek.volume * 100) : null

  return <section className="exercise-lab-page"><div className="exercise-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>운동 검사실</h1><b>{score}/100</b></header>
    <p className="exercise-overview">현재 {report.currentWeek}주차 · {increase == null ? '이전 주 비교 없음' : `주간 훈련량 ${increase >= 0 ? '+' : ''}${increase}%`} · {report.current.sets}세트 · {Math.round(report.current.minutes)}분 · {Math.round(report.current.calories)} kcal</p>
    <section className="body-volume"><header><h2>부위별 볼륨</h2><span>세트 수 · 권장 세트</span></header>{BODY_PARTS.map((part) => <article className={part === lowestPart ? 'low' : ''} key={part}><strong>{part}</strong><div><i style={{ width: `${partValues[part] / maxPart * 88}%` }} /><em /></div><b>{partValues[part]}</b></article>)}</section>
    <section className="weekly-volume"><header><h2>주차별 훈련량</h2><b>{increase == null ? `${report.currentWeek}주차 진행 중` : `${increase >= 0 ? '+' : ''}${increase}%`}</b></header><div style={{ gridTemplateColumns: `repeat(${Math.max(1, displayWeeks.length)}, 1fr)` }}>{displayWeeks.map((week) => <span className={week.future ? 'future' : ''} key={week.week}><b>{week.future ? '–' : Math.round(week.volume).toLocaleString()}</b><i className={!week.volume ? 'empty' : ''} style={{ height: week.volume ? `${Math.max(8, week.volume / maxWeekly * 100)}%` : '2px' }} /><small>{week.week}주</small></span>)}</div><p>볼륨 지수 · 세트 × 반복 × 중량 · 미래 주차는 집계 제외</p></section>
    <section className="exercise-analysis"><h2>분석</h2><p>{hasRecords ? `${report.currentWeek}주차 실제 수행 기록을 기준으로 ${lowestPart} 훈련량이 다른 부위에 비해 낮습니다. 다음 주에는 ${lowestPart} 동작을 보완하면 균형을 맞출 수 있어요.` : `${report.currentWeek}주차에 완료된 운동 기록이 없어 부위별 훈련량을 계산할 수 없습니다.`}</p><button type="button">다음 주에 {lowestPart} 2회 반영하기</button></section>
  </div></section>
}
