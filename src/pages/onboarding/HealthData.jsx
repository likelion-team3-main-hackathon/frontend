import { useRef, useState } from 'react'
import { uploadHealthDocument } from '../../api/health'
import { saveHealthDocumentPreview } from '../../utils/healthDocumentPreview'
import { randomId } from '../../utils/randomId'
import './HealthData.css'

const UPLOAD_CATEGORIES = [
  { id: 'inbody', title: '인바디 결과지', description: '사진 찍으면 AI가 읽음', action: '촬영', documentType: 'INBODY', accept: 'image/jpeg,image/png,.pdf,application/pdf' },
  { id: 'medical-record', title: '병원 진료·처방', description: '사진 또는 PDF 추가', action: '추가', documentType: 'MEDICAL_RECORD', accept: 'image/jpeg,image/png,.pdf,application/pdf' },
]

function fileEntry(file) {
  return {
    id: `${file.name}-${file.lastModified}-${randomId()}`,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
  }
}

export default function HealthData({ onNext, onBack, allowSkip = false }) {
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [categories, setCategories] = useState(() => UPLOAD_CATEGORIES.map((category) => ({ ...category, files: [] })))
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [eyeBodyReady, setEyeBodyReady] = useState(false)
  const [appleLinked, setAppleLinked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function openPicker(categoryId, mode) {
    const category = categories.find((item) => item.id === categoryId)
    if (!category) return
    setActiveCategoryId(categoryId)
    const input = mode === 'camera' ? cameraInputRef.current : fileInputRef.current
    input.accept = mode === 'camera' ? 'image/jpeg,image/png' : category.accept
    input.click()
  }

  function addFiles(event) {
    const nextFiles = [...(event.target.files || [])]
    if (!nextFiles.length || !activeCategoryId) return
    setCategories((current) => current.map((category) => category.id === activeCategoryId
      ? { ...category, files: [...category.files, ...nextFiles.map(fileEntry)] }
      : category))
    setError('')
    event.target.value = ''
  }

  function removeFile(categoryId, fileId) {
    setCategories((current) => current.map((category) => {
      if (category.id !== categoryId) return category
      const target = category.files.find((entry) => entry.id === fileId)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return { ...category, files: category.files.filter((entry) => entry.id !== fileId) }
    }))
  }

  async function handleNext() {
    const selectedDocuments = categories.flatMap((category) => category.files.map((entry) => ({
      ...category,
      ...entry,
    })))
    if (selectedDocuments.length === 0) {
      setError('분석에 사용할 인바디 또는 진료 자료를 하나 이상 추가해 주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const responses = await Promise.all(selectedDocuments.map((document) => uploadHealthDocument(document.file, document.documentType)))
      const documentIds = responses.map((response) => response?.data?.documentId).filter(Boolean)
      await Promise.all(responses.map((response, index) => saveHealthDocumentPreview(response?.data?.documentId, selectedDocuments[index]?.file).catch(() => {})))
      onNext?.({ documents: selectedDocuments, documentIds, analysisRequestKey: randomId() })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '건강 문서를 업로드하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="health-data-page">
      <header className="health-data-header">
        <button type="button" className="health-back-button" onClick={onBack} aria-label="뒤로 가기">‹</button>
        <div className="health-progress-track"><span /></div><span>9 / 9</span>
      </header>

      <div className="health-data-content">
        <h1>가진 정보가 있으면<br />한 번에 불러올게요</h1>
        <div className="health-document-list">
          <article className="health-document-card">
            <div><h2>눈바디</h2><p>체형분석</p></div>
            <button type="button" className={`document-action ${eyeBodyReady ? 'completed' : ''}`} onClick={() => setEyeBodyReady((value) => !value)}>{eyeBodyReady ? '완료' : '분석'}</button>
          </article>
          <article className="health-document-card">
            <div><h2>애플 건강</h2><p>걸음·체중·수면 연동</p></div>
            <button type="button" className={`document-action ${appleLinked ? 'completed' : ''}`} onClick={() => setAppleLinked((value) => !value)}>{appleLinked ? '연동됨' : '연동'}</button>
          </article>

          {categories.map((category) => category.files.length === 0 ? (
            <article className="health-document-card" key={category.id}>
              <div><h2>{category.title}</h2><p>{category.description}</p></div>
              <button type="button" className="document-action" onClick={() => openPicker(category.id, category.id === 'inbody' ? 'camera' : 'file')}>{category.action}</button>
            </article>
          ) : (
            <article className="health-document-card health-document-card-expanded" key={category.id}>
              <div className="health-document-card-heading"><h2>{category.title}</h2><p>{category.files.length}개 첨부됨</p></div>
              <div className="health-file-list">
                {category.files.map((entry) => (
                  <div className="health-file-row" key={entry.id}>
                    <span className="health-file-preview">{entry.previewUrl ? <img src={entry.previewUrl} alt="" /> : 'PDF'}</span>
                    <span><strong>{entry.file.name}</strong><small>{category.title}</small></span>
                    <button type="button" onClick={() => removeFile(category.id, entry.id)} aria-label={`${entry.file.name} 삭제`}>×</button>
                  </div>
                ))}
              </div>
              <div className="health-file-add-actions">
                <button type="button" onClick={() => openPicker(category.id, 'camera')}>+ 사진 촬영</button>
                <button type="button" onClick={() => openPicker(category.id, 'file')}>· 파일 선택</button>
              </div>
            </article>
          ))}
        </div>
        {error && <p className="health-data-error">{error}</p>}
      </div>

      <input ref={cameraInputRef} className="hidden-file-input" type="file" accept="image/jpeg,image/png" capture="environment" multiple onChange={addFiles} />
      <input ref={fileInputRef} className="hidden-file-input" type="file" multiple onChange={addFiles} />

      <footer className="health-data-actions">
        <button type="button" className="health-next-button" onClick={handleNext} disabled={isSubmitting}>{isSubmitting ? '불러오는 중…' : '다음'}</button>
        {allowSkip && <button type="button" className="health-later-button" onClick={() => onNext?.(null)}>나중에</button>}
      </footer>
    </section>
  )
}
