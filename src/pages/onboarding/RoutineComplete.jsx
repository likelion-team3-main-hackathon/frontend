import './RoutineComplete.css'
import smileIcon from '../../assets/icons/smile_big.png'

const CONFETTI = [
  { left: '12%', delay: '0s', color: 'orange', shape: 'circle' },
  { left: '25%', delay: '.55s', color: 'green', shape: 'streamer' },
  { left: '39%', delay: '.2s', color: 'yellow', shape: 'diamond' },
  { left: '58%', delay: '.8s', color: 'orange', shape: 'streamer' },
  { left: '73%', delay: '.35s', color: 'green', shape: 'circle' },
  { left: '88%', delay: '1.05s', color: 'yellow', shape: 'diamond' },
]

export default function RoutineComplete({ onStart }) {
  return (
    <section className="routine-complete-page">
      <div className="routine-complete-card">
        <div className="routine-complete-content">
          <div className="complete-confetti" aria-hidden="true">
            {CONFETTI.map((piece, index) => (
              <span
                className={`confetti-piece ${piece.color} ${piece.shape}`}
                key={index}
                style={{ left: piece.left, animationDelay: piece.delay }}
              />
            ))}
          </div>

          <div className="complete-face" aria-hidden="true">
            <img src={smileIcon} alt="" />
          </div>

          <h1>루틴이 완성됐어요!</h1>
          <p>지중해식 4주 + 심폐 집중 4주<br />오늘부터 함께 시작해요</p>

          <div className="routine-complete-stats">
            <div><strong>4주</strong><span>기간</span></div>
            <div><strong>주 4회</strong><span>주간</span></div>
            <div><strong>−6kg</strong><span>목표</span></div>
          </div>
        </div>

        <footer className="routine-complete-footer">
          <div>
            <span>오늘부터 1일째</span>
            <strong>정우정 님의 루틴</strong>
          </div>
          <button type="button" onClick={onStart}>시작하기 ›</button>
        </footer>
      </div>
    </section>
  )
}
