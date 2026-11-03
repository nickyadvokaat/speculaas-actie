export interface SellerProfile {
  id: string
  display_name: string | null
  role: 'seller' | 'admin'
}

export interface LeaderboardEntry {
  display_name: string
  total_cents: number | string
}

export interface SaleOrder {
  id: string
  seller_id: string
  customer_name: string
  address: string | null
  speculaaspoppen: number
  stroopwafels: number
  glutenvrij: number
  lactosevrij: number
  total_cents: number
  given: boolean
  cancelled: boolean
  created_at: string
}

export type MySaleOrder = Pick<
  SaleOrder,
  | 'id'
  | 'created_at'
  | 'customer_name'
  | 'speculaaspoppen'
  | 'stroopwafels'
  | 'glutenvrij'
  | 'lactosevrij'
  | 'total_cents'
  | 'cancelled'
>
