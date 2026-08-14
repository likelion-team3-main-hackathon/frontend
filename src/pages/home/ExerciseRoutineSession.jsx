import { useMemo, useState } from 'react'
import exerciseIcon from '../../assets/icons/routine/exercise.png'
import ExerciseDetail from './ExerciseDetail'
import ExerciseWorkout from './ExerciseWorkout'
import './ExerciseRoutineSession.css'

const MOCK_EXERCISES = [
  { id: 'mock-ex-1', name: '덤벨 컬', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 20, restSeconds: 45 },
  { id: 'mock-ex-2', name: '오버헤드 프레스', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 12, restSeconds: 45 },
  { id: 'mock-ex-3', name: '해머 컬', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 7, restSeconds: 45 },
]

export default function ExerciseRoutineSession({ item, onDecision, onClose }) {
  const [exercises, setExercises] = useState(() => item.exercises?.length ? item.exercises : MOCK_EXERCISES)
  const [selectedId, setSelectedId] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isWorkingOut, setIsWorkingOut] = useState(false)
  const progressKey = `exercise-progress-${item.routineItemId || item.id}`
  const [savedProgress, setSavedProgress] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(progressKey) || 'null') } catch { return null }
  })
  const selected = exercises.find((exercise) => exercise.id === selectedId)
  const summary = useMemo(() => ({
    count: exercises.length,
    minutes: Math.max(1, Math.round(exercises.reduce((sum, exercise) => sum + exercise.sets * (exercise.targetValue + exercise.restSeconds) / 60, 0))),
    calories: exercises.length * 35,
  }), [exercises])

  if (isWorkingOut) return <ExerciseWorkout exercises={exercises} initialProgress={savedProgress} onExit={() => setIsWorkingOut(false)} onPartialSave={(progress) => {
    sessionStorage.setItem(progressKey, JSON.stringify(progress))
    setSavedProgress(progress)
    onClose?.()
  }} onFinish={async (result) => {
    setIsStarting(true)
    sessionStorage.removeItem(progressKey)
    await onDecision?.(item, 'completed', null, result)
    onClose?.()
  }} />

  if (selected) return <ExerciseDetail routineId={item.routineId} exercise={selected} onBack={() => setSelectedId(null)} onSave={(updated) => {
    setExercises((current) => current.map((exercise) => exercise.id === updated.id ? updated : exercise))
    setSelectedId(null)
  }} />

  return (
    <section className="exercise-session-page">
      <header><button type="button" onClick={onClose}>‹</button><h1>{item.routineTitle || item.title}</h1><small>수정</small></header>
      <div className="exercise-session-summary"><span><strong>{summary.count}</strong><small>동작</small></span><span><strong>{summary.minutes}</strong><small>분</small></span><span><strong>{summary.calories}</strong><small>kcal</small></span></div>
      <div className="exercise-session-list">
        {exercises.map((exercise, index) => <button type="button" key={exercise.id} onClick={() => setSelectedId(exercise.id)}><i className={index === 0 ? 'current' : ''} /><span><img src={exerciseIcon} alt="" /></span><div><strong>{exercise.name}</strong><small>{exercise.targetValue}{exercise.targetUnit === 'SECONDS' ? '초' : '회'} {exercise.sets}세트{exercise.weightKg ? ` · ${exercise.weightKg}kg` : ''}</small></div><b>›</b></button>)}
      </div>
      <button type="button" className="exercise-start-button" disabled={isStarting} onClick={() => setIsWorkingOut(true)}>▶　시작</button>
    </section>
  )
}
