import './Home.css'

export default function RoutineDetail({ routine, onBack }) {
  if (!routine) return null
  return (
    <section className="routine-detail-page">
      <header><button type="button" onClick={onBack}>‹</button><h1>루틴 상세</h1></header>
      <div className="routine-detail-hero">
        <span>{routine.badge}</span><h2>{routine.title}</h2><p>오늘의 상태와 목표에 맞춰 구성된 맞춤 루틴이에요.</p>
      </div>
      <article><strong>진행률</strong><b>{routine.progress}%</b><div className="routine-progress"><i style={{ width: `${routine.progress}%` }} /></div></article>
      <article><strong>현재 일정</strong><p>{routine.totalWeeks}주 중 {routine.currentWeek}주차를 진행하고 있어요.</p></article>
      <button type="button" className="detail-start-button">오늘 루틴 시작하기</button>
    </section>
  )
}