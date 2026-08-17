import { useMemo, useState } from 'react'
import BottomNav from '../../components/layout/BottomNav'
import './CommunityPage.css'

const SCOPE_DATA = {
  friend: [
    { name: '아침러너', score: 458, streak: 21, change: 12, color: '#eff5dc' },
    { name: '건강한하루', score: 431, streak: 12, change: 6, color: '#f5e9e3' },
    { me: true, score: 412, streak: 12, change: 18, color: '#e8f2f8' },
    { name: '달리는곰', score: 396, streak: 9, change: -4, color: '#eeeaf6' },
    { name: '재활중', score: 372, streak: 8, change: 2, color: '#f5efe3' },
    { name: '느긋한산책', score: 341, streak: 5, change: -8, color: '#eeece1' },
  ],
  group: [
    { name: '코어지킴이', score: 476, streak: 25, change: 9, color: '#e7f1dc' },
    { me: true, score: 412, streak: 12, change: 18, color: '#e8f2f8' },
    { name: '오운완연구소', score: 405, streak: 15, change: 4, color: '#f3e8df' },
    { name: '근력새싹', score: 389, streak: 7, change: 11, color: '#eee9f6' },
    { name: '바른자세단', score: 361, streak: 11, change: -2, color: '#f1efdf' },
    { name: '퇴근후한세트', score: 338, streak: 4, change: 5, color: '#e6f0ed' },
  ],
  region: [
    { name: '성수건강러', score: 489, streak: 27, change: 14, color: '#e7f1dc' },
    { name: '서울숲산책', score: 447, streak: 19, change: 7, color: '#f4e8e2' },
    { name: '한강러너', score: 426, streak: 16, change: 3, color: '#ede9f6' },
    { me: true, score: 412, streak: 12, change: 18, color: '#e8f2f8' },
    { name: '뚝섬오운완', score: 385, streak: 10, change: -3, color: '#f3eee2' },
    { name: '건대헬린이', score: 354, streak: 6, change: 8, color: '#e8f1e4' },
  ],
}

const SCOPE_LABELS = { friend: '친구', group: '그룹', region: '지역' }

const FEED_POSTS = [
  { author: '건강한하루', meta: '지중해식 4주 · 12일차', tag: '인증', text: '2주차 끝! 체지방 −1.8% 나왔어요. 저녁 탄수 줄인 게 컸던 것 같아요.', likes: 128, comments: 24, photo: true, color: '#e4f0d8' },
  { author: '재활중', meta: '허리 재활 4주 · 8일차', tag: '질문', text: '플랭크 할 때 허리가 살짝 당기는데 계속해도 괜찮을까요?', likes: 46, comments: 13, routine: '단계적 코어 안정화 루틴', color: '#f3e7df' },
  { author: '아침러너', meta: '체력 증진 6주 · 21일차', tag: '식단', text: '오늘 아침은 그릭요거트와 과일로 가볍게 시작했어요.', likes: 91, comments: 18, color: '#e8f2dc' },
]

function FeedTab() {
  const [filter, setFilter] = useState('전체')
  const posts = FEED_POSTS.filter((post) => filter === '전체' || post.tag === filter)
  return <div className="community-feed">
    <label className="community-search"><input placeholder="글 · 사용자 검색" /><span>⌕</span></label>
    <div className="feed-filters">{['전체', '인증', '질문', '식단'].map((item) => <button type="button" className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="feed-post-list">{posts.map((post) => <article key={`${post.author}-${post.text}`}>
      <header><span className="ranking-avatar" style={{ background: post.color }} /><div><strong>{post.author}</strong><small>{post.meta}</small></div><em>{post.tag}</em><button type="button" aria-label="더 보기">···</button></header>
      <p>{post.text}</p>
      {post.photo && <div className="feed-photo-placeholder">인증 사진</div>}
      {post.routine && <button type="button" className="shared-routine"><span><small>루틴 공유</small><strong>{post.routine}</strong></span><b>›</b></button>}
      <footer><span>♡ {post.likes}</span><span>○ {post.comments}</span><span>↗ 공유</span></footer>
    </article>)}</div>
  </div>
}

function MatchTab({ userName }) {
  return <section className="community-match">
    <h2>비슷한 상대를 찾았어요</h2>
    <div className="match-versus">
      <article><span className="match-avatar me" /><strong>{userName}</strong><small>주간 412점</small></article>
      <b>VS</b>
      <article><span className="match-avatar opponent" /><strong>달리는곰</strong><small>주간 396점</small></article>
    </div>
    <div className="match-info"><span><small>종목</small><strong>루틴 완료율</strong></span><i /><span><small>기간</small><strong>7일</strong></span></div>
    <button type="button" className="match-start-button">매칭 시작</button>
  </section>
}

export default function CommunityPage({ profile, onNavigate }) {
  const [mainTab, setMainTab] = useState('ranking')
  const [scope, setScope] = useState('friend')
  const userName = profile?.name || '사용자'
  const rankings = useMemo(() => SCOPE_DATA[scope].map((person, index) => ({
    ...person,
    rank: index + 1,
    name: person.me ? `${userName} (나)` : person.name,
  })), [scope, userName])
  const me = rankings.find((person) => person.me)
  const podium = [rankings[1], rankings[0], rankings[2]]

  return (
    <section className="community-page">
      <div className="community-scroll">
        <header><h1>커뮤니티</h1></header>

        <nav className="community-main-tabs" aria-label="커뮤니티 메뉴">
          <button type="button" className={mainTab === 'feed' ? 'active' : ''} onClick={() => setMainTab('feed')}>피드</button>
          <button type="button" className={mainTab === 'ranking' ? 'active' : ''} onClick={() => setMainTab('ranking')}>순위</button>
          <button type="button" className={mainTab === 'match' ? 'active' : ''} onClick={() => setMainTab('match')}>대결</button>
        </nav>

        {mainTab === 'feed' && <FeedTab />}
        {mainTab === 'match' && <MatchTab userName={userName} />}
        {mainTab === 'ranking' && <>
          <nav className="ranking-scope-tabs" aria-label="순위 범위">
            {Object.entries(SCOPE_LABELS).map(([id, label]) => <button type="button" className={scope === id ? 'active' : ''} key={id} onClick={() => setScope(id)}>{label}</button>)}
          </nav>

          <section className="ranking-podium-card">
            <header><span>{SCOPE_LABELS[scope]} · 이번 주</span><small>월요일 초기화</small></header>
            <div className="ranking-podium">
              {podium.map((person) => <article className={`podium-place place-${person.rank}`} key={person.name}>
                <span className="ranking-avatar" style={{ background: person.color }} />
                <strong>{person.name}</strong><small>{person.score}</small><b>{person.rank}</b>
              </article>)}
            </div>
          </section>

          <section className="ranking-list">
            {rankings.map((person) => <article className={person.me ? 'me' : ''} key={person.name}>
              <b className="ranking-number">{person.rank}</b>
              <span className="ranking-avatar" style={{ background: person.color }} />
              <div><strong>{person.name}</strong><small>연속 {person.streak}일</small></div>
              <p><strong>{person.score}</strong><small className={person.change < 0 ? 'down' : ''}>{person.change > 0 ? '+' : ''}{person.change}</small></p>
            </article>)}
          </section>

          <aside className="my-ranking-summary"><span><strong>내 순위 {me.rank}위 / {rankings.length}명</strong><small>{me.rank === 1 ? '현재 1위를 지키고 있어요' : `1위까지 ${rankings[0].score - me.score}점 · 이번 주 ${me.change}점 상승`}</small></span><b>{me.score}</b></aside>
        </>}
      </div>
      {mainTab === 'feed' && <button type="button" className="community-write-button">✎　글쓰기</button>}
      <BottomNav active="community" onNavigate={onNavigate} />
    </section>
  )
}
