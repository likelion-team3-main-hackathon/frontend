import { useState } from 'react'
import Login from './pages/auth/Login'
import Goal from './pages/onboarding/Goal'
import HealthData from './pages/onboarding/HealthData'
import AnalysisResult from './pages/onboarding/AnalysisResult'
import HealthConsent from './pages/onboarding/HealthConsent'
import RoutineStopped from './pages/onboarding/RoutineStopped'
import HealthAnalysis from './pages/onboarding/HealthAnalysis'
import RoutineSelection from './pages/onboarding/RoutineSelection'
import RoutineComplete from './pages/onboarding/RoutineComplete'
import Home from './pages/home/Home'
import RoutineDetail from './pages/home/RoutineDetail'
import './Router.css'

export default function Router() {
  const [page, setPage] = useState('login')
  const [healthDocuments, setHealthDocuments] = useState({ documents: [], documentIds: [] })
  const [selectedRoutine, setSelectedRoutine] = useState(null)

  return (
    <div className="app-shell">
      <main className="mobile-frame">
        {page === 'login' && (
         <Login onLoginSuccess={() => setPage('goal')} />
        )}

        {page === 'goal' && (
         <Goal onNext={() => setPage('health-data')} />
        )}

        {page === 'health-data' && (
         <HealthData
            onBack={() => setPage('goal')}
            onNext={(data) => {
              setHealthDocuments(data)
              setPage('health-analysis')
            }}
         />
        )}
        {page === 'health-analysis' && (
         <HealthAnalysis
            healthDocuments={healthDocuments}
            onNext={() => setPage('analysis-result')}
         />
        )}
        
        {page === 'analysis-result' && (
         <AnalysisResult
            onConfirm={() => setPage('health-consent')}
            onLater={() => setPage('routine-stopped')}
         />
        )}

        {page === 'routine-selection' && (
          <RoutineSelection onComplete={() => setPage('routine-complete')} />
        )}

        {page === 'routine-complete' && (
          <RoutineComplete onStart={() => setPage('home')} />
        )}

        {page === 'home' && (
          <Home onOpenRoutine={(routine) => {
            setSelectedRoutine(routine)
            setPage('routine-detail')
          }} />
        )}

        {page === 'routine-detail' && (
          <RoutineDetail routine={selectedRoutine} onBack={() => setPage('home')} />
        )}

        {page === 'health-consent' && (
         <HealthConsent
            onAgree={() => setPage('routine-selection')}
            onCancel={() => setPage('routine-stopped')}
         />
        )}

        {page === 'routine-stopped' && (
         <RoutineStopped
            onGoHome={() => setPage('login')}
            onRetry={() => setPage('analysis-result')}
         />
        )}
      </main>
    </div>
  )
}
