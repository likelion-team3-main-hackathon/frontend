import { apiRequest } from './client'

export function uploadHealthDocument(file, documentType, measuredAt) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('documentType', documentType)

  if (measuredAt) formData.append('measuredAt', measuredAt)

  return apiRequest('/health-documents', { method: 'POST', body: formData })
}

export function createHealthAnalysis(documentIds, idempotencyKey = crypto.randomUUID()) {
  return apiRequest('/health-analyses', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { documentIds },
  })
}

export function getHealthAnalysis(analysisId, signal) {
  return apiRequest(`/health-analyses/${analysisId}`, { signal })
}

export function getLatestHealthAnalysis() {
  return apiRequest('/health-analyses/latest')
}

export function getHealthAnalyses(page = 0, size = 10) {
  return apiRequest(`/health-analyses?page=${page}&size=${size}`)
}

export function getHealthDocuments(page = 0, size = 50) {
  return apiRequest(`/health-documents?page=${page}&size=${size}`)
}

function wait(delayMs, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, delayMs)

    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId)
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function waitForHealthAnalysis(analysisId, signal) {
  let delayMs = 800

  while (!signal?.aborted) {
    const response = await getHealthAnalysis(analysisId, signal)
    const analysis = response?.data

    if (analysis?.status === 'COMPLETED') return analysis
    if (analysis?.status === 'FAILED') {
      throw new Error(analysis.failureReason || '건강 분석에 실패했습니다.')
    }

    await wait(delayMs, signal)
    delayMs = Math.min(Math.round(delayMs * 1.5), 5000)
  }

  throw new DOMException('요청이 취소되었습니다.', 'AbortError')
}
