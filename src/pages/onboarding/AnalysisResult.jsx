import './AnalysisResult.css'
import smile from "../../assets/icons/smile_big.png"

export default function AnalysisResult({ analysis, onConfirm, onLater }) {
  const goal = analysis?.goals?.[0]?.description || analysis?.summary
  const precaution = analysis?.precautions?.[0]?.description
  const constraints = [
    ...(analysis?.exerciseConstraints || []),
    ...(analysis?.nutritionConstraints || []),
  ].join(' · ')

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
            <strong>{goal || '건강한 생활 습관 형성'}</strong>
          </div>

          <div>
            <span>주의</span>
            <strong>{precaution || '특별한 주의사항 없음'}</strong>
          </div>

          <div>
            <span>제약</span>
            <strong>{constraints || '추가 제약 조건 없음'}</strong>
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
