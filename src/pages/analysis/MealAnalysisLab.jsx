import { useEffect, useMemo, useState } from 'react'
import { getNutritionAnalysis } from '../../api/analysis'
import './MealAnalysisLab.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const BAR_MAX_RATIO = 1.5

function nutrientStatus(key, value, target) {
  if (!target) return { className: 'empty', label: '자료 없음' }

  const ratio = value / target
  if (key === 'sodiumGrams') {
    return ratio <= 1
      ? { className: 'good', label: '적정' }
      : { className: 'over', label: '초과' }
  }

  const upperRatio = key === 'fatGrams' ? 1.1 : 1.2
  if (ratio < .8) return { className: 'low', label: '미달' }
  if (ratio > upperRatio) return { className: 'over', label: '초과' }
  return { className: 'good', label: '적정' }
}

function goalLabel(goal) {
  return {
    MUSCLE_GAIN: '근육 증가',
    WEIGHT_LOSS: '체중 감량',
    REHABILITATION: '재활',
    HEALTH_METRIC_MANAGEMENT: '건강 수치 관리',
    MAINTENANCE: '유지',
  }[goal] || '유지'
}

function weightSourceLabel(source) {
  return source === 'BODY_COMPOSITION' ? '최신 인바디' : source === 'HEALTH_PROFILE' ? '프로필' : '기본값'
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function MealAnalysisLab({ onBack }) {
  const [report, setReport] = useState(null)
  const [trendReport, setTrendReport] = useState(null)
  const [error, setError] = useState('')
  const [trendNutrient, setTrendNutrient] = useState('proteinGrams')
  const [averageDays, setAverageDays] = useState(1)
  const range = useMemo(() => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(to.getDate() - (averageDays - 1))
    return { from: dateKey(from), to: dateKey(to) }
  }, [averageDays])
  const trendRange = useMemo(() => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(to.getDate() - 6)
    return { from: dateKey(from), to: dateKey(to) }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      getNutritionAnalysis(range.from, range.to),
      getNutritionAnalysis(trendRange.from, trendRange.to),
    ])
      .then(([response, trendResponse]) => {
        if (!active) return
        setReport(response?.data || null)
        setTrendReport(trendResponse?.data || null)
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [range, trendRange])

  const targets = report?.targets || {}
  const averages = report?.averages || {}
  const days = (trendReport?.dailyTrend || []).slice(-7)
  const ratios = report?.calorieRatio || {}
  const targetBasis = report?.targetBasis || {}
  const metrics = [
    ['단백질', 'proteinGrams', 'g'],
    ['탄수화물', 'carbohydrateGrams', 'g'],
    ['지방', 'fatGrams', 'g'],
    ['나트륨', 'sodiumGrams', 'g'],
    ['식이섬유', 'fiberGrams', 'g'],
  ]
  const trendOptions = [
    ['proteinGrams', '단백질', 'g'],
    ['carbohydrateGrams', '탄수화물', 'g'],
    ['fatGrams', '지방', 'g'],
    ['sodiumGrams', '나트륨', 'g'],
    ['fiberGrams', '식이섬유', 'g'],
  ]
  const selectedTrend = trendOptions.find(([key]) => key === trendNutrient) || trendOptions[0]
  const [selectedKey, selectedLabel, selectedUnit] = selectedTrend
  const selectedTarget = Number(targets[selectedKey] || 0)
  const averageOptions = [[1, '일평균'], [3, '3일 평균'], [7, '7일 평균'], [30, '한달 평균']]

  return <section className="meal-lab-page"><div className="meal-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>식단 검사실</h1><b>{report?.score ?? '–'}/100</b></header><p className="meal-lab-subtitle">{averageOptions.find(([daysValue]) => daysValue === averageDays)?.[1]} · {report?.recordedDays || 0}/{report?.periodDays || averageDays}일 기록 ({report?.recordCoveragePercent || 0}%)</p>
    <section className="nutrient-achievement"><header className="achievement-heading"><h2>영양소 달성률</h2><span>{averageOptions.find(([daysValue]) => daysValue === averageDays)?.[1]}</span></header><nav className="average-period-tabs" aria-label="영양소 평균 기간 선택">{averageOptions.map(([daysValue, label]) => <button type="button" className={daysValue === averageDays ? 'active' : ''} key={daysValue} onClick={() => setAverageDays(daysValue)}>{label}</button>)}</nav>{targetBasis.proteinGramsPerKg && <p className="target-basis">{goalLabel(targetBasis.goal)} 목표 · {weightSourceLabel(targetBasis.weightSource)} 체중 {targetBasis.proteinBasisWeightKg}kg × {targetBasis.proteinGramsPerKg}g/kg</p>}{metrics.map(([label, key, unit]) => { const value = Number(averages[key] || 0); const target = Number(targets[key] || 0); const ratio = target ? value / target : 0; const rate = Math.min(ratio, BAR_MAX_RATIO) / BAR_MAX_RATIO * 100; const upperLimited = key === 'sodiumGrams'; const status = nutrientStatus(key, value, target); return <article className={status.className} key={key}><header><strong>{label}</strong><span>{Math.round(value)}{unit} / {upperLimited ? '≤' : ''}{Math.round(target)}{unit} <b>{status.label}{target ? ` ${Math.round(ratio * 100)}%` : ''}</b></span></header><div className="achievement-track"><i style={{ width: `${rate}%` }} /><em aria-label="권장량" /></div></article>})}<p className="achievement-legend"><span className="low">■ 미달</span><span className="good">■ 적정</span><span className="over">■ 초과</span><span className="target">│ 권장량 100%</span></p><small>선택한 기간의 전체 일수 기준 평균입니다. 기록하지 않은 날은 0으로 포함합니다.</small></section>
    <section className="meal-trend"><header><h2>7일 섭취 추이</h2><span>{selectedLabel} {selectedUnit}</span></header><nav className="trend-nutrient-tabs" aria-label="추이 영양소 선택">{trendOptions.map(([key, label]) => <button type="button" className={key === selectedKey ? 'active' : ''} key={key} onClick={() => setTrendNutrient(key)}>{label}</button>)}</nav><div className="trend-chart"><i className="target-line">권장 {Math.round(selectedTarget)}{selectedUnit}</i>{days.map((day) => { const value = Number(day[selectedKey] || 0); const recorded = Number(day.calories || 0) > 0; return <span key={day.date}><b>{recorded ? Math.round(value) : '–'}</b><i className={!recorded ? 'empty' : ''} style={{ height: recorded ? `${Math.max(8, Math.min(100, value / Math.max(selectedTarget || 1, 1) * 72))}%` : '2px' }} /><small>{WEEKDAYS[new Date(`${day.date}T00:00:00`).getDay()]}</small></span> })}</div></section>
    <section className="macro-ratio"><h2>열량 구성 비율</h2><div><i style={{ width: `${ratios.carbohydratePercent || 0}%` }}>{ratios.carbohydratePercent || 0}%</i><i style={{ width: `${ratios.proteinPercent || 0}%` }}>{ratios.proteinPercent || 0}%</i><i style={{ width: `${ratios.fatPercent || 0}%` }}>{ratios.fatPercent || 0}%</i></div><p><span>■ 탄수화물</span><span>■ 단백질</span><span>■ 지방</span></p><small>완료된 식단 기록의 영양소 열량 기준</small></section>
    <section className="meal-lab-analysis"><h2>분석</h2><p>{error || report?.summary || '식단 기록을 불러오고 있습니다.'}</p>{(report?.constraints || []).length > 0 && <p>건강 주의사항: {report.constraints.join(' · ')}</p>}<button type="button">다음 루틴에 반영하기</button></section>
  </div></section>
}
