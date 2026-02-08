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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          recipient_id: string | null
          scheduled_gift_id: string | null
          stage: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          recipient_id?: string | null
          scheduled_gift_id?: string | null
          stage: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          recipient_id?: string | null
          scheduled_gift_id?: string | null
          stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_scheduled_gift_id_fkey"
            columns: ["scheduled_gift_id"]
            isOneToOne: false
            referencedRelation: "scheduled_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          occasion_date: string | null
          occasion_type: string | null
          processed_at: string | null
          recipient_name: string
          status: string | null
          user_email: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          occasion_date?: string | null
          occasion_type?: string | null
          processed_at?: string | null
          recipient_name: string
          status?: string | null
          user_email: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          occasion_date?: string | null
          occasion_type?: string | null
          processed_at?: string | null
          recipient_name?: string
          status?: string | null
          user_email?: string
          user_name?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          scheduled_gift_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          scheduled_gift_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          scheduled_gift_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_scheduled_gift_id_fkey"
            columns: ["scheduled_gift_id"]
            isOneToOne: false
            referencedRelation: "scheduled_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          available_for_sale: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured_image_url: string | null
          gift_vibe: Database["public"]["Enums"]["gift_vibe"]
          handle: string
          id: string
          inventory: number | null
          price: number
          product_type: string | null
          rank: number | null
          shopify_product_id: string
          shopify_variant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          available_for_sale?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured_image_url?: string | null
          gift_vibe?: Database["public"]["Enums"]["gift_vibe"]
          handle: string
          id: string
          inventory?: number | null
          price: number
          product_type?: string | null
          rank?: number | null
          shopify_product_id: string
          shopify_variant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          available_for_sale?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured_image_url?: string | null
          gift_vibe?: Database["public"]["Enums"]["gift_vibe"]
          handle?: string
          id?: string
          inventory?: number | null
          price?: number
          product_type?: string | null
          rank?: number | null
          shopify_product_id?: string
          shopify_variant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_reload_amount: number | null
          auto_reload_enabled: boolean | null
          auto_reload_threshold: number | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gift_wallet_balance: number | null
          id: string
          phone: string | null
          stripe_payment_method_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string
          wallet_auto_reload: boolean | null
          wallet_reload_amount: number | null
          wallet_reload_threshold: number | null
        }
        Insert: {
          auto_reload_amount?: number | null
          auto_reload_enabled?: boolean | null
          auto_reload_threshold?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gift_wallet_balance?: number | null
          id: string
          phone?: string | null
          stripe_payment_method_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          wallet_auto_reload?: boolean | null
          wallet_reload_amount?: number | null
          wallet_reload_threshold?: number | null
        }
        Update: {
          auto_reload_amount?: number | null
          auto_reload_enabled?: boolean | null
          auto_reload_threshold?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gift_wallet_balance?: number | null
          id?: string
          phone?: string | null
          stripe_payment_method_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          wallet_auto_reload?: boolean | null
          wallet_reload_amount?: number | null
          wallet_reload_threshold?: number | null
        }
        Relationships: []
      }
      recipients: {
        Row: {
          address: Json | null
          anniversary: string | null
          automation_enabled: boolean | null
          birthday: string | null
          city: string | null
          country: string | null
          created_at: string
          default_gift_variant_id: string | null
          email: string | null
          id: string
          interests: string[] | null
          name: string
          notes: string | null
          phone: string | null
          preferred_gift_style: string | null
          preferred_gift_vibe: Database["public"]["Enums"]["gift_vibe"] | null
          relationship: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: Json | null
          anniversary?: string | null
          automation_enabled?: boolean | null
          birthday?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_gift_variant_id?: string | null
          email?: string | null
          id?: string
          interests?: string[] | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_gift_style?: string | null
          preferred_gift_vibe?: Database["public"]["Enums"]["gift_vibe"] | null
          relationship?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: Json | null
          anniversary?: string | null
          automation_enabled?: boolean | null
          birthday?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_gift_variant_id?: string | null
          email?: string | null
          id?: string
          interests?: string[] | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_gift_style?: string | null
          preferred_gift_vibe?: Database["public"]["Enums"]["gift_vibe"] | null
          relationship?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      scheduled_gifts: {
        Row: {
          address_confirmed_at: string | null
          address_reminder_sent: number | null
          address_requested_at: string | null
          archived_at: string | null
          auto_schedule: boolean | null
          automation_enabled: boolean | null
          confirmation_expires_at: string | null
          confirmation_token: string | null
          created_at: string
          default_gift_variant_id: string | null
          delivery_date: string | null
          estimated_cost: number | null
          fulfilled_at: string | null
          gift_description: string | null
          gift_image_url: string | null
          gift_type: string | null
          gift_variant_id: string | null
          gift_vibe: Database["public"]["Enums"]["gift_vibe"] | null
          id: string
          occasion: string
          occasion_date: string
          occasion_type: string | null
          paused_reason: string | null
          payment_amount: number | null
          payment_status: string | null
          price_range: string | null
          recipient_id: string
          shipping_address: Json | null
          shopify_order_id: string | null
          shopify_tracking_number: string | null
          status: string | null
          updated_at: string
          user_id: string
          wallet_reservation_amount: number | null
          wallet_reserved: boolean | null
        }
        Insert: {
          address_confirmed_at?: string | null
          address_reminder_sent?: number | null
          address_requested_at?: string | null
          archived_at?: string | null
          auto_schedule?: boolean | null
          automation_enabled?: boolean | null
          confirmation_expires_at?: string | null
          confirmation_token?: string | null
          created_at?: string
          default_gift_variant_id?: string | null
          delivery_date?: string | null
          estimated_cost?: number | null
          fulfilled_at?: string | null
          gift_description?: string | null
          gift_image_url?: string | null
          gift_type?: string | null
          gift_variant_id?: string | null
          gift_vibe?: Database["public"]["Enums"]["gift_vibe"] | null
          id?: string
          occasion: string
          occasion_date: string
          occasion_type?: string | null
          paused_reason?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          price_range?: string | null
          recipient_id: string
          shipping_address?: Json | null
          shopify_order_id?: string | null
          shopify_tracking_number?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          wallet_reservation_amount?: number | null
          wallet_reserved?: boolean | null
        }
        Update: {
          address_confirmed_at?: string | null
          address_reminder_sent?: number | null
          address_requested_at?: string | null
          archived_at?: string | null
          auto_schedule?: boolean | null
          automation_enabled?: boolean | null
          confirmation_expires_at?: string | null
          confirmation_token?: string | null
          created_at?: string
          default_gift_variant_id?: string | null
          delivery_date?: string | null
          estimated_cost?: number | null
          fulfilled_at?: string | null
          gift_description?: string | null
          gift_image_url?: string | null
          gift_type?: string | null
          gift_variant_id?: string | null
          gift_vibe?: Database["public"]["Enums"]["gift_vibe"] | null
          id?: string
          occasion?: string
          occasion_date?: string
          occasion_type?: string | null
          paused_reason?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          price_range?: string | null
          recipient_id?: string
          shipping_address?: Json | null
          shopify_order_id?: string | null
          shopify_tracking_number?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          wallet_reservation_amount?: number | null
          wallet_reserved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_gifts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          created_at: string
          estimated_time_saved: number | null
          id: string
          last_calculated: string | null
          total_delivered_gifts: number | null
          total_recipients: number | null
          total_scheduled_gifts: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_time_saved?: number | null
          id?: string
          last_calculated?: string | null
          total_delivered_gifts?: number | null
          total_recipients?: number | null
          total_scheduled_gifts?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_time_saved?: number | null
          id?: string
          last_calculated?: string | null
          total_delivered_gifts?: number | null
          total_recipients?: number | null
          total_scheduled_gifts?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          scheduled_gift_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          scheduled_gift_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          scheduled_gift_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_scheduled_gift_id_fkey"
            columns: ["scheduled_gift_id"]
            isOneToOne: false
            referencedRelation: "scheduled_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_delivery_date: {
        Args: { occasion_date: string }
        Returns: string
      }
      calculate_user_metrics: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      can_enable_automation: {
        Args: { p_gift_cost: number; p_user_id: string }
        Returns: Json
      }
      check_auto_reload: { Args: { p_user_id: string }; Returns: Json }
      check_upcoming_gift_events: { Args: never; Returns: undefined }
      get_available_balance: { Args: { p_user_id: string }; Returns: number }
      get_gifts_at_stage: {
        Args: { days_before: number; stage_name: string }
        Returns: {
          estimated_cost: number
          gift_description: string
          gift_id: string
          occasion_date: string
          recipient_id: string
          recipient_name: string
          user_id: string
        }[]
      }
      get_house_essentials: {
        Args: { p_max_price?: number }
        Returns: {
          active: boolean | null
          available_for_sale: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured_image_url: string | null
          gift_vibe: Database["public"]["Enums"]["gift_vibe"]
          handle: string
          id: string
          inventory: number | null
          price: number
          product_type: string | null
          rank: number | null
          shopify_product_id: string
          shopify_variant_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_calendar_integration: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_connected: boolean
          is_expired: boolean
          provider: string
          updated_at: string
        }[]
      }
      get_products_by_vibe_and_budget: {
        Args: {
          p_max_price: number
          p_vibe: Database["public"]["Enums"]["gift_vibe"]
        }
        Returns: {
          active: boolean | null
          available_for_sale: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured_image_url: string | null
          gift_vibe: Database["public"]["Enums"]["gift_vibe"]
          handle: string
          id: string
          inventory: number | null
          price: number
          product_type: string | null
          rank: number | null
          shopify_product_id: string
          shopify_variant_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      gift_vibe: "CALM_COMFORT" | "ARTFUL_UNIQUE" | "REFINED_STYLISH"
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
      app_role: ["admin", "moderator", "user"],
      gift_vibe: ["CALM_COMFORT", "ARTFUL_UNIQUE", "REFINED_STYLISH"],
    },
  },
} as const
