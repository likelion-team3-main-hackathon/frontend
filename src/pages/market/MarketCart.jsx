import { useMemo, useState } from 'react'
import './MarketCart.css'

const PROVIDERS = [
  { id: 'market-kurly', name: '마켓컬리', description: '내일 새벽 · 무료배송', extra: 0 },
  { id: 'coupang', name: '쿠팡', description: '내일 도착 · 로켓', extra: 2600 },
  { id: 'emart', name: '이마트', description: '모레 · 3,000', extra: 2900 },
]

function loadMealCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('marketCart') || '[]')
    return cart.filter((item) => !String(item.id || '').startsWith('expert-'))
  } catch { return [] }
}

export default function MarketCart({ onBack, onCheckout }) {
  const [items, setItems] = useState(loadMealCart)
  const [selectedIds, setSelectedIds] = useState(() => new Set(loadMealCart().map((item) => item.id)))
  const [providerId, setProviderId] = useState(PROVIDERS[0].id)

  const selectedItems = items.filter((item) => selectedIds.has(item.id))
  const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
  const providers = useMemo(() => PROVIDERS.map((provider) => ({ ...provider, total: subtotal + provider.extra })), [subtotal])
  const selectedProvider = providers.find((provider) => provider.id === providerId) || providers[0]
  const allSelected = items.length > 0 && selectedIds.size === items.length
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

  function saveItems(nextItems) {
    setItems(nextItems)
    localStorage.setItem('marketCart', JSON.stringify(nextItems))
  }

  function toggle(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)))
  }

  function removeItem(id) {
    saveItems(items.filter((item) => item.id !== id))
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  function clearCart() {
    saveItems([])
    setSelectedIds(new Set())
  }

  function checkout() {
    if (!selectedItems.length) return
    onCheckout?.({ items: selectedItems, provider: selectedProvider, source: 'cart' })
  }

  return <section className="market-cart-page">
    <header><button type="button" onClick={onBack}>‹</button><h1>장바구니 {totalQuantity}개</h1><button type="button" onClick={clearCart} disabled={!items.length}>전체삭제</button></header>
    <div className="market-cart-scroll">
      <button type="button" className={`cart-select-all ${allSelected ? 'selected' : ''}`} onClick={toggleAll}><i>✓</i>전체선택</button>
      {items.length === 0 ? <div className="cart-empty"><strong>장바구니가 비어 있어요</strong><p>식단·재료 상품의 ＋ 버튼을 눌러 담아보세요.</p></div> : <div className="cart-items">{items.map((item) => <article key={item.id}>
        <button type="button" className={`cart-item-check ${selectedIds.has(item.id) ? 'selected' : ''}`} onClick={() => toggle(item.id)}>✓</button>
        <div className="cart-item-image" style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}>{!item.imageUrl && '상품'}</div>
        <div><strong>{item.name}</strong><small>내일 새벽 · 무료배송{item.quantity > 1 ? ` · ${item.quantity}개` : ''}</small><b>{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}원</b></div>
        <button type="button" className="cart-item-delete" aria-label={`${item.name} 삭제`} onClick={() => removeItem(item.id)}>×</button>
      </article>)}</div>}

      {selectedItems.length > 0 && <section className="cart-provider-section"><h2>어디서 살까요?</h2><p>같은 장바구니, 가격만 비교</p>{providers.map((provider, index) => <button type="button" className={providerId === provider.id ? 'active' : ''} key={provider.id} onClick={() => setProviderId(provider.id)}><i>로고</i><span><strong>{provider.name}</strong><small>{provider.description}</small></span>{index === 0 && <em>최저가</em>}<b>{provider.total.toLocaleString()}</b></button>)}</section>}
    </div>
    {selectedItems.length > 0 && <footer><button type="button" onClick={checkout}>{selectedProvider.name}에서 {selectedProvider.total.toLocaleString()}원 구매하기</button></footer>}
  </section>
}
