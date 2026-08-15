import { useEffect, useMemo, useState } from 'react'
import { getHealthAnalyses, getHealthDocuments, getLatestHealthAnalysis } from '../../api/health'
import { buildBodyCompositionHistory } from '../../utils/analysisMetrics'
import './BodyCompositionLab.css'

function findingsOf(analysis) { return Array.isArray(analysis?.bodyCompositionFindings) ? analysis.bodyCompositionFindings : [] }
function matchFinding(findings, patterns) { return findings.find((finding) => patterns.some((pattern) => pattern.test(String(finding.label || '')))) }
function metric(findings, patterns, fallback) { const found = matchFinding(findings, patterns); return found ? { ...fallback, ...found, value: Number(found.value) } : fallback }
function shortDate(value, fallback) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : fallback }
function signedChange(current, previous) { if (!Number.isFinite(current) || !Number.isFinite(previous)) return null; const value = current - previous; return Math.abs(value) < .05 ? '유지' : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}` }
function graphLine(points, key) {
  const available = points.filter((point) => Number.isFinite(point[key]))
  if (!available.length) return ''
  const values = available.map((point) => point[key]); const min = Math.min(...values) - .5; const max = Math.max(...values) + .5
  return points.map((point, index) => Number.isFinite(point[key]) ? `${8 + index * (84 / Math.max(1, points.length - 1))},${72 - (point[key] - min) / Math.max(1, max - min) * 55}` : null).filter(Boolean).join(' ')
}

export default function BodyCompositionLab({ onBack }) {
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    let active = true
    Promise.allSettled([getLatestHealthAnalysis(), getHealthAnalyses(0, 10), getHealthDocuments(0, 50)]).then(([latestResult, historyResult, documentsResult]) => {
      if (!active) return
      if (latestResult.status === 'fulfilled') setLatest(latestResult.value?.data || null)
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value?.data?.content || [])
      if (documentsResult.status === 'fulfilled') setDocuments(documentsResult.value?.data?.content || [])
    })
    return () => { active = false }
  }, [])

  const historyPoints = useMemo(() => {
    const analyses = [...history]
    if (latest?.id && !analyses.some((analysis) => analysis.id === latest.id)) analyses.push(latest)
    return buildBodyCompositionHistory(analyses, documents, 3).map((point) => ({ ...point, date: shortDate(point.measuredAt, '측정일 없음') }))
  }, [documents, history, latest])
  const currentPoint = historyPoints.at(-1) || {}
  const previousPoint = historyPoints.at(-2) || {}
  const findings = findingsOf(currentPoint.analysis)
  const weight = { ...metric(findings, [/체중|weight/i], { label: '체중', unit: 'kg' }), value: currentPoint.weight, interpretation: signedChange(currentPoint.weight, previousPoint.weight) || (historyPoints.length === 1 ? '첫 기록' : '–') }
  const bodyFat = { ...metric(findings, [/체지방률|body fat.*%|fat percentage/i], { label: '체지방률', unit: '%' }), value: currentPoint.bodyFat, interpretation: signedChange(currentPoint.bodyFat, previousPoint.bodyFat) || (historyPoints.length === 1 ? '첫 기록' : '–') }
  const muscle = { ...metric(findings, [/골격근량|근육량|skeletal muscle/i], { label: '골격근량', unit: 'kg' }), value: currentPoint.muscle, interpretation: signedChange(currentPoint.muscle, previousPoint.muscle) || (historyPoints.length === 1 ? '첫 기록' : '–') }
  const weightLine = graphLine(historyPoints, 'weight')
  const fatLine = graphLine(historyPoints, 'bodyFat')

  const segments = useMemo(() => {
    const definitions = [
      ['팔', [/팔.*근육|arm.*muscle/i], [/팔.*지방|arm.*fat/i]],
      ['몸통', [/몸통.*근육|trunk.*muscle/i], [/몸통.*지방|trunk.*fat/i]],
      ['다리', [/다리.*근육|leg.*muscle/i], [/다리.*지방|leg.*fat/i]],
      ['체지방', [/골격근량|근육량/i], [/체지방률|body fat/i]],
    ]
    return definitions.map(([label, musclePatterns, fatPatterns]) => {
      const muscleValue = matchFinding(findings, musclePatterns)
      const fatValue = matchFinding(findings, fatPatterns)
      return { label, muscle: muscleValue ? Math.min(100, Number(muscleValue.value) * 3) : 0, fat: fatValue ? Math.min(100, Number(fatValue.value) * 3) : 0 }
    })
  }, [findings])
  const interpretations = findings.map((finding) => finding.interpretation).filter(Boolean)
  const cautionCount = interpretations.filter((text) => /높|초과|주의|부족|낮/i.test(text)).length
  const score = findings.length ? Math.max(45, Math.min(100, 86 - cautionCount * 7)) : 0

  return <section className="body-lab-page"><div className="body-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>체성분 검사실</h1><b>{score}/100</b></header><p className="body-lab-subtitle">인바디 사진 · 최근 {historyPoints.length}회 (측정일 기준)</p>
    <section className="body-trend"><header><h2>체중 · 체지방 추이</h2><span><i />체중　<i />체지방</span></header>{historyPoints.length ? <><svg viewBox="0 0 100 82" preserveAspectRatio="none">{weightLine && <polyline className="weight-line" points={weightLine} />}{fatLine && <polyline className="fat-line" points={fatLine} />}{weightLine.split(' ').filter(Boolean).map((point) => { const [cx, cy] = point.split(','); return <circle className="weight-dot" key={`w-${point}`} cx={cx} cy={cy} r="1.8" /> })}{fatLine.split(' ').filter(Boolean).map((point) => { const [cx, cy] = point.split(','); return <circle className="fat-dot" key={`f-${point}`} cx={cx} cy={cy} r="1.5" /> })}</svg><div className="body-trend-dates">{historyPoints.map((point, index) => <span key={`${point.date}-${index}`}>{point.date}</span>)}</div></> : <p className="body-empty-history">분석이 완료된 인바디 기록이 없습니다.</p>}<div className="body-summary-metrics">{[weight, bodyFat, muscle].map((item) => <article key={item.label}><small>{item.label}</small><strong>{Number.isFinite(item.value) ? item.value : '–'}<em>{Number.isFinite(item.value) ? item.unit : ''}</em></strong><b className={String(item.interpretation).startsWith('+') ? 'increase' : ''}>{item.interpretation || '–'}</b></article>)}</div></section>
    <section className="segment-comparison"><h2>부위별 근육 · 지방 (좌우 비교)</h2>{segments.map((segment) => <article key={segment.label}><div><i style={{ width: `${segment.muscle}%` }} /></div><strong>{segment.label}</strong><div><i style={{ width: `${segment.fat}%` }} /></div></article>)}<footer><span>왼쪽</span><span>오른쪽</span></footer></section>
    <section className="body-lab-analysis"><h2>분석</h2><p>{currentPoint.analysis?.summary || (historyPoints.length ? `${muscle.label} ${muscle.value ?? '–'}${muscle.unit}, ${bodyFat.label} ${bodyFat.value ?? '–'}${bodyFat.unit}로 분석됐어요.` : '업로드된 인바디 사진의 분석이 완료되면 최근 3회 변화가 표시됩니다.')}</p><button type="button">AAC 인바디 재측정 예약하기</button></section>
  </div></section>
}
