import { useEffect, useMemo, useState } from 'react'
import { getMyProfile } from '../../api/user'
import { getRoutines } from '../../api/routine'
import { getHealthDocuments } from '../../api/health'
import { logout } from '../../api/auth'
import { getCredits } from '../../api/credit'
import BottomNav from '../../components/layout/BottomNav'
import smileIcon from '../../assets/icons/smile.png'
import './MyPage.css'

const MENU_ITEMS = [
  { id: 'health-records', icon: '⚕', label: '건강 정보 · 진료 기록' },
  { icon: '◇', label: '크레딧 내역' },
  { icon: '▤', label: '주문 · 배송', value: '2건' },
  { icon: '♡', label: '찜한 루틴 · 상품', value: '8' },
  { icon: '♟', label: '연동된 앱', value: '4개' },
  { icon: '⊙', label: '알림 설정', value: '' },
]

export default function MyPage({ initialProfile, onNavigate, onResetRoutine, onLoggedOut, onOpenAi, onNicknameChange }) {
  const [profile, setProfile] = useState(initialProfile)
  const [routines, setRoutines] = useState([])
  const [healthDocumentCount, setHealthDocumentCount] = useState(0)
  const [creditBalance, setCreditBalance] = useState(Number(initialProfile?.creditBalance || 0))
  const [isNicknameOpen, setIsNicknameOpen] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState(initialProfile?.name || '')

  useEffect(() => {
    let active = true
    Promise.allSettled([getMyProfile(), getRoutines(), getHealthDocuments(0, 1), getCredits()]).then(([profileResult, routineResult, documentResult, creditResult]) => {
      if (!active) return
      if (profileResult.status === 'fulfilled') {
        const fetchedProfile = profileResult.value?.data || initialProfile
        const savedNickname = localStorage.getItem('renewNickname')?.trim()
        setProfile(savedNickname ? { ...fetchedProfile, name: savedNickname, nickname: savedNickname } : fetchedProfile)
      }
      if (routineResult.status === 'fulfilled') setRoutines(routineResult.value?.data?.content || [])
      if (documentResult.status === 'fulfilled') setHealthDocumentCount(Number(documentResult.value?.data?.totalElements || 0))
      if (creditResult.status === 'fulfilled') {
        const creditData = creditResult.value?.data || creditResult.value || {}
        setCreditBalance(Number(
          creditData.balance
          ?? creditData.creditBalance
          ?? creditData.availableCredits
          ?? initialProfile?.creditBalance
          ?? 0,
        ))
      } else {
        setCreditBalance(Number(initialProfile?.creditBalance || 0))
      }
    })
    return () => { active = false }
  }, [initialProfile])

  const stats = useMemo(() => ({
    total: routines.length,
    active: routines.filter((routine) => routine.status === 'ACTIVE').length,
    completed: routines.filter((routine) => routine.status === 'COMPLETED').length,
  }), [routines])
  const handle = profile?.email ? `@${profile.email.split('@')[0]}` : '@renew_user'

  async function handleLogout() {
    await logout()
    onLoggedOut?.()
  }

  function openNicknameEditor() {
    setNicknameDraft(profile?.name || '')
    setIsNicknameOpen(true)
  }

  function saveNickname(event) {
    event.preventDefault()
    const nickname = nicknameDraft.trim()
    if (!nickname) return
    localStorage.setItem('renewNickname', nickname)
    setProfile((current) => ({ ...current, name: nickname, nickname }))
    onNicknameChange?.(nickname)
    setIsNicknameOpen(false)
  }

  return (
    <section className="my-page">
      <div className="my-page-scroll">
        <header><h1>MY</h1><button type="button" aria-label="설정">⚙</button></header>

        <article className="my-profile-card">
          <div className="my-profile-main">
            <span className="my-avatar">{profile?.profileImageUrl ? <img src={profile.profileImageUrl} alt="" /> : <img src={smileIcon} alt="" />}</span>
            <div><span className="my-profile-name-row"><strong>{profile?.name || '사용자'}</strong><em>{Math.max(1, stats.active)}일 연속</em></span><small>{handle}</small></div>
            <button type="button" className="nickname-edit-button" onClick={openNicknameEditor}>닉네임 바꾸기</button>
          </div>
          <div className="my-credit-row"><span><small>보유 크레딧</small><strong>{creditBalance.toLocaleString()} <i>C</i></strong></span><span><small>루틴 완료 후 반영</small><strong>자동 적립</strong></span></div>
          <div className="my-stat-row"><span><strong>{stats.total}</strong><small>진행 루틴</small></span><span><strong>{stats.completed}</strong><small>완료 운동</small></span><span><strong>72</strong><small>웰니스 지수</small></span><span><strong>14</strong><small>친구</small></span></div>
        </article>

        <div className="my-menu-card">{MENU_ITEMS.map((item) => <button type="button" key={item.label} onClick={() => item.id && onNavigate?.(item.id)}><i>{item.icon}</i><strong>{item.label}</strong><span>{item.id === 'health-records' ? `${healthDocumentCount}건` : item.label === '크레딧 내역' ? `${creditBalance.toLocaleString()} C` : item.value}</span><b>›</b></button>)}</div>

        <button type="button" className="my-ai-history" onClick={onOpenAi}><i>◎</i><span><strong>AI 챗봇</strong><small>리뉴 연구원과 대화하기</small></span><b>›</b></button>

        <button type="button" className="routine-reset-card" onClick={onResetRoutine}><i>↻</i><span><strong>루틴 재설정</strong><small>목표와 건강 정보를 다시 설정해요</small></span><b>›</b></button>
        <button type="button" className="my-logout-card" onClick={handleLogout}><i>↪</i><span><strong>로그아웃</strong><small>현재 계정에서 로그아웃해요</small></span><b>›</b></button>
      </div>
      {isNicknameOpen && <div className="nickname-modal" role="dialog" aria-modal="true" aria-labelledby="nickname-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsNicknameOpen(false) }}><form onSubmit={saveNickname}><header><strong id="nickname-modal-title">변경하실 닉네임을 적어주세요</strong><button type="button" onClick={() => setIsNicknameOpen(false)} aria-label="닫기">×</button></header><div className="nickname-input-wrap"><input value={nicknameDraft} maxLength={20} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="변경하실 닉네임…" autoFocus />{nicknameDraft && <button type="button" onClick={() => setNicknameDraft('')} aria-label="입력 지우기">×</button>}</div><button type="submit" className="nickname-confirm-button" disabled={!nicknameDraft.trim()}>확인</button></form></div>}
      <BottomNav active="my" onNavigate={onNavigate} />
    </section>
  )
}
