import smileIcon from '../../assets/icons/smile.png'
import './AiRoutineChat.css'

export default function AiRoutineChat({ onBack }) {
  return (
    <section className="ai-routine-chat-page">
      <header><button type="button" onClick={onBack}>‹</button><img src={smileIcon} alt="" /><div><h1>리뉴 연구원</h1><small>내 기록 · 루틴 열람 중</small></div><em>미구현</em></header>
      <main>
        <time>오늘</time>
        <div className="ai-message"><i /><p>이번 주 단백질이 조금 부족했어요. 저녁 메뉴를 조정해볼까요?</p></div>
        <div className="user-message"><p>응 바꿔줘. 대신 조리 15분 안쪽으로</p></div>
        <div className="ai-message"><i /><div><p>연어 구이 대신 두부 스테이크와 계란 구성으로 바꿨어요.</p><article><strong>✓ 식단 루틴 수정 예시</strong><small>저녁 · 두부 스테이크 + 계란 2개</small><footer><button type="button">화면에서 보기</button><button type="button">되돌리기</button></footer></article></div></div>
        <div className="ai-quick-actions"><button type="button">장바구니에 담아줘</button><button type="button">내일 운동 강도 낮춰줘</button><button type="button">이번 주 리포트 보여줘</button></div>
      </main>
      <div className="ai-chat-input"><input aria-label="메시지" placeholder="무엇이든 물어보세요" disabled /><button type="button" disabled>↑</button></div>
    </section>
  )
}
