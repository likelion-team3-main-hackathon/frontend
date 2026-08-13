import { apiRequest } from './client'

export function updateAgreements(agreements) {
  return apiRequest('/users/me/agreements', {
    method: 'PUT',
    body: {
      agreements,
    },
  })
}

export function updateOnboarding(onboarding) {
  return apiRequest('/users/me/onboarding', {
    method: 'PUT',
    body: onboarding,
  })
}

export function getMyProfile() {
  return apiRequest('/users/me/profile')
}
