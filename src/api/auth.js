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

// Google Identity Services 연동 전 사용하는 목업입니다.
// 반환 형태를 실제 POST /auth/oauth/google 응답의 data와 동일하게 유지합니다.
export async function loginWithGoogleMock() {
  await new Promise((resolve) => setTimeout(resolve, 650))

  const data = {
    userId: 1,
    accessToken: 'mock-access-token',
    accessTokenExpiresIn: 1800,
    isNewUser: true,
    onboardingCompleted: false,
  }

  setAccessToken(data.accessToken)
  return data
}
