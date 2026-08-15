import { useEffect, useMemo, useState } from 'react'
import { getExpertContents, getMealProductRecommendations } from '../../api/market'
import { getRoutines } from '../../api/routine'
import BottomNav from '../../components/layout/BottomNav'
import './MarketPage.css'

const CATEGORIES = [
  ['과', '과일'], ['수', '수산'], ['건', '건강식품'], ['화', '화장품'], ['간', '간편식'],
]

const MOCK_SECTIONS = [
  {
    id: 'weekly', title: '이번 주 루틴 재료', subtitle: '지중해식 4주 · 3~4일차',
    products: [
      { id: 'chicken', name: '닭가슴살 스테이크', amount: '100g × 10팩', price: 22900 },
      { id: 'yogurt', name: '그릭요거트', amount: '400g', price: 8900 },
      { id: 'tomato', name: '방울토마토', amount: '500g', price: 6400 },
    ],
  },
  {
    id: 'protein', title: '단백질 채우기', subtitle: '이번 주 −18g',
    products: [
      { id: 'almond', name: '무염 아몬드', amount: '200g', price: 11900 },
      { id: 'tofu', name: '두부 스테이크', amount: '2팩', price: 7200 },
      { id: 'egg', name: '계란 특란', amount: '20구', price: 9400 },
    ],
  },
  {
    id: 'repeat', title: '자주 담은 재료', subtitle: '최근 4주',
    products: [
      { id: 'olive', name: '올리브유', amount: '500ml', price: 18900 },
      { id: 'brown-rice', name: '현미', amount: '2kg', price: 12500 },
      { id: 'salmon', name: '연어 필렛', amount: '300g', price: 16900 },
    ],
  },
]

const EXPERT_CATEGORIES = [
  ['유', '헬스'], ['육', '필라테스'], ['채', '저탄고지'], ['과', '다이어트'], ['수', '패스 전용'],
]

const MOCK_EXPERT_SECTIONS = [
  {
    id: 'exercise', title: '운동루틴', subtitle: '재활 중심',
    products: [
      { id: 'expert-focus', name: '상체 집중 4주', amount: '김승리 트레이너', price: 22900 },
      { id: 'expert-pilates', name: '필라테스 6주', amount: '박혜영 강사', price: 8900 },
      { id: 'expert-shoulder', name: '어깨 재활 프로그램', amount: '경혜인 물리치료사', price: 6400 },
    ],
  },
  {
    id: 'meal', title: '식단 루틴', subtitle: '다이어트 위주',
    products: [
      { id: 'expert-almond', name: '무염 아몬드', amount: '200g', price: 11900 },
      { id: 'expert-tofu', name: '두부 스테이크', amount: '2팩', price: 7200 },
      { id: 'expert-egg', name: '계란 특란', amount: '20구', price: 9400 },
    ],
  },
  { id: 'repeat', title: '자주 담은 재료', subtitle: '최근 4주', products: MOCK_SECTIONS[2].products },
]

function normalizeProduct(product, index) {
  return {
    id: product.externalProductId || `api-${index}`,
    name: product.name,
    amount: product.recommendationReason || '루틴 추천 상품',
    price: Number(product.price || 0),
    imageUrl: product.imageUrl,
    externalProductId: product.externalProductId,
    partner: product.partner,
  }
}

function normalizeExpertContent(content, index) {
  return {
    ...content,
    id: content.id || `expert-${index}`,
    name: content.name || content.title || '전문가 루틴',
    amount: [content.expertName, content.difficulty].filter(Boolean).join(' · ') || '전문가 추천',
    price: Number(content.price || 0),
    imageUrl: content.thumbnailUrl || content.imageUrl,
    contentType: String(content.contentType || '').toUpperCase(),
  }
}

export default function MarketPage({ onNavigate, onOpenProduct, onOpenExpert, onOpenCart, initialTab = 'meal', onTabChange }) {
  const [tab, setTab] = useState(initialTab)
  const [query, setQuery] = useState('')
  const [recommended, setRecommended] = useState([])
  const [expertContents, setExpertContents] = useState([])
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('marketCart') || '[]').filter((item) => !String(item.id || '').startsWith('expert-')) } catch { return [] }
  })

  useEffect(() => {
    let active = true
    getRoutines().then((response) => {
      const routines = response?.data?.content || []
      const routine = routines.find((item) => item.status === 'ACTIVE') || routines[0]
      if (!routine) return null
      return getMealProductRecommendations(routine.id)
    }).then((response) => {
      if (active && response) setRecommended((response?.data?.products || []).map(normalizeProduct))
    }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getExpertContents().then((response) => {
      const contents = response?.data?.content || []
      if (active) setExpertContents(contents.map(normalizeExpertContent))
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const sections = useMemo(() => {
    const source = recommended.length
      ? [{ ...MOCK_SECTIONS[0], products: recommended }, ...MOCK_SECTIONS.slice(1)]
      : MOCK_SECTIONS
    if (!query.trim()) return source
    return source.map((section) => ({ ...section, products: section.products.filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase())) })).filter((section) => section.products.length)
  }, [recommended, query])

  const expertSections = useMemo(() => {
    const exercise = expertContents.filter((item) => item.contentType === 'EXERCISE' || item.contentType === 'MIXED')
    const meal = expertContents.filter((item) => item.contentType === 'MEAL' || item.contentType === 'MIXED')
    const source = expertContents.length
      ? [
          { ...MOCK_EXPERT_SECTIONS[0], products: exercise },
          { ...MOCK_EXPERT_SECTIONS[1], products: meal },
          MOCK_EXPERT_SECTIONS[2],
        ].filter((section) => section.products.length)
      : MOCK_EXPERT_SECTIONS
    if (!query.trim()) return source
    const keyword = query.trim().toLowerCase()
    return source.map((section) => ({ ...section, products: section.products.filter((product) => product.name.toLowerCase().includes(keyword)) })).filter((section) => section.products.length)
  }, [expertContents, query])

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      const next = existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }]
      localStorage.setItem('marketCart', JSON.stringify(next))
      return next
    })
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <section className="market-page">
      <div className="market-scroll">
        <header><h1>마켓</h1><div><button type="button" aria-label="장바구니" onClick={onOpenCart}>🛒{cartCount > 0 && <b>{cartCount}</b>}</button><button type="button" aria-label="찜">♡</button></div></header>
        <label className="market-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="루틴·재료 검색" /><span>⌕</span></label>

        <div className="market-tabs"><button type="button" className={tab === 'expert' ? 'active' : ''} onClick={() => { setTab('expert'); onTabChange?.('expert') }}>전문가 루틴</button><button type="button" className={tab === 'meal' ? 'active' : ''} onClick={() => { setTab('meal'); onTabChange?.('meal') }}>식단·재료</button></div>

        {tab === 'expert' ? <>
          <article className="market-personal-note"><strong>내 부상에 맞는 것만</strong><span>허리 부담 프로그램은 숨겼어요</span></article>
          <div className="market-categories market-expert-categories">{EXPERT_CATEGORIES.map(([icon, label]) => <button type="button" key={label}><i>{icon}</i><span>{label}</span></button>)}</div>

          {expertSections.map((section) => <section className="market-product-section" key={section.id}>
            <header><div><h2>{section.title}</h2><small>{section.subtitle}</small></div><button type="button">전체 ›</button></header>
            <div className="market-product-slider">{section.products.map((product) => <article
              key={product.id}
              className="market-product-card"
              role="button"
              tabIndex={0}
              aria-label={`${product.name} 상세 보기`}
              onClick={() => onOpenExpert?.(product)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenExpert?.(product) }}
            >
              <div className="market-product-image" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}>{!product.imageUrl && <span>상품</span>}<button type="button" aria-label={`${product.name} 상세 보기`} onClick={(event) => { event.stopPropagation(); onOpenExpert?.(product) }}>＋</button></div>
              <strong>{product.name}</strong><small>{product.amount}</small><b>{product.price.toLocaleString()}원</b>
            </article>)}</div>
          </section>)}
        </> : <>
          <article className="market-personal-note"><strong>내 루틴에 필요한 것만</strong><span>자주·고당 간식은 숨겼어요</span></article>
          <div className="market-categories">{CATEGORIES.map(([icon, label]) => <button type="button" key={label}><i>{icon}</i><span>{label}</span></button>)}</div>

          {sections.map((section) => <section className="market-product-section" key={section.id}>
            <header><div><h2>{section.title}</h2><small>{section.subtitle}</small></div><button type="button">전체 ›</button></header>
            <div className="market-product-slider">{section.products.map((product) => <article key={product.id} className="market-product-card" onClick={() => onOpenProduct?.(product)}>
              <div className="market-product-image" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}>{!product.imageUrl && <span>상품</span>}<button type="button" onClick={(event) => { event.stopPropagation(); addToCart(product) }}>＋</button></div>
              <strong>{product.name}</strong><small>{product.amount}</small><b>{product.price.toLocaleString()}원</b>
            </article>)}</div>
          </section>)}
        </>}
      </div>
      <BottomNav active="market" onNavigate={onNavigate} />
    </section>
  )
}
