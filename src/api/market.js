import { apiRequest } from './client'

export function getMealProductRecommendations(routineId) {
  return apiRequest(`/meal-products/recommendations?routineId=${encodeURIComponent(routineId)}`)
}

export function createMealCart(routineId, partner, items) {
  return apiRequest('/meal-carts', {
    method: 'POST',
    body: { routineId, partner, items },
  })
}
