import { useEffect, useMemo, useState } from 'react'
import { getLatestHealthAnalysis } from '../../api/health'
import { getRoutineRecords } from '../../api/record'
import { getRoutine, getRoutines } from '../../api/routine'
import './MealAnalysisLab.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function parse(value) { if (value && typeof value === 'object') return value; try { return JSON.parse(value || '{}') } catch { return {} } }
function detailsOf(record) { return parse(record?.details || record?.detailsJson) }

function routineNutritionTargets(detail) {
  const dayTotals = (detail?.days || []).map((day) => (day.sections || []).flatMap((section) => section.exercises || []).filter((item) => item.activityType === 'MEAL').reduce((sum, item) => {
    const content = parse(item.content)
    return { carbs: sum.carbs + Number(content.carbohydrateGrams || 0), protein: sum.protein + Number(content.proteinGrams || 0), fat: sum.fat + Number(content.fatGrams || 0) }
  }, { carbs: 0, protein: 0, fat: 0 })).filter((target) => target.carbs || target.protein || target.fat)
  const average = (key, fallback) => dayTotals.length ? Math.round(dayTotals.reduce((sum, day) => sum + day[key], 0) / dayTotals.length) : fallback
  return { carbs: average('carbs', 200), protein: average('protein', 100), fat: average('fat', 60), sodium: 2.3, fiber: 25 }
}

export default function MealAnalysisLab({ onBack }) {
  const [weekRecords, setWeekRecords] = useState([])
  const [routineDetail, setRoutineDetail] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const dates = useMemo(() => Array.from({ length: 7 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() - (6 - offset)); return date }), [])

  useEffect(() => {
    let active = true
    const recordRequests = dates.map((date) => getRoutineRecords(dateKey(date)))
    Promise.allSettled([...recordRequests, getRoutines(), getLatestHealthAnalysis()]).then(async (results) => {
      if (!active) return
      setWeekRecords(results.slice(0, 7).map((result, index) => ({ date: dates[index], records: result.status === 'fulfilled' ? result.value?.data || [] : [] })))
      const routineResponse = results[7]
      const routines = routineResponse.status === 'fulfilled' ? routineResponse.value?.data?.content || [] : []
      const mealRoutine = routines.find((item) => item.status === 'ACTIVE' && (item.type === 'MEAL' || item.type === 'MIXED')) || routines.find((item) => item.type === 'MEAL' || item.type === 'MIXED')
      if (mealRoutine) getRoutine(mealRoutine.id).then((response) => { if (active) setRoutineDetail(response?.data || null) }).catch(() => {})
      const analysisResult = results[8]
      if (analysisResult.status === 'fulfilled') setAnalysis(analysisResult.value?.data || null)
    })
    return () => { active = false }
  }, [dates])

  const targets = useMemo(() => routineNutritionTargets(routineDetail), [routineDetail])
  const days = useMemo(() => weekRecords.map(({ date, records }) => {
    const nutrients = records.filter((record) => (record.activityType || record.type) === 'MEAL').reduce((sum, record) => {
      const details = detailsOf(record)
      return { carbs: sum.carbs + Number(details.carbohydrateGrams || details.carbs || 0), protein: sum.protein + Number(details.proteinGrams || details.protein || 0), fat: sum.fat + Number(details.fatGrams || details.fat || 0), sodium: sum.sodium + Number(details.sodiumGrams || details.sodium || 0), fiber: sum.fiber + Number(details.fiberGrams || details.fiber || 0) }
    }, { carbs: 0, protein: 0, fat: 0, sodium: 0, fiber: 0 })
    return { date, ...nutrients }
  }), [weekRecords])
  const recordedDays = Math.max(1, days.filter((day) => day.carbs || day.protein || day.fat).length)
  const averages = ['carbs', 'protein', 'fat', 'sodium', 'fiber'].reduce((result, key) => ({ ...result, [key]: days.reduce((sum, day) => sum + day[key], 0) / recordedDays }), {})
  const proteinTrend = days.map((day) => Math.round(day.protein))
  const trendDisplay = proteinTrend.some(Boolean) ? proteinTrend : [88, 74, 96, 62, 70, 58, 123]
  const macroTotal = Math.max(1, averages.carbs + averages.protein + averages.fat)
  const ratios = { carbs: Math.round(averages.carbs / macroTotal * 100) || 46, protein: Math.round(averages.protein / macroTotal * 100) || 31 }
  ratios.fat = 100 - ratios.carbs - ratios.protein
  const score = Math.max(0, Math.min(100, Math.round((Math.min(1, averages.protein / targets.protein) + Math.min(1, averages.carbs / targets.carbs) + Math.min(1, targets.fat / Math.max(targets.fat, averages.fat))) / 3 * 100) || 64))
  const constraints = [...(analysis?.nutritionConstraints || []), ...(analysis?.precautions || [])]
  const metrics = [
    ['단백질', averages.protein, targets.protein, 'g'], ['탄수화물', averages.carbs, targets.carbs, 'g'], ['포화지방', averages.fat, targets.fat, 'g'], ['나트륨', averages.sodium, targets.sodium, 'g'], ['식이섬유', averages.fiber, targets.fiber, 'g'],
  ]

  return <section className="meal-lab-page"><div className="meal-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>식단 검사실</h1><b>{score}/100</b></header><p className="meal-lab-subtitle">주간 평균 · 참고치는 목표 체중 및 현재 루틴 기준</p>
    <section className="nutrient-achievement"><h2>영양소 달성률</h2>{metrics.map(([label, value, target, unit]) => { const rate = Math.min(100, value / target * 100); const status = value > target * 1.1 ? '초과' : value >= target * .8 ? '적정' : `${Math.round(value / target * 100 - 100)}%`; return <article className={value > target * 1.1 ? 'over' : value >= target * .8 ? 'good' : 'low'} key={label}><header><strong>{label}</strong><span>{Math.round(value)}{unit} / {label === '탄수화물' ? `${Math.round(target * .9)}–${Math.round(target * 1.1)}` : label === '포화지방' || label === '나트륨' ? `≤${target}` : target}{unit} <b>{status}</b></span></header><div><i style={{ width: `${rate}%` }} /></div></article>})}<small>│ 권장선</small></section>
    <section className="meal-trend"><header><h2>7일 섭취 추이</h2><span>단백질 g</span></header><div className="trend-chart"><i className="target-line">권장 {targets.protein}g</i>{trendDisplay.map((value, index) => <span key={index}><b>{value}</b><i style={{ height: `${Math.max(18, Math.min(100, value / Math.max(targets.protein, 1) * 72))}%` }} /><small>{WEEKDAYS[days[index]?.date.getDay() ?? index]}</small></span>)}</div></section>
    <section className="macro-ratio"><h2>열량 구성 비율</h2><div><i style={{ width: `${ratios.carbs}%` }}>{ratios.carbs}%</i><i style={{ width: `${ratios.protein}%` }}>{ratios.protein}%</i><i style={{ width: `${ratios.fat}%` }}>{ratios.fat}%</i></div><p><span>■ 탄수화물</span><span>■ 단백질</span><span>■ 지방</span></p><small>권장 비율 50 / 30 / 20 대비 지방이 {Math.max(0, ratios.fat - 20)}%p 높아요</small></section>
    <section className="meal-lab-analysis"><h2>분석</h2><p>{constraints[0]?.description || constraints[0] || `최근 7일 기록에서 단백질은 목표의 ${Math.round(averages.protein / targets.protein * 100) || 0}%를 달성했고, 지방과 나트륨은 루틴 권장선에 맞춰 조절이 필요합니다.`}</p><button type="button">고단백 저나트륨으로 반영하기</button></section>
  </div></section>
}
