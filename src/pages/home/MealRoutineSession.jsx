import { useMemo, useState } from 'react'
import MealCamera from './MealCamera'
import MealFoodDetail from './MealFoodDetail'
import cameraIcon from '../../assets/icons/camera.png'
import './MealRoutineSession.css'

const EMPTY_FOOD = { name: '', calories: '', carbs: '', protein: '', fat: '' }

function numberFrom(text, keyword) {
  const match = String(text || '').match(new RegExp(`${keyword}\\s*(\\d+)`, 'i'))
  return match ? Number(match[1]) : 0
}

function initialFoods(item) {
  const supplied = item.foods || item.details?.foods
  if (Array.isArray(supplied) && supplied.length) {
    return supplied.map((food, index) => ({ id: food.id || `food-${index}`, ...food }))
  }
  if (Array.isArray(item.menu) && item.menu.length) {
    return item.menu.map((name, index) => ({ id: `menu-${index}`, name, calories: 0, carbs: 0, protein: 0, fat: 0 }))
  }
  return [{
    id: `routine-food-${item.id}`,
    name: item.title,
    calories: numberFrom(item.detail, 'kcal'),
    carbs: numberFrom(item.detail, '탄(?:수화물)?'),
    protein: numberFrom(item.detail, '단(?:백질)?'),
    fat: numberFrom(item.detail, '지(?:방)?'),
  }]
}

function mealTypeCode(type) {
  if (type?.includes('아침')) return 'BREAKFAST'
  if (type?.includes('점심')) return 'LUNCH'
  if (type?.includes('저녁')) return 'DINNER'
  return 'SNACK'
}

export default function MealRoutineSession({ item, onDecision, onClose }) {
  const [foods, setFoods] = useState(() => initialFoods(item))
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_FOOD)
  const [photoUrl, setPhotoUrl] = useState('')
  const [view, setView] = useState('list')
  const [selectedFoodId, setSelectedFoodId] = useState(null)
  const [recognitionNotice, setRecognitionNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const totals = useMemo(() => foods.reduce((sum, food) => ({
    calories: sum.calories + Number(food.calories || 0),
    carbs: sum.carbs + Number(food.carbs || 0),
    protein: sum.protein + Number(food.protein || 0),
    fat: sum.fat + Number(food.fat || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 }), [foods])

  function addFood(event) {
    event.preventDefault()
    if (!draft.name.trim()) return
    setFoods((current) => [...current, { ...draft, id: crypto.randomUUID(), name: draft.name.trim() }])
    setDraft(EMPTY_FOOD)
    setIsAdding(false)
  }

  async function confirm() {
    setIsSaving(true)
    setError('')
    try {
      await onDecision?.(item, 'completed', { foods, mealType: mealTypeCode(item.type) })
      onClose?.()
    } catch (requestError) {
      setError(requestError.message || '식단 기록을 저장하지 못했어요.')
      setIsSaving(false)
    }
  }

  const selectedFood = foods.find((food) => food.id === selectedFoodId)
  if (view === 'camera') return <MealCamera onClose={() => setView('list')} onUsePhoto={(url) => {
    setPhotoUrl(url)
    setFoods((current) => current.map((food) => ({ ...food, autoRecognized: true })))
    setRecognitionNotice('사진을 촬영했어요. 인식된 음식 목록을 확인해주세요.')
    setView('list')
  }} />
  if (view === 'detail' && selectedFood) return <MealFoodDetail food={selectedFood} photoUrl={photoUrl} routineId={item.routineId || item.id} onBack={() => setView('list')} onSave={(updatedFood) => {
    setFoods((current) => current.map((food) => food.id === updatedFood.id ? updatedFood : food))
    setView('list')
  }} onDelete={() => {
    setFoods((current) => current.filter((food) => food.id !== selectedFood.id))
    setSelectedFoodId(null)
    setView('list')
  }} />

  return (
    <section className="meal-session-page">
      <header className="meal-session-header">
        <button type="button" onClick={onClose} aria-label="뒤로 가기">‹</button>
        <h1>{item.routineTitle || '식단 루틴'} {item.dayNumber || 1}일차</h1>
      </header>

      <button type="button" className="meal-photo-card" onClick={() => setView('camera')} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
        {!photoUrl && <><img src={cameraIcon} alt="" /><small>사진 인증</small></>}
      </button>
      {recognitionNotice && <p className="meal-recognition-notice">{recognitionNotice}</p>}

      <div className="meal-food-list">
        {foods.map((food) => (
          <button type="button" className="meal-food-card" key={food.id} onClick={() => { setSelectedFoodId(food.id); setView('detail') }}>
            <div><strong>{item.type} {food.name}</strong><span>›</span></div>
            <div><b>{Number(food.calories || 0).toLocaleString()} kcal</b><small>탄 {food.carbs || 0}　단 {food.protein || 0}　지 {food.fat || 0}</small></div>
          </button>
        ))}
      </div>

      <div className="meal-total-card">
        <strong>합계 {totals.calories.toLocaleString()} kcal</strong>
        <small>탄 {totals.carbs}　단 {totals.protein}　지 {totals.fat}</small>
      </div>

      {isAdding && (
        <form className="meal-add-form" onSubmit={addFood}>
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="음식 이름" autoFocus />
          <div>
            {['calories', 'carbs', 'protein', 'fat'].map((field) => <input key={field} type="number" min="0" value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} placeholder={{ calories: 'kcal', carbs: '탄수', protein: '단백질', fat: '지방' }[field]} />)}
          </div>
          <footer><button type="button" onClick={() => setIsAdding(false)}>취소</button><button type="submit">추가</button></footer>
        </form>
      )}

      {!isAdding && <button type="button" className="meal-add-button" aria-label="음식 추가" onClick={() => setIsAdding(true)}>＋</button>}
      {error && <p className="meal-session-error">{error}</p>}
      <button type="button" className="meal-confirm-button" disabled={isSaving || foods.length === 0} onClick={confirm}>{isSaving ? '저장 중…' : '확인'}</button>
    </section>
  )
}
