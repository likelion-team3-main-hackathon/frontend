import { useState } from 'react'
import './Goal.css'
import checkIcon from '../../assets/icons/check.png'

const GOALS = [
  '체중 감량',
  '체형 개선 · 근육',
  '재활 · 통증 완화',
  '수치 관리 (혈당·혈압)',
]

export default function Goal({ onNext }) {
  const savedDraft = JSON.parse(sessionStorage.getItem('onboardingDraft') || '{}')

  const [selectedGoal, setSelectedGoal] = useState(savedDraft.goals?.[0] || '')

  function saveGoal() {
    const nextDraft = {
      ...savedDraft,
      goals: selectedGoal ? [selectedGoal] : [],
    }

    sessionStorage.setItem('onboardingDraft', JSON.stringify(nextDraft))
    onNext?.()
  }

  return (
    <section className="goal-page">
      <header className="onboarding-header">
        <button type="button" className="back-button" aria-label="뒤로 가기">
          ‹
        </button>

        <div className="progress-track">
          <span className="progress-value" />
        </div>

        <span className="progress-text">2 / 6</span>
      </header>

      <div className="goal-content">
        <h1>무엇을 바꾸고 싶나요?</h1>

        <div className="goal-list">
          {GOALS.map((goal) => {
            const isSelected = selectedGoal === goal

            return (
              <button
                key={goal}
                type="button"
                className={`goal-option ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedGoal(goal)}
              >
                <span>{goal}</span>
                {isSelected && (
                    <img
                      className="goal-check-icon"
                      src={checkIcon}
                      alt=""
                    />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <footer className="goal-actions">
        <button
          type="button"
          className="next-button"
          disabled={!selectedGoal}
          onClick={saveGoal}
        >
          다음
        </button>

        <button type="button" className="skip-button" onClick={saveGoal}>
          건너뛰기
        </button>
      </footer>
    </section>
  )
}