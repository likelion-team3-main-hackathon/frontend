import { apiRequest } from './client'

export function requestRoutineGeneration(request) {
  return apiRequest('/routines/generations', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: request,
  })
}

export function getRoutineGeneration(generationId, signal) {
  return apiRequest(`/routines/generations/${generationId}`, { signal })
}

export function getRoutine(routineId) {
  return apiRequest(`/routines/${routineId}`)
}

export function getTodayRoutine() {
  return apiRequest('/routines/today')
}

export function getRoutines(page = 0, size = 20) {
  return apiRequest(`/routines?page=${page}&size=${size}`)
}

function wait(delayMs, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, delayMs)

    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId)
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function waitForRoutineGeneration(generationId, signal) {
  let delayMs = 800

  while (!signal?.aborted) {
    const response = await getRoutineGeneration(generationId, signal)
    const generation = response?.data

    if (generation?.status === 'COMPLETED') return generation
    if (generation?.status === 'FAILED') {
      throw new Error(generation.failureReason || '루틴 생성에 실패했습니다.')
    }

    await wait(delayMs, signal)
    delayMs = Math.min(Math.round(delayMs * 1.5), 5000)
  }

  throw new DOMException('요청이 취소되었습니다.', 'AbortError')
}
