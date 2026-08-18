import { useEffect, useMemo, useRef, useState } from 'react'
import './MarketProductDetail.css'

const PRODUCT_META = {
  chicken: { discount: 24, originalPrice: 29900, calories: 109, protein: 23.4, fat: 1.2, sodium: 180, options: [['100g × 10팩', 22900, '기본 구성 · 재고 충분'], ['100g × 20팩', 41200, '10% 추가 할인 · 인기'], ['150g × 10팩', 29900, '단백질 35g/팩']] },
  almond: { calories: 607, protein: 21.2, fat: 49.9, sodium: 1, options: [['200g', 11900, '기본 구성'], ['200g × 2팩', 21900, '묶음 할인']] },
  tofu: { calories: 84, protein: 9.3, fat: 4.7, sodium: 7, options: [['2팩', 7200, '기본 구성'], ['4팩', 13200, '묶음 할인']] },
}

function defaultOptions(product) {
  const label = product?.amount && !/추천|루틴/.test(product.amount) ? product.amount : '기본 구성'
  return [[label, Number(product?.price || 0), '기본 구성 · 재고 충분'], [`${label} × 2`, Number(product?.price || 0) * 2, '묶음 구성']]
}

export default function MarketProductDetail({ product, onBack, onOpenCart, onBuyNow }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState({})
  const [cartToast, setCartToast] = useState(false)
  const [cartCount, setCartCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('marketCart') || '[]').reduce((sum, item) => sum + Number(item.quantity || 0), 0) } catch { return 0 }
  })
  const [cartAnimation, setCartAnimation] = useState(null)
  const [cartBump, setCartBump] = useState(false)
  const pageRef = useRef(null)
  const headerCartRef = useRef(null)
  const addCartRef = useRef(null)
  const animationTimersRef = useRef([])
  const meta = PRODUCT_META[product?.id] || {}
  const options = meta.options || defaultOptions(product)
  const selections = Object.entries(selected).filter(([, quantity]) => quantity > 0)
  const total = selections.reduce((sum, [index, quantity]) => sum + options[index][1] * quantity, 0)
  const price = Number(product?.price || 0)

  const comment = useMemo(() => {
    if (product?.amount && /추천|루틴/.test(product.amount)) return product.amount
    return '이번 주 루틴에 필요한 영양을 간편하게 채울 수 있어요. 나트륨도 권장 이하입니다.'
  }, [product])

  useEffect(() => {
    if (!cartToast) return undefined
    const timeout = window.setTimeout(() => setCartToast(false), 8000)
    return () => window.clearTimeout(timeout)
  }, [cartToast])

  useEffect(() => () => animationTimersRef.current.forEach(window.clearTimeout), [])

  function changeQuantity(index, amount) {
    setSelected((current) => ({ ...current, [index]: Math.max(0, Number(current[index] || 0) + amount) }))
  }

  function selectOption(index) {
    setSelected((current) => ({ ...current, [index]: Math.max(1, Number(current[index] || 0)) }))
    setOpen(false)
  }

  function addSelectedToCart() {
    if (!selections.length) return setOpen(true)
    let cart = []
    try { cart = JSON.parse(localStorage.getItem('marketCart') || '[]') } catch { cart = [] }
    selections.forEach(([index, quantity]) => {
      const [optionName, optionPrice] = options[index]
      const id = `${product?.id || 'product'}-${index}`
      const found = cart.find((item) => item.id === id)
      if (found) found.quantity += quantity
      else cart.push({ ...product, id, name: `${product?.name} ${optionName}`, price: optionPrice, quantity })
    })
    localStorage.setItem('marketCart', JSON.stringify(cart))
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }

  function animateAddToCart() {
    const nextCartCount = addSelectedToCart()
    if (!nextCartCount) return
    const pageRect = pageRef.current?.getBoundingClientRect()
    const startRect = addCartRef.current?.getBoundingClientRect()
    const endRect = headerCartRef.current?.getBoundingClientRect()
    animationTimersRef.current.forEach(window.clearTimeout)
    animationTimersRef.current = []
    setCartToast(false)
    setCartBump(false)
    if (pageRect && startRect && endRect) {
      const startX = startRect.left - pageRect.left + startRect.width / 2 - 21
      const startY = startRect.top - pageRect.top + startRect.height / 2 - 21
      const endX = endRect.left - pageRect.left + endRect.width / 2 - 21
      const endY = endRect.top - pageRect.top + endRect.height / 2 - 21
      setCartAnimation({ key: Date.now(), startX, startY, deltaX: endX - startX, deltaY: endY - startY })
    }
    animationTimersRef.current.push(window.setTimeout(() => {
      setCartCount(nextCartCount)
      setCartBump(true)
    }, 620))
    animationTimersRef.current.push(window.setTimeout(() => {
      setCartAnimation(null)
      setCartBump(false)
      setCartToast(true)
    }, 1040))
  }

  function buyNow() {
    if (!selections.length) {
      setOpen(true)
      return
    }
    const purchaseItems = selections.map(([index, quantity]) => ({ ...product, id: `${product.id}-${index}`, name: `${product.name} ${options[index][0]}`, option: options[index][0], price: options[index][1], quantity }))
    onBuyNow?.({ items: purchaseItems, source: 'direct' })
  }

  if (!product) return <section className="product-detail-page"><button type="button" onClick={onBack}>‹ 마켓으로</button><p>상품 정보를 찾을 수 없어요.</p></section>

  return <section className="product-detail-page" ref={pageRef}>
    <header className="product-detail-header"><button type="button" onClick={onBack}>‹</button><h1>상세 페이지</h1><button type="button" ref={headerCartRef} className={`product-header-cart ${cartBump ? 'bump' : ''}`} aria-label={`장바구니 ${cartCount}개`} onClick={onOpenCart}>🛒{cartCount > 0 && <b>{cartCount}</b>}</button></header>
    <div className="product-detail-scroll">
      <div className="product-detail-image" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}>{!product.imageUrl && '상품 이미지'}</div>
      <main>
        <div className="product-tags"><span>고단백</span><span>저나트륨</span><span>내 루틴 적합</span></div>
        <h2>{product.name} {product.amount && !/추천|루틴/.test(product.amount) ? product.amount : ''}</h2>
        <p className="product-delivery">{product.partner || '프레시원'} · 내일 새벽 도착</p>
        <div className="product-price">{meta.discount && <em>{meta.discount}%</em>}<strong>{price.toLocaleString()}원</strong>{meta.originalPrice && <del>{meta.originalPrice.toLocaleString()}원</del>}</div>

        <section className="product-nutrition"><h3>100g당 영양</h3><div><span>열량<b>{meta.calories || 109} kcal</b></span><span>단백질<b className="green">{meta.protein || 23.4} g</b></span><span>지방<b>{meta.fat || 1.2} g</b></span><span>나트륨<b>{meta.sodium || 180} mg</b></span></div></section>
        <section className="product-comment"><h3>연구원 코멘트</h3><p>{comment}</p></section>

        <div className={`product-option-picker ${open ? 'open' : ''}`}>
          <button type="button" onClick={() => setOpen((value) => !value)}><span><small>중량 · 구성</small>{selections.length ? options[selections[0][0]][0] : '옵션을 선택해주세요'}</span><b>{open ? '⌃' : '⌄'}</b></button>
          {open && <div className="product-option-menu">{options.map(([name, optionPrice, description], index) => <button type="button" key={name} onClick={() => selectOption(index)}><span><strong>{name}</strong><small>{description}</small></span><b>{optionPrice.toLocaleString()}원</b>{selected[index] > 0 && <i>✓</i>}</button>)}</div>}
        </div>

        {selections.length > 0 && <section className="product-selections">
          {selections.map(([index, quantity]) => <article key={index}><span><strong>{options[index][0]}</strong><small>개당 {options[index][1].toLocaleString()}원</small></span><div><button type="button" onClick={() => changeQuantity(index, -1)}>−</button><b>{quantity}</b><button type="button" onClick={() => changeQuantity(index, 1)}>＋</button><button type="button" onClick={() => setSelected((current) => ({ ...current, [index]: 0 }))}>×</button></div></article>)}
          <button type="button" className="add-option" onClick={() => setOpen(true)}>＋ 옵션 추가</button>
          <footer><span>총 결제금액 · {selections.length}개 옵션</span><strong>{total.toLocaleString()}원</strong></footer>
        </section>}
      </main>
    </div>
    {cartAnimation && <span key={cartAnimation.key} className="cart-flying-item" style={{ left: cartAnimation.startX, top: cartAnimation.startY, '--cart-x': `${cartAnimation.deltaX}px`, '--cart-y': `${cartAnimation.deltaY}px` }}>상품</span>}
    {cartToast && <aside className="cart-added-toast" role="status"><i>✓</i><strong>장바구니에 담았어요</strong><button type="button" onClick={onOpenCart}>보러가기</button></aside>}
    <footer className="product-buy-bar"><button ref={addCartRef} type="button" aria-label="장바구니에 담기" disabled={Boolean(cartAnimation)} onClick={animateAddToCart}>🛒</button><button type="button" onClick={buyNow}>바로 구매</button></footer>
  </section>
}
