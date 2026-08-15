export const BODY_PARTS = ['가슴', '등', '어깨', '팔', '하체']
export const ANALYSIS_PERIODS = Object.freeze({ DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' })

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseJson(value) {
  if (value && typeof value === 'object') return value
  try { return JSON.parse(value || '{}') } catch { return {} }
}

export function recordDetails(record) {
  return parseJson(record?.details || record?.detailsJson)
}

export function isCompletedRecord(record) {
  const details = recordDetails(record)
  return !details.skipped && (details.completed || record.status === 'COMPLETED' || record.recordStatus === 'COMPLETED')
}

/** 날짜가 붙은 기록 묶음을 일간/달력 주간/월간 단위로 그룹화한다. 백엔드 집계 응답 검증에도 재사용할 수 있다. */
export function groupRecordsByPeriod(dailyRecords, period = ANALYSIS_PERIODS.DAILY) {
  const groups = new Map()
  dailyRecords.forEach(({ date, records = [] }) => {
    const value = date instanceof Date ? date : new Date(date)
    let key = dateKey(value)
    if (period === ANALYSIS_PERIODS.MONTHLY) key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
    if (period === ANALYSIS_PERIODS.WEEKLY) {
      const monday = new Date(value)
      const day = monday.getDay() || 7
      monday.setDate(monday.getDate() - day + 1)
      key = dateKey(monday)
    }
    const group = groups.get(key) || { key, dates: [], records: [] }
    group.dates.push(value); group.records.push(...records); groups.set(key, group)
  })
  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key))
}

/** 최근 7개 날짜의 실제 식단 기록을 날짜별 영양 합계로 변환한다. */
export function aggregateMealSevenDays(dailyRecords) {
  return dailyRecords.map(({ date, records = [] }) => {
    const meals = records.filter((record) => (record.activityType || record.type) === 'MEAL' && isCompletedRecord(record))
    const nutrients = meals.reduce((sum, record) => {
      const details = recordDetails(record)
      return {
        calories: sum.calories + Number(details.calories || 0),
        carbs: sum.carbs + Number(details.carbohydrateGrams || details.carbs || 0),
        protein: sum.protein + Number(details.proteinGrams || details.protein || 0),
        fat: sum.fat + Number(details.fatGrams || details.fat || 0),
        sodium: sum.sodium + Number(details.sodiumGrams || details.sodium || 0),
        fiber: sum.fiber + Number(details.fiberGrams || details.fiber || 0),
      }
    }, { calories: 0, carbs: 0, protein: 0, fat: 0, sodium: 0, fiber: 0 })
    return { date, recorded: meals.length > 0, mealCount: meals.length, ...nutrients }
  })
}

/** 루틴에 저장된 일차별 식단 목표의 평균값을 계산한다. */
export function routineNutritionTargets(detail) {
  const dayTotals = (detail?.days || []).map((day) => (day.sections || []).flatMap((section) => section.exercises || []).filter((item) => item.activityType === 'MEAL').reduce((sum, item) => {
    const content = parseJson(item.content)
    return {
      carbs: sum.carbs + Number(content.carbohydrateGrams || 0),
      protein: sum.protein + Number(content.proteinGrams || 0),
      fat: sum.fat + Number(content.fatGrams || 0),
    }
  }, { carbs: 0, protein: 0, fat: 0 })).filter((target) => target.carbs || target.protein || target.fat)
  const average = (key, fallback) => dayTotals.length ? Math.round(dayTotals.reduce((sum, day) => sum + day[key], 0) / dayTotals.length) : fallback
  return { carbs: average('carbs', 200), protein: average('protein', 100), fat: average('fat', 60), sodium: 2.3, fiber: 25, fromRoutine: dayTotals.length > 0 }
}

export function bodyPartFor(text) {
  if (/가슴|체스트|벤치|푸시업|푸쉬업|플라이/.test(text)) return '가슴'
  if (/등|랫|로우|풀업|데드리프트|광배/.test(text)) return '등'
  if (/어깨|숄더|프레스|레터럴|삼각근/.test(text)) return '어깨'
  if (/팔|컬|이두|삼두|딥스/.test(text)) return '팔'
  if (/하체|스쿼트|런지|레그|힙|둔근|햄스트링|종아리/.test(text)) return '하체'
  return null
}

export function determineCurrentRoutineWeek(detail, today = new Date()) {
  const days = (detail?.days || []).filter((day) => day.scheduledDate && Number(day.week)).sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))
  const todayValue = dateKey(today)
  const exact = days.find((day) => day.scheduledDate === todayValue)
  if (exact) return Number(exact.week)
  const latestStarted = days.filter((day) => day.scheduledDate <= todayValue).at(-1)
  if (latestStarted) return Number(latestStarted.week)
  if (days.length) return Number(days[0].week)
  if (detail?.startDate) {
    const elapsed = Math.floor((today - new Date(`${detail.startDate}T00:00:00`)) / 86400000)
    return Math.max(1, Math.floor(Math.max(0, elapsed) / 7) + 1)
  }
  return 1
}

function exerciseIndex(detail) {
  const index = new Map()
  ;(detail?.days || []).forEach((day) => (day.sections || []).forEach((section) => (section.exercises || []).forEach((item) => {
    index.set(String(item.exerciseId), { week: Number(day.week || 1), text: `${item.name || ''} ${section.title || ''} ${item.content || ''}` })
  })))
  return index
}

function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback }

/** 실제 수행 기록을 루틴 item의 주차에 연결해 현재 주 부위별 세트와 주차별 볼륨을 계산한다. */
export function aggregateExerciseByRoutineWeek(dailyRecords, detail, today = new Date()) {
  const index = exerciseIndex(detail)
  const currentWeek = determineCurrentRoutineWeek(detail, today)
  const totalWeeks = Math.max(currentWeek, ...(detail?.days || []).map((day) => Number(day.week || 0)))
  const parts = Object.fromEntries(BODY_PARTS.map((part) => [part, 0]))
  const weekMap = new Map()
  const startDate = detail?.startDate ? new Date(`${detail.startDate}T00:00:00`) : null
  const completed = dailyRecords.flatMap(({ date, records = [] }) => records.map((record) => ({ record, date }))).filter(({ record }) => ['EXERCISE', 'REHABILITATION'].includes(record.activityType || record.type) && isCompletedRecord(record)).map(({ record, date }) => {
    const details = recordDetails(record)
    const linked = index.get(String(record.routineItemId))
    const dateWeek = startDate ? Math.max(1, Math.floor((date - startDate) / 86400000 / 7) + 1) : 1
    const week = linked?.week || dateWeek
    const sets = number(details.totalSets || details.sets, 1)
    const reps = number(details.repetitions || details.reps || details.targetValue, 1)
    const weight = Math.max(1, number(details.weight || details.weightKg, 1))
    const volume = sets * reps * weight
    const part = bodyPartFor(`${details.exerciseName || ''} ${details.muscleGroup || ''} ${linked?.text || ''}`)
    const item = { week, sets, reps, weight, volume, part, minutes: number(details.minutes || details.durationMinutes), calories: number(details.calories) }
    const weekTotal = weekMap.get(week) || { week, volume: 0, sets: 0, minutes: 0, calories: 0, count: 0 }
    weekTotal.volume += volume; weekTotal.sets += sets; weekTotal.minutes += item.minutes; weekTotal.calories += item.calories; weekTotal.count += 1
    weekMap.set(week, weekTotal)
    if (week === currentWeek && part) parts[part] += sets
    return item
  })
  const weeks = Array.from({ length: currentWeek }, (_, indexValue) => weekMap.get(indexValue + 1) || { week: indexValue + 1, volume: 0, sets: 0, minutes: 0, calories: 0, count: 0 })
  const current = weekMap.get(currentWeek) || { week: currentWeek, volume: 0, sets: 0, minutes: 0, calories: 0, count: 0 }
  return { currentWeek, totalWeeks, parts, weeks, current, completed }
}

function finding(findings, patterns) { return findings.find((item) => patterns.some((pattern) => pattern.test(String(item.label || '')))) }

/** 인바디 분석을 sourceDocumentId로 문서와 연결하고 측정일 우선으로 최근 N회를 반환한다. */
export function buildBodyCompositionHistory(analyses, documents, limit = 3) {
  const documentMap = new Map(documents.map((document) => [String(document.documentId), document]))
  return analyses.map((analysis) => {
    const findings = Array.isArray(analysis?.bodyCompositionFindings) ? analysis.bodyCompositionFindings : []
    const weight = finding(findings, [/체중|weight/i]); const bodyFat = finding(findings, [/체지방률|body fat.*%|fat percentage/i]); const muscle = finding(findings, [/골격근량|근육량|skeletal muscle/i])
    if (!weight && !bodyFat && !muscle) return null
    const sourceId = weight?.sourceDocumentId || bodyFat?.sourceDocumentId || muscle?.sourceDocumentId
    const document = sourceId != null ? documentMap.get(String(sourceId)) : null
    const measuredAt = document?.measuredAt || document?.createdAt || analysis.completedAt
    const timestamp = measuredAt ? new Date(measuredAt).getTime() : 0
    return { analysis, document, measuredAt, timestamp, weight: weight ? Number(weight.value) : null, bodyFat: bodyFat ? Number(bodyFat.value) : null, muscle: muscle ? Number(muscle.value) : null }
  }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp).slice(-limit)
}
