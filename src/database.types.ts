export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          role: 'seller' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: 'seller' | 'admin'
          created_at?: string
        }
        Update: {
          display_name?: string | null
          role?: 'seller' | 'admin'
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
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
        Insert: {
          id?: string
          seller_id: string
          customer_name: string
          address?: string | null
          speculaaspoppen?: number
          stroopwafels?: number
          glutenvrij?: number
          lactosevrij?: number
          total_cents?: number
          given?: boolean
          cancelled?: boolean
          created_at?: string
        }
        Update: {
          customer_name?: string
          address?: string | null
          speculaaspoppen?: number
          stroopwafels?: number
          glutenvrij?: number
          lactosevrij?: number
          given?: boolean
          cancelled?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: Record<string, never>
        Returns: { display_name: string; total_cents: number }[]
      }
      get_my_sales_total: {
        Args: Record<string, never>
        Returns: number
      }
      get_my_sales_orders: {
        Args: Record<string, never>
        Returns: {
          id: string
          created_at: string
          customer_name: string
          speculaaspoppen: number
          stroopwafels: number
          glutenvrij: number
          lactosevrij: number
          total_cents: number
          cancelled: boolean
        }[]
      }
      is_commission_member: {
        Args: Record<string, never>
        Returns: boolean
      }
      submit_order: {
        Args: {
          p_customer_name: string
          p_address: string | null
          p_speculaaspoppen: number
          p_stroopwafels: number
          p_glutenvrij: number
          p_lactosevrij: number
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
