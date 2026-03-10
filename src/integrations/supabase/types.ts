export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string
          achievement_type: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achievement_type: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          achievement_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          last_updated_at: string
          period_start: string
          total_cost_cents: number
          total_requests: number
          user_id: string
        }
        Insert: {
          id?: string
          last_updated_at?: string
          period_start: string
          total_cost_cents?: number
          total_requests?: number
          user_id: string
        }
        Update: {
          id?: string
          last_updated_at?: string
          period_start?: string
          total_cost_cents?: number
          total_requests?: number
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          amount: number
          category: string
          created_at: string
          frequency: string | null
          id: string
          item_name: string
          last_used_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          frequency?: string | null
          id?: string
          item_name: string
          last_used_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          frequency?: string | null
          id?: string
          item_name?: string
          last_used_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number | null
          id: string
          image_url: string | null
          is_completed: boolean | null
          is_primary: boolean | null
          name: string
          priority: Database["public"]["Enums"]["goal_priority"] | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          is_primary?: boolean | null
          name: string
          priority?: Database["public"]["Enums"]["goal_priority"] | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          is_primary?: boolean | null
          name?: string
          priority?: Database["public"]["Enums"]["goal_priority"] | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_price_comparisons: {
        Row: {
          best_store_name: string | null
          best_store_total_price: number | null
          created_at: string
          grocery_list_id: string
          id: string
          location_lat: number
          location_lng: number
          store_results: Json
          user_id: string
        }
        Insert: {
          best_store_name?: string | null
          best_store_total_price?: number | null
          created_at?: string
          grocery_list_id: string
          id?: string
          location_lat: number
          location_lng: number
          store_results?: Json
          user_id: string
        }
        Update: {
          best_store_name?: string | null
          best_store_total_price?: number | null
          created_at?: string
          grocery_list_id?: string
          id?: string
          location_lat?: number
          location_lng?: number
          store_results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_price_comparisons_grocery_list_id_fkey"
            columns: ["grocery_list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_accounts: {
        Row: {
          account_name: string
          account_type: string
          created_at: string
          id: string
          institution_name: string | null
          is_default: boolean
          plaid_account_id: string | null
          plaid_balance: number | null
          plaid_balance_synced_at: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type: string
          created_at?: string
          id?: string
          institution_name?: string | null
          is_default?: boolean
          plaid_account_id?: string | null
          plaid_balance?: number | null
          plaid_balance_synced_at?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          created_at?: string
          id?: string
          institution_name?: string | null
          is_default?: boolean
          plaid_account_id?: string | null
          plaid_balance?: number | null
          plaid_balance_synced_at?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_transfers: {
        Row: {
          account_id: string
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          source_description: string | null
          source_type: string
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          source_description?: string | null
          source_type: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          source_description?: string | null
          source_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transfers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "investment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          access_token: string
          created_at: string
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      linked_bank_accounts: {
        Row: {
          id: string
          user_id: string
          plaid_item_id: string | null
          plaid_account_id: string | null
          account_name: string
          account_type: string | null
          institution_name: string | null
          mask: string | null
          current_balance: number | null
          available_balance: number | null
          balance_synced_at: string | null
          last_transaction_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plaid_item_id?: string | null
          plaid_account_id?: string | null
          account_name: string
          account_type?: string | null
          institution_name?: string | null
          mask?: string | null
          current_balance?: number | null
          available_balance?: number | null
          balance_synced_at?: string | null
          last_transaction_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plaid_item_id?: string | null
          plaid_account_id?: string | null
          account_name?: string
          account_type?: string | null
          institution_name?: string | null
          mask?: string | null
          current_balance?: number | null
          available_balance?: number | null
          balance_synced_at?: string | null
          last_transaction_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          current_lowest_price: number | null
          id: string
          is_active: boolean
          is_triggered: boolean
          product_name: string
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_lowest_price?: number | null
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          product_name: string
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_lowest_price?: number | null
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          product_name?: string
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: string
          price: number
          product_name: string
          recorded_at: string
          store_name: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          id?: string
          price: number
          product_name: string
          recorded_at?: string
          store_name: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          id?: string
          price?: number
          product_name?: string
          recorded_at?: string
          store_name?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      price_notifications: {
        Row: {
          alert_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          original_price: number
          pattern_id: string | null
          product_name: string
          sale_price: number
          savings_percent: number
          store_name: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          original_price: number
          pattern_id?: string | null
          product_name: string
          sale_price: number
          savings_percent: number
          store_name?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          original_price?: number
          pattern_id?: string | null
          product_name?: string
          sale_price?: number
          savings_percent?: number
          store_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_notifications_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "purchase_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          daily_budget: number | null
          hourly_wage: number | null
          iap_active: boolean
          iap_expires_at: string | null
          iap_product_id: string | null
          iap_updated_at: string | null
          id: string
          last_login_date: string | null
          login_streak: number | null
          longest_streak: number | null
          monthly_income: number | null
          name: string | null
          nova_wealth_user: boolean
          onboarding_completed: boolean | null
          referral_bonus_days: number
          referral_code: string
          referred_by: string | null
          streak_freezes_remaining: number | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          daily_budget?: number | null
          hourly_wage?: number | null
          iap_active?: boolean
          iap_expires_at?: string | null
          iap_product_id?: string | null
          iap_updated_at?: string | null
          id?: string
          last_login_date?: string | null
          login_streak?: number | null
          longest_streak?: number | null
          monthly_income?: number | null
          name?: string | null
          nova_wealth_user?: boolean
          onboarding_completed?: boolean | null
          referral_bonus_days?: number
          referral_code: string
          referred_by?: string | null
          streak_freezes_remaining?: number | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          daily_budget?: number | null
          hourly_wage?: number | null
          iap_active?: boolean
          iap_expires_at?: string | null
          iap_product_id?: string | null
          iap_updated_at?: string | null
          id?: string
          last_login_date?: string | null
          login_streak?: number | null
          longest_streak?: number | null
          monthly_income?: number | null
          name?: string | null
          nova_wealth_user?: boolean
          onboarding_completed?: boolean | null
          referral_bonus_days?: number
          referral_code?: string
          referred_by?: string | null
          streak_freezes_remaining?: number | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_patterns: {
        Row: {
          alert_threshold_percent: number | null
          auto_alert_enabled: boolean
          average_price: number
          category: string
          created_at: string
          id: string
          last_purchased_at: string
          product_name: string
          purchase_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold_percent?: number | null
          auto_alert_enabled?: boolean
          average_price: number
          category: string
          created_at?: string
          id?: string
          last_purchased_at?: string
          product_name: string
          purchase_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold_percent?: number | null
          auto_alert_enabled?: boolean
          average_price?: number
          category?: string
          created_at?: string
          id?: string
          last_purchased_at?: string
          product_name?: string
          purchase_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["purchase_category"]
          created_at: string
          custom_frequency_days: number | null
          frequency: Database["public"]["Enums"]["purchase_frequency"] | null
          id: string
          import_batch_id: string | null
          item_name: string
          linked_account_id: string | null
          notes: string | null
          plaid_transaction_id: string | null
          purchase_date: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["purchase_category"]
          created_at?: string
          custom_frequency_days?: number | null
          frequency?: Database["public"]["Enums"]["purchase_frequency"] | null
          id?: string
          import_batch_id?: string | null
          item_name: string
          linked_account_id?: string | null
          notes?: string | null
          plaid_transaction_id?: string | null
          purchase_date?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["purchase_category"]
          created_at?: string
          custom_frequency_days?: number | null
          frequency?: Database["public"]["Enums"]["purchase_frequency"] | null
          id?: string
          import_batch_id?: string | null
          item_name?: string
          linked_account_id?: string | null
          notes?: string | null
          plaid_transaction_id?: string | null
          purchase_date?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_adds: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["purchase_category"]
          created_at: string
          frequency: Database["public"]["Enums"]["purchase_frequency"] | null
          id: string
          item_name: string
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["purchase_category"]
          created_at?: string
          frequency?: Database["public"]["Enums"]["purchase_frequency"] | null
          id?: string
          item_name: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["purchase_category"]
          created_at?: string
          frequency?: Database["public"]["Enums"]["purchase_frequency"] | null
          id?: string
          item_name?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          rewarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_alternatives: {
        Row: {
          alternative_name: string
          alternative_price: number
          category: string
          created_at: string
          id: string
          original_amount: number
          purchase_id: string | null
          savings: number
          status: string
          user_id: string
        }
        Insert: {
          alternative_name: string
          alternative_price: number
          category: string
          created_at?: string
          id?: string
          original_amount: number
          purchase_id?: string | null
          savings: number
          status?: string
          user_id: string
        }
        Update: {
          alternative_name?: string
          alternative_price?: number
          category?: string
          created_at?: string
          id?: string
          original_amount?: number
          purchase_id?: string | null
          savings?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_alternatives_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_interval: string
          created_at: string
          currency: string
          id: string
          next_renewal_at: string | null
          plan_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          next_renewal_at?: string | null
          plan_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          next_renewal_at?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          email: string | null
          id: string
          last_novawealth_check: string | null
          novawealth_subscriber: boolean
          standalone_subscriber: boolean
        }
        Insert: {
          email?: string | null
          id: string
          last_novawealth_check?: string | null
          novawealth_subscriber?: boolean
          standalone_subscriber?: boolean
        }
        Update: {
          email?: string | null
          id?: string
          last_novawealth_check?: string | null
          novawealth_subscriber?: boolean
          standalone_subscriber?: boolean
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          actual_savings: number
          alternatives_chosen: number
          created_at: string
          id: string
          is_completed: boolean
          reward_claimed: boolean
          streak_count: number
          target_savings: number
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          actual_savings?: number
          alternatives_chosen?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          reward_claimed?: boolean
          streak_count?: number
          target_savings?: number
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          actual_savings?: number
          alternatives_chosen?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          reward_claimed?: boolean
          streak_count?: number
          target_savings?: number
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_record_ai_usage: {
        Args: { p_estimated_cost_cents: number; p_user_id: string }
        Returns: string
      }
      get_community_challenge_stats: { Args: never; Returns: Json }
    }
    Enums: {
      goal_priority: "low" | "medium" | "high"
      purchase_category:
        | "dining"
        | "shopping"
        | "transportation"
        | "entertainment"
        | "subscriptions"
        | "groceries"
        | "health"
        | "utilities"
        | "travel"
        | "other"
      purchase_frequency: "one-time" | "daily" | "weekly" | "monthly" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      goal_priority: ["low", "medium", "high"],
      purchase_category: [
        "dining",
        "shopping",
        "transportation",
        "entertainment",
        "subscriptions",
        "groceries",
        "health",
        "utilities",
        "travel",
        "other",
      ],
      purchase_frequency: ["one-time", "daily", "weekly", "monthly", "custom"],
    },
  },
} as const
