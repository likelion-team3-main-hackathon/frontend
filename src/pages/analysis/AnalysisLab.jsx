import { useEffect, useMemo, useState } from 'react'
import { getAnalysisOverview } from '../../api/analysis'
import BottomNav from '../../components/layout/BottomNav'
import './AnalysisLab.css'

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function polygonPoints(values, radius = 48, center = 60) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
    const distance = radius * value / 100
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`
  }).join(' ')
}

export default function AnalysisLab({ onNavigate }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(() => sessionStorage.getItem('analysisPeriod') || 'daily')
  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => dateKey(today), [today])
  const [selectedDate, setSelectedDate] = useState(() => sessionStorage.getItem('analysisAnchorDate') || todayKey)
  useEffect(() => {
    let active = true
    setError('')
    getAnalysisOverview(period, selectedDate)
      .then((response) => { if (active) setReport(response?.data || null) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [period, selectedDate])

  const selectedDateValue = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate])

  const periodMetrics = useMemo(() => {
    const idByType = {
      MEAL: 'meal',
      EXERCISE: 'exercise',
      BODY_FAT: 'fat',
      SKELETAL_MUSCLE: 'muscle',
      HEALTH_MANAGEMENT: 'health',
    }
    const body = (report?.labPreviews || []).find((metric) => metric.type === 'BODY_COMPOSITION')
    const legacyMetrics = (report?.metrics || []).filter((metric) => metric.type === 'MEAL' || metric.type === 'EXERCISE')
    const fallback = [
      legacyMetrics.find((metric) => metric.type === 'MEAL') || { type: 'MEAL', label: '식단', score: null, status: 'INSUFFICIENT_DATA' },
      legacyMetrics.find((metric) => metric.type === 'EXERCISE') || { type: 'EXERCISE', label: '운동', score: null, status: 'INSUFFICIENT_DATA' },
      { type: 'BODY_FAT', label: '지방', score: body?.score ?? null, status: body?.status, note: '체성분 체지방 기준' },
      { type: 'SKELETAL_MUSCLE', label: '근육', score: body?.score ?? null, status: body?.status, note: '체성분 골격근 기준' },
      { type: 'HEALTH_MANAGEMENT', label: '건강 관리', score: 80, status: 'MOCK', note: '임상·의료기록 연동 전 임시 점수' },
    ]
    return (report?.wellnessAxes || fallback).map((metric) => ({ ...metric, id: idByType[metric.type] || metric.type.toLowerCase() }))
  }, [report])

  const labMetrics = useMemo(() => {
    const idByType = { MEAL: 'meal', EXERCISE: 'exercise', BODY_COMPOSITION: 'body' }
    return [
      ...(report?.labPreviews || []).map((metric) => ({ ...metric, id: idByType[metric.type] })),
      { id: 'clinical', label: '건강 관리', score: null, status: 'COMING_SOON', note: '임상·의료기록 검사실은 추후 제공 예정이에요.' },
    ]
  }, [report])

  const totalScore = report?.overallScore
  const summary = report?.summary || '기록을 추가하면 종합 분석을 확인할 수 있어요.'
  const recommendations = report?.recommendations || []
  const periodLabel = period === 'monthly' ? '선택한 달' : period === 'weekly' ? '선택한 주' : '선택한 날짜'
  const rangeLabel = report?.period ? `${report.period.from}–${report.period.to}` : '조회 중'

  return <section className="analysis-lab-page">
    <div className="analysis-lab-scroll">
      <header className="analysis-lab-header"><h1>분석실</h1><label className="analysis-date-picker"><span>{selectedDateValue.getFullYear()}. {selectedDateValue.getMonth() + 1}. {selectedDateValue.getDate()}.</span><input type="date" value={selectedDate} max={todayKey} aria-label="분석 기준 날짜 선택" onChange={(event) => { const value = event.target.value; if (!value) return; setSelectedDate(value); sessionStorage.setItem('analysisAnchorDate', value) }} /></label></header>
      <nav className="analysis-period-tabs"><button type="button" className={period === 'daily' ? 'active' : ''} onClick={() => { setPeriod('daily'); sessionStorage.setItem('analysisPeriod', 'daily') }}>일별</button><button type="button" className={period === 'weekly' ? 'active' : ''} onClick={() => { setPeriod('weekly'); sessionStorage.setItem('analysisPeriod', 'weekly') }}>주별</button><button type="button" className={period === 'monthly' ? 'active' : ''} onClick={() => { setPeriod('monthly'); sessionStorage.setItem('analysisPeriod', 'monthly') }}>월별</button></nav>

      <article className="wellness-card">
        <div><small>종합 웰니스 지수</small><strong>{totalScore ?? '–'}</strong><p>{periodLabel} 기록 기준</p><span>{report?.status === 'INSUFFICIENT_DATA' ? '분석할 기록이 더 필요해요' : '실제 기록 기반 점수'}</span></div>
        <svg viewBox="0 0 120 120" aria-label="웰니스 지표 방사형 그래프"><g>{[20, 35, 50].map((radius) => <polygon key={radius} points={polygonPoints(periodMetrics.map(() => radius * 2), 50)} />)}{periodMetrics.map((_, index) => <line key={index} x1="60" y1="60" x2={60 + Math.cos(-Math.PI / 2 + Math.PI * 2 * index / Math.max(1, periodMetrics.length)) * 50} y2={60 + Math.sin(-Math.PI / 2 + Math.PI * 2 * index / Math.max(1, periodMetrics.length)) * 50} />)}{periodMetrics.length > 2 && <polygon className="radar-value" points={polygonPoints(periodMetrics.map((metric) => metric.score || 0))} />}</g></svg>
        <div className="wellness-score-row" style={{ gridTemplateColumns: `repeat(${Math.max(1, periodMetrics.length)}, 1fr)` }}>{periodMetrics.map((metric) => <span key={metric.id}>{metric.label}<b>{metric.score ?? '–'}</b></span>)}</div>
      </article>

      <article className="analysis-summary-card"><header><h2>종합 분석</h2><span>{rangeLabel}</span></header><p>{error || summary}</p><ol>{recommendations.map((item, index) => <li key={item}><b>{index + 1}</b>{item}</li>)}</ol><button type="button" onClick={() => onNavigate?.('ai-chat')}>루틴에 반영하기</button></article>

      <h2 className="lab-title">검사실 4</h2>
      <div className="lab-grid">{labMetrics.map((metric) => { const detailPage = metric.id === 'meal' ? 'meal-analysis' : metric.id === 'exercise' ? 'exercise-analysis' : metric.id === 'body' ? 'body-analysis' : null; return <article className={detailPage ? 'clickable' : ''} role={detailPage ? 'button' : undefined} tabIndex={detailPage ? 0 : undefined} onClick={() => detailPage && onNavigate?.(detailPage)} onKeyDown={(event) => { if (detailPage && event.key === 'Enter') onNavigate?.(detailPage) }} key={metric.id}><header><strong>{metric.label}</strong><b>{metric.score != null ? <>{metric.score}<small>/100</small></> : metric.badge || (metric.status === 'COMING_SOON' ? '예정' : '–')}</b></header><p>{metric.note}</p><div><i style={{ width: `${metric.score || 0}%` }} /></div></article> })}</div>
      <button type="button" className="analysis-link-button">의료기록 조회 <span>›</span></button>
      <button type="button" className="analysis-link-button">종합 리포트 PDF · 의료진 공유 <span>⇧</span></button>
    </div>
    <BottomNav active="analysis" onNavigate={onNavigate} />
  </section>
}
