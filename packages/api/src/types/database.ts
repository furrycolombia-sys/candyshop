export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      check_in_audit: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          check_in_id: string;
          created_at: string;
          id: string;
          ip_address: string;
          performed_by: string;
          reason: string | null;
          user_agent: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          check_in_id: string;
          created_at?: string;
          id?: string;
          ip_address?: string;
          performed_by: string;
          reason?: string | null;
          user_agent?: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          check_in_id?: string;
          created_at?: string;
          id?: string;
          ip_address?: string;
          performed_by?: string;
          reason?: string | null;
          user_agent?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_in_audit_check_in_id_fkey";
            columns: ["check_in_id"];
            isOneToOne: false;
            referencedRelation: "check_ins";
            referencedColumns: ["id"];
          },
        ];
      };
      check_ins: {
        Row: {
          checked_in: boolean;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          entitlement_id: string;
          id: string;
          order_item_id: string;
          qr_code: string;
        };
        Insert: {
          checked_in?: boolean;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          entitlement_id: string;
          id?: string;
          order_item_id: string;
          qr_code?: string;
        };
        Update: {
          checked_in?: boolean;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          entitlement_id?: string;
          id?: string;
          order_item_id?: string;
          qr_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_entitlement_id_fkey";
            columns: ["entitlement_id"];
            isOneToOne: false;
            referencedRelation: "product_entitlements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          description_en: string;
          description_es: string;
          ends_at: string;
          id: string;
          is_active: boolean;
          location: string;
          max_capacity: number | null;
          name_en: string;
          name_es: string;
          slug: string;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          description_en?: string;
          description_es?: string;
          ends_at: string;
          id?: string;
          is_active?: boolean;
          location?: string;
          max_capacity?: number | null;
          name_en: string;
          name_es: string;
          slug: string;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          description_en?: string;
          description_es?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          location?: string;
          max_capacity?: number | null;
          name_en?: string;
          name_es?: string;
          slug?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cop: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          order_id: string;
          product_id: string;
          quantity?: number;
          unit_price_cop: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price_cop?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          id: string;
          payment_status: Database["public"]["Enums"]["payment_status"];
          stripe_session_id: string | null;
          total_cop: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          stripe_session_id?: string | null;
          total_cop: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          stripe_session_id?: string | null;
          total_cop?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          created_at: string;
          description_en: string;
          description_es: string;
          id: string;
          key: string;
          name_en: string;
          name_es: string;
        };
        Insert: {
          created_at?: string;
          description_en?: string;
          description_es?: string;
          id?: string;
          key: string;
          name_en: string;
          name_es: string;
        };
        Update: {
          created_at?: string;
          description_en?: string;
          description_es?: string;
          id?: string;
          key?: string;
          name_en?: string;
          name_es?: string;
        };
        Relationships: [];
      };
      product_entitlements: {
        Row: {
          created_at: string;
          id: string;
          name_en: string;
          name_es: string;
          product_id: string;
          sort_order: number;
          type: Database["public"]["Enums"]["entitlement_type"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          name_en: string;
          name_es: string;
          product_id: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["entitlement_type"];
        };
        Update: {
          created_at?: string;
          id?: string;
          name_en?: string;
          name_es?: string;
          product_id?: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["entitlement_type"];
        };
        Relationships: [
          {
            foreignKeyName: "product_entitlements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_reviews: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          rating: number;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          rating: number;
          text?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          rating?: number;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"];
          compare_at_price_cop: number | null;
          compare_at_price_usd: number | null;
          created_at: string;
          description_en: string;
          description_es: string;
          event_id: string | null;
          featured: boolean;
          id: string;
          images: Json;
          is_active: boolean;
          long_description_en: string;
          long_description_es: string;
          max_quantity: number | null;
          name_en: string;
          name_es: string;
          price_cop: number;
          price_usd: number;
          rating: number | null;
          refundable: boolean | null;
          review_count: number;
          sections: Json;
          seller_id: string | null;
          slug: string;
          sort_order: number;
          tagline_en: string;
          tagline_es: string;
          tags: string[];
          type: Database["public"]["Enums"]["product_type"];
          updated_at: string;
        };
        Insert: {
          category?: Database["public"]["Enums"]["product_category"];
          compare_at_price_cop?: number | null;
          compare_at_price_usd?: number | null;
          created_at?: string;
          description_en?: string;
          description_es?: string;
          event_id?: string | null;
          featured?: boolean;
          id?: string;
          images?: Json;
          is_active?: boolean;
          long_description_en?: string;
          long_description_es?: string;
          max_quantity?: number | null;
          name_en: string;
          name_es: string;
          price_cop: number;
          price_usd?: number;
          rating?: number | null;
          refundable?: boolean | null;
          review_count?: number;
          sections?: Json;
          seller_id?: string | null;
          slug: string;
          sort_order?: number;
          tagline_en?: string;
          tagline_es?: string;
          tags?: string[];
          type: Database["public"]["Enums"]["product_type"];
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["product_category"];
          compare_at_price_cop?: number | null;
          compare_at_price_usd?: number | null;
          created_at?: string;
          description_en?: string;
          description_es?: string;
          event_id?: string | null;
          featured?: boolean;
          id?: string;
          images?: Json;
          is_active?: boolean;
          long_description_en?: string;
          long_description_es?: string;
          max_quantity?: number | null;
          name_en?: string;
          name_es?: string;
          price_cop?: number;
          price_usd?: number;
          rating?: number | null;
          refundable?: boolean | null;
          review_count?: number;
          sections?: Json;
          seller_id?: string | null;
          slug?: string;
          sort_order?: number;
          tagline_en?: string;
          tagline_es?: string;
          tags?: string[];
          type?: Database["public"]["Enums"]["product_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_permissions: {
        Row: {
          created_at: string;
          id: string;
          permission_id: string;
          resource_id: string | null;
          resource_type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          permission_id: string;
          resource_id?: string | null;
          resource_type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          permission_id?: string;
          resource_id?: string | null;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_transfers: {
        Row: {
          claimed_at: string | null;
          created_at: string;
          expires_at: string;
          from_user_id: string;
          id: string;
          order_item_id: string;
          status: Database["public"]["Enums"]["transfer_status"];
          to_user_id: string | null;
          transfer_token: string;
        };
        Insert: {
          claimed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          from_user_id: string;
          id?: string;
          order_item_id: string;
          status?: Database["public"]["Enums"]["transfer_status"];
          to_user_id?: string | null;
          transfer_token?: string;
        };
        Update: {
          claimed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          from_user_id?: string;
          id?: string;
          order_item_id?: string;
          status?: Database["public"]["Enums"]["transfer_status"];
          to_user_id?: string | null;
          transfer_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_permissions: {
        Row: {
          created_at: string;
          expires_at: string | null;
          granted_by: string;
          id: string;
          mode: Database["public"]["Enums"]["permission_mode"];
          reason: string | null;
          resource_permission_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          granted_by: string;
          id?: string;
          mode?: Database["public"]["Enums"]["permission_mode"];
          reason?: string | null;
          resource_permission_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          granted_by?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["permission_mode"];
          reason?: string | null;
          resource_permission_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_permissions_resource_permission_id_fkey";
            columns: ["resource_permission_id"];
            isOneToOne: false;
            referencedRelation: "resource_permissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      audit_action: "check-in" | "uncheck" | "transfer";
      entitlement_type:
        | "transport"
        | "entry"
        | "meal"
        | "merch"
        | "party"
        | "other";
      payment_status: "pending" | "paid";
      permission_mode: "grant" | "deny";
      product_category:
        | "fursuits"
        | "merch"
        | "art"
        | "events"
        | "digital"
        | "deals";
      product_type: "ticket" | "merch" | "digital" | "service";
      transfer_status: "pending" | "claimed" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: ["check-in", "uncheck", "transfer"],
      entitlement_type: [
        "transport",
        "entry",
        "meal",
        "merch",
        "party",
        "other",
      ],
      payment_status: ["pending", "paid"],
      permission_mode: ["grant", "deny"],
      product_category: [
        "fursuits",
        "merch",
        "art",
        "events",
        "digital",
        "deals",
      ],
      product_type: ["ticket", "merch", "digital", "service"],
      transfer_status: ["pending", "claimed", "expired"],
    },
  },
} as const;
