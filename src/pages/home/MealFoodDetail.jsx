import { useMemo, useState } from 'react'
import { createMealCart, getMealProductRecommendations } from '../../api/market'
import bellIcon from '../../assets/icons/bell.png'

const INGREDIENT_FALLBACKS = {
  '닭가슴살 샐러드': ['닭가슴살', '양상추', '방울토마토'],
  '현미밥': ['현미'],
  '방울토마토': ['방울토마토'],
}

export default function MealFoodDetail({ food, photoUrl, routineId, onBack, onSave, onDelete }) {
  const baseAmount = Number(food.amount || 200)
  const [amount, setAmount] = useState(baseAmount)
  const [cartStatus, setCartStatus] = useState('')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const serving = Number(food.serving || 100)
  const nutrition = useMemo(() => {
    const ratio = amount / Math.max(1, baseAmount)
    return {
      calories: Math.round(Number(food.calories || 0) * ratio),
      carbs: Math.round(Number(food.carbs || 0) * ratio),
      protein: Math.round(Number(food.protein || 0) * ratio),
      fat: Math.round(Number(food.fat || 0) * ratio),
    }
  }, [amount, baseAmount, food])

  function changeAmount(change) {
    setAmount((current) => Math.max(0, current + change))
  }

  const ingredients = Array.isArray(food.ingredients) && food.ingredients.length
    ? food.ingredients
    : INGREDIENT_FALLBACKS[food.name] || [food.name]
  const now = new Date()
  const recordedTime = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  async function addIngredientsToCart() {
    setIsAddingToCart(true)
    setCartStatus('')
    try {
      const response = await getMealProductRecommendations(routineId)
      const products = response?.data?.products || []
      const matched = products.filter((product) => ingredients.some((ingredient) =>
        product.name?.includes(ingredient) || ingredient.includes(product.name)))
      if (matched.length) {
        const partner = matched[0].partner
        const partnerItems = matched.filter((product) => product.partner === partner)
        const cart = await createMealCart(routineId, partner, partnerItems.map((product) => ({ externalProductId: product.externalProductId, quantity: 1 })))
        sessionStorage.setItem('mealMarketCart', JSON.stringify(cart?.data || {}))
        setCartStatus(`${partnerItems.length}개 상품을 마켓 장바구니에 담았어요.`)
      } else {
        const localCart = JSON.parse(localStorage.getItem('mealIngredientCart') || '[]')
        localStorage.setItem('mealIngredientCart', JSON.stringify([...new Set([...localCart, ...ingredients])]))
        setCartStatus('재료를 마켓 장바구니에 담았어요.')
      }
    } catch {
      const localCart = JSON.parse(localStorage.getItem('mealIngredientCart') || '[]')
      localStorage.setItem('mealIngredientCart', JSON.stringify([...new Set([...localCart, ...ingredients])]))
      setCartStatus('재료를 마켓 장바구니에 담았어요.')
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <section className="meal-food-detail-page">
      <header className="meal-subpage-header"><button type="button" onClick={onBack}>‹</button><h1>이거 맞나요?</h1></header>

      <article className="food-detail-summary">
        <div className="food-detail-photo" style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>{!photoUrl && '🥗'}</div>
        <div><strong>{food.name}</strong><span className="food-recognition-line"><b>{nutrition.calories.toLocaleString()} kcal</b>{food.autoRecognized && <em>✓ 자동 인식</em>}</span></div>
      </article>

      <article className="food-detail-time"><span><img src={bellIcon} alt="" />{recordedTime}</span><small>자동</small></article>

      <div className="food-unit-selector"><button type="button" aria-pressed="false">인분(200g)</button><button type="button" className="active" aria-pressed="true">g</button></div>

      <div className="food-amount-stepper"><button type="button" onClick={() => changeAmount(-serving)}>−</button><strong>{amount}</strong><button type="button" onClick={() => changeAmount(serving)}>＋</button></div>

      <div className="food-detail-row ingredient-row"><span>재료 {ingredients.length}가지<small>{ingredients.join(' · ')}</small></span><button type="button" disabled={isAddingToCart} onClick={addIngredientsToCart}>{isAddingToCart ? '담는 중' : '담기'}</button></div>
      {cartStatus && <p className="food-cart-status">{cartStatus}</p>}
      <button type="button" className="food-detail-row"><span>요리법 보기</span><b>›</b></button>

      <article className="food-nutrition-card">
        <strong>{nutrition.calories.toLocaleString()} <small>kcal</small></strong>
        <div><i style={{ width: `${Math.min(100, nutrition.carbs)}%` }} /><i style={{ width: `${Math.min(100, nutrition.protein)}%` }} /><i style={{ width: `${Math.min(100, nutrition.fat)}%` }} /></div>
        <small>탄 {nutrition.carbs}　단 {nutrition.protein}　지 {nutrition.fat}</small>
      </article>

      <button type="button" className="meal-confirm-button" onClick={() => onSave({ ...food, amount, serving, ...nutrition })}>확인</button>
      <button type="button" className="food-delete-button" onClick={onDelete}>이 음식 삭제하기</button>
    </section>
  )
}
