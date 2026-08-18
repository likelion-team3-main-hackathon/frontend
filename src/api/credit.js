import { apiRequest } from './client'

export function getCredits() {
  return apiRequest('/credits')
}
