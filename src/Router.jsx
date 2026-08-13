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
import PlaceholderPage from './pages/placeholder/PlaceholderPage'
import RoutineSession from './pages/home/RoutineSession'
import TodayReport from './pages/home/TodayReport'
import './Router.css'

export default function Router() {
  const [page, setPage] = useState('login')
  const [healthDocuments, setHealthDocuments] = useState({ documents: [], documentIds: [] })
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [routineSession, setRoutineSession] = useState(null)
  const [routineStatuses, setRoutineStatuses] = useState({})
  const [todayReportItems, setTodayReportItems] = useState([])

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
          <Home
            onNavigate={setPage}
            routineStatuses={routineStatuses}
            onPassRoutine={(item) => setRoutineStatuses((current) => ({
              ...current,
              [item.id]: 'cancelled',
            }))}
            onOpenReport={(items) => {
              setTodayReportItems(items)
              setPage('today-report')
            }}
            onStartRoutine={(item) => {
              setRoutineSession(item)
              setPage('routine-session')
            }}
            onOpenRoutine={(routine) => {
              setSelectedRoutine(routine)
              setPage('routine-detail')
            }}
          />
        )}

        {page === 'today-report' && (
          <TodayReport
            items={todayReportItems}
            statuses={routineStatuses}
            onBack={() => setPage('home')}
          />
        )}

        {page === 'routine-session' && (
          <RoutineSession
            item={routineSession}
            onDecision={(id, status) => setRoutineStatuses((current) => ({ ...current, [id]: status }))}
            onClose={() => setPage('home')}
          />
        )}

        {['analysis', 'market', 'community', 'my'].includes(page) && (
          <PlaceholderPage page={page} onNavigate={setPage} />
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
