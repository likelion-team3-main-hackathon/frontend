import { useEffect, useMemo, useState } from 'react'
import { getLatestHealthAnalysis } from '../../api/health'
import { getExpertContent } from '../../api/market'
import { getRoutines } from '../../api/routine'
import { getMyProfile } from '../../api/user'
import './ExpertRoutineDetail.css'

function firstText(items, fallback = '') {
  const item = items?.[0]
  return typeof item === 'string' ? item : item?.description || item?.summary || fallback
}

function routineWeeks(detail) {
  const weeks = (detail?.items || []).map((item) => Number(item.week || 0)).filter(Boolean)
  return weeks.length ? Math.max(...weeks) : 4
}

export default function ExpertRoutineDetail({ routine, onBack }) {
  const [detail, setDetail] = useState(routine || null)
  const [analysis, setAnalysis] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeRoutine, setActiveRoutine] = useState(null)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    let active = true
    const requests = [
      routine?.id ? getExpertContent(routine.id) : Promise.resolve(null),
      getLatestHealthAnalysis(),
      getMyProfile(),
      getRoutines(),
    ]
    Promise.allSettled(requests).then(([contentResult, analysisResult, profileResult, routinesResult]) => {
      if (!active) return
      if (contentResult.status === 'fulfilled' && contentResult.value?.data) setDetail((current) => ({ ...current, ...contentResult.value.data }))
      if (analysisResult.status === 'fulfilled') setAnalysis(analysisResult.value?.data || null)
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value?.data || null)
      if (routinesResult.status === 'fulfilled') {
        const routines = routinesResult.value?.data?.content || []
        setActiveRoutine(routines.find((item) => item.status === 'ACTIVE') || routines[0] || null)
      }
    })
    return () => { active = false }
  }, [routine?.id])

  const facts = useMemo(() => {
    const goal = firstText(analysis?.goals, analysis?.summary)
    const precaution = firstText(analysis?.precautions)
    const exerciseConstraint = firstText(analysis?.exerciseConstraints)
    const nutritionConstraint = firstText(analysis?.nutritionConstraints)
    const routineType = String(detail?.contentType || routine?.contentType || '').toUpperCase()
    const reasons = []

    if (goal) reasons.push({ source: '건강 분석', text: `${goal} 목표와 이 루틴의 단계별 구성이 잘 맞아요.` })
    if (routineType === 'EXERCISE' && (exerciseConstraint || precaution)) reasons.push({ source: '주의 정보', text: `${exerciseConstraint || precaution} 항목을 고려해 무리한 동작은 피하며 진행할 수 있어요.` })
    if (routineType === 'MEAL' && (nutritionConstraint || precaution)) reasons.push({ source: '영양 정보', text: `${nutritionConstraint || precaution} 내용을 확인하며 식단을 조절하기 좋아요.` })
    if (activeRoutine?.title) reasons.push({ source: '진행 루틴', text: `현재 진행 중인 ‘${activeRoutine.title}’과 겹치는 활동을 비교하며 보완할 수 있어요.` })
    if (!reasons.length) reasons.push({ source: '맞춤 추천', text: '선택한 목표와 루틴 유형을 기준으로 꾸준히 실천하기 좋은 구성이에요.' })
    return reasons.slice(0, 3)
  }, [activeRoutine, analysis, detail, routine])

  const items = detail?.items || []
  const weeks = routineWeeks(detail)
  const sessions = items.length || 16
  const minutes = items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0) / items.length) || 28 : 28
  const price = Number(detail?.price || routine?.price || 39000)
  const originalPrice = Math.ceil(price / 0.8 / 1000) * 1000
  const title = detail?.name || routine?.name || '상체 집중 4주'
  const expertName = detail?.expertName || routine?.expertName || String(routine?.amount || '').split(' · ')[0] || '전문가 트레이너'
  const category = detail?.category || '헬스'

  return <section className="expert-detail-page">
    <header><button type="button" onClick={onBack}>‹</button><h1>{category}</h1><button type="button" className={liked ? 'liked' : ''} onClick={() => setLiked((value) => !value)}>♡</button></header>
    <div className="expert-detail-scroll">
      <div className="expert-hero" style={detail?.thumbnailUrl || routine?.imageUrl ? { backgroundImage: `url(${detail?.thumbnailUrl || routine?.imageUrl})` } : undefined}>{!(detail?.thumbnailUrl || routine?.imageUrl) && '루틴 대표 이미지'}</div>
      <main>
        <div className="expert-tags"><span>{detail?.contentType === 'MEAL' ? '식단' : '근력'}</span><span>주 {Math.min(7, Math.max(2, Math.round(sessions / weeks)))}회</span><span>내 목표 적합</span></div>
        <h2>{title}</h2>
        <p className="expert-summary">{detail?.description || '체형 개선 · 생활 리듬 반영 · 별도 기구 없이 가능'}</p>
        <p className="expert-rating">★ 4.8 <span>후기 324</span><span>누적 1,820명 진행</span></p>

        <article className="expert-profile"><i>{expertName.slice(0, 1)}</i><div><strong>{expertName}</strong><small>생활스포츠지도사 · 재활 트레이닝 담당</small></div><b>프로필</b></article>
        <div className="expert-stats"><span><strong>{weeks}주</strong><small>기간</small></span><span><strong>{sessions}회</strong><small>세션</small></span><span><strong>{minutes}분</strong><small>회당</small></span><span><strong>{detail?.difficulty || routine?.difficulty || '초·중급'}</strong><small>난이도</small></span></div>

        <section className="expert-fit"><h3>이 루틴이 나에게 맞는 이유</h3>{facts.map((fact) => <p key={`${fact.source}-${fact.text}`}><b>✓</b><span><small>{fact.source}</small>{fact.text}</span></p>)}</section>
        {items.length > 0 && <section className="expert-curriculum"><h3>루틴 구성</h3>{items.slice(0, 4).map((item) => <article key={item.itemId}><b>{item.week}주차</b><span><strong>{item.title}</strong><small>{item.description || `${item.durationMinutes || minutes}분 진행`}</small></span></article>)}</section>}
      </main>
    </div>
    <footer><div><span>크레딧 2,400 사용 가능</span><p><em>20%</em><strong>{price.toLocaleString()}원</strong><del>{originalPrice.toLocaleString()}원</del></p></div><button type="button" aria-label="장바구니">🛒</button><button type="button">바로 구매하기</button></footer>
  </section>
}
