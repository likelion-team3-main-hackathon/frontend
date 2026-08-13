import { useEffect, useState } from 'react'
import { hasAccessToken } from './api/client'
import { getMyProfile } from './api/user'
import Login from './pages/auth/Login'
import Home from './pages/home/Home'
import RoutineDetail from './pages/home/RoutineDetail'
import AnalysisResult from './pages/onboarding/AnalysisResult'
import Goal from './pages/onboarding/Goal'
import HealthAnalysis from './pages/onboarding/HealthAnalysis'
import HealthConsent from './pages/onboarding/HealthConsent'
import HealthData from './pages/onboarding/HealthData'
import RoutineComplete from './pages/onboarding/RoutineComplete'
import RoutineSelection from './pages/onboarding/RoutineSelection'
import RoutineStopped from './pages/onboarding/RoutineStopped'
import './Router.css'

function pageForProfile(profile) {
  if (profile?.status === 'PENDING_TERMS') return 'health-consent'
  if (profile?.status === 'ONBOARDING' || !profile?.onboardingCompleted) return 'goal'
  return 'home'
}

export default function Router() {
  const [page, setPage] = useState(hasAccessToken() ? 'loading' : 'login')
  const [profile, setProfile] = useState(null)
  const [healthDocuments, setHealthDocuments] = useState({ documents: [], documentIds: [] })
  const [analysis, setAnalysis] = useState(null)
  const [routine, setRoutine] = useState(null)
  const [selectedRoutine, setSelectedRoutine] = useState(null)

  useEffect(() => {
    if (page !== 'loading') return

    getMyProfile()
      .then((response) => {
        setProfile(response?.data || null)
        setPage(pageForProfile(response?.data))
      })
      .catch(() => setPage('login'))
  }, [page])

  return (
    <div className="app-shell">
      <main className="mobile-frame">
        {page === 'loading' && <p className="route-loading">사용자 정보를 확인하고 있어요…</p>}

        {page === 'login' && <Login onLoginSuccess={() => setPage('loading')} />}

        {page === 'health-consent' && (
          <HealthConsent
            onAgree={() => setPage('goal')}
            onCancel={() => setPage('login')}
          />
        )}

        {page === 'goal' && <Goal onNext={() => setPage('health-data')} />}

        {page === 'health-data' && (
          <HealthData
            onBack={() => setPage('goal')}
            onNext={(data) => {
              if (!data) {
                setPage('home')
                return
              }
              setHealthDocuments(data)
              setPage('health-analysis')
            }}
          />
        )}

        {page === 'health-analysis' && (
          <HealthAnalysis
            healthDocuments={healthDocuments}
            onBack={() => setPage('health-data')}
            onNext={(result) => {
              setAnalysis(result)
              setPage('analysis-result')
            }}
          />
        )}

        {page === 'analysis-result' && (
          <AnalysisResult
            analysis={analysis}
            onConfirm={() => setPage('routine-selection')}
            onLater={() => setPage('routine-stopped')}
          />
        )}

        {page === 'routine-selection' && (
          <RoutineSelection
            analysisId={analysis?.id}
            onComplete={(result) => {
              setRoutine(result)
              setPage('routine-complete')
            }}
          />
        )}

        {page === 'routine-complete' && (
          <RoutineComplete
            routine={routine}
            profile={profile}
            onStart={() => setPage('home')}
          />
        )}

        {page === 'home' && (
          <Home
            onOpenRoutine={(selected) => {
              setSelectedRoutine(selected)
              setPage('routine-detail')
            }}
            onCreateRoutine={() => setPage('health-data')}
            onLoggedOut={() => {
              setProfile(null)
              setPage('login')
            }}
          />
        )}

        {page === 'routine-detail' && (
          <RoutineDetail
            routine={selectedRoutine}
            onBack={() => setPage('home')}
          />
        )}

        {page === 'routine-stopped' && (
          <RoutineStopped
            onGoHome={() => setPage('home')}
            onRetry={() => setPage('analysis-result')}
          />
        )}
      </main>
    </div>
  )
}
