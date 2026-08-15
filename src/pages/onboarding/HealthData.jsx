import { useRef, useState } from 'react'
import { uploadHealthDocument } from '../../api/health'
import { saveHealthDocumentPreview } from '../../utils/healthDocumentPreview'
import './HealthData.css'

const INITIAL_DOCUMENTS = [
  {
    id: 'mcc-result',
    title: 'MCC 검사 결과',
    description: '검사 결과 사진 또는 PDF',
    action: '추가',
    documentType: 'MCC_RESULT',
    accept: 'image/jpeg,image/png,.pdf,application/pdf',
  },
  {
    id: 'inbody',
    title: '인바디 결과지',
    description: '사진 찍으면 AI가 읽음',
    action: '촬영',
    documentType: 'INBODY',
    accept: 'image/jpeg,image/png,.pdf,application/pdf',
  },
  {
    id: 'medical-record',
    title: '병원 진료·처방',
    description: '사진 또는 PDF 추가',
    action: '추가',
    documentType: 'MEDICAL_RECORD',
    accept: 'image/jpeg,image/png,.pdf,application/pdf',
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
      setError('분석에 사용할 건강 문서를 하나 이상 선택해 주세요.')
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
      await Promise.all(responses.map((response, index) => saveHealthDocumentPreview(response?.data?.documentId, selectedDocuments[index]?.file).catch(() => {})))

      onNext?.({
        documents: selectedDocuments,
        documentIds,
        analysisRequestKey: crypto.randomUUID(),
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '건강 문서를 업로드하지 못했습니다.',
      )
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
        <button type="button" className="health-later-button" onClick={() => onNext?.(null)}>
          나중에
        </button>
      </footer>
    </section>
  )
}
