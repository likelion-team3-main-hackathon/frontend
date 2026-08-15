import { useEffect, useMemo, useState } from 'react'
import { getLatestHealthAnalysis } from '../../api/health'
import { getRoutineRecords } from '../../api/record'
import BottomNav from '../../components/layout/BottomNav'
import './AnalysisLab.css'

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function detailsOf(record) {
  if (record?.details && typeof record.details === 'object') return record.details
  try { return JSON.parse(record?.detailsJson || record?.details || '{}') } catch { return {} }
}

function polygonPoints(values, radius = 48, center = 60) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
    const distance = radius * value / 100
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`
  }).join(' ')
}

function firstDescription(items) {
  const item = items?.[0]
  return typeof item === 'string' ? item : item?.description || item?.summary || ''
}

export default function AnalysisLab({ onNavigate }) {
  const [records, setRecords] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [period, setPeriod] = useState(() => sessionStorage.getItem('analysisPeriod') || 'daily')
  const today = useMemo(() => new Date(), [])
  const todayKey = dateKey(today)
  const weekStart = useMemo(() => {
    const date = new Date(today)
    const weekday = date.getDay() || 7
    date.setDate(today.getDate() - weekday + 1)
    return date
  }, [today])
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])

  useEffect(() => {
    let active = true
    const startDate = period === 'monthly' ? monthStart : period === 'weekly' ? weekStart : today
    const dayCount = Math.floor((today - startDate) / 86400000) + 1
    const dates = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)
      return dateKey(date)
    })
    Promise.allSettled([...dates.map((date) => getRoutineRecords(date)), getLatestHealthAnalysis()]).then((results) => {
      if (!active) return
      const recordResults = results.slice(0, dates.length)
      const analysisResult = results.at(-1)
      setRecords(recordResults.flatMap((result) => result.status === 'fulfilled' ? result.value?.data || [] : []))
      if (analysisResult.status === 'fulfilled') setAnalysis(analysisResult.value?.data || null)
    })
    return () => { active = false }
  }, [monthStart, period, today, todayKey, weekStart])

  const metrics = useMemo(() => {
    const recordPeriodLabel = period === 'monthly' ? '이번 달' : period === 'weekly' ? '이번 주' : '오늘'
    const completed = records.filter((record) => {
      const details = detailsOf(record)
      return !details.skipped && (details.completed || record.status === 'COMPLETED' || record.recordStatus === 'COMPLETED')
    })
    const meals = completed.filter((record) => (record.activityType || record.type) === 'MEAL')
    const exercises = completed.filter((record) => ['EXERCISE', 'REHABILITATION'].includes(record.activityType || record.type))
    const waterRecords = records.filter((record) => detailsOf(record).category === 'WATER')
    const waterGlasses = waterRecords.length ? waterRecords.reduce((sum, record) => sum + Number(detailsOf(record).glasses || 0), 0) / waterRecords.length : 0
    const dayDivisor = Math.max(1, period === 'monthly' ? today.getDate() : period === 'weekly' ? Math.floor((today - weekStart) / 86400000) + 1 : 1)
    const bodyFindings = analysis?.bodyCompositionFindings || []
    const cautions = [...(analysis?.precautions || []), ...(analysis?.exerciseConstraints || []), ...(analysis?.nutritionConstraints || [])]
    return [
      { id: 'meal', label: '식단', score: meals.length ? Math.min(100, Math.round(55 + meals.length / dayDivisor * 9)) : 64, note: `${recordPeriodLabel} 식단 ${meals.length}회 기록` },
      { id: 'exercise', label: '운동', score: exercises.length ? Math.min(100, Math.round(62 + exercises.length / dayDivisor * 8)) : 78, note: `${recordPeriodLabel} 운동 ${exercises.length}회 완료` },
      { id: 'body', label: '체성분', score: bodyFindings.length ? 74 : 71, note: bodyFindings[0]?.interpretation || '체지방 −1.8%' },
      { id: 'clinical', label: '임상', score: cautions.length ? 62 : 76, note: cautions.length ? '주의 항목 확인' : '특이사항 없음', warning: cautions.length },
      { id: 'life', label: '생활', score: waterGlasses ? Math.min(100, 45 + waterGlasses * 6) : 70, note: waterGlasses ? `물 ${waterGlasses}/8잔` : '생활 리듬 유지' },
    ]
  }, [analysis, period, records, today, weekStart])

  const totalScore = Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length)
  const goal = firstDescription(analysis?.goals)
  const caution = firstDescription(analysis?.precautions)
  const summary = analysis?.summary || '운동은 안정적이지만 식단 단백질과 생활 지표를 함께 보완하면 오늘의 웰니스 지수를 더 높일 수 있어요.'
  const periodLabel = period === 'monthly' ? '이번 달' : period === 'weekly' ? '이번 주' : '오늘'
  const rangeLabel = period === 'monthly'
    ? `${monthStart.getMonth() + 1}/${monthStart.getDate()}–${today.getMonth() + 1}/${today.getDate()} 기준`
    : period === 'weekly'
      ? `${weekStart.getMonth() + 1}/${weekStart.getDate()}–${today.getMonth() + 1}/${today.getDate()} 기준`
      : '오늘 기준'

  return <section className="analysis-lab-page">
    <div className="analysis-lab-scroll">
      <header className="analysis-lab-header"><h1>분석실</h1><span>{today.getFullYear()}. {today.getMonth() + 1}. {today.getDate()}.　▣</span></header>
      <nav className="analysis-period-tabs"><button type="button" className={period === 'daily' ? 'active' : ''} onClick={() => { setPeriod('daily'); sessionStorage.setItem('analysisPeriod', 'daily') }}>일별</button><button type="button" className={period === 'weekly' ? 'active' : ''} onClick={() => { setPeriod('weekly'); sessionStorage.setItem('analysisPeriod', 'weekly') }}>주별</button><button type="button" className={period === 'monthly' ? 'active' : ''} onClick={() => { setPeriod('monthly'); sessionStorage.setItem('analysisPeriod', 'monthly') }}>월별</button></nav>

      <article className="wellness-card">
        <div><small>종합 웰니스 지수</small><strong>{totalScore}</strong><p>{periodLabel} 기록 기준</p><span>동일 연령대 상위 {Math.max(8, 38 - Math.round(totalScore / 3))}%</span></div>
        <svg viewBox="0 0 120 120" aria-label="웰니스 지표 방사형 그래프"><g>{[20, 35, 50].map((radius) => <polygon key={radius} points={polygonPoints([radius * 2, radius * 2, radius * 2, radius * 2, radius * 2], 50)} />)}{metrics.map((_, index) => <line key={index} x1="60" y1="60" x2={60 + Math.cos(-Math.PI / 2 + Math.PI * 2 * index / 5) * 50} y2={60 + Math.sin(-Math.PI / 2 + Math.PI * 2 * index / 5) * 50} />)}<polygon className="radar-value" points={polygonPoints(metrics.map((metric) => metric.score))} /></g></svg>
        <div className="wellness-score-row">{metrics.map((metric) => <span key={metric.id}>{metric.label}<b>{metric.score}</b></span>)}</div>
      </article>

      <article className="analysis-summary-card"><header><h2>종합 분석</h2><span>{rangeLabel}</span></header><p>{summary}</p><ol><li><b>1</b>{goal || '단백질 섭취량을 목표에 맞게 보완'}</li><li><b>2</b>{caution || '오후 운동으로 활동 공백 보완'}</li><li><b>3</b>나트륨 2.3g 이하 유지 · 외식 조절</li></ol><button type="button" onClick={() => onNavigate?.('ai-chat')}>루틴에 반영하기</button></article>

      <h2 className="lab-title">검사실 4</h2>
      <div className="lab-grid">{metrics.slice(0, 4).map((metric) => { const detailPage = metric.id === 'meal' ? 'meal-analysis' : metric.id === 'exercise' ? 'exercise-analysis' : metric.id === 'body' ? 'body-analysis' : null; return <article className={detailPage ? 'clickable' : ''} role={detailPage ? 'button' : undefined} tabIndex={detailPage ? 0 : undefined} onClick={() => detailPage && onNavigate?.(detailPage)} onKeyDown={(event) => { if (detailPage && event.key === 'Enter') onNavigate?.(detailPage) }} key={metric.id}><header><strong>{metric.label}</strong>{metric.warning ? <em>주의 {metric.warning}</em> : <b>{metric.score}<small>/100</small></b>}</header><p>{metric.note}</p><div><i style={{ width: `${metric.score}%` }} /></div></article> })}</div>
      <button type="button" className="analysis-link-button">의료기록 조회 <span>›</span></button>
      <button type="button" className="analysis-link-button">종합 리포트 PDF · 의료진 공유 <span>⇧</span></button>
    </div>
    <BottomNav active="analysis" onNavigate={onNavigate} />
  </section>
}
