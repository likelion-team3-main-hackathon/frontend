import { useEffect, useMemo, useState } from 'react'
import { getBodyCompositionAnalysis } from '../../api/analysis'
import './BodyCompositionLab.css'

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function graphLine(points, dates) {
  if (!points.length) return ''
  const values = points.map((point) => Number(point.value))
  const min = Math.min(...values) - .5
  const max = Math.max(...values) + .5
  return points.map((point) => {
    const dateIndex = Math.max(0, dates.indexOf(point.date))
    const x = 8 + dateIndex * (84 / Math.max(1, dates.length - 1))
    const y = 72 - (Number(point.value) - min) / Math.max(1, max - min) * 55
    return `${x},${y}`
  }).join(' ')
}

function change(points) {
  if (points.length < 2) return points.length ? '첫 기록' : '–'
  const value = Number(points.at(-1).value) - Number(points.at(-2).value)
  return Math.abs(value) < .05 ? '유지' : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`
}

export default function BodyCompositionLab({ onBack, onUpload }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const range = useMemo(() => {
    const anchorDate = sessionStorage.getItem('analysisAnchorDate')
    const to = anchorDate ? new Date(`${anchorDate}T00:00:00`) : new Date()
    const from = new Date(to)
    from.setFullYear(to.getFullYear() - 5)
    return { from: dateKey(from), to: dateKey(to) }
  }, [])

  useEffect(() => {
    let active = true
    getBodyCompositionAnalysis(range.from, range.to)
      .then((response) => { if (active) setReport(response?.data || null) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [range])

  const trends = report?.trends || {}
  const weights = trends.weight || []
  const fats = trends.bodyFatPercent || []
  const muscles = trends.skeletalMuscleMass || []
  const dates = [...new Set([...weights, ...fats, ...muscles].map((point) => point.date))].sort()
  const weightLine = graphLine(weights, dates)
  const fatLine = graphLine(fats, dates)
  const muscleLine = graphLine(muscles, dates)
  const insufficient = report?.status === 'INSUFFICIENT_DATA'
  const metrics = [
    ['체중', report?.latest?.weightKg, 'kg', change(weights)],
    ['체지방률', report?.latest?.bodyFatPercent, '%', change(fats)],
    ['골격근량', report?.latest?.skeletalMuscleMassKg, 'kg', change(muscles)],
  ]

  return <section className="body-lab-page"><div className="body-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>체성분 검사실</h1><b>{report?.score ?? '–'}/100</b></header><p className="body-lab-subtitle">인바디 등 체성분 문서에서 추출한 측정값 기준</p>
    {insufficient ? <section className="body-data-required"><h2>체성분 자료가 필요해요</h2><p>{report.message}</p><p>인바디 사진이나 체성분 검사 파일을 올리면 체중·체지방률·골격근량과 좌우 부위별 측정값을 분석합니다.</p><button type="button" onClick={onUpload}>{report.action?.label || '인바디 파일 등록하기'}</button></section> : <>
      <section className="body-trend"><header><h2>체중 · 체지방 · 골격근량 추이</h2><span><i />체중　<i />체지방　<i />골격근량</span></header>{dates.length ? <><svg viewBox="0 0 100 82" preserveAspectRatio="none">{weightLine && <polyline className="weight-line" points={weightLine} />}{fatLine && <polyline className="fat-line" points={fatLine} />}{muscleLine && <polyline className="muscle-line" points={muscleLine} />}</svg><div className="body-trend-dates">{dates.map((date) => <span key={date}>{shortDate(date)}</span>)}</div></> : <p className="body-empty-history">추이로 표시할 측정값이 부족합니다.</p>}<div className="body-summary-metrics">{metrics.map(([label, value, unit, interpretation]) => <article key={label}><small>{label}</small><strong>{value ?? '–'}<em>{value != null ? unit : ''}</em></strong><b className={String(interpretation).startsWith('+') ? 'increase' : ''}>{interpretation}</b></article>)}</div></section>
      <section className="segment-comparison"><h2>부위별 근육 · 지방 (좌우 비교)</h2>{(report?.segmentalComparison || []).length ? report.segmentalComparison.map((segment) => { const muscleMax = Math.max(Number(segment.leftMuscleKg || 0), Number(segment.rightMuscleKg || 0), 1); return <article key={segment.bodyPart}><div><i style={{ width: `${Number(segment.leftMuscleKg || 0) / muscleMax * 100}%` }} /></div><strong>{segment.bodyPart}</strong><div><i style={{ width: `${Number(segment.rightMuscleKg || 0) / muscleMax * 100}%` }} /></div><small>근육 {segment.leftMuscleKg ?? '–'} / {segment.rightMuscleKg ?? '–'}kg<br />지방 {segment.leftFatKg ?? '–'} / {segment.rightFatKg ?? '–'}kg</small></article> }) : <p>부위별 좌우 측정값이 포함된 자료가 없습니다.</p>}<footer><span>왼쪽</span><span>오른쪽</span></footer></section>
      <section className="body-lab-analysis"><h2>분석</h2><p>{report?.status === 'PARTIAL' ? '측정 기록이 1회라 현재 수치만 표시합니다. 다음 측정부터 변화 추이를 확인할 수 있어요.' : '저장된 체성분 측정 이력을 날짜순으로 비교한 결과입니다.'}</p><button type="button" onClick={onUpload}>체성분 자료 추가하기</button></section>
    </>}
    {error && <section className="body-data-required"><p>{error}</p></section>}
  </div></section>
}
