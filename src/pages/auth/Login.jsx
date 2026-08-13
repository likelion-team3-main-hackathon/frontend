import { useState } from 'react'
import { loginWithGoogleMock } from '../../api/auth'
import googleIcon from '../../assets/icons/Google.png'
import './Login.css'

export default function Login({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleGoogleLogin() {
    if (isLoading) return

    setIsLoading(true)
    setMessage('')

    try {
      // 실제 Google 연동 시 Google에서 받은 idToken으로
      // loginWithGoogle(idToken)을 호출하면 됩니다.
      const login = await loginWithGoogleMock()

      if (!login?.accessToken) {
        throw new Error('로그인 토큰을 받지 못했습니다.')
      }

      onLoginSuccess?.(login)
    } catch (error) {
      setMessage(error.message || '로그인에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-logo-placeholder">로고 · 마스코트</div>

      <div className="login-copy">
        <h1>분산된 건강정보를<br />한 곳에서</h1>
      </div>

      <div className="login-actions">
        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <img className="google-login-icon" src={googleIcon} alt="Google" />
          <span>{isLoading ? '로그인 중…' : '로그인'}</span>
        </button>
        {message && <p className="login-message" role="alert">{message}</p>}
      </div>
    </section>
  )
}
