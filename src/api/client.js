const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
).replace(/\/$/, '')

let accessToken = sessionStorage.getItem('accessToken')

// 로그인 단계에서 받은 Access Token을 넣을 예정
export function setAccessToken(token) {
  accessToken = token || null

  if (accessToken) {
    sessionStorage.setItem('accessToken', accessToken)
  } else {
    sessionStorage.removeItem('accessToken')
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
  } = options

  const isFormData = body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
      ...(body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...headers,
    },
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
  })

  const contentType = response.headers.get('content-type') || ''

  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data?.message
        ? data.message
        : `API 요청에 실패했습니다. (${response.status})`

    throw new Error(message)
  }

  return data
}
