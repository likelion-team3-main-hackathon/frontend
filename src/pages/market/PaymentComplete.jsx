import './PaymentComplete.css'

export default function PaymentComplete({ onBack }) {
  return <section className="payment-complete-page"><div><i>✓</i><h1>결제 완료!</h1><p>주문이 정상적으로 접수됐어요.</p></div><button type="button" onClick={onBack}>마켓으로 돌아가기</button></section>
}
