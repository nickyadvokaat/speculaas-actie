export const ORDER_DEADLINE = '2026-11-12'

export function areOrdersClosed(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const localDate = `${date.year}-${date.month}-${date.day}`
  return localDate >= ORDER_DEADLINE
}
