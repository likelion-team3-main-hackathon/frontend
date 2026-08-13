import { useEffect, useState } from 'react'
import { getRoutine } from '../../api/routine'
import './Home.css'

export default function RoutineDetail({ routine, onBack }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (!routine?.id) return
    let active = true
    getRoutine(routine.id).then((response) => {
      if (active) setDetail(response?.data || null)
    }).catch(() => {})
    return () => { active = false }
  }, [routine?.id])

  if (!routine) return null

  return (
    <section className="routine-detail-page">
      <header><button type="button" onClick={onBack}>‹</button><h1>루틴 상세</h1></header>
      <div className="routine-detail-hero"><span>{routine.badge}</span><h2>{detail?.title || routine.title}</h2><p>{detail?.description || '오늘의 상태와 목표에 맞춰 구성된 맞춤 루틴이에요.'}</p></div>
      <article><strong>진행률</strong><b>{routine.progress}%</b><div className="routine-progress"><i style={{ width: `${routine.progress}%` }} /></div></article>
      <article><strong>현재 일정</strong><p>{routine.totalWeeks}주 중 {routine.currentWeek}주차를 진행하고 있어요.</p></article>
      {(detail?.days || []).map((day) => <article className="detail-day-card" key={day.routineDayId}><strong>{day.scheduledDate} · {day.estimatedMinutes}분</strong>{day.sections?.map((section) => <div key={section.sectionId}><h3>{section.title}</h3>{section.exercises?.map((exercise) => <p key={exercise.exerciseId}>{exercise.name} · {exercise.targetValue}{exercise.targetUnit === 'SECONDS' ? '초' : '회'} × {exercise.sets}세트</p>)}</div>)}</article>)}
      <button type="button" className="detail-start-button">오늘 루틴 시작하기</button>
    </section>
  )
}
