import routineStoppedIcon from '../../assets/icons/sad.png'
import './RoutineStopped.css'

export default function RoutineStopped({ onGoHome, onRetry }) {
  return (
    <section className="routine-stopped-page">
      <div className="routine-stopped-background">
        <h1>
          루틴을 준비하고
          <br />
          있어요
        </h1>
      </div>

      <div className="routine-stopped-sheet">
        <div className="sheet-handle" />

        <img
          className="routine-stopped-icon"
          src={routineStoppedIcon}
          alt=""
        />

        <h2>구성을 취소했어요</h2>

        <p>
          나중이라도 언제든 만들 수 있어요.
          <br />
          정보는 안전하게 보관돼요.
        </p>

        <button
          type="button"
          className="routine-stopped-home-button"
          onClick={onGoHome}
        >
          홈으로 가기
        </button>

        <button
          type="button"
          className="routine-stopped-retry-button"
          onClick={onRetry}
        >
          다시 시도
        </button>
      </div>
    </section>
  )
}