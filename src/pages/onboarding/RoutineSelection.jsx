import { useMemo, useRef, useState } from 'react'
import {
  getRoutine,
  getRoutines,
  requestRoutineGeneration,
  waitForRoutineGeneration,
} from '../../api/routine'
import RoutineLoading from './RoutineLoading'
import './RoutineSelection.css'

const FALLBACK_RECOMMENDATIONS = [
  { id: 'MEAL_PRIMARY', category: 'MEAL', title: '균형 식단 3주', description: '영양 균형을 맞춘 하루 세 끼 식단', durationWeeks: 3, mealCountPerDay: 3, exerciseDaysPerWeek: 0, preferredExerciseTypes: [], tags: ['식단', '균형'], rationale: '온보딩 식습관을 반영한 기본 추천입니다.' },
  { id: 'MEAL_ALTERNATIVE', category: 'MEAL', title: '가벼운 식단 2주', description: '부담 없이 시작하는 식사 관리', durationWeeks: 2, mealCountPerDay: 3, exerciseDaysPerWeek: 0, preferredExerciseTypes: [], tags: ['식단', '초급'], rationale: '꾸준히 실천하기 쉬운 대안입니다.' },
  { id: 'EXERCISE_PRIMARY', category: 'EXERCISE', title: '맞춤 운동 3주', description: '건강 제약을 반영한 단계별 운동', durationWeeks: 3, mealCountPerDay: 0, exerciseDaysPerWeek: 3, preferredExerciseTypes: ['REHABILITATION', 'CORE'], tags: ['운동', '맞춤'], rationale: '온보딩 운동 목표를 반영한 기본 추천입니다.' },
  { id: 'EXERCISE_ALTERNATIVE', category: 'EXERCISE', title: '가벼운 활동 2주', description: '저강도로 시작하는 일상 활동', durationWeeks: 2, mealCountPerDay: 0, exerciseDaysPerWeek: 4, preferredExerciseTypes: ['WALKING'], tags: ['운동', '초급'], rationale: '부담을 줄인 대안입니다.' },
]

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function routineActivityKinds(routine) {
  const activities = (routine?.days || []).flatMap((day) => (day.sections || []))
    .flatMap((section) => section.exercises || [])
    .map((item) => item.activityType)
  return {
    hasMeal: activities.includes('MEAL'),
    hasExercise: activities.some((type) => type !== 'MEAL'),
  }
}

function isMealRecommendation(routine) {
  return routine?.category === 'MEAL'
    || routine?.type === 'MEAL'
    || Number(routine?.mealCountPerDay || 0) > 0
}

export default function RoutineSelection({ analysis, onComplete, onBack, onCancel, isReset = false }) {
  const abortControllerRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [resetPrompt, setResetPrompt] = useState(null)
  const hasAiRecommendations = Boolean(analysis?.routineRecommendations?.length)
  const recommendations = useMemo(
    () => analysis?.routineRecommendations?.length ? analysis.routineRecommendations : FALLBACK_RECOMMENDATIONS,
    [analysis],
  )
  const groups = [
    { category: 'MEAL', title: '식단 루틴', routines: recommendations.filter((item) => item.category === 'MEAL') },
    { category: 'EXERCISE', title: '운동·재활 루틴', routines: recommendations.filter((item) => item.category === 'EXERCISE') },
  ]

  function toggleRoutine(routine) {
    setSelectedIds((current) => {
      const next = new Set(current)
      const sameCategory = recommendations.filter((item) => item.category === routine.category)
      sameCategory.forEach((item) => next.delete(item.id))
      if (!current.has(routine.id)) next.add(routine.id)
      return next
    })
    setError('')
  }

  function confirmSelection() {
    const selected = recommendations.filter((item) => selectedIds.has(item.id))
    if (selected.length === 0) {
      setError('식단 또는 운동 루틴을 하나 이상 선택해 주세요.')
      return
    }
    if (isReset) {
      setResetPrompt({
        stage: selected.some(isMealRecommendation) ? 'meal' : 'exercise',
        hasMeal: selected.some(isMealRecommendation),
        hasExercise: selected.some((item) => !isMealRecommendation(item)),
      })
      return
    }
    generateRoutine('initial')
  }

  function confirmMealReplacement() {
    if (resetPrompt?.hasExercise) {
      setResetPrompt((current) => ({ ...current, stage: 'exercise', mealMode: 'meal-replace' }))
      return
    }
    generateRoutine('meal-replace')
  }

  function confirmExerciseMode(mode) {
    const mealMode = resetPrompt?.mealMode
    generateRoutine([mealMode, `exercise-${mode}`].filter(Boolean).join('_'))
  }

  async function generateRoutine(resetMode) {
    const selected = recommendations.filter((item) => selectedIds.has(item.id))
    setResetPrompt(null)
    const meal = selected.find((item) => item.category === 'MEAL')
    const exercise = selected.find((item) => item.category === 'EXERCISE')
    const controller = new AbortController()
    abortControllerRef.current?.abort()
    abortControllerRef.current = controller
    setIsSubmitting(true)
    setStatus('선택한 추천안을 확인하고 있어요…')
    setError('')

    try {
      let replacedRoutineIds = []
      let preservedRoutineIds = []
      if (isReset && resetMode.includes('replace')) {
        const replaceMeal = resetMode.includes('meal-replace')
        const replaceExercise = resetMode.includes('exercise-replace')
        const currentRoutines = await getRoutines()
        const currentList = currentRoutines?.data?.content || []
        const detailResults = await Promise.allSettled(currentList.map((item) => getRoutine(item.id)))
        detailResults.forEach((result, index) => {
          const id = currentList[index]?.id
          if (!id || result.status !== 'fulfilled') return
          const kinds = routineActivityKinds(result.value?.data)
          const shouldReplace = (replaceMeal && kinds.hasMeal)
            || (replaceExercise && kinds.hasExercise && !kinds.hasMeal)
          if (shouldReplace) replacedRoutineIds.push(id)
          else preservedRoutineIds.push(id)
        })
      }
      const response = await requestRoutineGeneration({
        analysisId: analysis?.id,
        startDate: today(),
        durationWeeks: Math.max(...selected.map((item) => item.durationWeeks)),
        mealCountPerDay: meal?.mealCountPerDay || 0,
        exerciseDaysPerWeek: exercise?.exerciseDaysPerWeek || 0,
        preferredExerciseTypes: [...new Set(exercise?.preferredExerciseTypes || [])],
        includeExpertContents: true,
        selectedRecommendationIds: hasAiRecommendations ? selected.map((item) => item.id) : [],
      })
      const generationId = response?.data?.generationId
      if (!generationId) throw new Error('루틴 생성 작업 ID를 받지 못했습니다.')

      setStatus('AI가 선택한 식단·운동을 전체 일정으로 만들고 있어요…')
      const generation = await waitForRoutineGeneration(generationId, controller.signal)
      if (!generation.routineId) throw new Error('생성된 루틴 ID를 받지 못했습니다.')

      const routineResponse = await getRoutine(generation.routineId)
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('renewHiddenRoutineIds') || '[]').map(String))
      hiddenIds.delete(String(generation.routineId))
      if (replacedRoutineIds.length) {
        preservedRoutineIds.forEach((id) => hiddenIds.delete(String(id)))
        replacedRoutineIds.forEach((id) => {
          if (String(id) !== String(generation.routineId)) hiddenIds.add(String(id))
        })
      }
      localStorage.setItem('renewHiddenRoutineIds', JSON.stringify([...hiddenIds]))
      sessionStorage.setItem('latestGeneratedRoutineId', String(generation.routineId))
      onComplete?.(routineResponse?.data, resetMode)
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError instanceof Error ? requestError.message : '루틴을 생성하지 못했습니다.')
      }
    } finally {
      setIsSubmitting(false)
      setStatus('')
    }
  }

  if (isSubmitting) return <RoutineLoading message={'선택한 루틴으로\n일정을 구성하고 있어요'} />

  return (
    <section className="routine-selection-page">
      <div className="routine-selection-content">
        <button type="button" className="routine-selection-back" onClick={onBack} aria-label="직전 페이지로 돌아가기">‹</button>
        <h1>추천 루틴</h1>
        <p className="routine-selection-intro">식단과 운동을 각각 하나씩 고르거나, 필요한 유형만 선택할 수 있어요</p>

        {groups.map((group) => (
          <section className="routine-group" key={group.category}>
            <h2>{group.title}</h2>
            <div className="routine-card-slider" aria-label={`${group.title} 목록`}>
              {group.routines.map((routine) => {
                const isSelected = selectedIds.has(routine.id)
                const frequency = routine.category === 'MEAL'
                  ? `하루 ${routine.mealCountPerDay}끼`
                  : `주 ${routine.exerciseDaysPerWeek}회`

                return (
                  <button
                    className={`routine-option-card ${isSelected ? 'selected' : ''}`}
                    key={routine.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => toggleRoutine(routine)}
                  >
                    <span className="routine-card-type">{routine.category === 'MEAL' ? '식단' : '운동'}</span>
                    <span className="routine-selected-mark" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                    <strong>{routine.title}</strong>
                    <small>{routine.durationWeeks}주 · {frequency}</small>
                    <span className="routine-tags">
                      {(routine.tags || []).map((tag) => <em key={tag}>{tag}</em>)}
                    </span>
                    <p>{routine.description}</p>
                    <p className="routine-rationale">추천 이유 · {routine.rationale}</p>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {status && <p className="routine-generation-status">{status}</p>}
        {error && <p className="routine-generation-error" role="alert">{error}</p>}
      </div>

      <footer className="routine-selection-actions">
        <small>{selectedIds.size ? `${selectedIds.size}개 선택됨` : '추천 루틴을 선택해 주세요'}</small>
        <button type="button" disabled={isSubmitting || !analysis?.id || selectedIds.size === 0} onClick={confirmSelection}>
          이대로 할게요
        </button>
        <button type="button" className="routine-selection-cancel" onClick={onCancel}>취소</button>
      </footer>

      {resetPrompt && (
        <div className="routine-reset-modal-backdrop" role="presentation" onClick={() => setResetPrompt(null)}>
          <section className="routine-reset-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>{resetPrompt.stage === 'meal' ? '식단 루틴은 변경만 가능해요' : '운동 루틴을 어떻게 적용할까요?'}</h2>
            <p>{resetPrompt.stage === 'meal'
              ? '해당 루틴은 식단이 겹쳐 다른 루틴들과 합쳐질 수 없습니다. 기존 식단 루틴을 선택한 루틴으로 변경하시겠습니까?'
              : '현재 운동 루틴에 새 루틴을 추가하거나, 기존 운동 루틴을 선택한 루틴으로 변경할 수 있어요.'}</p>
            <div>
              {resetPrompt.stage === 'exercise' ? (
                <>
                  <button type="button" onClick={() => confirmExerciseMode('add')}>운동 추가</button>
                  <button type="button" className="primary" onClick={() => confirmExerciseMode('replace')}>운동 변경</button>
                </>
              ) : (
                <button type="button" className="primary" onClick={confirmMealReplacement}>식단 변경</button>
              )}
              {resetPrompt.stage === 'meal' && <button type="button" onClick={() => setResetPrompt(null)}>취소</button>}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
