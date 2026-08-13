import { useState } from 'react'
import './RoutineSelection.css'
import { routineRecommendationGroups } from '../../mocks/routineRecommendations'

export default function RoutineSelection({ onComplete }) {
  const [selectedRoutine, setSelectedRoutine] = useState('metabolic-4')

  return (
    <section className="routine-selection-page">

      <div className="routine-selection-content">
        <h1>추천 루틴</h1>
        <p className="routine-selection-intro">진단 · 목표 · 생활습관 반영해 골랐어요</p>

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
                    onClick={() => setSelectedRoutine(routine.id)}
                  >
                    <div className="routine-card-image" aria-hidden="true">이미지</div>
                    <span className="routine-selected-mark" aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
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
      </div>

      <footer className="routine-selection-actions">
        <button type="button" onClick={onComplete}>이대로 할게요</button>
      </footer>
    </section>
  )
}
