import './RoutineSession.css'
import MealRoutineSession from './MealRoutineSession'
import ExerciseRoutineSession from './ExerciseRoutineSession'

function isMeal(item) {
  return item?.activityType === 'MEAL' || ['아침', '점심', '저녁', '끼니', '식단'].some((word) => item?.type?.includes(word))
}

export default function RoutineSession({ item, onDecision, onClose, viewOnly = false }) {
  if (!item) return null
  if (isMeal(item)) return <MealRoutineSession item={item} onDecision={onDecision} onClose={onClose} viewOnly={viewOnly} />
  return <ExerciseRoutineSession item={item} onDecision={onDecision} onClose={onClose} viewOnly={viewOnly} />
}
