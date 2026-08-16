import { useState } from 'react'
import { updateRoutineExercise } from '../../api/routine'

function Stepper({ label, value, unit, step, onChange, disabled = false }) {
  return <div className="exercise-setting-row"><span>{label}</span><div><button type="button" disabled={disabled} onClick={() => onChange(Math.max(0, value - step))}>−</button><strong>{value} {unit}</strong><button type="button" disabled={disabled} onClick={() => onChange(value + step)}>＋</button></div></div>
}

export default function ExerciseDetail({ routineId, exercise, onBack, onSave, readOnly = false }) {
  const [targetValue, setTargetValue] = useState(Number(exercise.targetValue || 0))
  const [sets, setSets] = useState(Number(exercise.sets || 1))
  const [weightKg, setWeightKg] = useState(Number(exercise.weightKg || 0))
  const [restSeconds, setRestSeconds] = useState(Number(exercise.restSeconds || 0))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setIsSaving(true)
    setError('')
    const updated = { ...exercise, targetValue, sets, weightKg, restSeconds }
    try {
      if (routineId && Number.isFinite(Number(exercise.exerciseId))) {
        await updateRoutineExercise(routineId, exercise.exerciseId, {
          targetValue,
          targetUnit: exercise.targetUnit || 'REPETITIONS',
          sets,
          restSeconds,
          memo: weightKg ? `중량 ${weightKg}kg` : undefined,
          excludeFromAiAdjustment: true,
        })
      }
      onSave(updated)
    } catch (requestError) {
      setError(requestError.message || '운동 설정을 저장하지 못했어요.')
      setIsSaving(false)
    }
  }

  return (
    <section className="exercise-detail-page">
      <header><button type="button" onClick={onBack}>‹</button><h1>{exercise.name}</h1><small>{readOnly ? '상세 정보' : '사용자 설정'}</small></header>
      <div className="exercise-video-placeholder">동작 영상<br /><small>추후 제공 예정</small></div>
      <div className="exercise-setting-card">
        <Stepper disabled={readOnly} label="횟수" value={targetValue} unit={exercise.targetUnit === 'SECONDS' ? '초' : '회'} step={1} onChange={setTargetValue} />
        <Stepper disabled={readOnly} label="세트" value={sets} unit="세트" step={1} onChange={setSets} />
        <Stepper disabled={readOnly} label="중량" value={weightKg} unit="kg" step={1} onChange={setWeightKg} />
        <Stepper disabled={readOnly} label="세트 간 휴식" value={restSeconds} unit="초" step={15} onChange={setRestSeconds} />
      </div>
      <p className="exercise-tip"><strong>연구원 제안</strong><br />자세는 유지하면서 무리하지 않는 범위에서 수행해주세요.</p>
      {error && <p className="exercise-save-error">{error}</p>}
      <button type="button" className="exercise-save-button" disabled={!readOnly && isSaving} onClick={readOnly ? onBack : save}>{readOnly ? '돌아가기' : isSaving ? '저장 중…' : `${targetValue}${exercise.targetUnit === 'SECONDS' ? '초' : '회'} ${sets}세트로 저장`}</button>
    </section>
  )
}
