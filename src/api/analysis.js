import { apiRequest } from './client'

function query(params) {
  return new URLSearchParams(params).toString()
}

export function getAnalysisOverview(period = 'DAILY', anchorDate) {
  return apiRequest(`/analysis-labs/overview?${query({
    period: period.toUpperCase(),
    ...(anchorDate ? { anchorDate } : {}),
  })}`)
}

export function getNutritionAnalysis(from, to) {
  return apiRequest(`/analysis-labs/nutrition?${query({ from, to })}`)
}

export function getExerciseAnalysis(from, to) {
  return apiRequest(`/analysis-labs/exercise?${query({ from, to })}`)
}

export function getBodyCompositionAnalysis(from, to) {
  return apiRequest(`/analysis-labs/body-composition?${query({ from, to })}`)
}
