import { apiRequest } from './client'

export function getExpertContents() {
  return apiRequest('/expert-contents')
}

export function getExpertContent(contentId) {
  return apiRequest(`/expert-contents/${encodeURIComponent(contentId)}`)
}

export function getMealProductRecommendations(routineId) {
  return apiRequest(`/meal-products/recommendations?routineId=${encodeURIComponent(routineId)}`)
}

export function createMealCart(routineId, partner, items) {
  return apiRequest('/meal-carts', {
    method: 'POST',
    body: { routineId, partner, items },
  })
}
