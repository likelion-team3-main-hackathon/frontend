import { useEffect, useMemo, useState } from 'react'
import { getExerciseAnalysis } from '../../api/analysis'
import './ExerciseAnalysisLab.css'

const BAR_MAX_RATIO = 1.5
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function volumeStatus(completedSets, recommendedSets) {
  if (!recommendedSets) return { className: 'empty', label: '자료 없음' }
  const ratio = completedSets / recommendedSets
  if (ratio < .8) return { className: 'low', label: '미달' }
  if (ratio > 1.2) return { className: 'over', label: '초과' }
  return { className: 'good', label: '적정' }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function ExerciseAnalysisLab({ onBack }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const range = useMemo(() => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(to.getDate() - 27)
    return { from: dateKey(from), to: dateKey(to) }
  }, [])

  useEffect(() => {
    let active = true
    getExerciseAnalysis(range.from, range.to)
      .then((response) => { if (active) setReport(response?.data || null) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [range])

  const parts = report?.muscleGroupVolumes || []
  const dailyValues = new Map((report?.dailyTrend || []).map((day) => [day.date, day]))
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = dateKey(date)
    return dailyValues.get(key) || { date: key, completedSets: 0, durationMinutes: 0 }
  })
  const weeks = report?.weeklyVolume || []
  const maxWeekly = Math.max(...weeks.map((week) => week.completedSets), 1)
  const maxDaily = Math.max(...dailyTrend.map((day) => day.completedSets), 1)
  const lowest = parts.reduce((result, part) => !result || part.achievementRate < result.achievementRate ? part : result, null)

  return <section className="exercise-lab-page"><div className="exercise-lab-scroll">
    <header><button type="button" onClick={onBack}>‹</button><h1>운동 검사실</h1><b>{report?.score ?? '–'}/100</b></header>
    <p className="exercise-overview">최근 4주 · 완료 {report?.completedSets || 0}세트 / 권장 {report?.recommendedSets || 0}세트 · {report?.durationMinutes || 0}분</p>
    <section className="body-volume"><header><h2>부위별 볼륨</h2><span>완료 세트 / 권장 세트</span></header>{parts.length ? parts.map((part) => { const ratio = part.recommendedSets ? part.completedSets / part.recommendedSets : 0; const rate = Math.min(ratio, BAR_MAX_RATIO) / BAR_MAX_RATIO * 100; const status = volumeStatus(part.completedSets, part.recommendedSets); return <article className={status.className} key={part.muscleGroup}><strong>{part.label}</strong><div><i style={{ width: `${rate}%` }} /><em aria-label="권장 세트" /></div><b>{part.completedSets}/{part.recommendedSets}<small>{status.label} {part.recommendedSets ? `${Math.round(ratio * 100)}%` : ''}</small></b></article> }) : <p>운동 계획이나 완료 기록이 없습니다.</p>}<p className="volume-legend"><span className="low">■ 미달</span><span className="good">■ 적정</span><span className="over">■ 초과</span><span className="target">│ 권장 세트 100%</span></p><small className="volume-scale">막대 전체는 권장 세트의 150%까지 표시합니다.</small></section>
    <section className="daily-volume"><header><h2>최근 7일 운동량 추이</h2><b>완료 세트</b></header><div style={{ gridTemplateColumns: `repeat(${dailyTrend.length}, 1fr)` }}>{dailyTrend.map((day) => <span key={day.date}><b>{day.completedSets || ''}</b><i className={!day.completedSets ? 'empty' : ''} style={{ height: day.completedSets ? `${Math.max(8, day.completedSets / maxDaily * 100)}%` : '2px' }} /><small>{WEEKDAYS[new Date(`${day.date}T00:00:00`).getDay()]}</small></span>)}</div><p>기록이 없는 날은 0으로 표시합니다.</p></section>
    <section className="weekly-volume"><header><h2>주차별 훈련량</h2><b>완료 세트</b></header><div style={{ gridTemplateColumns: `repeat(${Math.max(1, weeks.length)}, 1fr)` }}>{weeks.map((week, index) => <span key={week.weekStart || index}><b>{week.completedSets || ''}</b><i className={!week.completedSets ? 'empty' : ''} style={{ height: week.completedSets ? `${Math.max(8, week.completedSets / maxWeekly * 100)}%` : '2px' }} /><small>{week.label || `${week.weekNumber || index + 1}주`}</small></span>)}</div><p>각 주의 수요일이 속한 달에 주차를 귀속합니다.</p></section>
    <section className="exercise-analysis"><h2>분석</h2><p>{error || report?.summary || '운동 기록을 불러오고 있습니다.'}</p><button type="button">다음 주에 {lowest?.label || '운동'} 반영하기</button></section>
  </div></section>
}
