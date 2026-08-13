import { apiRequest, setAccessToken } from './client'

export async function loginWithGoogle(idToken) {
  const response = await apiRequest('/auth/oauth/google', {
    method: 'POST',
    body: { idToken },
  })

  const accessToken = response?.data?.accessToken

  if (accessToken) {
    setAccessToken(accessToken)
  }

  return response?.data
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } catch {
    // 로컬 토큰은 서버 세션 정리 성공 여부와 관계없이 제거합니다.
  } finally {
    setAccessToken(null)
  }
}
