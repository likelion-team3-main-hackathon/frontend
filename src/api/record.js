import { apiRequest } from './client'

export function getRoutineRecords(date, type) {
  const query = new URLSearchParams({ date })
  if (type) query.set('type', type)
  return apiRequest(`/routine-records?${query}`)
}

export function createRoutineRecord(record) {
  return apiRequest('/routine-records', { method: 'POST', body: record })
}

export function recordWater(glasses) {
  return createRoutineRecord({
    type: 'OTHER',
    recordedAt: new Date().toISOString(),
    details: { category: 'WATER', glasses, milliliters: glasses * 250 },
  })
}
