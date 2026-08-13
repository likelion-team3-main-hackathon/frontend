import { apiRequest } from './client'

export function uploadHealthDocument(file, documentType, measuredAt) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('documentType', documentType)

  if (measuredAt) formData.append('measuredAt', measuredAt)

  return apiRequest('/health-documents', { method: 'POST', body: formData })
}

export function createHealthAnalysis(documentIds) {
  return apiRequest('/health-analyses', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: { documentIds },
  })
}

export function getHealthAnalysis(analysisId, signal) {
  return apiRequest(`/health-analyses/${analysisId}`, { signal })
}

export function getLatestHealthAnalysis() {
  return apiRequest('/health-analyses/latest')
}
