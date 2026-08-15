import { useEffect, useMemo, useState } from 'react'
import { getMyProfile } from '../../api/user'
import { getRoutines } from '../../api/routine'
import { getHealthDocuments } from '../../api/health'
import BottomNav from '../../components/layout/BottomNav'
import smileIcon from '../../assets/icons/smile.png'
import './MyPage.css'

const MENU_ITEMS = [
  { id: 'health-records', icon: '⚕', label: '건강 정보 · 진료 기록' },
  { icon: '◇', label: '크레딧 내역', value: '2,400 C' },
  { icon: '▤', label: '주문 · 배송', value: '2건' },
  { icon: '♡', label: '찜한 루틴 · 상품', value: '8' },
  { icon: '♟', label: '연동된 앱', value: '4개' },
  { icon: '⊙', label: '알림 설정', value: '' },
]

export default function MyPage({ initialProfile, onNavigate, onResetRoutine }) {
  const [profile, setProfile] = useState(initialProfile)
  const [routines, setRoutines] = useState([])
  const [healthDocumentCount, setHealthDocumentCount] = useState(0)

  useEffect(() => {
    let active = true
    Promise.allSettled([getMyProfile(), getRoutines(), getHealthDocuments(0, 1)]).then(([profileResult, routineResult, documentResult]) => {
      if (!active) return
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value?.data || initialProfile)
      if (routineResult.status === 'fulfilled') setRoutines(routineResult.value?.data?.content || [])
      if (documentResult.status === 'fulfilled') setHealthDocumentCount(Number(documentResult.value?.data?.totalElements || 0))
    })
    return () => { active = false }
  }, [initialProfile])

  const stats = useMemo(() => ({
    total: routines.length,
    active: routines.filter((routine) => routine.status === 'ACTIVE').length,
    completed: routines.filter((routine) => routine.status === 'COMPLETED').length,
  }), [routines])
  const handle = profile?.email ? `@${profile.email.split('@')[0]}` : '@renew_user'

  return (
    <section className="my-page">
      <div className="my-page-scroll">
        <header><h1>MY</h1><button type="button" aria-label="설정">⚙</button></header>

        <article className="my-profile-card">
          <div className="my-profile-main">
            <span className="my-avatar">{profile?.profileImageUrl ? <img src={profile.profileImageUrl} alt="" /> : <img src={smileIcon} alt="" />}</span>
            <div><strong>{profile?.name || '사용자'}</strong><small>{handle}</small></div>
            <em>{Math.max(1, stats.active)}일 연속</em><b>›</b>
          </div>
          <div className="my-credit-row"><span><small>보유 크레딧</small><strong>2,400 <i>C</i></strong></span><span><small>이번 주 적립</small><strong>+300</strong></span></div>
          <div className="my-stat-row"><span><strong>{stats.total}</strong><small>진행 루틴</small></span><span><strong>{stats.completed}</strong><small>완료 운동</small></span><span><strong>72</strong><small>웰니스 지수</small></span><span><strong>14</strong><small>친구</small></span></div>
        </article>

        <div className="my-menu-card">{MENU_ITEMS.map((item) => <button type="button" key={item.label} onClick={() => item.id && onNavigate?.(item.id)}><i>{item.icon}</i><strong>{item.label}</strong><span>{item.id === 'health-records' ? `${healthDocumentCount}건` : item.value}</span><b>›</b></button>)}</div>

        <button type="button" className="my-ai-history"><i>◎</i><span><strong>AI 채팅 기록</strong><small>연구원과의 대화 · 준비 중</small></span><b>›</b></button>

        <button type="button" className="routine-reset-card" onClick={onResetRoutine}><i>↻</i><span><strong>루틴 재설정</strong><small>목표와 건강 정보를 다시 설정해요</small></span><b>›</b></button>
      </div>
      <BottomNav active="my" onNavigate={onNavigate} />
    </section>
  )
}
