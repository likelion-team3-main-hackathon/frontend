import { useEffect, useState } from 'react'
import { getMyProfile, updateOnboarding } from '../../api/user'
import checkIcon from '../../assets/icons/check.png'
import './Goal.css'

const GOALS = [
  { label: '체중 감량', value: 'WEIGHT_LOSS' },
  { label: '체형 개선 · 근육', value: 'MUSCLE_GAIN' },
  { label: '재활 · 통증 완화', value: 'REHABILITATION' },
  { label: '수치 관리 (혈당·혈압)', value: 'HEALTH_METRIC_MANAGEMENT' },
]
const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: '거의 운동하지 않아요', detail: '앉아서 보내는 시간이 많아요' },
  { value: 'LIGHT', label: '가볍게 움직여요', detail: '가벼운 활동을 주 1~2회 해요' },
  { value: 'MODERATE', label: '꾸준히 운동해요', detail: '중간 강도 운동을 주 3~4회 해요' },
  { value: 'ACTIVE', label: '활발하게 운동해요', detail: '강도 높은 운동을 주 5회 이상 해요' },
]
const WEEKDAYS = [['MONDAY', '월'], ['TUESDAY', '화'], ['WEDNESDAY', '수'], ['THURSDAY', '목'], ['FRIDAY', '금'], ['SATURDAY', '토'], ['SUNDAY', '일']]
const DEFAULT_FORM = { name: '', birthDate: '', gender: '', heightCm: '', weightKg: '', goal: '', targetWeightKg: '', activityLevel: '', availableExerciseDays: [], availableExerciseMinutes: '', dietaryPreferencesText: '', dislikedFoodsText: '', allergiesText: '', medicalHistoryText: '' }

function getDraft() { try { return JSON.parse(sessionStorage.getItem('onboardingDraft') || '{}') } catch { return {} } }
function valueList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return value.split(',').map((item) => item.trim()).filter(Boolean) }
}
function listText(value) { return valueList(value).join(', ') }
function splitList(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean) }

export default function Goal({ onNext, onBack }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, ...getDraft(), name: localStorage.getItem('renewNickname')?.trim() || getDraft().name || '' }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyProfile().then((response) => {
      const profile = response?.data
      const health = profile?.healthProfile || {}
      setForm((current) => ({
        ...current,
        name: current.name || profile?.name || '',
        birthDate: current.birthDate || health.birthDate || '',
        gender: current.gender || health.gender || '',
        heightCm: current.heightCm || health.heightCm || '',
        weightKg: current.weightKg || health.weightKg || '',
        targetWeightKg: current.targetWeightKg || health.targetWeightKg || '',
        goal: current.goal || valueList(health.goals)[0] || '',
        activityLevel: current.activityLevel || health.activityLevel || 'LIGHT',
        availableExerciseDays: current.availableExerciseDays?.length ? current.availableExerciseDays : valueList(health.availableExerciseDays),
        availableExerciseMinutes: current.availableExerciseMinutes || health.availableExerciseMinutes || 30,
        dietaryPreferencesText: current.dietaryPreferencesText || listText(health.dietaryPreferences),
        dislikedFoodsText: current.dislikedFoodsText || listText(health.dislikedFoods),
        allergiesText: current.allergiesText || listText(health.allergies),
        medicalHistoryText: current.medicalHistoryText || valueList(health.injuries).map((injury) => typeof injury === 'string' ? injury : injury.description || injury.bodyPart).filter(Boolean).join(', '),
      }))
    }).catch(() => {})
  }, [])

  function updateField(name, value) { setForm((current) => ({ ...current, [name]: value })) }
  function toggleDay(day) { setForm((current) => ({ ...current, availableExerciseDays: current.availableExerciseDays.includes(day) ? current.availableExerciseDays.filter((value) => value !== day) : [...current.availableExerciseDays, day] })) }
  function canContinue() {
    if (step === 1) return Boolean(form.name.trim())
    if (step === 2) return Boolean(form.birthDate && form.gender)
    if (step === 3) return Number(form.heightCm) > 0 && Number(form.weightKg) > 0
    if (step === 4) return Boolean(form.goal)
    if (step === 5) return Number(form.targetWeightKg) > 0
    if (step === 6) return Boolean(form.activityLevel)
    if (step === 7) return form.availableExerciseDays.length > 0 && Number(form.availableExerciseMinutes) >= 5
    return true
  }
  function previous() { if (step > 1) setStep((current) => current - 1); else onBack?.() }
  async function next() {
    if (!canContinue()) return
    if (step < 8) { sessionStorage.setItem('onboardingDraft', JSON.stringify(form)); setStep((current) => current + 1); return }
    setIsSubmitting(true); setError('')
    const nickname = form.name.trim()
    const request = {
      name: nickname,
      birthDate: form.birthDate,
      gender: form.gender,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      goals: [form.goal],
      targetWeightKg: Number(form.targetWeightKg),
      activityLevel: form.activityLevel,
      availableExerciseDays: form.availableExerciseDays,
      availableExerciseMinutes: Number(form.availableExerciseMinutes),
      dietaryPreferences: splitList(form.dietaryPreferencesText),
      allergies: splitList(form.allergiesText),
      dislikedFoods: splitList(form.dislikedFoodsText),
      injuries: form.medicalHistoryText.trim() ? [{ bodyPart: 'GENERAL', description: form.medicalHistoryText.trim() }] : [],
    }
    try {
      await updateOnboarding(request)
      localStorage.setItem('renewNickname', nickname)
      sessionStorage.setItem('onboardingDraft', JSON.stringify(form))
      onNext?.(request)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '온보딩 정보를 저장하지 못했습니다.') } finally { setIsSubmitting(false) }
  }

  return <section className="goal-page">
    <header className="onboarding-header"><button type="button" className="goal-back-button" onClick={previous}>‹</button><div className="progress-track"><span className="progress-value" style={{ width: `${step / 9 * 100}%` }} /></div><span className="progress-text">{step} / 9</span></header>
    <div className="goal-step-content">
      {step === 1 && <><h1>반가워요!<br />앞으로 어떻게 불러드릴까요?</h1><p>나중에 바꿀 수 있어요</p><label className="line-input"><input value={form.name} maxLength={20} placeholder="이름을 입력해주세요" aria-label="이름" onChange={(event) => updateField('name', event.target.value)} autoFocus /></label></>}
      {step === 2 && <><h1>생년월일과 성별을 알려주세요<br />필요한 운동량을 계산할게요!</h1><label className="line-input"><span>생년월일</span><input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} /></label><div className="gender-options">{[['MALE', '남자'], ['FEMALE', '여자']].map(([value, label]) => <button type="button" className={form.gender === value ? 'selected' : ''} onClick={() => updateField('gender', value)} key={value}>{label}</button>)}</div></>}
      {step === 3 && <><h1>사용자님만을 위한 계획을 세울게요<br />먼저 키를 알려주세요</h1><label className="unit-input"><span>키</span><input type="number" min="1" step="0.1" value={form.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} /><b>cm</b></label><label className="unit-input"><span>몸무게</span><input type="number" min="1" step="0.1" value={form.weightKg} onChange={(event) => updateField('weightKg', event.target.value)} /><b>kg</b></label></>}
      {step === 4 && <><h1>무엇을 바꾸고 싶나요?</h1><div className="goal-list">{GOALS.map((goal) => <button type="button" className={`goal-option ${form.goal === goal.value ? 'selected' : ''}`} onClick={() => updateField('goal', goal.value)} key={goal.value}><span>{goal.label}</span>{form.goal === goal.value && <img src={checkIcon} alt="" />}</button>)}</div></>}
      {step === 5 && <><h1>목표 몸무게를 알려주세요</h1><p>현재 {form.weightKg || '-'}kg에서 원하는 목표를 입력해 주세요</p><label className="unit-input target"><span>목표 몸무게</span><input type="number" inputMode="decimal" min="1" max="500" step="0.1" value={form.targetWeightKg} placeholder="0" aria-label="목표 몸무게" onChange={(event) => updateField('targetWeightKg', event.target.value)} autoFocus /><b>kg</b></label></>}
      {step === 6 && <><h1>어떻게 운동하시나요?</h1><div className="activity-list">{ACTIVITY_LEVELS.map((level) => <button type="button" className={form.activityLevel === level.value ? 'selected' : ''} onClick={() => updateField('activityLevel', level.value)} key={level.value}><span><strong>{level.label}</strong><small>{level.detail}</small></span>{form.activityLevel === level.value && <img src={checkIcon} alt="" />}</button>)}</div></>}
      {step === 7 && <><h1>언제 운동 가능하세요?</h1><div className="weekday-list">{WEEKDAYS.map(([value, label]) => <button type="button" className={form.availableExerciseDays.includes(value) ? 'selected' : ''} onClick={() => toggleDay(value)} key={value}>{label}</button>)}</div><label className="minutes-field"><span>하루 운동 가능 시간</span><select value={form.availableExerciseMinutes} onChange={(event) => updateField('availableExerciseMinutes', event.target.value)}><option value="" disabled>시간 선택</option><option value="20">20분</option><option value="30">30분</option><option value="40">40분</option><option value="60">60분</option></select></label></>}
      {step === 8 && <><h1>주의해야할 사항 있을까요?</h1><p>쉼표로 여러 항목을 나눠 적을 수 있어요</p><div className="preference-fields"><label><span>선호 음식</span><input value={form.dietaryPreferencesText} onChange={(event) => updateField('dietaryPreferencesText', event.target.value)} placeholder="예: 한식, 고단백 식단" /></label><label><span>기피 음식</span><input value={form.dislikedFoodsText} onChange={(event) => updateField('dislikedFoodsText', event.target.value)} placeholder="예: 오이, 가지" /></label><label><span>알레르기</span><input value={form.allergiesText} onChange={(event) => updateField('allergiesText', event.target.value)} placeholder="예: 땅콩, 우유" /></label><label><span>병력</span><textarea value={form.medicalHistoryText} onChange={(event) => updateField('medicalHistoryText', event.target.value)} placeholder="예: 허리 디스크, 왼쪽 무릎 통증" /></label></div></>}
      {error && <p className="goal-error">{error}</p>}
    </div>
    <footer className="goal-actions"><button type="button" className="next-button" disabled={!canContinue() || isSubmitting} onClick={next}>{isSubmitting ? '저장 중…' : '다음'}</button></footer>
  </section>
}
