import { useMemo, useState } from 'react'
import MealRoutineSession from './MealRoutineSession'
import './MealDaySession.css'

const MEAL_ORDER = ['아침', '점심', '저녁', '간식']

function totalsFor(meal) {
  const foods = meal.foods || meal.details?.foods || []
  if (foods.length) {
    return foods.reduce((total, food) => ({
      calories: total.calories + Number(food.calories || 0),
      carbs: total.carbs + Number(food.carbs || 0),
      protein: total.protein + Number(food.protein || 0),
      fat: total.fat + Number(food.fat || 0),
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 })
  }
  return {
    calories: Number(meal.details?.calories || String(meal.detail || '').replace(/[^0-9.]/g, '') || 0),
    carbs: Number(meal.details?.carbs || 0),
    protein: Number(meal.details?.protein || 0),
    fat: Number(meal.details?.fat || 0),
  }
}

function sortMeals(meals) {
  return [...meals].sort((left, right) => {
    const leftOrder = MEAL_ORDER.findIndex((name) => left.type?.includes(name))
    const rightOrder = MEAL_ORDER.findIndex((name) => right.type?.includes(name))
    return (leftOrder < 0 ? 99 : leftOrder) - (rightOrder < 0 ? 99 : rightOrder)
  })
}

export default function MealDaySession({ item, onDecision, onClose, viewOnly = false }) {
  const [meals, setMeals] = useState(() => sortMeals(item.dayMeals?.length ? item.dayMeals : [item]))
  const [selectedMealId, setSelectedMealId] = useState(null)
  const selectedMeal = meals.find((meal) => String(meal.id) === String(selectedMealId))

  const dayTotals = useMemo(() => meals.reduce((total, meal) => {
    const mealTotals = totalsFor(meal)
    return {
      calories: total.calories + mealTotals.calories,
      carbs: total.carbs + mealTotals.carbs,
      protein: total.protein + mealTotals.protein,
      fat: total.fat + mealTotals.fat,
    }
  }, { calories: 0, carbs: 0, protein: 0, fat: 0 }), [meals])

  if (selectedMeal) {
    return <MealRoutineSession
      item={selectedMeal}
      viewOnly={viewOnly}
      dayView
      onDecision={onDecision}
      onClose={() => setSelectedMealId(null)}
      onMealUpdated={(updatedMeal) => setMeals((current) => current.map((meal) => String(meal.id) === String(updatedMeal.id) ? updatedMeal : meal))}
    />
  }

  function addSnack() {
    const snack = {
      ...item,
      id: `snack-${item.scheduledDate}-${crypto.randomUUID()}`,
      routineItemId: null,
      routineItemIds: [],
      type: '간식',
      title: '추가한 간식',
      detail: '0 kcal',
      foods: [],
      details: { foods: [] },
      isManualMeal: true,
    }
    setMeals((current) => [...current, snack])
    setSelectedMealId(snack.id)
  }

  return (
    <section className="meal-day-page">
      <header className="meal-day-header">
        <button type="button" onClick={onClose} aria-label="뒤로 가기">‹</button>
        <h1>{item.routineTitle || '식단 루틴'} {item.dayNumber || 1}일차</h1>
      </header>

      <div className="meal-day-list">
        {meals.map((meal) => {
          const totals = totalsFor(meal)
          return (
            <button type="button" className="meal-day-card" key={meal.id} onClick={() => setSelectedMealId(meal.id)}>
              <div><strong>{meal.type || '식사'}</strong><span>›</span></div>
              <div><b>{totals.calories.toLocaleString()} kcal</b><small>탄 {totals.carbs}　단 {totals.protein}　지 {totals.fat}</small></div>
            </button>
          )
        })}
      </div>

      <div className="meal-day-total">
        <strong>합계 {dayTotals.calories.toLocaleString()} kcal</strong>
        <small>탄 {dayTotals.carbs}　단 {dayTotals.protein}　지 {dayTotals.fat}</small>
      </div>

      {!viewOnly && <button type="button" className="meal-day-add" onClick={addSnack} aria-label="간식 추가">＋</button>}
      <button type="button" className="meal-day-confirm" onClick={onClose}>{viewOnly ? '돌아가기' : '확인'}</button>
    </section>
  )
}
