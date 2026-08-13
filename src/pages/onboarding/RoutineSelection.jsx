import { useRef, useState } from 'react'
import {
  getRoutine,
  requestRoutineGeneration,
  waitForRoutineGeneration,
} from '../../api/routine'
import { routineRecommendationGroups } from '../../mocks/routineRecommendations'
import './RoutineSelection.css'

const ROUTINE_OPTIONS = {
  'metabolic-4': { durationWeeks: 4, exerciseDaysPerWeek: 4, preferredExerciseTypes: ['WALKING', 'STRENGTH'] },
  'core-rehab': { durationWeeks: 3, exerciseDaysPerWeek: 3, preferredExerciseTypes: ['REHABILITATION', 'CORE'] },
  'light-cardio': { durationWeeks: 2, exerciseDaysPerWeek: 5, preferredExerciseTypes: ['WALKING'] },
  'core-4': { durationWeeks: 4, exerciseDaysPerWeek: 3, preferredExerciseTypes: ['REHABILITATION', 'CORE'] },
  'core-stable': { durationWeeks: 3, exerciseDaysPerWeek: 3, preferredExerciseTypes: ['CORE'] },
  'stretch-2': { durationWeeks: 2, exerciseDaysPerWeek: 7, preferredExerciseTypes: ['STRETCHING'] },
}

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export default function RoutineSelection({ analysisId, onComplete }) {
  const abortControllerRef = useRef(null)
  const [selectedRoutine, setSelectedRoutine] = useState('metabolic-4')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function generateRoutine() {
    const option = ROUTINE_OPTIONS[selectedRoutine]
    const controller = new AbortController()
    abortControllerRef.current?.abort()
    abortControllerRef.current = controller
    setIsSubmitting(true)
    setStatus('루틴 생성 요청 중…')
    setError('')

    try {
      const response = await requestRoutineGeneration({
        analysisId,
        startDate: today(),
        durationWeeks: option.durationWeeks,
        mealCountPerDay: 3,
        exerciseDaysPerWeek: option.exerciseDaysPerWeek,
        preferredExerciseTypes: option.preferredExerciseTypes,
        includeExpertContents: true,
      })
      const generationId = response?.data?.generationId
      if (!generationId) throw new Error('루틴 생성 작업 ID를 받지 못했습니다.')

      setStatus('AI가 운동·재활·식단 루틴을 구성하고 있어요…')
      const generation = await waitForRoutineGeneration(generationId, controller.signal)
      if (!generation.routineId) throw new Error('생성된 루틴 ID를 받지 못했습니다.')

      const routineResponse = await getRoutine(generation.routineId)
      onComplete?.(routineResponse?.data)
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(
          requestError instanceof Error
            ? requestError.message
            : '루틴을 생성하지 못했습니다.',
        )
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
        <p className="routine-selection-intro">진단 · 목표 · 생활습관을 반영해 생성해요</p>

        {routineRecommendationGroups.map((group) => (
          <section className="routine-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="routine-card-slider" aria-label={`${group.title} 루틴 목록`}>
              {group.routines.map((routine) => {
                const isSelected = routine.id === selectedRoutine

                return (
                  <button
                    className={`routine-option-card ${isSelected ? 'selected' : ''}`}
                    key={routine.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedRoutine(routine.id)}
                  >
                    <div className="routine-card-image" aria-hidden="true">이미지</div>
                    <span className="routine-selected-mark" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                    <strong>{routine.title}</strong>
                    <small>{routine.duration}</small>
                    <span className="routine-tags">
                      {routine.tags.map((tag) => <em key={tag}>{tag}</em>)}
                    </span>
                    <p>{routine.description}</p>
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
        <button type="button" disabled={isSubmitting || !analysisId} onClick={generateRoutine}>
          {isSubmitting ? '생성 중…' : '이대로 생성할게요'}
        </button>
      </footer>
    </section>
  )
}
