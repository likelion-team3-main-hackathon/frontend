import { useEffect, useMemo, useState } from 'react'
import BottomNav from '../../components/layout/BottomNav'
import './NotificationPage.css'

function itemStatus(item, statuses) {
  if (statuses[item.id]) return statuses[item.id]
  const ids = (item.routineItemIds || [item.routineItemId]).filter(Boolean)
  const values = ids.map((id) => statuses[id]).filter(Boolean)
  return values.length > 0 && values.every((status) => status === 'completed') ? 'completed' : null
}

export default function NotificationPage({ items = [], statuses = {}, reportDate, onBack, onOpenFeedback, onNavigate }) {
  const storageKey = `renew-feedback-read:${reportDate || 'today'}`
  const completedCount = useMemo(() => items.filter((item) => itemStatus(item, statuses) === 'completed').length, [items, statuses])
  const hasFeedback = completedCount > 0
  const [isRead, setIsRead] = useState(() => localStorage.getItem(storageKey) === 'true')

  useEffect(() => setIsRead(localStorage.getItem(storageKey) === 'true'), [storageKey])

  function markAsRead() {
    localStorage.setItem(storageKey, 'true')
    setIsRead(true)
  }

  function openFeedback() {
    markAsRead()
    onOpenFeedback?.()
  }

  return (
    <section className="notification-page">
      <div className="notification-scroll">
        <header className="notification-header">
          <button type="button" onClick={onBack} aria-label="뒤로가기">‹</button>
          <h1>알림</h1>
          <button type="button" className="read-all-button" onClick={markAsRead} disabled={!hasFeedback || isRead}>모두 읽음</button>
        </header>
        <p className="notification-date-label">오늘</p>
        {hasFeedback ? (
          <button type="button" className={`feedback-notification ${isRead ? 'read' : 'unread'}`} onClick={openFeedback}>
            <span className="notification-kind-icon">▱</span>
            <span className="notification-copy">
              <strong>오늘의 피드백이 도착했어요{!isRead && <i aria-label="읽지 않음" />}</strong>
              <small>오늘 완료한 {completedCount}개 활동의 결과를 확인해요</small>
              <time>방금</time>
            </span>
          </button>
        ) : (
          <div className="empty-notifications">
            <span>♧</span>
            <strong>도착한 알림이 없어요</strong>
            <p>새로운 피드백이 도착하면 알려드릴게요.</p>
          </div>
        )}
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </section>
  )
}
