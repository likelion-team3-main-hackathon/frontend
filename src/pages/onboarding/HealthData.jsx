import { useRef, useState } from 'react'
import { uploadHealthDocument } from '../../api/health'
import './HealthData.css'

const INITIAL_DOCUMENTS = [
  {
    id: 'apple-health',
    title: '애플 건강',
    description: '걸음·체중·수면 연동',
    action: '연동',
    documentType: 'AAC_RESULT',
    accept: '.json,.xml,.csv,application/json,text/xml,text/csv',
  },
  {
    id: 'inbody',
    title: '인바디 결과지',
    description: '사진 찍으면 AI가 읽음',
    action: '촬영',
    documentType: 'INBODY',
    accept: 'image/*',
  },
  {
    id: 'medical-record',
    title: '병원 진료·처방',
    description: '사진 또는 PDF 추가',
    action: '추가',
    documentType: 'MEDICAL_RECORD',
    accept: 'image/*,.pdf,application/pdf',
  },
]

export default function HealthData({ onNext, onBack }) {
  const fileInputRef = useRef(null)
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS)
  const [activeIndex, setActiveIndex] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function openFilePicker(index) {
    setActiveIndex(index)
    fileInputRef.current.accept = documents[index].accept
    fileInputRef.current.click()
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0]
    if (!file || activeIndex === null) return

    setDocuments((current) => current.map((document, index) =>
      index === activeIndex
        ? { ...document, file, fileName: file.name }
        : document,
    ))
    setError('')
    event.target.value = ''
  }

  async function handleNext() {
    const selectedDocuments = documents.filter((document) => document.file)

    if (selectedDocuments.length === 0) {
      onNext?.({ documents: [], documentIds: [] })
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const responses = await Promise.all(selectedDocuments.map((document) =>
        uploadHealthDocument(document.file, document.documentType),
      ))
      const documentIds = responses
        .map((response) => response?.data?.documentId)
        .filter(Boolean)

      onNext?.({ documents: selectedDocuments, documentIds })
    } catch {
      // 로그인/API 연결 전에도 선택한 자료로 목업 분석 흐름을 확인할 수 있습니다.
      onNext?.({ documents: selectedDocuments, documentIds: [] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="health-data-page">
      <header className="health-data-header">
        <button type="button" className="health-back-button" onClick={onBack} aria-label="뒤로 가기">‹</button>
        <div className="health-progress-track"><span /></div>
        <span>8 / 8</span>
      </header>

      <div className="health-data-content">
        <h1>가진 정보가 있으면<br />한 번에 불러올게요</h1>

        <div className="health-document-list">
          {documents.map((document, index) => (
            <article key={document.id} className="health-document-card">
              <div>
                <h2>{document.title}</h2>
                <p>{document.fileName || document.description}</p>
              </div>
              <button
                type="button"
                className={`document-action ${document.file ? 'completed' : ''}`}
                onClick={() => openFilePicker(index)}
              >
                {document.file ? '완료' : document.action}
              </button>
            </article>
          ))}
        </div>
        {error && <p className="health-data-error">{error}</p>}
      </div>

      <input ref={fileInputRef} className="hidden-file-input" type="file" onChange={handleInputChange} />

      <footer className="health-data-actions">
        <button type="button" className="health-next-button" onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? '불러오는 중…' : '다음'}
        </button>
        <button type="button" className="health-later-button" onClick={() => onNext?.({ documents: [], documentIds: [] })}>
          나중에
        </button>
      </footer>
    </section>
  )
}
