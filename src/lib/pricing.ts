export const PRODUCT_LIMIT = 20
export const ORDER_LIMIT_CENTS = 15_000

export interface ProductCounts {
  speculaaspoppen: number
  stroopwafels: number
  glutenvrij: number
  lactosevrij: number
}

export const emptyCounts = (): ProductCounts => ({
  speculaaspoppen: 0,
  stroopwafels: 0,
  glutenvrij: 0,
  lactosevrij: 0,
})

export function calculateTotalCents(counts: ProductCounts): number {
  const regularWaffles =
    Math.floor(counts.stroopwafels / 3) * 900 +
    (counts.stroopwafels % 3) * 330
  const specialCount = counts.glutenvrij + counts.lactosevrij
  const specialWaffles =
    Math.floor(specialCount / 3) * 1250 + (specialCount % 3) * 460

  return (
    counts.speculaaspoppen * 700 + regularWaffles + specialWaffles
  )
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export function isValidOrder(counts: ProductCounts): boolean {
  return (
    Object.values(counts).every(
      (count) =>
        Number.isInteger(count) && count >= 0 && count <= PRODUCT_LIMIT,
    ) &&
    Object.values(counts).some((count) => count > 0) &&
    calculateTotalCents(counts) <= ORDER_LIMIT_CENTS
  )
}
