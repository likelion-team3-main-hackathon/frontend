import './TodayReport.css'

export default function TodayReport({ items = [], statuses = {}, onBack }) {
  const completed = items.filter((item) => statuses[item.id] === 'completed').length
  const cancelled = items.filter((item) => statuses[item.id] === 'cancelled').length
  const completionRate = items.length ? Math.round((completed / items.length) * 100) : 0

  return (
    <section className="today-report-page">
      <header><button type="button" onClick={onBack}>‹</button><h1>오늘의 리포트</h1></header>

      <div className="report-summary">
        <span>오늘의 달성률</span>
        <strong>{completionRate}%</strong>
        <div><i style={{ width: `${completionRate}%` }} /></div>
        <p>완료 {completed}개 · 취소 {cancelled}개 · 전체 {items.length}개</p>
      </div>

      <div className="report-list">
        {items.map((item) => {
          const status = statuses[item.id]
          return (
            <article className={status} key={item.id}>
              <span>{status === 'completed' ? '✓' : '×'}</span>
              <div><strong>{item.type} · {item.title}</strong><small>{item.time} · {item.detail}</small></div>
            </article>
          )
        })}
      </div>

      <button type="button" className="report-home-button" onClick={onBack}>메인으로 돌아가기</button>
    </section>
  )
}
