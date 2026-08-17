import { useEffect, useMemo, useState } from 'react'
import { addRoutineExercise, deleteRoutineExercise, updateRoutineExerciseOrder } from '../../api/routine'
import exerciseIcon from '../../assets/icons/routine/exercise.png'
import ExerciseDetail from './ExerciseDetail'
import ExerciseWorkout from './ExerciseWorkout'
import './ExerciseRoutineSession.css'

const MOCK_EXERCISES = [
  { id: 'mock-ex-1', name: '덤벨 컬', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 20, restSeconds: 45 },
  { id: 'mock-ex-2', name: '오버헤드 프레스', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 12, restSeconds: 45 },
  { id: 'mock-ex-3', name: '해머 컬', targetValue: 12, targetUnit: 'REPETITIONS', sets: 3, weightKg: 7, restSeconds: 45 },
]

export default function ExerciseRoutineSession({ item, onDecision, onClose, viewOnly = false }) {
  const [exercises, setExercises] = useState(() => item.exercises?.length ? item.exercises : MOCK_EXERCISES)
  const [selectedId, setSelectedId] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isWorkingOut, setIsWorkingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [deletedExerciseIds, setDeletedExerciseIds] = useState([])
  const [isSavingList, setIsSavingList] = useState(false)
  const [listError, setListError] = useState('')
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [isToastExiting, setIsToastExiting] = useState(false)
  const progressKey = `exercise-progress-${item.routineItemId || item.id}`
  const [savedProgress, setSavedProgress] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(progressKey) || 'null') } catch { return null }
  })
  const selected = exercises.find((exercise) => exercise.id === selectedId)
  const summary = useMemo(() => {
    const minutes = Math.max(1, Math.round(exercises.reduce((sum, exercise) => {
      const activeSeconds = exercise.targetUnit === 'MINUTES'
        ? Number(exercise.targetValue || 0) * 60
        : exercise.targetUnit === 'SECONDS' ? Number(exercise.targetValue || 0) : Number(exercise.targetValue || 0) * 3
      return sum + Number(exercise.sets || 1) * (activeSeconds + Number(exercise.restSeconds || 0)) / 60
    }, 0)))
    return { count: exercises.length, minutes, calories: Math.max(0, Math.round(minutes * 7.5)) }
  }, [exercises])

  useEffect(() => {
    if (!showSavedToast) return undefined
    setIsToastExiting(false)
    const exitTimer = window.setTimeout(() => setIsToastExiting(true), 4500)
    const hideTimer = window.setTimeout(() => setShowSavedToast(false), 5000)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(hideTimer)
    }
  }, [showSavedToast])

  function moveExercise(index, direction) {
    const target = index + direction
    if (target < 0 || target >= exercises.length) return
    setExercises((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeExercise(exercise) {
    if (!exercise.isManual && Number.isFinite(Number(exercise.exerciseId))) {
      setDeletedExerciseIds((current) => [...new Set([...current, Number(exercise.exerciseId)])])
    }
    setExercises((current) => current.filter((item) => item.id !== exercise.id))
  }

  function addManualExercise(event) {
    event.preventDefault()
    if (!newExerciseName.trim()) return
    const fallbackSectionId = exercises.at(-1)?.sectionId || exercises[0]?.sectionId
    setExercises((current) => [...current, {
      id: `manual-${crypto.randomUUID()}`,
      exerciseId: null,
      isManual: true,
      name: newExerciseName.trim(),
      activityType: 'EXERCISE',
      sectionId: fallbackSectionId,
      sectionType: exercises.at(-1)?.sectionType || 'MAIN_EXERCISE',
      sectionTitle: exercises.at(-1)?.sectionTitle || '본 운동',
      targetValue: 12,
      targetUnit: 'REPETITIONS',
      sets: 3,
      restSeconds: 45,
      weightKg: 0,
    }])
    setNewExerciseName('')
    setIsAdding(false)
  }

  async function saveExerciseList() {
    setIsSavingList(true)
    setListError('')
    try {
      await Promise.all(deletedExerciseIds.map((exerciseId) => deleteRoutineExercise(item.routineId, exerciseId)))
      const nextExercises = [...exercises]
      for (let index = 0; index < nextExercises.length; index += 1) {
        const exercise = nextExercises[index]
        if (!exercise.isManual) continue
        if (!exercise.sectionId) throw new Error('운동을 추가할 구간 정보를 찾지 못했어요.')
        const response = await addRoutineExercise(item.routineId, exercise.sectionId, {
          name: exercise.name,
          order: index + 1,
          targetValue: Number(exercise.targetValue || 12),
          targetUnit: exercise.targetUnit || 'REPETITIONS',
          sets: Number(exercise.sets || 1),
          restSeconds: Number(exercise.restSeconds || 0),
          memo: exercise.weightKg ? `중량 ${exercise.weightKg}kg` : undefined,
          excludeFromAiAdjustment: true,
        })
        const exerciseId = response?.data?.exerciseId
        nextExercises[index] = { ...exercise, id: exerciseId || exercise.id, exerciseId: exerciseId || null, isManual: !exerciseId }
      }

      const sectionGroups = nextExercises.reduce((groups, exercise) => {
        if (!exercise.sectionId || !Number.isFinite(Number(exercise.exerciseId))) return groups
        const key = String(exercise.sectionId)
        groups[key] = [...(groups[key] || []), Number(exercise.exerciseId)]
        return groups
      }, {})
      await Promise.all(Object.entries(sectionGroups).map(([sectionId, exerciseIds]) => updateRoutineExerciseOrder(item.routineId, sectionId, exerciseIds)))
      setExercises(nextExercises)
      setDeletedExerciseIds([])
      setIsEditing(false)
      setShowSavedToast(true)
    } catch (requestError) {
      setListError(requestError.message || '운동 루틴을 저장하지 못했어요.')
    } finally {
      setIsSavingList(false)
    }
  }

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

  if (selected) return <ExerciseDetail readOnly={viewOnly} routineId={item.routineId} exercise={selected} onBack={() => setSelectedId(null)} onSave={(updated) => {
    setExercises((current) => current.map((exercise) => exercise.id === updated.id ? updated : exercise))
    setSelectedId(null)
  }} />

  return (
    <section className="exercise-session-page">
      <header><button type="button" onClick={onClose}>‹</button><h1>{item.dayNumber ? `${item.dayNumber}일차 ` : ''}{item.routineTitle || item.title}</h1>{!viewOnly && (isEditing ? <button type="button" className="exercise-edit-save" disabled={isSavingList} onClick={saveExerciseList}>{isSavingList ? '저장 중…' : '저장하기'}</button> : <button type="button" className="exercise-edit-toggle" onClick={() => setIsEditing(true)}>수정</button>)}</header>
      <div className="exercise-session-summary"><span><strong>{summary.count}</strong><small>동작</small></span><span><strong>{summary.minutes}</strong><small>분</small></span><span><strong>{summary.calories}</strong><small>kcal</small></span></div>
      <div className="exercise-session-list">
        {exercises.map((exercise, index) => <article className="exercise-session-item" key={exercise.id}><i className={index === 0 ? 'current' : ''} /><button type="button" className="exercise-item-main" onClick={() => !isEditing && setSelectedId(exercise.id)}><span><img src={exerciseIcon} alt="" /></span><div><strong>{exercise.name}</strong><small>{exercise.targetValue}{exercise.targetUnit === 'SECONDS' ? '초' : exercise.targetUnit === 'MINUTES' ? '분' : '회'} {exercise.sets}세트{exercise.weightKg ? ` · ${exercise.weightKg}kg` : ''}</small></div></button>{isEditing ? <div className="exercise-order-actions"><button type="button" disabled={index === exercises.length - 1} onClick={() => moveExercise(index, 1)} aria-label="아래로 이동">↓</button><button type="button" disabled={index === 0} onClick={() => moveExercise(index, -1)} aria-label="위로 이동">↑</button><button type="button" onClick={() => removeExercise(exercise)} aria-label="운동 삭제">×</button><button type="button" onClick={() => setSelectedId(exercise.id)} aria-label="운동 상세 설정">›</button></div> : <b>›</b>}</article>)}
      </div>
      {isEditing && (isAdding ? <form className="exercise-add-form" onSubmit={addManualExercise}><input value={newExerciseName} onChange={(event) => setNewExerciseName(event.target.value)} placeholder="추가할 운동 이름" autoFocus /><button type="button" onClick={() => setIsAdding(false)}>취소</button><button type="submit">추가</button></form> : <button type="button" className="exercise-add-button" onClick={() => setIsAdding(true)}>＋ 운동 추가하기</button>)}
      {listError && <p className="exercise-list-error">{listError}</p>}
      {!isEditing && <button type="button" className="exercise-start-button" disabled={!viewOnly && isStarting} onClick={viewOnly ? onClose : () => setIsWorkingOut(true)}>{viewOnly ? '확인' : '▶　시작'}</button>}
      {showSavedToast && <div className={`exercise-saved-toast ${isToastExiting ? 'exiting' : ''}`}><span>!</span>루틴이 저장되었어요!</div>}
    </section>
  )
}
