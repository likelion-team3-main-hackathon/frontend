import { useMemo, useState } from 'react'
import { analyzeMealPhoto } from '../../api/record'
import cameraIcon from '../../assets/icons/camera.png'
import MealCamera from './MealCamera'
import MealFoodDetail from './MealFoodDetail'
import './MealRoutineSession.css'
import { randomId } from '../../utils/randomId'

const EMPTY_FOOD = { name: '', calories: '', carbs: '', protein: '', fat: '', servingGrams: 100 }

function numberFrom(text, keyword) {
  const match = String(text || '').match(new RegExp(`${keyword}\\s*(\\d+)`, 'i'))
  return match ? Number(match[1]) : 0
}

function initialFoods(item) {
  const supplied = item.foods || item.details?.foods
  if (Array.isArray(supplied) && (supplied.length || item.isManualMeal)) {
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

export default function MealRoutineSession({ item, onDecision, onClose, onMealUpdated, viewOnly = false, dayView = false }) {
  const [foods, setFoods] = useState(() => initialFoods(item))
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_FOOD)
  const [photo, setPhoto] = useState(null)
  const [view, setView] = useState('list')
  const [selectedFoodId, setSelectedFoodId] = useState(null)
  const [recognitionNotice, setRecognitionNotice] = useState('')
  const [mealAnalysisId, setMealAnalysisId] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const totals = useMemo(() => foods.reduce((sum, food) => ({
    calories: sum.calories + Number(food.calories || 0), carbs: sum.carbs + Number(food.carbs || 0),
    protein: sum.protein + Number(food.protein || 0), fat: sum.fat + Number(food.fat || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 }), [foods])

  function addFood(event) {
    event.preventDefault()
    if (!draft.name.trim()) return
    setFoods((current) => [...current, { ...draft, id: randomId(), name: draft.name.trim() }])
    setDraft(EMPTY_FOOD); setIsAdding(false)
  }

  async function usePhoto(captured) {
    setPhoto(captured); setView('list'); setIsAnalyzing(true); setError('')
    setRecognitionNotice('AI가 사진 속 음식과 영양 정보를 분석하고 있어요…')
    try {
      const analysis = await analyzeMealPhoto(captured.file, item.routineItemId)
      setMealAnalysisId(analysis.analysisId)
      setFoods((analysis.foods || []).map((food, index) => ({ id: `ai-food-${index}`, name: food.name,
        servingGrams: food.servingGrams, calories: food.calories, carbs: food.carbohydrateGrams,
        protein: food.proteinGrams, fat: food.fatGrams, autoRecognized: true })))
      setRecognitionNotice(`예상 영양 분석이 완료됐어요. 음식과 양을 확인해 주세요. (신뢰도 ${Math.round(Number(analysis.confidence || 0) * 100)}%)`)
    } catch (requestError) {
      setRecognitionNotice(''); setError(requestError.message || '식단 사진을 분석하지 못했어요.')
    } finally { setIsAnalyzing(false) }
  }

  async function confirm() {
    setIsSaving(true); setError('')
    try {
      await onDecision?.(item, 'completed', { foods, mealType: mealTypeCode(item.type),
        photoFile: mealAnalysisId ? null : photo?.file, mealAnalysisId })
      onMealUpdated?.({ ...item, foods, details: { ...item.details, foods, ...totals }, detail: `${totals.calories} kcal` })
      onClose?.()
    } catch (requestError) { setError(requestError.message || '식단 기록을 저장하지 못했어요.'); setIsSaving(false) }
  }

  const selectedFood = foods.find((food) => food.id === selectedFoodId)
  if (view === 'camera') return <MealCamera onClose={() => setView('list')} onUsePhoto={usePhoto} />
  if (view === 'detail' && selectedFood) return <MealFoodDetail readOnly={viewOnly} food={selectedFood} photoUrl={photo?.url || ''} routineId={item.routineId || item.id} onBack={() => setView('list')} onSave={(updatedFood) => { setFoods((current) => current.map((food) => food.id === updatedFood.id ? updatedFood : food)); setView('list') }} onDelete={() => { setFoods((current) => current.filter((food) => food.id !== selectedFood.id)); setSelectedFoodId(null); setView('list') }} />

  return <section className="meal-session-page">
    <header className="meal-session-header"><button type="button" onClick={onClose} aria-label="뒤로 가기">‹</button><h1>{dayView ? (item.type || '식사') : `${item.routineTitle || '식단 루틴'} ${item.dayNumber || 1}일차`}</h1></header>
    <button type="button" className="meal-photo-card" disabled={viewOnly} onClick={() => setView('camera')} style={photo?.url ? { backgroundImage: `url(${photo.url})` } : undefined}>{!photo?.url && <><img src={cameraIcon} alt="" /><small>사진 인증 및 분석</small></>}</button>
    {recognitionNotice && <p className="meal-recognition-notice">{recognitionNotice}</p>}
    <div className="meal-food-list">{foods.map((food) => <button type="button" className="meal-food-card" key={food.id} onClick={() => { setSelectedFoodId(food.id); setView('detail') }}><div><strong>{food.name}</strong><span>›</span></div><div><b>{Number(food.calories || 0).toLocaleString()} kcal</b><small>탄 {food.carbs || 0}　단 {food.protein || 0}　지 {food.fat || 0}</small></div></button>)}</div>
    <div className="meal-total-card"><strong>합계 {totals.calories.toLocaleString()} kcal</strong><small>탄 {totals.carbs}　단 {totals.protein}　지 {totals.fat}</small></div>
    {isAdding && <form className="meal-add-form" onSubmit={addFood}><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="음식 이름" autoFocus /><div>{['calories','carbs','protein','fat'].map((field) => <input key={field} type="number" min="0" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} placeholder={{calories:'kcal',carbs:'탄수',protein:'단백질',fat:'지방'}[field]} />)}</div><footer><button type="button" onClick={() => setIsAdding(false)}>취소</button><button type="submit">추가</button></footer></form>}
    {!viewOnly && !isAdding && <button type="button" className="meal-add-button" aria-label="음식 추가" onClick={() => setIsAdding(true)}>＋</button>}
    {error && <p className="meal-session-error">{error}</p>}
    <button type="button" className="meal-confirm-button" disabled={viewOnly || isSaving || isAnalyzing || foods.length === 0} onClick={viewOnly ? onClose : confirm}>{viewOnly ? '돌아가기' : isAnalyzing ? '분석 중…' : isSaving ? '저장 중…' : '확인'}</button>
  </section>
}
