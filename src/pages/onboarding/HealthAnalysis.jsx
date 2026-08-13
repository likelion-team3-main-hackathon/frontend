import { useEffect, useState } from 'react'
import { createHealthAnalysis } from '../../api/health'
import './HealthAnalysis.css'

const ANALYSIS_ITEMS = [
  { label: '주의', content: '허리 부담 동작은 피하는 게 좋아요', tone: 'caution' },
  { label: '목표', content: '12주 −6kg, 주 4회 운동', tone: 'goal' },
  { label: '생활', content: '점심 12:30 · 앉아 있는 시간이 길어요', tone: 'life' },
]

export default function HealthAnalysis({ healthDocuments, onNext }) {
  const [analysisId, setAnalysisId] = useState(null)
  const selectedCount = healthDocuments?.documents?.length || 0

  useEffect(() => {
    const documentIds = healthDocuments?.documentIds || []
    if (documentIds.length === 0) return

    let isActive = true
    createHealthAnalysis(documentIds)
      .then((response) => {
        if (!isActive) return
        const nextAnalysisId = response?.data?.analysisId
        setAnalysisId(nextAnalysisId || null)
        if (nextAnalysisId) sessionStorage.setItem('latestAnalysisId', String(nextAnalysisId))
      })
      .catch(() => {
        // API 연결 전에는 목업 분석 결과를 사용합니다.
      })

    return () => { isActive = false }
  }, [healthDocuments])

  return (
    <section className="health-analysis-page">
      <div className="analysis-mask">마스코트 · 분석 완료</div>
      <h1>3가지 핵심을 찾았어요</h1>
      <p className="analysis-source-count">
        {selectedCount > 0
          ? `선택한 건강 정보 ${selectedCount}개를 분석했어요`
          : '입력한 기본 정보를 바탕으로 분석했어요'}
        {analysisId ? ` · 분석 #${analysisId}` : ''}
      </p>

      <div className="analysis-item-list">
        {ANALYSIS_ITEMS.map((item) => (
          <article key={item.label} className="analysis-item-card">
            <span className={`analysis-item-label ${item.tone}`}>{item.label}</span>
            <p>{item.content}</p>
          </article>
        ))}
      </div>

      <button type="button" className="analysis-create-button" onClick={onNext}>
        나만의 루틴 생성
      </button>
    </section>
  )
}
