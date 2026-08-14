import { apiRequest } from './client'

export function getRoutineRecords(date, type) {
  const query = new URLSearchParams({ date })
  if (type) query.set('type', type)
  return apiRequest(`/routine-records?${query}`)
}

export function createRoutineRecord(record) {
  return apiRequest('/routine-records', { method: 'POST', body: record })
}

export function recordWater(glasses, date) {
  return createRoutineRecord({
    type: 'OTHER',
    recordedAt: date ? `${date}T12:00:00+09:00` : new Date().toISOString(),
    details: { category: 'WATER', glasses, milliliters: glasses * 250 },
  })
}

export function recordRoutineItem(routineItemId, status, activityType = 'EXERCISE', activityDetails = {}) {
  const skipped = status === 'cancelled'
  return createRoutineRecord({
    routineItemId,
    type: activityType,
    recordedAt: new Date().toISOString(),
    details: { completed: !skipped, skipped, ...activityDetails },
  })
}

export function recordMealRoutine(item, foods, mealType) {
  const totals = foods.reduce((sum, food) => ({
    calories: sum.calories + Number(food.calories || 0),
    carbs: sum.carbs + Number(food.carbs || 0),
    protein: sum.protein + Number(food.protein || 0),
    fat: sum.fat + Number(food.fat || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 })
  const routineItemId = Number(item?.routineItemId)

  return createRoutineRecord({
    ...(Number.isFinite(routineItemId) ? { routineItemId } : {}),
    type: 'MEAL',
    recordedAt: new Date().toISOString(),
    details: {
      mealType,
      menu: foods.map((food) => food.name),
      foods,
      calories: totals.calories,
      carbohydrateGrams: totals.carbs,
      proteinGrams: totals.protein,
      fatGrams: totals.fat,
      completed: true,
    },
  })
}
