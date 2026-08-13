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
