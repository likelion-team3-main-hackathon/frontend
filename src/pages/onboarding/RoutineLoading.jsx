import { useEffect } from 'react'
import './RoutineLoading.css'

export default function RoutineLoading({ message = '루틴을 준비하고\n있어요', onDone, delay = 1000 }) {
  useEffect(() => {
    if (!onDone) return undefined
    const timer = window.setTimeout(onDone, delay)
    return () => window.clearTimeout(timer)
  }, [delay, onDone])

  return (
    <section className="routine-loading-page" aria-live="polite" aria-busy="true">
      <h1>{message.split(/\\n|\n/).map((line) => <span key={line}>{line}</span>)}</h1>
      <div className="routine-loading-track"><i /></div>
    </section>
  )
}
