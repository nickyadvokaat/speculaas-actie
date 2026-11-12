export const ORDER_DEADLINE = '2026-11-15T12:00:00+01:00'

export function areOrdersClosed(now: Date): boolean {
  return now.getTime() >= Date.parse(ORDER_DEADLINE)
}
