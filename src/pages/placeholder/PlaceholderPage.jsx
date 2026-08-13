import BottomNav from '../../components/layout/BottomNav'
import './PlaceholderPage.css'

const PAGE_COPY = {
  analysis: { title: '분석실', description: '건강 분석과 변화 기록을 준비하고 있어요.' },
  market: { title: '마켓', description: '루틴에 맞는 상품 추천을 준비하고 있어요.' },
  community: { title: '커뮤니티', description: '함께 루틴을 이어가는 공간을 준비하고 있어요.' },
  my: { title: 'MY', description: '내 프로필과 설정 화면을 준비하고 있어요.' },
}

export default function PlaceholderPage({ page, onNavigate }) {
  const copy = PAGE_COPY[page] || PAGE_COPY.analysis

  return (
    <section className="placeholder-page">
      <main>
        <span>리뉴</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </main>
      <BottomNav active={page} onNavigate={onNavigate} />
    </section>
  )
}
