import { useEffect, useMemo, useState } from 'react'
import {
  getHealthAnalyses,
  getHealthAnalysis,
  getHealthDocuments,
  getLatestHealthAnalysis,
} from '../../api/health'
import { loadHealthDocumentPreviews } from '../../utils/healthDocumentPreview'
import './MedicalRecords.css'

const CATEGORIES = [
  { id: 'VISIT', label: '진료' },
  { id: 'TEST', label: '검사' },
  { id: 'PRESCRIPTION', label: '처방' },
]
const FILTER_CATEGORIES = [{ id: 'ALL', label: '전체' }, ...CATEGORIES]

const HOSPITAL_DOCUMENT_TYPES = new Set(['MEDICAL_RECORD', 'PRESCRIPTION'])
const PRESCRIPTION_KEYWORDS = ['처방', '처방전', '복약', '투약', '약제', '약물', '용법', '의약품']
const TEST_KEYWORDS = [
  '검사', '검사결과', '검진', '혈액', '소변', '영상', '엑스레이', 'x-ray', 'ct', 'mri',
  '초음파', '내시경', '병리', '조직', '배양', '심전도', '수치', '양성', '음성',
]
const CONSTRAINT_LABELS = {
  GLUTEN_FREE: '글루텐 함유 식품을 제한한 식단 구성',
  PEANUT_FREE: '땅콩을 제외한 식단 구성',
  LOW_IMPACT: '관절 부담을 낮춘 저충격 운동 구성',
}

function constraintLabel(value) {
  return CONSTRAINT_LABELS[value] || String(value).replaceAll('_', ' ')
}

function searchableDocumentText(document, finding, medicalFindings = []) {
  const findingValues = findingTexts(finding)
  const medicalValues = medicalFindings.flatMap((item) => [item.title, item.description])
  return [document.fileName, finding?.summary, ...findingValues, ...medicalValues]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function categoryFor(document, finding, medicalFindings = []) {
  if (document.documentType === 'PRESCRIPTION') return 'PRESCRIPTION'

  const text = searchableDocumentText(document, finding, medicalFindings)
  if (PRESCRIPTION_KEYWORDS.some((keyword) => text.includes(keyword))) return 'PRESCRIPTION'
  if (TEST_KEYWORDS.some((keyword) => text.includes(keyword))) return 'TEST'
  return 'VISIT'
}

function formatDate(value) {
  if (!value) return '날짜 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function cleanFileName(value) {
  return String(value || '').replace(/\.[^.]+$/, '')
}

function findingTexts(finding) {
  return (finding?.keyFindings || []).map((item) => typeof item === 'string'
    ? item
    : [item.label, item.value].filter(Boolean).join(': ')).filter(Boolean)
}

function recordTitle(document, finding, medicalFindings = []) {
  const medicalTitle = medicalFindings.find((item) => item?.title)?.title
  const firstFinding = findingTexts(finding)[0]
  return medicalTitle || firstFinding || cleanFileName(document.fileName) || CATEGORIES.find((item) => item.id === categoryFor(document, finding, medicalFindings))?.label || '의료기록'
}

export default function MedicalRecords({ onBack }) {
  const [documents, setDocuments] = useState([])
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [previews, setPreviews] = useState(new Map())
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const objectUrls = []

    Promise.allSettled([
      getHealthDocuments(0, 100),
      getLatestHealthAnalysis(),
      getHealthAnalyses(0, 50),
    ])
      .then(async ([documentResult, analysisResult, historyResult]) => {
        if (!active) return
        const nextDocuments = documentResult.status === 'fulfilled'
          ? documentResult.value?.data?.content || []
          : []
        setDocuments(nextDocuments)
        const latestAnalysis = analysisResult.status === 'fulfilled'
          ? analysisResult.value?.data || null
          : null
        const summaries = historyResult.status === 'fulfilled'
          ? historyResult.value?.data?.content || []
          : []
        const detailResults = await Promise.allSettled(
          summaries
            .filter((item) => item.status === 'COMPLETED' && item.id !== latestAnalysis?.id)
            .map((item) => getHealthAnalysis(item.id)),
        )
        if (!active) return
        const previousAnalyses = detailResults
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value?.data)
          .filter(Boolean)
        setAnalysisHistory([latestAnalysis, ...previousAnalyses].filter(Boolean))
        if (documentResult.status === 'rejected') setError(documentResult.reason?.message || '의료기록을 불러오지 못했습니다.')

        const blobs = await loadHealthDocumentPreviews(nextDocuments.map((document) => document.documentId))
        if (!active) return
        const nextPreviews = new Map()
        blobs.forEach((blob, id) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          objectUrls.push(url)
          nextPreviews.set(String(id), { url, type: blob.type })
        })
        setPreviews(nextPreviews)
      })
      .finally(() => { if (active) setLoading(false) })

    return () => {
      active = false
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const findingsByDocumentId = useMemo(() => {
    const mapped = new Map()
    analysisHistory.forEach((item) => {
      ;(item.documentFindings || []).forEach((finding) => {
        const id = String(finding.sourceDocumentId)
        if (!mapped.has(id)) mapped.set(id, finding)
      })
    })
    return mapped
  }, [analysisHistory])

  const medicalFindingsByDocumentId = useMemo(() => {
    const grouped = new Map()
    analysisHistory.forEach((item) => {
      ;(item.medicalFindings || []).forEach((finding) => {
        const id = String(finding.sourceDocumentId)
        if (!grouped.has(id)) grouped.set(id, [])
        grouped.get(id).push(finding)
      })
    })
    return grouped
  }, [analysisHistory])

  const records = useMemo(() => documents
    .filter((document) => HOSPITAL_DOCUMENT_TYPES.has(document.documentType))
    .map((document) => {
      const finding = findingsByDocumentId.get(String(document.documentId))
      const medicalFindings = medicalFindingsByDocumentId.get(String(document.documentId)) || []
      return {
        ...document,
        category: categoryFor(document, finding, medicalFindings),
        finding,
        medicalFindings,
      }
    }), [documents, findingsByDocumentId, medicalFindingsByDocumentId])

  const counts = useMemo(() => CATEGORIES.reduce((result, category) => ({
    ...result,
    [category.id]: records.filter((record) => record.category === category.id).length,
  }), {}), [records])

  const filteredRecords = selectedCategory === 'ALL'
    ? records
    : records.filter((record) => record.category === selectedCategory)

  if (selectedDocument) {
    const preview = previews.get(String(selectedDocument.documentId))
    const keyFindings = [
      ...findingTexts(selectedDocument.finding),
      ...selectedDocument.medicalFindings.map((item) => item.title).filter(Boolean),
    ].filter((item, index, values) => values.indexOf(item) === index)
    const aiSummary = selectedDocument.finding?.summary
      || selectedDocument.medicalFindings.map((item) => item.description).filter(Boolean).join(' · ')
    const sourceAnalysis = analysisHistory.find((item) =>
      (item.documentFindings || []).some((finding) =>
        String(finding.sourceDocumentId) === String(selectedDocument.documentId)))
    const linkedPrecautions = (sourceAnalysis?.precautions || []).filter((item) =>
      typeof item === 'string'
        || !item.sourceDocumentId
        || String(item.sourceDocumentId) === String(selectedDocument.documentId))
    const analysisConstraints = [
      ...(sourceAnalysis?.nutritionConstraints || []),
      ...(sourceAnalysis?.exerciseConstraints || []),
    ].map(constraintLabel)
    const recommendationReasons = (sourceAnalysis?.routineRecommendations || [])
      .map((item) => item.rationale || item.description)
      .filter(Boolean)
    const managementItems = [
      ...linkedPrecautions.map((item) => typeof item === 'string' ? item : item.description),
      ...analysisConstraints,
      ...recommendationReasons,
    ]
      .filter(Boolean)
      .filter((item, index, values) => values.indexOf(item) === index)

    return <section className="medical-record-detail-page">
      <header><button type="button" onClick={() => setSelectedDocument(null)}>‹</button><h1>{recordTitle(selectedDocument, selectedDocument.finding, selectedDocument.medicalFindings)}</h1></header>
      <div className="medical-record-detail-scroll">
        <article><small>{selectedDocument.category === 'PRESCRIPTION' ? '처방' : 'AI 분석 요약'}</small><p>{aiSummary || '이 문서의 AI 분석 결과가 아직 준비되지 않았습니다.'}</p></article>

        <article><small>주요 확인 사항</small>{keyFindings.length
          ? <ul className="medical-key-findings-list">{keyFindings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          : <p>추출된 주요 항목이 없습니다.</p>}</article>

        <article><small>주요 확인 사항에 반영된 관리 사항</small>{managementItems.length
          ? <ul className="medical-management-list">{managementItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          : <p>이 기록에서 별도로 도출된 관리 사항이 없습니다.</p>}</article>

        <div className="medical-record-source">
          {preview?.type?.startsWith('image/')
            ? <img src={preview.url} alt={`${selectedDocument.fileName} 원본`} />
            : preview?.type === 'application/pdf'
              ? <iframe src={preview.url} title={selectedDocument.fileName} />
              : <span>원본 서명·사진<br />저장된 미리보기가 없습니다</span>}
        </div>
        <p className="medical-record-meta">{formatDate(selectedDocument.measuredAt || selectedDocument.createdAt)} · {selectedDocument.fileName || '업로드 문서'}</p>
      </div>
      <button type="button" className="medical-record-confirm" onClick={() => setSelectedDocument(null)}>확인</button>
    </section>
  }

  return <section className="medical-records-page">
    <header><button type="button" onClick={onBack}>‹</button><h1>의료기록</h1></header>
    <div className="medical-records-scroll">
      <nav>{FILTER_CATEGORIES.map((category) => <button type="button" className={selectedCategory === category.id ? 'active' : ''} onClick={() => setSelectedCategory(category.id)} key={category.id}>{category.label}</button>)}</nav>

      <section className="medical-record-summary">{CATEGORIES.map((category) => <span key={category.id}><small>{category.label}</small><strong>{counts[category.id] || 0}</strong></span>)}</section>

      <div className="medical-record-list">
        <h2>{FILTER_CATEGORIES.find((category) => category.id === selectedCategory)?.label} 기록</h2>
        {loading && <p className="medical-record-empty">의료기록을 불러오는 중…</p>}
        {!loading && error && <p className="medical-record-empty">{error}</p>}
        {!loading && !error && filteredRecords.length === 0 && <p className="medical-record-empty">등록된 기록이 없습니다.</p>}
        {filteredRecords.map((record) => <button type="button" onClick={() => setSelectedDocument(record)} key={record.documentId}>
          <span><strong>{recordTitle(record, record.finding, record.medicalFindings)}</strong><small>{record.finding?.summary || record.medicalFindings.map((item) => item.description).filter(Boolean).join(' · ') || cleanFileName(record.fileName) || 'AI 분석 대기 중'}</small><em>{formatDate(record.measuredAt || record.createdAt)}</em></span><b>›</b>
        </button>)}
      </div>
    </div>
  </section>
}
