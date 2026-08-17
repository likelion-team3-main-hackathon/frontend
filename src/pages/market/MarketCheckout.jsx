import { useEffect, useMemo, useState } from 'react'
import { getMyProfile } from '../../api/user'
import './MarketCheckout.css'

const METHODS = [
  ['kakao', '카카오페이', '최대 3% 적립'],
  ['card', '신한카드 ****1234', '무이자 3개월'],
  ['naver', '네이버페이', ''],
]

export default function MarketCheckout({ order, onBack, onComplete }) {
  const [userName, setUserName] = useState('정우정')
  const [method, setMethod] = useState('kakao')
  const items = order?.items || []
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
  const coupon = Math.min(3000, subtotal)
  const credit = Math.min(2400, Math.max(0, subtotal - coupon))
  const finalTotal = Math.max(0, subtotal - coupon - credit)

  useEffect(() => {
    getMyProfile().then((response) => {
      const profile = response?.data || {}
      setUserName(localStorage.getItem('renewNickname')?.trim() || profile.name || profile.nickname || profile.username || '정우정')
    }).catch(() => {})
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 1), 0), [items])

  return <section className="market-checkout-page">
    <header><button type="button" onClick={onBack}>‹</button><h1>결제하기</h1></header>
    <div className="checkout-scroll">
      <section className="checkout-address"><header><h2>배송지</h2><button type="button">변경</button></header><strong>{userName} · 010-1234-5678</strong><p>서울 성동구 왕십리로 00, 000동 000호</p><span>문 앞에 놓아주세요</span></section>
      <section className="checkout-products"><h2>주문 상품 {itemCount}개</h2>{items.map((item) => <article key={item.id}><div style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}>{!item.imageUrl && '상품'}</div><span><strong>{item.name}</strong><small>수량 {item.quantity || 1}</small></span><b>{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}원</b></article>)}</section>
      <section className="checkout-benefits"><article><span><strong>쿠폰</strong><small>신규 가입 3,000원 할인</small></span><b>적용됨</b></article><article><span><strong>크레딧</strong><small>보유 2,400 · 이번 주 적립 300</small></span><b>2,400 사용</b></article></section>
      <section className="checkout-method"><h2>결제수단</h2>{METHODS.map(([id, name, note]) => <button type="button" className={method === id ? 'active' : ''} key={id} onClick={() => setMethod(id)}><i></i><strong>{name}</strong><small>{note}</small></button>)}</section>
      <section className="checkout-total"><p><span>상품 금액</span><b>{subtotal.toLocaleString()}원</b></p><p><span>배송비</span><b>무료</b></p><p><span>쿠폰 할인</span><b className="discount">−{coupon.toLocaleString()}원</b></p><p><span>크레딧 사용</span><b className="discount">−{credit.toLocaleString()}원</b></p><footer><strong>최종 결제금액</strong><b>{finalTotal.toLocaleString()}원</b></footer></section>
      <p className="checkout-agreement">주문 내용을 확인했으며 결제에 동의합니다. 신선식품은 단순 변심 반품이 제한됩니다.</p>
    </div>
    <footer className="checkout-pay"><button type="button" disabled={!items.length} onClick={() => onComplete?.({ ...order, finalTotal, method })}>{finalTotal.toLocaleString()}원 결제하기</button></footer>
  </section>
}
