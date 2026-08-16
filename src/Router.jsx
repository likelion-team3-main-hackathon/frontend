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
import RoutineLoading from './pages/onboarding/RoutineLoading'
import RoutineStopped from './pages/onboarding/RoutineStopped'
import PlaceholderPage from './pages/placeholder/PlaceholderPage'
import RoutineSession from './pages/home/RoutineSession'
import TodayReport from './pages/home/TodayReport'
import AiRoutineChat from './pages/home/AiRoutineChat'
import MyPage from './pages/my/MyPage'
import MarketPage from './pages/market/MarketPage'
import MarketProductDetail from './pages/market/MarketProductDetail'
import ExpertRoutineDetail from './pages/market/ExpertRoutineDetail'
import MarketCart from './pages/market/MarketCart'
import MarketCheckout from './pages/market/MarketCheckout'
import PaymentComplete from './pages/market/PaymentComplete'
import AnalysisLab from './pages/analysis/AnalysisLab'
import MealAnalysisLab from './pages/analysis/MealAnalysisLab'
import ExerciseAnalysisLab from './pages/analysis/ExerciseAnalysisLab'
import BodyCompositionLab from './pages/analysis/BodyCompositionLab'
import HealthRecordsPage from './pages/my/HealthRecordsPage'
import NotificationPage from './pages/notifications/NotificationPage'
import { recordMealRoutine, recordRoutineItems } from './api/record'
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
  const [routineSession, setRoutineSession] = useState(null)
  const [routineStatuses, setRoutineStatuses] = useState({})
  const [routineCalories, setRoutineCalories] = useState({})
  const [exerciseResults, setExerciseResults] = useState({})
  const [todayReportItems, setTodayReportItems] = useState([])
  const [reportDate, setReportDate] = useState(null)
  const [todayReportBackPage, setTodayReportBackPage] = useState('home')
  const [aiChatBackPage, setAiChatBackPage] = useState('home')
  const [selectedMarketProduct, setSelectedMarketProduct] = useState(null)
  const [selectedExpertRoutine, setSelectedExpertRoutine] = useState(null)
  const [marketTab, setMarketTab] = useState('meal')
  const [checkoutOrder, setCheckoutOrder] = useState(null)
  const [checkoutBackPage, setCheckoutBackPage] = useState('market')
  const [healthDataBackPage, setHealthDataBackPage] = useState('goal')
  const [isRoutineReset, setIsRoutineReset] = useState(false)

  function openCheckout(order, backPage) {
    setCheckoutOrder(order)
    setCheckoutBackPage(backPage)
    setPage('market-checkout')
  }

  function openAiChat(backPage) {
    setAiChatBackPage(backPage)
    setPage('ai-chat')
  }

  async function saveRoutineStatus(item, status, mealData, exerciseData) {
    if (mealData && status === 'completed') {
      await recordMealRoutine(item, mealData.foods, mealData.mealType, mealData.photoFile)
      const calories = mealData.foods.reduce((total, food) => total + Number(food.calories || 0), 0)
      setRoutineCalories((current) => ({ ...current, [item.id]: calories }))
    } else if (item.routineItemId != null || item.exercises?.length) {
      await recordRoutineItems(item, status, item.activityType || 'EXERCISE', exerciseData || {})
    }
    if (exerciseData && status === 'completed') {
      setExerciseResults((current) => ({ ...current, [item.id]: exerciseData }))
    }
    setRoutineStatuses((current) => {
      const next = { ...current, [item.id]: status }
      const linkedIds = (item.routineItemIds || [item.routineItemId]).filter(Boolean)
      linkedIds.forEach((id) => { next[id] = status })
      return next
    })
  }

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

        {page === 'goal' && <Goal onNext={() => {
          setHealthDataBackPage('goal')
          setPage('health-data')
        }} />}

        {page === 'health-data' && (
          <HealthData
            onBack={() => setPage(healthDataBackPage)}
            allowSkip={isRoutineReset}
            onBack={() => setPage('goal')}
            onNext={(data) => {
              if (!data) {
                setHealthDocuments({ documents: [], documentIds: [], useExisting: true })
                setPage('health-analysis')
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
            onReturnToLab={healthDataBackPage === 'body-analysis' ? () => {
              setHealthDataBackPage('goal')
              setPage('body-analysis')
            } : undefined}
            onNext={(result) => {
              setAnalysis(result)
              setPage('analysis-result')
            }}
          />
        )}

        {page === 'analysis-result' && (
          <AnalysisResult
            analysis={analysis}
            onBack={() => setPage('health-analysis')}
            onConfirm={() => setPage('routine-recommendation-loading')}
            onLater={() => {
              setIsRoutineReset(false)
              setPage('home')
            }}
          />
        )}

        {page === 'routine-recommendation-loading' && (
          <RoutineLoading onDone={() => setPage('routine-selection')} />
        )}

        {page === 'routine-selection' && (
          <RoutineSelection
            analysis={analysis}
            isReset={isRoutineReset}
            onBack={() => setPage('analysis-result')}
            onCancel={() => {
              setIsRoutineReset(false)
              setPage('home')
            }}
            onComplete={(result, resetMode) => {
              setRoutine(result)
              if (resetMode) sessionStorage.setItem('lastRoutineResetMode', resetMode)
              setIsRoutineReset(false)
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
            onCreateRoutine={() => setPage('health-data')}
            onOpenNotifications={(items, selectedDate) => {
              setTodayReportItems(items)
              setReportDate(selectedDate)
              setPage('notifications')
            }}
            onNavigate={setPage}
            routineStatuses={routineStatuses}
            routineCalories={routineCalories}
            onStatusesLoaded={(statuses, calories) => {
              setRoutineStatuses((current) => ({ ...current, ...statuses }))
              setRoutineCalories((current) => ({ ...current, ...calories }))
            }}
            onOpenAi={() => openAiChat('home')}
            onPassRoutine={(item) => saveRoutineStatus(item, 'cancelled')}
            onOpenReport={(items, selectedDate) => {
              setTodayReportItems(items)
              setReportDate(selectedDate)
              setTodayReportBackPage('home')
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
            calories={routineCalories}
            exerciseResults={exerciseResults}
            reportDate={reportDate}
            onBack={() => setPage(todayReportBackPage)}
            onNavigate={(nextPage) => {
              if (nextPage === 'ai-chat') setAiChatBackPage('today-report')
              setPage(nextPage)
            }}
          />
        )}

        {page === 'ai-chat' && <AiRoutineChat onBack={() => setPage(aiChatBackPage)} />}

        {page === 'notifications' && (
          <NotificationPage
            items={todayReportItems}
            statuses={routineStatuses}
            reportDate={reportDate}
            onBack={() => setPage('home')}
            onNavigate={setPage}
            onOpenFeedback={() => {
              setTodayReportBackPage('notifications')
              setPage('today-report')
            }}
          />
        )}

        {page === 'routine-session' && (
          <RoutineSession
            item={routineSession}
            onDecision={saveRoutineStatus}
            onClose={() => setPage('home')}
          />
        )}

        {page === 'community' && (
          <PlaceholderPage page={page} onNavigate={setPage} onOpenAi={() => openAiChat('community')} />
        )}

        {page === 'analysis' && <AnalysisLab onNavigate={(nextPage) => {
          if (nextPage === 'ai-chat') setAiChatBackPage('analysis')
          setPage(nextPage)
        }} />}

        {page === 'meal-analysis' && <MealAnalysisLab onBack={() => setPage('analysis')} />}

        {page === 'exercise-analysis' && <ExerciseAnalysisLab onBack={() => setPage('analysis')} />}

        {page === 'body-analysis' && <BodyCompositionLab onBack={() => setPage('analysis')} onUpload={() => {
          setHealthDataBackPage('body-analysis')
          setPage('health-data')
        }} />}

        {page === 'market' && <MarketPage
          onNavigate={setPage}
          onOpenCart={() => setPage('market-cart')}
          onOpenAi={() => openAiChat('market')}
          initialTab={marketTab}
          onTabChange={setMarketTab}
          onOpenProduct={(product) => {
            setSelectedMarketProduct(product)
            setPage('market-product')
          }}
          onOpenExpert={(expertRoutine) => {
            setMarketTab('expert')
            setSelectedExpertRoutine(expertRoutine)
            setPage('expert-routine')
          }}
        />}

        {page === 'market-product' && <MarketProductDetail product={selectedMarketProduct} onBack={() => setPage('market')} onOpenCart={() => setPage('market-cart')} onBuyNow={(order) => openCheckout(order, 'market-product')} />}

        {page === 'expert-routine' && <ExpertRoutineDetail routine={selectedExpertRoutine} onBack={() => setPage('market')} />}

        {page === 'market-cart' && <MarketCart onBack={() => setPage('market')} onCheckout={(order) => openCheckout(order, 'market-cart')} />}

        {page === 'market-checkout' && <MarketCheckout order={checkoutOrder} onBack={() => setPage(checkoutBackPage)} onComplete={() => {
          if (checkoutOrder?.source === 'cart') localStorage.removeItem('marketCart')
          setPage('payment-complete')
        }} />}

        {page === 'payment-complete' && <PaymentComplete onBack={() => setPage('market')} />}

        {page === 'my' && <MyPage initialProfile={profile} onNavigate={setPage} onResetRoutine={() => {
          setIsRoutineReset(true)
          setPage('goal')
        }} onLoggedOut={() => {
          setProfile(null)
          setPage('login')
        }} />}

        {page === 'health-records' && <HealthRecordsPage onBack={() => setPage('my')} onAdd={() => {
          setHealthDataBackPage('health-records')
          setPage('health-data')
        }} />}

        {page === 'routine-detail' && (
          <RoutineDetail
            routine={selectedRoutine}
            onBack={() => setPage('home')}
            onOpenAi={() => {
              setAiChatBackPage('routine-detail')
              setPage('ai-chat')
            }}
          />
        )}

        {page === 'routine-stopped' && (
          <RoutineStopped
            onBack={() => setPage('analysis-result')}
            onGoHome={() => setPage('home')}
            onRetry={() => setPage('analysis-result')}
          />
        )}
      </main>
    </div>
  )
}
