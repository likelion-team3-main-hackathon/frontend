import { useEffect, useMemo, useState } from 'react'
import leftIcon from '../../assets/icons/exercise/left.png'
import pauseIcon from '../../assets/icons/exercise/pause.png'
import rightIcon from '../../assets/icons/exercise/right.png'
import cameraIcon from '../../assets/icons/exercise/camera_n.png'
import MealCamera from './MealCamera'

function secondsFor(exercise) {
  if (exercise.targetUnit === 'MINUTES') return Number(exercise.targetValue || 0) * 60
  if (exercise.targetUnit === 'SECONDS') return Number(exercise.targetValue || 0)
  return 0
}

function clock(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export default function ExerciseWorkout({ exercises, initialProgress, onExit, onPartialSave, onFinish }) {
  const [exerciseIndex, setExerciseIndex] = useState(initialProgress?.exerciseIndex || 0)
  const [setIndex, setSetIndex] = useState(initialProgress?.setIndex || 0)
  const [phase, setPhase] = useState('exercise')
  const [seconds, setSeconds] = useState(() => initialProgress?.seconds ?? secondsFor(exercises[initialProgress?.exerciseIndex || 0]))
  const [paused, setPaused] = useState(false)
  const [feedback, setFeedback] = useState('GOOD')
  const [evidencePhoto, setEvidencePhoto] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const exercise = exercises[exerciseIndex]
  const isTimed = secondsFor(exercise) > 0
  const totalSets = useMemo(() => exercises.reduce((sum, item) => sum + Math.max(1, item.sets), 0), [exercises])
  const completedSets = exercises.slice(0, exerciseIndex).reduce((sum, item) => sum + Math.max(1, item.sets), 0) + setIndex
  const workoutMinutes = Math.max(1, Math.round(exercises.reduce((sum, item) => sum + Math.max(1, item.sets) * (secondsFor(item) || Number(item.targetValue || 0) * 3) + Math.max(0, item.sets - 1) * Number(item.restSeconds || 0), 0) / 60))
  const calories = Math.round(workoutMinutes * 9.1)

  function advance() {
    const hasAnotherSet = setIndex + 1 < Math.max(1, exercise.sets)
    const hasAnotherExercise = exerciseIndex + 1 < exercises.length
    if (!hasAnotherSet && !hasAnotherExercise) {
      setPhase('complete')
      return
    }
    const restSeconds = Math.max(0, Number(exercise.restSeconds || 0))
    if (restSeconds === 0) {
      afterRest()
      return
    }
    setSeconds(restSeconds)
    setPhase('rest')
    setPaused(false)
  }

  function afterRest() {
    if (setIndex + 1 < Math.max(1, exercise.sets)) {
      setSetIndex((current) => current + 1)
      setSeconds(secondsFor(exercise))
    } else {
      const nextIndex = exerciseIndex + 1
      setExerciseIndex(nextIndex)
      setSetIndex(0)
      setSeconds(secondsFor(exercises[nextIndex]))
    }
    setPhase('exercise')
  }

  function previous() {
    if (setIndex > 0) {
      setSetIndex((current) => current - 1)
      setSeconds(secondsFor(exercise))
      return
    }
    if (exerciseIndex > 0) {
      const previousIndex = exerciseIndex - 1
      setExerciseIndex(previousIndex)
      setSetIndex(Math.max(0, exercises[previousIndex].sets - 1))
      setSeconds(secondsFor(exercises[previousIndex]))
    }
  }

  useEffect(() => {
    if (paused || !['exercise', 'rest'].includes(phase)) return
    if (phase === 'exercise' && !isTimed) return
    if (seconds <= 0) {
      const timeout = window.setTimeout(phase === 'rest' ? afterRest : advance, 250)
      return () => window.clearTimeout(timeout)
    }
    const interval = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(interval)
  })

  if (phase === 'camera') return <MealCamera onClose={() => setPhase('exercise')} onUsePhoto={() => setPhase('exercise')} guideText={'전신이 프레임 안에 보이도록 맞춰주세요\n동작 자세를 확인할게요'} />
  if (phase === 'evidence-camera') return <MealCamera onClose={() => setPhase('complete')} onUsePhoto={(captured) => { setEvidencePhoto(captured); setPhase('complete') }} guideText={'운동 인증 사진을 촬영해주세요\n선택한 사진은 기록과 함께 저장돼요'} />

  if (phase === 'pause-menu') return <section className="exercise-pause-page">
    <div className="exercise-pause-preview">일시정지된 화면 <small>(준비)</small></div>
    <main><h1>{exerciseIndex}동작까지 하셨어요</h1><p>여기까지 저장할까요?</p></main>
    <footer><button type="button" onClick={() => setPhase('exercise')}>이어서 하기</button><button type="button" onClick={() => onPartialSave({ exerciseIndex, setIndex, seconds })}>여기까지 저장</button></footer>
  </section>

  if (phase === 'complete') {
    return <section className="exercise-complete-page">
      <header><h1>{1}일차 완료!</h1></header>
      <div className="exercise-complete-stats"><span><strong>{workoutMinutes}</strong><small>분</small></span><span><strong>{calories}</strong><small>kcal</small></span><span><strong>{exercises.length}/{exercises.length}</strong><small>동작</small></span></div>
      <div className="exercise-complete-visual">단련 부위 실루엣 <small>(팔 강조)</small></div>
      <h2>오늘 강도는 어떠셨나요?</h2><p>고른 난이도는 다음 운동 구성에 반영돼요.</p>
      <div className="exercise-feedback">
        {[['EASY', '↑', '여유 있었어요'], ['GOOD', '=', '딱 맞았어요'], ['HARD', '↓', '버거웠어요']].map(([value, icon, label]) => <button type="button" className={feedback === value ? 'active' : ''} key={value} onClick={() => setFeedback(value)}><i>{icon}</i>{label}{feedback === value && <b>✓</b>}</button>)}
      </div>
      <button type="button" className="exercise-discomfort"><span>불편했던 곳이 있나요?<small>해당 부위 동작을 다음에 빼드려요.</small></span><b>선택 ›</b></button>
      <button type="button" className="exercise-auth-button" onClick={() => setPhase('evidence-camera')}>{evidencePhoto ? '✓ 인증 사진 선택됨' : '○ 사진 인증 (선택)'}</button>
      {saveError && <p>{saveError}</p>}
      <button type="button" className="exercise-save-button" disabled={isSaving} onClick={async () => {
        setIsSaving(true)
        setSaveError('')
        try {
          await onFinish({ feedback, minutes: workoutMinutes, calories, exerciseCount: exercises.length, totalSets, photoFile: evidencePhoto?.file })
        } catch (error) {
          setSaveError(error.message || '운동 기록을 저장하지 못했어요.')
          setIsSaving(false)
        }
      }}>{isSaving ? '저장 중…' : '기록 저장'}</button>
    </section>
  }

  if (phase === 'rest') {
    const nextExercise = setIndex + 1 < Math.max(1, exercise.sets) ? exercise : exercises[exerciseIndex + 1]
    return <section className="exercise-rest-page">
      <button type="button" className="workout-exit" onClick={onExit}>×</button>
      <main><small>쉬는 중</small><strong>{clock(seconds)}</strong><p>다음 · {nextExercise?.name}</p><div>다음 동작 미리보기</div></main>
      <footer><button type="button" onClick={() => setSeconds((current) => current + 15)}>+15초</button><button type="button" onClick={afterRest}>▶　다음</button></footer>
    </section>
  }

  return <section className="exercise-workout-page">
    <button type="button" className="workout-exit" onClick={onExit}>×</button>
    <div className="workout-video">동작 영상<br /><small>추후 제공 예정</small></div>
    <div className="workout-progress">{Array.from({ length: totalSets }, (_, index) => <i className={index <= completedSets ? 'active' : ''} key={index} />)}</div>
    <small>{exerciseIndex + 1} / {exercises.length} · {setIndex + 1}세트</small>
    <h1>{exercise.name}</h1>
    {isTimed ? <strong className="workout-timer">{clock(seconds)}</strong> : <p>{exercise.weightKg ? `${exercise.weightKg}kg × ` : ''}{exercise.targetValue}회 × {exercise.sets}세트</p>}
    <nav><button type="button" onClick={previous} disabled={exerciseIndex === 0 && setIndex === 0}><img src={leftIcon} alt="이전" /></button><button type="button" onClick={() => setPhase('pause-menu')}><img src={pauseIcon} alt="일시정지" /></button><button type="button" onClick={advance}><img src={rightIcon} alt="다음" /></button></nav>
    <button type="button" className="learn-posture-button" onClick={() => setPhase('camera')}><img src={cameraIcon} alt="" />자세 봐주기</button>
  </section>
}
