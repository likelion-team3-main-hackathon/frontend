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
  const [existingRoutines, setExistingRoutines] = useState(null)
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(false)
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
        mealTargetIds: [],
        exerciseTargetIds: [],
      })
      return
    }
    generateRoutine('initial', {})
  }

  async function loadExistingRoutines() {
    if (existingRoutines) return existingRoutines
    setIsLoadingRoutines(true)
    try {
      const currentRoutines = await getRoutines()
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('renewHiddenRoutineIds') || '[]').map(String))
      const currentList = (currentRoutines?.data?.content || [])
        .filter((item) => item.status === 'ACTIVE')
        .filter((item) => !hiddenIds.has(String(item.id)))
      const detailResults = await Promise.allSettled(currentList.map((item) => getRoutine(item.id)))
      const list = detailResults
        .map((result, index) => {
          const item = currentList[index]
          if (!item || result.status !== 'fulfilled') return null
          return { id: item.id, title: item.title, ...routineActivityKinds(result.value?.data) }
        })
        .filter(Boolean)
      setExistingRoutines(list)
      return list
    } catch {
      setError('기존 루틴 목록을 불러오지 못했습니다.')
      return []
    } finally {
      setIsLoadingRoutines(false)
    }
  }

  async function openMealPicker() {
    const list = await loadExistingRoutines()
    const candidates = list.filter((item) => item.hasMeal)
    setResetPrompt((current) => ({ ...current, stage: 'meal-pick', mealCandidates: candidates }))
  }

  function toggleMealTarget(id) {
    setResetPrompt((current) => {
      const set = new Set(current.mealTargetIds)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...current, mealTargetIds: [...set] }
    })
  }

  function proceedAfterMeal(mealTargetIds) {
    if (resetPrompt?.hasExercise) {
      setResetPrompt((current) => ({ ...current, stage: 'exercise', mealMode: 'meal-replace', mealTargetIds }))
      return
    }
    generateRoutine('meal-replace', { mealTargetIds })
  }

  async function chooseExerciseAdd() {
    generateRoutine([resetPrompt?.mealMode, 'exercise-add'].filter(Boolean).join('_'), {
      mealTargetIds: resetPrompt?.mealTargetIds || [],
    })
  }

  async function openExercisePicker() {
    const list = await loadExistingRoutines()
    const candidates = list.filter((item) => item.hasExercise)
    setResetPrompt((current) => ({ ...current, stage: 'exercise-pick', exerciseCandidates: candidates }))
  }

  function toggleExerciseTarget(id) {
    setResetPrompt((current) => {
      const set = new Set(current.exerciseTargetIds)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...current, exerciseTargetIds: [...set] }
    })
  }

  function confirmExerciseTargets(exerciseTargetIds) {
    const ids = exerciseTargetIds ?? resetPrompt.exerciseTargetIds
    generateRoutine([resetPrompt?.mealMode, 'exercise-replace'].filter(Boolean).join('_'), {
      mealTargetIds: resetPrompt?.mealTargetIds || [],
      exerciseTargetIds: ids,
    })
  }

  async function generateRoutine(resetMode, targets) {
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

    const replacedMealRoutineIds = targets?.mealTargetIds || []
    const replacedExerciseRoutineIds = targets?.exerciseTargetIds || []

    try {
      const response = await requestRoutineGeneration({
        analysisId: analysis?.id,
        startDate: today(),
        durationWeeks: Math.max(...selected.map((item) => item.durationWeeks)),
        mealCountPerDay: meal?.mealCountPerDay || 0,
        exerciseDaysPerWeek: exercise?.exerciseDaysPerWeek || 0,
        preferredExerciseTypes: [...new Set(exercise?.preferredExerciseTypes || [])],
        includeExpertContents: true,
        selectedRecommendationIds: hasAiRecommendations ? selected.map((item) => item.id) : [],
        replacedMealRoutineIds,
        replacedExerciseRoutineIds,
      })
      const generationId = response?.data?.generationId
      if (!generationId) throw new Error('루틴 생성 작업 ID를 받지 못했습니다.')

      setStatus('AI가 선택한 식단·운동을 전체 일정으로 만들고 있어요…')
      const generation = await waitForRoutineGeneration(generationId, controller.signal)
      if (!generation.routineId) throw new Error('생성된 루틴 ID를 받지 못했습니다.')

      const routineResponse = await getRoutine(generation.routineId)
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('renewHiddenRoutineIds') || '[]').map(String))
      hiddenIds.delete(String(generation.routineId))
      // 대상 루틴이 이번 요청으로 식단·운동 양쪽 다 비워질 때만(원래 없던 쪽은 자동으로 "비워진" 것으로 간주)
      // 홈 화면에서 완전히 숨긴다. 한쪽만 교체된 MIXED 루틴은 나머지 활동이 남아있으므로 계속 보여준다.
      const fullyReplacedIds = [...new Set([...replacedMealRoutineIds, ...replacedExerciseRoutineIds])]
        .filter((id) => {
          const info = existingRoutines?.find((item) => item.id === id)
          const mealGone = !info || !info.hasMeal || replacedMealRoutineIds.includes(id)
          const exerciseGone = !info || !info.hasExercise || replacedExerciseRoutineIds.includes(id)
          return mealGone && exerciseGone
        })
      fullyReplacedIds.forEach((id) => {
        if (String(id) !== String(generation.routineId)) hiddenIds.add(String(id))
      })
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
        <p className="routine-selection-intro">진단 · 목표 · 생활을 반영해 골랐어요</p>

        {groups.map((group) => (
          <section className="routine-group" key={group.category}>
            <h2>{group.title}</h2>
            <div className="routine-card-slider" aria-label={`${group.title} 목록`}>
              {group.routines.map((routine) => {
                const isSelected = selectedIds.has(routine.id)

                return (
                  <button
                    className={`routine-option-card ${isSelected ? 'selected' : ''}`}
                    key={routine.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => toggleRoutine(routine)}
                  >
                    <span className="routine-card-image">이미지</span>
                    <span className="routine-selected-mark" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                    <strong>{routine.title}</strong>
                    <span className="routine-tags">
                      {(routine.tags || []).map((tag, index) => <em className={index === 0 ? 'category' : 'detail'} key={tag}>{tag}</em>)}
                    </span>
                    <p className="routine-rationale">{routine.rationale}</p>
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
            {(resetPrompt.stage === 'meal' || resetPrompt.stage === 'exercise') && (
              <>
                <h2>{resetPrompt.stage === 'meal' ? '식단 루틴은 변경만 가능해요' : '운동 루틴을 어떻게 적용할까요?'}</h2>
                <p>{resetPrompt.stage === 'meal'
                  ? '해당 루틴은 식단이 겹쳐 다른 루틴들과 합쳐질 수 없습니다. 기존 식단 루틴을 선택한 루틴으로 변경하시겠습니까?'
                  : '현재 운동 루틴에 새 루틴을 추가하거나, 기존 운동 루틴을 선택한 루틴으로 변경할 수 있어요.'}</p>
                <div>
                  {resetPrompt.stage === 'exercise' ? (
                    <>
                      <button type="button" disabled={isLoadingRoutines} onClick={chooseExerciseAdd}>운동 추가</button>
                      <button type="button" className="primary" disabled={isLoadingRoutines} onClick={openExercisePicker}>운동 변경</button>
                    </>
                  ) : (
                    <button type="button" className="primary" disabled={isLoadingRoutines} onClick={openMealPicker}>식단 변경</button>
                  )}
                  {resetPrompt.stage === 'meal' && <button type="button" onClick={() => setResetPrompt(null)}>취소</button>}
                </div>
              </>
            )}

            {(resetPrompt.stage === 'meal-pick' || resetPrompt.stage === 'exercise-pick') && (() => {
              const isMealStage = resetPrompt.stage === 'meal-pick'
              const candidates = isMealStage ? resetPrompt.mealCandidates : resetPrompt.exerciseCandidates
              const targetIds = isMealStage ? resetPrompt.mealTargetIds : resetPrompt.exerciseTargetIds
              const toggle = isMealStage ? toggleMealTarget : toggleExerciseTarget
              const goBack = () => setResetPrompt((current) => ({ ...current, stage: isMealStage ? 'meal' : 'exercise' }))
              const proceedEmpty = () => (isMealStage ? proceedAfterMeal([]) : confirmExerciseTargets([]))
              return (
                <>
                  <h2>어떤 루틴을 변경할까요?</h2>
                  {candidates.length === 0 ? (
                    <p>교체할 수 있는 기존 루틴이 없어요. 새 루틴으로 추가할게요.</p>
                  ) : (
                    <>
                      <p>선택한 루틴{isMealStage ? '의 식단' : '의 운동'} 부분이 새 루틴으로 교체돼요. 하나 이상 골라 주세요.</p>
                      <ul className="routine-target-list">
                        {candidates.map((item) => {
                          const isMixed = item.hasMeal && item.hasExercise
                          return (
                            <li key={item.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={targetIds.includes(item.id)}
                                  onChange={() => toggle(item.id)}
                                />
                                {item.title}
                                {isMixed && (
                                  <small> (이 루틴은 식단·운동을 함께 포함해요. {isMealStage ? '식단' : '운동'} 부분만 교체돼요)</small>
                                )}
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                  <div>
                    <button type="button" onClick={goBack}>뒤로</button>
                    {candidates.length === 0 ? (
                      <button type="button" className="primary" onClick={proceedEmpty}>새 루틴으로 추가하기</button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        disabled={targetIds.length === 0}
                        onClick={() => (isMealStage ? proceedAfterMeal(targetIds) : confirmExerciseTargets(targetIds))}
                      >
                        선택 완료
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </section>
        </div>
      )}
    </section>
  )
}
