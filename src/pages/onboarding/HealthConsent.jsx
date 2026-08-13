import { useState } from 'react'
import { updateAgreements } from '../../api/user'
import './HealthConsent.css'

const NOTICES = [
  { type: 'TERMS_OF_SERVICE', label: '서비스 이용약관에 동의해요', required: true },
  { type: 'PRIVACY', label: '개인정보 처리방침에 동의해요', required: true },
  { type: 'SENSITIVE_HEALTH_DATA', label: '민감 건강정보 수집·이용에 동의해요', required: true },
  { type: 'MARKETING', label: '건강 소식과 혜택 수신에 동의해요', required: false },
]

export default function HealthConsent({ onAgree, onCancel }) {
  const [checks, setChecks] = useState(Array(NOTICES.length).fill(false))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const allChecked = checks.every(Boolean)
  const requiredChecked = NOTICES.every(
    (notice, index) => !notice.required || checks[index],
  )

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

  async function submitAgreements() {
    setIsSubmitting(true)
    setError('')

    try {
      await updateAgreements(
        NOTICES.map((notice, index) => ({
          type: notice.type,
          agreed: checks[index],
        })),
      )
      onAgree?.()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '약관을 저장하지 못했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="health-consent-page">
      <div className="health-consent-background">
        <h1>
          건강 여정을 시작할
          <br />
          준비가 됐어요
        </h1>

        <div className="health-consent-progress">
          <span />
        </div>
      </div>

      <div className="health-consent-sheet">
        <div className="sheet-handle" />

        <h2>시작 전 확인해주세요</h2>
        <p className="health-consent-subtitle">
          필수 3개 항목의 동의가 필요해요
        </p>

        <ul className="health-notice-list">
          {NOTICES.map((notice, index) => (
            <li key={notice.type}>
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
                <span>
                  {notice.required ? '[필수] ' : '[선택] '}
                  {notice.label}
                </span>
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
          <span>전체 동의</span>
        </button>

        {error && <p className="health-consent-error" role="alert">{error}</p>}

        <button
          type="button"
          className="health-consent-agree"
          disabled={!requiredChecked || isSubmitting}
          onClick={submitAgreements}
        >
          {isSubmitting ? '저장 중…' : '동의하고 시작'}
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
