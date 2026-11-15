import { reactive } from 'vue'
import { fetchMySalesOrders, fetchMySalesTotal, fetchMyOrderDelivery } from '../lib/data'
import { authState, refreshProfile } from './auth'
import type { MySaleOrder } from '../types'

export type SellerOrder = MySaleOrder & {
  package_given: boolean
  delivered_to_customer: boolean
}

export const salesState = reactive<{
  orders: SellerOrder[]
  totalCents: number | null
  loading: boolean
  error: string | null
}>({ orders: [], totalCents: null, loading: false, error: null })

let requestId = 0

export function clearSales(): void {
  requestId++
  salesState.orders = []
  salesState.totalCents = null
  salesState.loading = false
  salesState.error = null
}

export async function loadSales(): Promise<void> {
  const userId = authState.user?.id
  if (!userId) {
    clearSales()
    return
  }
  const request = ++requestId
  salesState.loading = true
  salesState.error = null
  try {
    await refreshProfile()
    if (authState.error) throw new Error(authState.error)
    const [total, orders, delivery] = await Promise.all([
      fetchMySalesTotal(),
      fetchMySalesOrders(),
      fetchMyOrderDelivery(),
    ])
    if (request !== requestId || authState.user?.id !== userId) return
    const statuses = new Map(delivery.map((status) => [status.order_id, status]))
    salesState.orders = orders.map((order) => {
      const status = statuses.get(order.id)
      if (!status) throw new Error('De uitdeelstatus van een bestelling ontbreekt.')
      return { ...order, package_given: status.package_given, delivered_to_customer: status.delivered_to_customer }
    })
    salesState.totalCents = total
  } catch (error) {
    if (request !== requestId || authState.user?.id !== userId) return
    salesState.orders = []
    salesState.totalCents = null
    salesState.error = error instanceof Error ? error.message : 'Controleer je verbinding en probeer opnieuw.'
  } finally {
    if (request === requestId) salesState.loading = false
  }
}
