import { useEffect, useMemo, useState } from 'react'
import { getLatestHealthAnalysis } from '../../api/health'
import { getRoutineRecords } from '../../api/record'
import { getRoutine, getRoutines } from '../../api/routine'
import { aggregateMealSevenDays, dateKey, routineNutritionTargets } from '../../utils/analysisMetrics'
import './MealAnalysisLab.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

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
  const days = useMemo(() => aggregateMealSevenDays(weekRecords), [weekRecords])
  const recordedDays = days.filter((day) => day.recorded).length
  const averages = ['carbs', 'protein', 'fat', 'sodium', 'fiber'].reduce((result, key) => ({ ...result, [key]: days.reduce((sum, day) => sum + day[key], 0) / 7 }), {})
  const trendDisplay = days.map((day) => Math.round(day.protein))
  const macroTotal = averages.carbs + averages.protein + averages.fat
  const ratios = macroTotal ? { carbs: Math.round(averages.carbs / macroTotal * 100), protein: Math.round(averages.protein / macroTotal * 100) } : { carbs: 0, protein: 0 }
  ratios.fat = macroTotal ? 100 - ratios.carbs - ratios.protein : 0
  const score = recordedDays ? Math.max(0, Math.min(100, Math.round((Math.min(1, averages.protein / targets.protein) + Math.min(1, averages.carbs / targets.carbs) + Math.min(1, targets.fat / Math.max(targets.fat, averages.fat))) / 3 * 100))) : 0
  const constraints = [...(analysis?.nutritionConstraints || []), ...(analysis?.precautions || [])]
  const metrics = [
    ['단백질', averages.protein, targets.protein, 'g'], ['탄수화물', averages.carbs, targets.carbs, 'g'], ['포화지방', averages.fat, targets.fat, 'g'], ['나트륨', averages.sodium, targets.sodium, 'g'], ['식이섬유', averages.fiber, targets.fiber, 'g'],
  ]

  return <section className="meal-lab-page"><div className="meal-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>식단 검사실</h1><b>{score}/100</b></header><p className="meal-lab-subtitle">최근 7일 · {recordedDays}일 기록 · 참고치는 {targets.fromRoutine ? '현재 루틴' : '일반 권장량'} 기준</p>
    <section className="nutrient-achievement"><h2>영양소 달성률</h2>{metrics.map(([label, value, target, unit]) => { const rate = Math.min(100, value / target * 100); const status = value > target * 1.1 ? '초과' : value >= target * .8 ? '적정' : `${Math.round(value / target * 100 - 100)}%`; return <article className={value > target * 1.1 ? 'over' : value >= target * .8 ? 'good' : 'low'} key={label}><header><strong>{label}</strong><span>{Math.round(value)}{unit} / {label === '탄수화물' ? `${Math.round(target * .9)}–${Math.round(target * 1.1)}` : label === '포화지방' || label === '나트륨' ? `≤${target}` : target}{unit} <b>{status}</b></span></header><div><i style={{ width: `${rate}%` }} /></div></article>})}<small>│ 권장선</small></section>
    <section className="meal-trend"><header><h2>7일 섭취 추이</h2><span>단백질 g</span></header><div className="trend-chart"><i className="target-line">권장 {targets.protein}g</i>{trendDisplay.map((value, index) => <span key={index}><b>{days[index]?.recorded ? value : '–'}</b><i className={!days[index]?.recorded ? 'empty' : ''} style={{ height: days[index]?.recorded ? `${Math.max(8, Math.min(100, value / Math.max(targets.protein, 1) * 72))}%` : '2px' }} /><small>{WEEKDAYS[days[index]?.date.getDay() ?? index]}</small></span>)}</div></section>
    <section className="macro-ratio"><h2>열량 구성 비율</h2><div><i style={{ width: `${ratios.carbs}%` }}>{ratios.carbs}%</i><i style={{ width: `${ratios.protein}%` }}>{ratios.protein}%</i><i style={{ width: `${ratios.fat}%` }}>{ratios.fat}%</i></div><p><span>■ 탄수화물</span><span>■ 단백질</span><span>■ 지방</span></p><small>권장 비율 50 / 30 / 20 대비 지방이 {Math.max(0, ratios.fat - 20)}%p 높아요</small></section>
    <section className="meal-lab-analysis"><h2>분석</h2><p>{recordedDays ? constraints[0]?.description || constraints[0] || `최근 7일 중 ${recordedDays}일의 식단 기록을 포함해 계산했습니다. 단백질은 7일 평균 기준 목표의 ${Math.round(averages.protein / targets.protein * 100)}%를 달성했습니다.` : '최근 7일간 완료된 식단 기록이 없어 섭취 추이를 계산할 수 없습니다.'}</p><button type="button">고단백 저나트륨으로 반영하기</button></section>
  </div></section>
}
