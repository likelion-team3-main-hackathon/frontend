import { useState } from 'react'
import { updateOnboarding } from '../../api/user'
import checkIcon from '../../assets/icons/check.png'
import './Goal.css'

const GOALS = [
  { label: '체중 감량', value: 'WEIGHT_LOSS' },
  { label: '체형 개선 · 근육', value: 'MUSCLE_GAIN' },
  { label: '재활 · 통증 완화', value: 'REHABILITATION' },
  { label: '수치 관리 (혈당·혈압)', value: 'HEALTH_METRIC_MANAGEMENT' },
]

const WEEKDAYS = [
  ['MONDAY', '월'],
  ['TUESDAY', '화'],
  ['WEDNESDAY', '수'],
  ['THURSDAY', '목'],
  ['FRIDAY', '금'],
  ['SATURDAY', '토'],
  ['SUNDAY', '일'],
]

function getDraft() {
  try {
    return JSON.parse(sessionStorage.getItem('onboardingDraft') || '{}')
  } catch {
    return {}
  }
}

export default function Goal({ onNext }) {
  const [form, setForm] = useState(() => ({
    name: '',
    birthDate: '',
    gender: 'PREFER_NOT_TO_SAY',
    heightCm: '',
    weightKg: '',
    goal: '',
    activityLevel: 'LIGHT',
    availableExerciseDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
    availableExerciseMinutes: 30,
    ...getDraft(),
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      availableExerciseDays: current.availableExerciseDays.includes(day)
        ? current.availableExerciseDays.filter((value) => value !== day)
        : [...current.availableExerciseDays, day],
    }))
  }

  async function saveOnboarding() {
    if (!form.goal || form.availableExerciseDays.length === 0) return

    setIsSubmitting(true)
    setError('')

    const request = {
      name: form.name.trim() || undefined,
      birthDate: form.birthDate || undefined,
      gender: form.gender,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      goals: [form.goal],
      activityLevel: form.activityLevel,
      availableExerciseDays: form.availableExerciseDays,
      availableExerciseMinutes: Number(form.availableExerciseMinutes),
      dietaryPreferences: [],
      allergies: [],
      dislikedFoods: [],
      injuries: [],
    }

    try {
      await updateOnboarding(request)
      sessionStorage.setItem('onboardingDraft', JSON.stringify(form))
      onNext?.(request)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '온보딩 정보를 저장하지 못했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="goal-page">
      <header className="onboarding-header">
        <div className="progress-track">
          <span className="progress-value" />
        </div>
        <span className="progress-text">기본 정보</span>
      </header>

      <div className="goal-content">
        <h1>건강 목표와 생활 패턴을 알려주세요</h1>

        <div className="profile-field-grid">
          <label>
            이름
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="선택 입력" />
          </label>
          <label>
            생년월일
            <input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} />
          </label>
          <label>
            성별
            <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="PREFER_NOT_TO_SAY">선택 안 함</option>
              <option value="FEMALE">여성</option>
              <option value="MALE">남성</option>
              <option value="OTHER">기타</option>
            </select>
          </label>
          <label>
            활동 수준
            <select value={form.activityLevel} onChange={(event) => updateField('activityLevel', event.target.value)}>
              <option value="SEDENTARY">거의 없음</option>
              <option value="LIGHT">가벼움</option>
              <option value="MODERATE">보통</option>
              <option value="ACTIVE">활발함</option>
            </select>
          </label>
          <label>
            키(cm)
            <input type="number" min="1" step="0.1" value={form.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} placeholder="선택 입력" />
          </label>
          <label>
            체중(kg)
            <input type="number" min="1" step="0.1" value={form.weightKg} onChange={(event) => updateField('weightKg', event.target.value)} placeholder="선택 입력" />
          </label>
        </div>

        <h2>무엇을 바꾸고 싶나요?</h2>
        <div className="goal-list">
          {GOALS.map((goal) => {
            const isSelected = form.goal === goal.value

            return (
              <button
                key={goal.value}
                type="button"
                className={`goal-option ${isSelected ? 'selected' : ''}`}
                onClick={() => updateField('goal', goal.value)}
              >
                <span>{goal.label}</span>
                {isSelected && <img className="goal-check-icon" src={checkIcon} alt="" />}
              </button>
            )
          })}
        </div>

        <h2>운동 가능한 요일</h2>
        <div className="weekday-list">
          {WEEKDAYS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={form.availableExerciseDays.includes(value) ? 'selected' : ''}
              onClick={() => toggleDay(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="minutes-field">
          하루 운동 시간
          <select value={form.availableExerciseMinutes} onChange={(event) => updateField('availableExerciseMinutes', event.target.value)}>
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="40">40분</option>
            <option value="60">60분</option>
          </select>
        </label>

        {error && <p className="goal-error" role="alert">{error}</p>}
      </div>

      <footer className="goal-actions">
        <button
          type="button"
          className="next-button"
          disabled={!form.goal || form.availableExerciseDays.length === 0 || isSubmitting}
          onClick={saveOnboarding}
        >
          {isSubmitting ? '저장 중…' : '다음'}
        </button>
      </footer>
    </section>
  )
}
