const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
).replace(/\/$/, '')

let accessToken = sessionStorage.getItem('accessToken')
let refreshPromise = null

// 로그인 단계에서 받은 Access Token을 넣을 예정
export function setAccessToken(token) {
  accessToken = token || null

  if (accessToken) {
    sessionStorage.setItem('accessToken', accessToken)
  } else {
    sessionStorage.removeItem('accessToken')
  }
}

export function hasAccessToken() {
  return Boolean(accessToken)
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('로그인이 만료되었습니다.')
        const payload = await response.json()
        const token = payload?.data?.accessToken
        if (!token) throw new Error('재발급 토큰을 받지 못했습니다.')
        setAccessToken(token)
        return token
      })
      .catch((error) => {
        setAccessToken(null)
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
  } = options

  const isFormData = body instanceof FormData
  const usesAccessToken = path !== '/auth/oauth/google' && path !== '/auth/token/refresh'
  const requestBody = body
    ? isFormData
      ? body
      : JSON.stringify(body)
    : undefined
  const requestHeaders = {
    Accept: 'application/json',
    ...(body && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(usesAccessToken && accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
    ...headers,
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: requestHeaders,
    body: requestBody,
  })

  if (response.status === 401 && usesAccessToken && path !== '/auth/logout') {
    const nextToken = await refreshSession()
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...requestHeaders,
        Authorization: `Bearer ${nextToken}`,
      },
      body: requestBody,
    })
  }

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
