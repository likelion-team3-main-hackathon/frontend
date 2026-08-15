import { useEffect, useMemo, useState } from 'react'
import { getHealthDocuments } from '../../api/health'
import { loadHealthDocumentPreviews } from '../../utils/healthDocumentPreview'
import './HealthRecordsPage.css'

const TYPE_META = {
  INBODY: { label: '인바디 (AAC)', description: '체성분 검사 기록' },
  MEDICAL_RECORD: { label: '진료기록', description: '병원 진료 기록' },
  PRESCRIPTION: { label: '처방전', description: '약 처방 기록' },
  MCC_RESULT: { label: '알레르기 검사', description: 'MCC 검사 결과' },
  OTHER: { label: '기타 건강정보', description: '추가 건강 문서' },
}

function formatDate(value) {
  if (!value) return '날짜 정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

export default function HealthRecordsPage({ onBack, onAdd }) {
  const [documents, setDocuments] = useState([])
  const [previewUrls, setPreviewUrls] = useState(new Map())
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const objectUrls = []
    getHealthDocuments(0, 100).then(async (response) => {
      const content = response?.data?.content || []
      if (!active) return
      setDocuments(content)
      const previews = await loadHealthDocumentPreviews(content.map((document) => document.documentId))
      if (!active) return
      const urls = new Map()
      previews.forEach((blob, id) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        objectUrls.push(url)
        urls.set(id, { url, type: blob.type })
      })
      setPreviewUrls(urls)
    }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false; objectUrls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [])

  const counts = useMemo(() => documents.reduce((result, document) => ({ ...result, [document.documentType]: (result[document.documentType] || 0) + 1 }), {}), [documents])
  const filtered = selectedType === 'ALL' ? documents : documents.filter((document) => document.documentType === selectedType)
  const categories = Object.entries(TYPE_META).filter(([type]) => counts[type]).map(([type, meta]) => ({ type, ...meta, count: counts[type] }))
  const currentPreview = selectedDocument ? previewUrls.get(String(selectedDocument.documentId)) : null

  return <section className="health-records-page">
    <header><button type="button" onClick={onBack}>‹</button><h1>건강정보 · 진료기록</h1></header>
    <div className="health-records-scroll">
      <p>연결된 {documents.length}건 · 업로드 기록 {documents.length}</p>
      <div className="health-record-categories">
        <button type="button" className={selectedType === 'ALL' ? 'active' : ''} onClick={() => setSelectedType('ALL')}><span><strong>전체 기록</strong><small>업로드한 모든 문서</small></span><b>{documents.length}건</b></button>
        {categories.map((category) => <button type="button" className={selectedType === category.type ? 'active' : ''} key={category.type} onClick={() => setSelectedType(category.type)}><span><strong>{category.label}</strong><small>{category.description}</small></span><b>{category.count}건</b></button>)}
      </div>

      <div className="health-upload-list">
        <h2>{selectedType === 'ALL' ? '업로드한 기록 전체' : TYPE_META[selectedType]?.label}</h2>
        {loading && <p className="health-record-empty">기록을 불러오는 중…</p>}
        {!loading && !filtered.length && <p className="health-record-empty">업로드한 기록이 없습니다.</p>}
        {filtered.map((document) => { const preview = previewUrls.get(String(document.documentId)); return <button type="button" key={document.documentId} onClick={() => setSelectedDocument(document)}>
          <div className="health-record-thumb">{preview?.type?.startsWith('image/') ? <img src={preview.url} alt="" /> : <span>{String(document.fileName || '').toLowerCase().endsWith('.pdf') ? 'PDF' : '사진'}</span>}</div>
          <span><strong>{document.fileName || TYPE_META[document.documentType]?.label}</strong><small>{TYPE_META[document.documentType]?.label} · {formatDate(document.measuredAt || document.createdAt)}</small></span><em className={document.processingStatus === 'PROCESSED' ? 'done' : ''}>{document.processingStatus === 'PROCESSED' ? '분석 완료' : document.processingStatus === 'FAILED' ? '분석 실패' : '업로드됨'}</em><b>›</b>
        </button> })}
      </div>
      <button type="button" className="health-record-add" onClick={onAdd}>＋ 건강정보 추가</button>
    </div>

    {selectedDocument && <div className="health-record-modal" role="dialog" aria-modal="true"><article><header><div><strong>{selectedDocument.fileName}</strong><small>{TYPE_META[selectedDocument.documentType]?.label} · {formatDate(selectedDocument.measuredAt || selectedDocument.createdAt)}</small></div><button type="button" onClick={() => setSelectedDocument(null)}>×</button></header><div className="health-record-original">{currentPreview?.type?.startsWith('image/') ? <img src={currentPreview.url} alt={selectedDocument.fileName} /> : currentPreview?.type === 'application/pdf' ? <iframe src={currentPreview.url} title={selectedDocument.fileName} /> : <div><b>원본 미리보기를 불러올 수 없어요</b><p>이전에 업로드한 파일은 백엔드 원본 조회 API가 추가되면 이 화면에서 확인할 수 있습니다.</p></div>}</div></article></div>}
  </section>
}
