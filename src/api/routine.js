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
