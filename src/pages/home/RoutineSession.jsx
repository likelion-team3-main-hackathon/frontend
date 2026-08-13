import './RoutineSession.css'

export default function RoutineSession({ item, onDecision, onClose }) {
  if (!item) return null

  function decide(status) {
    onDecision?.(item.id, status)
    onClose?.()
  }

  return (
    <section className="routine-session-page">
      <header>
        <button type="button" onClick={onClose} aria-label="닫기">×</button>
        <div><span style={{ width: '100%' }} /></div>
        <small>루틴 확인</small>
      </header>

      <main>
        <span className="session-type">{item.type}</span>
        <p>{item.time}</p>
        <h1>{item.title}</h1>
        <p className="session-detail">{item.detail}</p>
      </main>

      <footer>
        <button type="button" className="session-confirm" onClick={() => decide('completed')}>확인</button>
        <button type="button" className="session-cancel" onClick={() => decide('cancelled')}>취소</button>
      </footer>
    </section>
  )
}
