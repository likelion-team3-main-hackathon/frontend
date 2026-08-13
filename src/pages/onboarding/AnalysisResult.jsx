import './AnalysisResult.css'
import smile from "../../assets/icons/smile_big.png"

export default function AnalysisResult({ onConfirm, onLater }) {
  return (
    <section className="analysis-result-page">
      <div className="routine-preparing-background">
        <h1>
          루틴을 준비하고
          <br />
          있어요
        </h1>

        <div className="routine-preparing-progress">
          <span />
        </div>
      </div>

      <div className="routine-recommendation-sheet">
        <div className="sheet-handle" />

        <div className="recommendation-title">
          <img
            className="recommendation-face"
            src={smile}
            alt=""
/>

          <div>
            <h2>이 정보로 루틴을 구성할까요?</h2>
            <p>진료·인바디·목표를 바탕으로 만들어요</p>
          </div>
        </div>

        <div className="recommendation-card">
          <div>
            <span>목표</span>
            <strong>12주 · 6kg · 주 4회 운동</strong>
          </div>

          <div>
            <span>주의</span>
            <strong>허리 부담 동작 제외 · 자극 제외</strong>
          </div>

          <div>
            <span>생활</span>
            <strong>점심 12:30 · 고정 · 아침 집중</strong>
          </div>
        </div>

        <button
          type="button"
          className="recommendation-confirm-button"
          onClick={onConfirm}
        >
          네, 구성할게요
        </button>

        <button
          type="button"
          className="recommendation-later-button"
          onClick={onLater}
        >
          아니요, 나중에
        </button>
      </div>
    </section>
  )
}