export function formatOneDecimal(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
}
