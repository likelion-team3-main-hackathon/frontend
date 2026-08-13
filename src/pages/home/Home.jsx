import { useMemo, useState } from 'react'
import BottomNav from '../../components/layout/BottomNav'
import { homeMockData } from '../../mocks/homeData'
import './Home.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getWeekDates() {
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + index)
    return {
      key: date.toISOString().slice(0, 10),
      day: WEEKDAYS[date.getDay()],
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}

export default function Home({ onOpenRoutine }) {
  const weekDates = useMemo(getWeekDates, [])
  const [selectedDate, setSelectedDate] = useState(
    weekDates.find((date) => date.isToday)?.key || weekDates[0].key,
  )
  const [water, setWater] = useState(homeMockData.condition.water.current)

  return (
    <section className="home-page">
      <div className="home-scroll-content">
        <header className="home-topbar">
          <strong>리뉴</strong>
          <button type="button" aria-label="알림">♧</button>
        </header>

        <div className="week-selector" aria-label="이번 주 날짜 선택">
          {weekDates.map((item) => (
            <button
              type="button"
              key={item.key}
              className={selectedDate === item.key ? 'selected' : ''}
              onClick={() => setSelectedDate(item.key)}
            >
              <small>{item.day}</small><span>{item.date}</span>
            </button>
          ))}
        </div>

        <section className="home-section active-routine-section">
          <h2>진행 중인 루틴 <span>1 / {homeMockData.activeRoutines.length}</span></h2>
          <div className="active-routine-slider">
            {homeMockData.activeRoutines.map((routine) => (
              <button type="button" className="active-routine-card" key={routine.id} onClick={() => onOpenRoutine?.(routine)}>
                <div><strong>{routine.title}</strong><em>{routine.badge}</em><span>›</span></div>
                <div className="routine-progress"><i style={{ width: `${routine.progress}%` }} /></div>
                <div className="routine-weeks">
                  {Array.from({ length: routine.totalWeeks }, (_, index) => <span className={index + 1 === routine.currentWeek ? 'current' : ''} key={index}>{index + 1}주</span>)}
                </div>
              </button>
            ))}
          </div>
          <div className="slider-dots"><i /><i /><i /></div>
        </section>

        <section className="today-timeline">
          {homeMockData.todayRoutines.map((item) => (
            <article className={`today-card ${item.primary ? 'primary' : ''}`} key={item.id}>
              <span className="timeline-dot" />
              {item.primary ? (
                <>
                  <div className="today-meta"><em>● {item.type}</em><span>{item.time}</span><b>›</b></div>
                  <h2>{item.title}</h2><p>{item.detail}</p>
                  <button type="button" className="routine-start-button">시작하기</button>
                  <button type="button" className="routine-pass-button">패스하기</button>
                </>
              ) : (
                <div className="compact-routine"><span>⌁</span><div><strong>{item.type} · {item.title}</strong><small>{item.time} · {item.detail}</small></div></div>
              )}
            </article>
          ))}
        </section>

        <section className="condition-section">
          <h2>오늘의 컨디션 기록</h2>
          <article className="condition-card water-card">
            <div className="condition-title"><span>♢</span><strong>물</strong><small>{water}잔 / {homeMockData.condition.water.target}잔</small><button onClick={() => setWater(Math.max(0, water - 1))}>−</button><button onClick={() => setWater(Math.min(8, water + 1))}>+</button></div>
            <div className="water-glasses">{Array.from({ length: 8 }, (_, index) => <i className={index < water ? 'filled' : ''} key={index} />)}</div>
            <p>한 잔 250ml · 목표까지 {Math.max(0, 8 - water)}잔 남았어요</p>
          </article>

          <article className="condition-card sleep-card">
            <div className="condition-title"><span>◔</span><strong>수면</strong><small>{homeMockData.condition.sleep.total}</small><em>건강 앱 연동</em></div>
            <div className="sleep-track"><i /></div>
            <div className="sleep-labels"><span>{homeMockData.condition.sleep.asleepAt} 취침</span><strong>깊은 잠 {homeMockData.condition.sleep.deepSleep}</strong><span>{homeMockData.condition.sleep.wakeAt} 기상</span></div>
            <div className="sleep-times"><span>00:00</span><span>12:00</span></div>
          </article>

          <article className="coaching-card"><span>!</span><p>{homeMockData.condition.coaching}</p></article>
          <button type="button" className="research-note">{homeMockData.condition.recommendation}<span>›</span></button>
        </section>
      </div>
      <BottomNav active="home" />
    </section>
  )
}