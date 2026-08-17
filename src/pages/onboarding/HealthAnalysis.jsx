import { useEffect, useState } from 'react'
import { createHealthAnalysis, getLatestHealthAnalysis, waitForHealthAnalysis } from '../../api/health'
import RoutineLoading from './RoutineLoading'
import './HealthAnalysis.css'

const analysisCreationRequests = new Map()
const GOAL_LABELS = {
  WEIGHT_LOSS: '체중 감량',
  MUSCLE_GAIN: '체형 개선과 근육 강화',
  REHABILITATION: '재활과 통증 완화',
  HEALTH_METRIC_MANAGEMENT: '혈당·혈압 등 건강 수치 관리',
}

function applyCurrentGoal(analysis) {
  try {
    const draft = JSON.parse(sessionStorage.getItem('onboardingDraft') || '{}')
    const goal = draft?.goal
    if (!goal) return analysis
    const currentWeight = Number(draft?.weightKg)
    const targetWeight = Number(draft?.targetWeightKg)
    const weightDifference = currentWeight - targetWeight
    const formattedDifference = Number.isInteger(Math.abs(weightDifference))
      ? String(Math.abs(weightDifference))
      : Math.abs(weightDifference).toFixed(1)
    const weightGoal = Number.isFinite(weightDifference) && currentWeight > 0 && targetWeight > 0
      ? weightDifference > 0
        ? `${formattedDifference}kg 감량`
        : weightDifference < 0
          ? `${formattedDifference}kg 증량`
          : '현재 몸무게 유지'
      : ''
    const description = [GOAL_LABELS[goal] || goal, weightGoal].filter(Boolean).join(', ')
    return {
      ...analysis,
      goals: [{ type: goal, description }],
    }
  } catch {
    return analysis
  }
}

function createHealthAnalysisOnce(documentIds, idempotencyKey) {
  const requestKey = idempotencyKey || documentIds.join(',')
  if (!analysisCreationRequests.has(requestKey)) {
    const request = createHealthAnalysis(documentIds, idempotencyKey).catch((error) => {
      analysisCreationRequests.delete(requestKey)
      throw error
    })
    analysisCreationRequests.set(requestKey, request)
  }
  return analysisCreationRequests.get(requestKey)
}

function getAnalysisItems(analysis) {
  const firstPrecaution = analysis?.precautions?.[0]
  const precaution = typeof firstPrecaution === 'string' ? firstPrecaution : firstPrecaution?.description
  const goal = analysis?.goals?.[0]?.description
  const constraints = [
    ...(analysis?.exerciseConstraints || []),
    ...(analysis?.nutritionConstraints || []),
  ]

  const documentItems = (analysis?.documentFindings || []).map((finding, index) => ({
    label: finding.documentType === 'INBODY' ? '인바디' : finding.documentType === 'MEDICAL_RECORD' ? '진단서' : finding.documentType === 'PRESCRIPTION' ? '처방전' : `문서 ${index + 1}`,
    content: (finding.keyFindings || []).join(' · ') || finding.summary,
    tone: finding.documentType === 'INBODY' ? 'goal' : 'caution',
  }))
  const bodyComposition = (analysis?.bodyCompositionFindings || [])
    .map((finding) => `${finding.label} ${finding.value}${finding.unit || ''}${finding.interpretation ? ` (${finding.interpretation})` : ''}`)
    .join(' · ')
  const allergies = (analysis?.allergyFindings || [])
    .map((finding) => `${finding.allergen}: ${finding.result}${finding.severity ? ` (${finding.severity})` : ''}`)
    .join(' · ')

  return [
    ...documentItems,
    ...(bodyComposition ? [{ label: '체성분', content: bodyComposition, tone: 'goal' }] : []),
    ...(allergies ? [{ label: '알레르기', content: allergies, tone: 'caution' }] : []),
    { label: '주의', content: precaution || '특별한 주의사항이 확인되지 않았어요.', tone: 'caution' },
    { label: '목표', content: goal || analysis?.summary || '건강한 생활 습관을 만들어 보세요.', tone: 'goal' },
    { label: '제약', content: constraints.join(' · ') || '추가 제약 조건이 없어요.', tone: 'life' },
  ]
}

export default function HealthAnalysis({ healthDocuments, onNext, onBack, onReturnToLab }) {
  const [analysis, setAnalysis] = useState(null)
  const [status, setStatus] = useState('분석 요청 중…')
  const [error, setError] = useState('')
  const selectedCount = healthDocuments?.documents?.length || 0
  const [sourceCount, setSourceCount] = useState(selectedCount)

  useEffect(() => {
    const documentIds = healthDocuments?.documentIds || []
    const controller = new AbortController()

    if (documentIds.length === 0 && !healthDocuments?.useExisting) {
      setError('분석할 건강 문서가 없습니다.')
      return () => controller.abort()
    }

    async function analyze() {
      try {
        if (healthDocuments?.useExisting) {
          setStatus('기존 건강 정보를 불러오고 있어요…')
          const latestResponse = await getLatestHealthAnalysis()
          const latestAnalysis = latestResponse?.data
          if (!latestAnalysis?.id) throw new Error('저장된 건강 분석 정보를 찾지 못했습니다.')
          setSourceCount(latestAnalysis.documentFindings?.length || 0)
          setAnalysis(applyCurrentGoal(latestAnalysis))
          setStatus('기존 분석과 변경한 목표를 반영했어요')
          return
        }
        const response = await createHealthAnalysisOnce(
          documentIds,
          healthDocuments.analysisRequestKey || crypto.randomUUID(),
        )
        const analysisId = response?.data?.analysisId

        if (!analysisId) throw new Error('분석 작업 ID를 받지 못했습니다.')

        sessionStorage.setItem('latestAnalysisId', String(analysisId))
        setStatus('건강 정보를 분석하고 있어요…')
        const result = await waitForHealthAnalysis(analysisId, controller.signal)
        setAnalysis(applyCurrentGoal(result))
        setStatus('분석 완료')
      } catch (requestError) {
        if (requestError?.name !== 'AbortError') {
          setStatus('분석 실패')
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

  if (!analysis && !error) {
    return <RoutineLoading message={status} />
  }

  return (
    <section className="health-analysis-page">
      <header className="health-analysis-header">
        <button type="button" className="onboarding-analysis-back" onClick={onBack} aria-label="직전 페이지로 돌아가기">‹</button>
      </header>
      <div className="analysis-mask">마스코트 · {status}</div>
      <h1>{analysis ? `${analysis.documentFindings?.length || sourceCount}개 문서와 목표를 종합했어요` : '건강 정보를 확인하고 있어요'}</h1>
      <p className="analysis-source-count">
        {healthDocuments?.useExisting ? `기존 분석 정보 ${sourceCount}개와 변경한 목표를 반영합니다` : `선택한 건강 정보 ${sourceCount}개를 분석합니다`}
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
      {onReturnToLab && (
        <button
          type="button"
          className="analysis-return-lab-button"
          disabled={!analysis}
          onClick={onReturnToLab}
        >
          체성분 검사실로 돌아가기
        </button>
      )}
    </section>
  )
}
