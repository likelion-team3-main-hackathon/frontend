import { useState } from 'react'
import './HealthConsent.css'

const NOTICES = [
  '이 루틴은 의료 행위·처방을 대체하지 않아요.',
  '처방·진료 지시가 항상 우선합니다.',
  '통증·이상 증상이 있으면 즉시 중단해주세요.',
  '건강정보는 루틴 구성에만 사용돼요.',
]

export default function HealthConsent({ onAgree, onCancel }) {
  const [checks, setChecks] = useState(Array(NOTICES.length).fill(false))
  const allChecked = checks.every(Boolean)

  function toggleNotice(index) {
    setChecks((current) =>
      current.map((checked, currentIndex) =>
        currentIndex === index ? !checked : checked,
      ),
    )
  }

  function toggleAll() {
    setChecks(Array(NOTICES.length).fill(!allChecked))
  }

  return (
    <section className="health-consent-page">
      <div className="health-consent-background">
        <h1>
          루틴을 준비하고
          <br />
          있어요
        </h1>

        <div className="health-consent-progress">
          <span />
        </div>
      </div>

      <div className="health-consent-sheet">
        <div className="sheet-handle" />

        <h2>시작 전 확인해주세요</h2>
        <p className="health-consent-subtitle">
          4가지 모두 확인이 필요해요
        </p>

        <ul className="health-notice-list">
          {NOTICES.map((notice, index) => (
            <li key={notice}>
              <button
                type="button"
                className="health-notice"
                onClick={() => toggleNotice(index)}
              >
                <span
                  className={`health-notice-circle ${
                    checks[index] ? 'checked' : ''
                  }`}
                >
                  ✓
                </span>
                <span>{notice}</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="health-consent-all"
          onClick={toggleAll}
        >
          <span
            className={`health-consent-square ${
              allChecked ? 'checked' : ''
            }`}
          >
            ✓
          </span>
          <span>위 내용을 확인했어요</span>
        </button>

        <button
          type="button"
          className="health-consent-agree"
          disabled={!allChecked}
          onClick={onAgree}
        >
          동의하고 시작
        </button>

        <button
          type="button"
          className="health-consent-cancel"
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </section>
  )
}