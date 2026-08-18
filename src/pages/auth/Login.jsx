import { useEffect, useRef, useState } from 'react'
import { loginWithGoogle } from '../../api/auth'
import titleLogo from '../../assets/icons/logo/logo_title.png'
import './Login.css'

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const DEMO_USERS = [
  {
    id: 'balanced',
    label: '기본 분석 데모',
    description: '안정적인 식단·운동 기록',
    token: 'local:mcc-analysis-demo:analysis-demo@mcc.local:분석실 데모',
  },
  {
    id: 'growth',
    label: '성장형 데모',
    description: '최근으로 갈수록 지표 개선',
    token: 'local:mcc-analysis-growth-demo:growth-demo@mcc.local:성장형 데모',
  },
  {
    id: 'decline',
    label: '퇴보형 데모',
    description: '최근으로 갈수록 지표 악화',
    token: 'local:mcc-analysis-decline-demo:decline-demo@mcc.local:퇴보형 데모',
  },
]

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Google 로그인 모듈을 불러오지 못했습니다.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () =>
      reject(new Error('Google 로그인 모듈을 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
}

export default function Login({ onLoginSuccess }) {
  const googleButtonRef = useRef(null)
  const callbackRef = useRef(onLoginSuccess)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const demoLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'

  callbackRef.current = onLoginSuccess

  async function loginDemoUser(demoUser) {
    setIsLoading(true)
    setMessage('')
    try {
      const login = await loginWithGoogle(demoUser.token)
      callbackRef.current?.(login)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '데모 사용자 로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
    let cancelled = false

    if (!clientId) {
      setMessage('VITE_GOOGLE_CLIENT_ID 환경변수를 설정해 주세요.')
      return undefined
    }

    async function initializeGoogleLogin() {
      try {
        await loadGoogleIdentityServices()
        if (cancelled || !googleButtonRef.current) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) {
              setMessage('Google ID Token을 받지 못했습니다.')
              return
            }

            setIsLoading(true)
            setMessage('')

            try {
              const login = await loginWithGoogle(credential)
              if (!login?.accessToken) {
                throw new Error('로그인 토큰을 받지 못했습니다.')
              }
              callbackRef.current?.(login)
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : '로그인에 실패했습니다. 다시 시도해 주세요.',
              )
            } finally {
              setIsLoading(false)
            }
          },
        })

        googleButtonRef.current.replaceChildren()
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'ko',
          width: Math.min(380, googleButtonRef.current.clientWidth || 320),
        })
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Google 로그인을 준비하지 못했습니다.',
          )
        }
      }
    }

    initializeGoogleLogin()

    return () => {
      cancelled = true
      window.google?.accounts?.id?.cancel()
    }
  }, [])

  return (
    <section className="login-page">
      <div className="login-logo"><img src={titleLogo} alt="리뉴" /></div>

      <div className="login-copy">
        <h1>
          분산된 건강정보를
          <br />한 곳에서
        </h1>
      </div>

      <div className="login-actions" aria-busy={isLoading}>
        <div
          ref={googleButtonRef}
          className={isLoading ? 'google-login-container is-loading' : 'google-login-container'}
          aria-label="Google 계정으로 로그인"
        />
        {demoLoginEnabled && (
          <div className="demo-login-list">
            <small>분석실 데모 계정</small>
            {DEMO_USERS.map((demoUser) => (
              <button
                key={demoUser.id}
                type="button"
                className={`demo-login-button demo-login-button--${demoUser.id}`}
                disabled={isLoading}
                onClick={() => loginDemoUser(demoUser)}
              >
                <strong>{demoUser.label}</strong>
                <span>{demoUser.description}</span>
              </button>
            ))}
          </div>
        )}
        {isLoading && <p className="login-status">로그인 처리 중…</p>}
        {message && (
          <p className="login-message" role="alert">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
