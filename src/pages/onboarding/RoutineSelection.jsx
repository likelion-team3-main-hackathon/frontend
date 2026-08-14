import { useMemo, useRef, useState } from 'react'
import {
  getRoutine,
  requestRoutineGeneration,
  waitForRoutineGeneration,
} from '../../api/routine'
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

export default function RoutineSelection({ analysis, onComplete }) {
  const abortControllerRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
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

  async function generateRoutine() {
    const selected = recommendations.filter((item) => selectedIds.has(item.id))
    if (selected.length === 0) {
      setError('식단 또는 운동 루틴을 하나 이상 선택해 주세요.')
      return
    }
    const meal = selected.find((item) => item.category === 'MEAL')
    const exercise = selected.find((item) => item.category === 'EXERCISE')
    const controller = new AbortController()
    abortControllerRef.current?.abort()
    abortControllerRef.current = controller
    setIsSubmitting(true)
    setStatus('선택한 추천안을 확인하고 있어요…')
    setError('')

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
      })
      const generationId = response?.data?.generationId
      if (!generationId) throw new Error('루틴 생성 작업 ID를 받지 못했습니다.')

      setStatus('AI가 선택한 식단·운동을 전체 일정으로 만들고 있어요…')
      const generation = await waitForRoutineGeneration(generationId, controller.signal)
      if (!generation.routineId) throw new Error('생성된 루틴 ID를 받지 못했습니다.')

      const routineResponse = await getRoutine(generation.routineId)
      onComplete?.(routineResponse?.data)
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError instanceof Error ? requestError.message : '루틴을 생성하지 못했습니다.')
      }
    } finally {
      setIsSubmitting(false)
      setStatus('')
    }
  }

  return (
    <section className="routine-selection-page">
      <div className="routine-selection-content">
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
        <button type="button" disabled={isSubmitting || !analysis?.id || selectedIds.size === 0} onClick={generateRoutine}>
          {isSubmitting ? '생성 중…' : '선택한 루틴 생성하기'}
        </button>
      </footer>
    </section>
  )
}
