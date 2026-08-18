import { apiRequest } from './client'

export function getRoutineRecords(date, type) {
  const query = new URLSearchParams({ date })
  if (type) query.set('type', type)
  return apiRequest(`/routine-records?${query}`)
}

export function createRoutineRecord(record) {
  return apiRequest('/routine-records', { method: 'POST', body: record })
}

export function createRoutineRecords(records) {
  return apiRequest('/routine-records/batch', {
    method: 'POST',
    body: { records },
  })
}

export async function uploadRoutineRecordImage(file) {
  if (!file) return null
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiRequest('/routine-records/images', {
    method: 'POST',
    body: formData,
  })
  return response?.data?.imageKey || null
}

export async function analyzeMealPhoto(file, routineItemId, recordedAt = new Date().toISOString()) {
  const formData = new FormData()
  formData.append('image', file)
  if (Number.isFinite(Number(routineItemId))) formData.append('routineItemId', String(routineItemId))
  formData.append('recordedAt', recordedAt)
  const response = await apiRequest('/meal-analyses', { method: 'POST', body: formData })
  return response?.data
}

export async function analyzeExercisePose(file, exerciseName, routineItemId) {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('exerciseName', exerciseName)
  if (Number.isFinite(Number(routineItemId))) formData.append('routineItemId', String(routineItemId))
  const response = await apiRequest('/pose-analyses', { method: 'POST', body: formData })
  return response?.data
}

export function updateMealAnalysis(analysisId, foods) {
  return apiRequest(`/meal-analyses/${analysisId}`, {
    method: 'PATCH',
    body: { foods: foods.map((food) => ({
      name: food.name,
      servingGrams: Number(food.servingGrams || food.amount || 100),
      calories: Number(food.calories || 0),
      carbohydrateGrams: Number(food.carbohydrateGrams ?? food.carbs ?? 0),
      proteinGrams: Number(food.proteinGrams ?? food.protein ?? 0),
      fatGrams: Number(food.fatGrams ?? food.fat ?? 0),
    })) },
  })
}

export function confirmMealAnalysis(analysisId) {
  return apiRequest(`/meal-analyses/${analysisId}/confirm`, { method: 'POST' })
}

export function getDailyNutritionReport(date) {
  return apiRequest(`/nutrition-reports/daily?date=${encodeURIComponent(date)}`)
}

function recordedAtFor(item) {
  if (!item?.scheduledDate) return new Date().toISOString()
  const now = new Date()
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  return `${item.scheduledDate}T${hour}:${minute}:00+09:00`
}

export function recordWater(glasses, date) {
  return apiRequest('/routine-records/water', {
    method: 'PUT',
    body: {
      glasses,
    recordedAt: date ? `${date}T12:00:00+09:00` : new Date().toISOString(),
    },
  })
}

export async function recordRoutineItems(item, status, activityType = 'EXERCISE', activityDetails = {}) {
  const skipped = status === 'cancelled'
  const { photoFile, ...serializableDetails } = activityDetails || {}
  const imageKey = photoFile ? await uploadRoutineRecordImage(photoFile) : null
  const exercises = Array.isArray(item?.exercises) && item.exercises.length
    ? item.exercises
    : [{ id: item?.routineItemId }]
  const validExercises = exercises.filter((exercise) => Number.isFinite(Number(exercise.id || exercise.exerciseId)))
  const divisor = Math.max(1, validExercises.length)
  const records = validExercises.map((exercise) => ({
    routineItemId: Number(exercise.id || exercise.exerciseId),
    type: exercise.activityType || activityType,
    recordedAt: recordedAtFor(item),
    ...(imageKey ? { imageKey } : {}),
    details: {
      completed: !skipped,
      skipped,
      ...(skipped ? {} : serializableDetails),
      ...(skipped ? {} : {
        exerciseName: exercise.name,
        exerciseCount: 1,
        totalSets: Number(exercise.sets || 1),
        minutes: Number(serializableDetails.minutes || 0) / divisor,
        calories: Number(serializableDetails.calories || 0) / divisor,
      }),
    },
  }))
  if (!records.length) throw new Error('DB에 연결된 루틴 항목이 없습니다.')
  return records.length === 1
    ? createRoutineRecord(records[0])
    : createRoutineRecords(records)
}

export async function recordMealRoutine(item, foods, mealType, photoFile, mealAnalysisId) {
  if (mealAnalysisId) {
    await updateMealAnalysis(mealAnalysisId, foods)
    return confirmMealAnalysis(mealAnalysisId)
  }
  const totals = foods.reduce((sum, food) => ({
    calories: sum.calories + Number(food.calories || 0),
    carbs: sum.carbs + Number(food.carbs || 0),
    protein: sum.protein + Number(food.protein || 0),
    fat: sum.fat + Number(food.fat || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 })
  const routineItemId = Number(item?.routineItemId)
  const imageKey = photoFile ? await uploadRoutineRecordImage(photoFile) : null

  return createRoutineRecord({
    ...(Number.isFinite(routineItemId) ? { routineItemId } : {}),
    type: 'MEAL',
    recordedAt: recordedAtFor(item),
    ...(imageKey ? { imageKey } : {}),
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
