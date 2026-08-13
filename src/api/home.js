import { apiRequest } from './client'

export function getHome() {
  return apiRequest('/home')
}

export function getLatestCoaching() {
  return apiRequest('/coachings/latest')
}
