import { useEffect, useState } from 'react'
import { createHealthAnalysis, waitForHealthAnalysis } from '../../api/health'
import './HealthAnalysis.css'

function getAnalysisItems(analysis) {
  const precaution = analysis?.precautions?.[0]?.description
  const goal = analysis?.goals?.[0]?.description
  const constraints = [
    ...(analysis?.exerciseConstraints || []),
    ...(analysis?.nutritionConstraints || []),
  ]

  return [
    { label: '주의', content: precaution || '특별한 주의사항이 확인되지 않았어요.', tone: 'caution' },
    { label: '목표', content: goal || analysis?.summary || '건강한 생활 습관을 만들어 보세요.', tone: 'goal' },
    { label: '제약', content: constraints.join(' · ') || '추가 제약 조건이 없어요.', tone: 'life' },
  ]
}

export default function HealthAnalysis({ healthDocuments, onNext, onBack }) {
  const [analysis, setAnalysis] = useState(null)
  const [status, setStatus] = useState('분석 요청 중…')
  const [error, setError] = useState('')
  const selectedCount = healthDocuments?.documents?.length || 0

  useEffect(() => {
    const documentIds = healthDocuments?.documentIds || []
    const controller = new AbortController()

    if (documentIds.length === 0) {
      setError('분석할 건강 문서가 없습니다.')
      return () => controller.abort()
    }

    async function analyze() {
      try {
        const response = await createHealthAnalysis(
          documentIds,
          healthDocuments.analysisRequestKey,
        )
        const analysisId = response?.data?.analysisId

        if (!analysisId) throw new Error('분석 작업 ID를 받지 못했습니다.')

        sessionStorage.setItem('latestAnalysisId', String(analysisId))
        setStatus('건강 정보를 분석하고 있어요…')
        const result = await waitForHealthAnalysis(analysisId, controller.signal)
        setAnalysis(result)
        setStatus('분석 완료')
      } catch (requestError) {
        if (requestError?.name !== 'AbortError') {
          setError(
            requestError instanceof Error
              ? requestError.message
              : '건강 분석에 실패했습니다.',
          )
        }
      }
    }

    analyze()
    return () => controller.abort()
  }, [healthDocuments])

  const items = getAnalysisItems(analysis)

  return (
    <section className="health-analysis-page">
      <div className="analysis-mask">마스코트 · {status}</div>
      <h1>{analysis ? '3가지 핵심을 찾았어요' : '건강 정보를 확인하고 있어요'}</h1>
      <p className="analysis-source-count">
        선택한 건강 정보 {selectedCount}개를 분석합니다
        {analysis?.id ? ` · 분석 #${analysis.id}` : ''}
      </p>

      {analysis && (
        <div className="analysis-item-list">
          {items.map((item) => (
            <article key={item.label} className="analysis-item-card">
              <span className={`analysis-item-label ${item.tone}`}>{item.label}</span>
              <p>{item.content}</p>
            </article>
          ))}
        </div>
      )}

      {error && <p className="analysis-error" role="alert">{error}</p>}

      {error && (
        <button type="button" className="analysis-back-button" onClick={onBack}>
          문서 다시 선택
        </button>
      )}
      <button
        type="button"
        className="analysis-create-button"
        disabled={!analysis}
        onClick={() => onNext?.(analysis)}
      >
        나만의 루틴 생성
      </button>
    </section>
  )
}
