import { supabase } from './supabase'
import type { LeaderboardEntry, MySaleOrder, SaleOrder, SellerProfile } from '../types'
import type { ProductCounts } from './pricing'

function requireSupabase() {
  if (!supabase) throw new Error('De Supabase-koppeling is nog niet ingesteld.')
  return supabase
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await requireSupabase().rpc('get_leaderboard')
  if (error) throw error
  return data ?? []
}

export async function fetchMySalesTotal(): Promise<number> {
  const { data, error } = await requireSupabase().rpc('get_my_sales_total')
  if (error) throw error
  const total = Number(data)
  if (!Number.isFinite(total)) throw new Error('Je verkooptotaal kon niet worden verwerkt.')
  return total
}

export async function fetchMySalesOrders(): Promise<MySaleOrder[]> {
  const { data, error } = await requireSupabase().rpc('get_my_sales_orders')
  if (error) throw error
  return data ?? []
}

export async function submitOrder(
  customerName: string,
  address: string,
  counts: ProductCounts,
): Promise<string> {
  const { data, error } = await requireSupabase().rpc('submit_order', {
    p_customer_name: customerName,
    p_address: address.trim() || null,
    p_speculaaspoppen: counts.speculaaspoppen,
    p_stroopwafels: counts.stroopwafels,
    p_glutenvrij: counts.glutenvrij,
    p_lactosevrij: counts.lactosevrij,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('De database gaf geen bestelnummer terug.')
  return data
}

export async function fetchCommissionData(): Promise<{
  orders: SaleOrder[]
  sellers: SellerProfile[]
}> {
  const client = requireSupabase()
  const [ordersResult, sellersResult] = await Promise.all([
    client.from('orders').select('*').order('created_at', { ascending: false }),
    client.from('profiles').select('id, display_name, role').order('display_name'),
  ])
  if (ordersResult.error) throw ordersResult.error
  if (sellersResult.error) throw sellersResult.error
  return {
    orders: ordersResult.data ?? [],
    sellers: sellersResult.data ?? [],
  }
}

export async function updateOrder(
  id: string,
  patch: Partial<
    Pick<
      SaleOrder,
      | 'customer_name'
      | 'address'
      | 'speculaaspoppen'
      | 'stroopwafels'
      | 'glutenvrij'
      | 'lactosevrij'
      | 'given'
      | 'cancelled'
    >
  >,
): Promise<void> {
  const { error } = await requireSupabase()
    .from('orders')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function updateSellerName(
  id: string,
  displayName: string,
): Promise<void> {
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', id)
  if (error) throw error
}
