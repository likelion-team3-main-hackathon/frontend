import { useEffect, useMemo, useState } from 'react'
import leftIcon from '../../assets/icons/exercise/left.png'
import pauseIcon from '../../assets/icons/exercise/pause.png'
import rightIcon from '../../assets/icons/exercise/right.png'
import cameraIcon from '../../assets/icons/exercise/camera_n.png'
import { analyzeExercisePose } from '../../api/record'
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
  const [paused] = useState(false)
  const [feedback, setFeedback] = useState('GOOD')
  const [evidencePhoto, setEvidencePhoto] = useState(null)
  const [poseAnalysis, setPoseAnalysis] = useState(null)
  const [poseError, setPoseError] = useState('')
  const [isAnalyzingPose, setIsAnalyzingPose] = useState(false)
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
    if (!hasAnotherSet && !hasAnotherExercise) return setPhase('complete')
    setSeconds(Math.max(0, Number(exercise.restSeconds || 0)))
    setPhase('rest')
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
      return setSeconds(secondsFor(exercise))
    }
    if (exerciseIndex > 0) {
      const previousIndex = exerciseIndex - 1
      setExerciseIndex(previousIndex)
      setSetIndex(Math.max(0, exercises[previousIndex].sets - 1))
      setSeconds(secondsFor(exercises[previousIndex]))
    }
  }

  async function analyzePose(captured) {
    setIsAnalyzingPose(true)
    setPoseError('')
    setPhase('pose-result')
    try {
      setPoseAnalysis(await analyzeExercisePose(captured.file, exercise.name, exercise.id || exercise.exerciseId))
    } catch (error) {
      setPoseError(error.message || '자세를 분석하지 못했어요.')
    } finally {
      setIsAnalyzingPose(false)
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

  if (phase === 'camera') return <MealCamera onClose={() => setPhase('exercise')} onUsePhoto={analyzePose} guideText={'전신이 화면 안에 보이도록 맞춰주세요.\n운동 자세를 확인할게요.'} />
  if (phase === 'evidence-camera') return <MealCamera onClose={() => setPhase('complete')} onUsePhoto={(captured) => { setEvidencePhoto(captured); setPhase('complete') }} guideText={'운동 인증 사진을 촬영해 주세요.\n선택한 사진은 기록과 함께 저장돼요.'} />

  if (phase === 'pose-result') return <section className="pose-analysis-page">
    <header><button type="button" onClick={() => setPhase('exercise')}>‹</button><h1>AI 자세 분석</h1></header>
    {isAnalyzingPose && <div className="pose-analysis-loading"><strong>자세를 분석하고 있어요</strong><small>사진의 관절 정렬과 신체 위치를 확인합니다.</small></div>}
    {!isAnalyzingPose && poseError && <div className="pose-analysis-error"><p>{poseError}</p><button type="button" onClick={() => setPhase('camera')}>다시 촬영</button></div>}
    {!isAnalyzingPose && poseAnalysis && <>
      <div className="pose-score-card"><small>{exercise.name}</small><strong>{poseAnalysis.poseScore}<em>/100</em></strong><span>AI 추정 신뢰도 {Math.round(Number(poseAnalysis.confidence || 0) * 100)}%</span></div>
      {poseAnalysis.safetyWarning && <div className="pose-safety-warning"><strong>안전 경고</strong><p>{poseAnalysis.safetyWarning}</p></div>}
      <section className="pose-result-card"><h2>확인된 부분</h2>{poseAnalysis.detectedIssues?.length ? <ul>{poseAnalysis.detectedIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p>사진에서 뚜렷한 문제를 찾지 못했어요.</p>}</section>
      <section className="pose-result-card"><h2>이렇게 고쳐보세요</h2><ul>{poseAnalysis.feedback?.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
      <p className="pose-disclaimer">사진 한 장을 기반으로 한 AI 추정 결과이며 의료 진단이 아닙니다. 통증이 있다면 운동을 중단하세요.</p>
      <button type="button" className="pose-retry-button" onClick={() => setPhase('camera')}>다시 촬영</button>
      <button type="button" className="pose-return-button" onClick={() => setPhase('exercise')}>운동으로 돌아가기</button>
    </>}
  </section>

  if (phase === 'pause-menu') return <section className="exercise-pause-page">
    <div className="exercise-pause-preview">일시정지 화면</div>
    <main><h1>{exerciseIndex + 1}동작까지 수행했어요</h1><p>여기까지 저장할까요?</p></main>
    <footer><button type="button" onClick={() => setPhase('exercise')}>이어하기</button><button type="button" onClick={() => onPartialSave({ exerciseIndex, setIndex, seconds })}>여기까지 저장</button></footer>
  </section>

  if (phase === 'complete') return <section className="exercise-complete-page">
    <header><h1>오늘 운동 완료!</h1></header>
    <div className="exercise-complete-stats"><span><strong>{workoutMinutes}</strong><small>분</small></span><span><strong>{calories}</strong><small>kcal</small></span><span><strong>{exercises.length}/{exercises.length}</strong><small>동작</small></span></div>
    <div className="exercise-complete-visual">오늘 운동 결과</div>
    <h2>오늘 강도는 어땠나요?</h2><p>고른 난이도는 다음 운동 구성에 반영돼요.</p>
    <div className="exercise-feedback">{[['EASY', '○', '여유 있었어요'], ['GOOD', '=', '딱 맞았어요'], ['HARD', '△', '버거웠어요']].map(([value, icon, label]) => <button type="button" className={feedback === value ? 'active' : ''} key={value} onClick={() => setFeedback(value)}><i>{icon}</i>{label}{feedback === value && <b>✓</b>}</button>)}</div>
    <button type="button" className="exercise-discomfort"><span>불편했던 곳이 있나요?<small>다음 운동 조정에 활용해요.</small></span><b>선택 ›</b></button>
    <button type="button" className="exercise-auth-button" onClick={() => setPhase('evidence-camera')}>{evidencePhoto ? '인증 사진 선택됨' : '사진 인증 (선택)'}</button>
    {saveError && <p>{saveError}</p>}
    <button type="button" className="exercise-save-button" disabled={isSaving} onClick={async () => {
      setIsSaving(true)
      setSaveError('')
      try {
        await onFinish({ feedback, minutes: workoutMinutes, calories, exerciseCount: exercises.length, totalSets, photoFile: evidencePhoto?.file, poseAnalysisId: poseAnalysis?.poseAnalysisId })
      } catch (error) {
        setSaveError(error.message || '운동 기록을 저장하지 못했어요.')
        setIsSaving(false)
      }
    }}>{isSaving ? '저장 중…' : '기록 저장'}</button>
  </section>

  if (phase === 'rest') {
    const nextExercise = setIndex + 1 < Math.max(1, exercise.sets) ? exercise : exercises[exerciseIndex + 1]
    return <section className="exercise-rest-page"><button type="button" className="workout-exit" onClick={onExit}>×</button><main><small>쉬는 중</small><strong>{clock(seconds)}</strong><p>다음 · {nextExercise?.name}</p><div>다음 동작 미리보기</div></main><footer><button type="button" onClick={() => setSeconds((current) => current + 15)}>+15초</button><button type="button" onClick={afterRest}>다음</button></footer></section>
  }

  return <section className="exercise-workout-page">
    <button type="button" className="workout-exit" onClick={onExit}>×</button>
    <div className="workout-video">동작 영상<br /><small>추후 제공 예정</small></div>
    <div className="workout-progress">{Array.from({ length: totalSets }, (_, index) => <i className={index <= completedSets ? 'active' : ''} key={index} />)}</div>
    <small>{exerciseIndex + 1} / {exercises.length} · {setIndex + 1}세트</small><h1>{exercise.name}</h1>
    {isTimed ? <strong className="workout-timer">{clock(seconds)}</strong> : <p>{exercise.weightKg ? `${exercise.weightKg}kg × ` : ''}{exercise.targetValue}회 × {exercise.sets}세트</p>}
    <nav><button type="button" onClick={previous} disabled={exerciseIndex === 0 && setIndex === 0}><img src={leftIcon} alt="이전" /></button><button type="button" onClick={() => setPhase('pause-menu')}><img src={pauseIcon} alt="일시정지" /></button><button type="button" onClick={advance}><img src={rightIcon} alt="다음" /></button></nav>
    <button type="button" className="learn-posture-button" onClick={() => setPhase('camera')}><img src={cameraIcon} alt="" />자세 봐주기</button>
  </section>
}
