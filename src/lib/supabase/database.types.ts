export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      estimates: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          lines: Json;
          organization_id: string;
          project_id: string;
          revision: number;
          status: string;
          title: string;
          total_cents: number;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          lines?: Json;
          organization_id: string;
          project_id: string;
          revision?: number;
          status?: string;
          title: string;
          total_cents?: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          lines?: Json;
          organization_id?: string;
          project_id?: string;
          revision?: number;
          status?: string;
          title?: string;
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "estimates_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          contact_address: string;
          contact_email: string;
          contact_phone: string;
          contact_revision: number;
          country: string;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          request_id: string;
        };
        Insert: {
          contact_address?: string;
          contact_email?: string;
          contact_phone?: string;
          contact_revision?: number;
          country: string;
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          request_id: string;
        };
        Update: {
          contact_address?: string;
          contact_email?: string;
          contact_phone?: string;
          contact_revision?: number;
          country?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          request_id?: string;
        };
        Relationships: [];
      };
      project_budgets: {
        Row: {
          budget_cents: number;
          organization_id: string;
          project_id: string;
          revision: number;
        };
        Insert: {
          budget_cents: number;
          organization_id: string;
          project_id: string;
          revision?: number;
        };
        Update: {
          budget_cents?: number;
          organization_id?: string;
          project_id?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_budgets_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      project_costs: {
        Row: {
          amount_cents: number;
          category: string;
          created_at: string;
          description: string;
          id: string;
          incurred_on: string;
          notes: string;
          organization_id: string;
          project_id: string;
          revision: number;
          voided: boolean;
        };
        Insert: {
          amount_cents: number;
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          incurred_on: string;
          notes?: string;
          organization_id: string;
          project_id: string;
          revision?: number;
          voided?: boolean;
        };
        Update: {
          amount_cents?: number;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          incurred_on?: string;
          notes?: string;
          organization_id?: string;
          project_id?: string;
          revision?: number;
          voided?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "project_costs_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      project_files: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string;
          object_key: string | null;
          organization_id: string;
          original_name: string;
          project_id: string;
          size_bytes: number;
          state: string;
          uploaded_by: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime_type: string;
          object_key?: string | null;
          organization_id: string;
          original_name: string;
          project_id: string;
          size_bytes: number;
          state?: string;
          uploaded_by?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string;
          object_key?: string | null;
          organization_id?: string;
          original_name?: string;
          project_id?: string;
          size_bytes?: number;
          state?: string;
          uploaded_by?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          notes: string;
          organization_id: string;
          project_id: string;
          revision: number;
          start_date: string | null;
          status: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          notes?: string;
          organization_id: string;
          project_id: string;
          revision?: number;
          start_date?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          notes?: string;
          organization_id?: string;
          project_id?: string;
          revision?: number;
          start_date?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_tasks_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      projects: {
        Row: {
          address: string;
          city: string;
          client_name: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          revision: number;
          status: string;
        };
        Insert: {
          address?: string;
          city: string;
          client_name: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          revision?: number;
          status?: string;
        };
        Update: {
          address?: string;
          city?: string;
          client_name?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          revision?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_organization: {
        Args: { p_country: string; p_name: string; p_request_id: string };
        Returns: string;
      };
      project_cost_summary: {
        Args: { p_organization_id: string; p_project_id: string };
        Returns: {
          budget_cents: number;
          budget_revision: number;
          labor: string;
          materials: string;
          other: string;
          subcontractors: string;
          total: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
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
  public: {
    Enums: {},
  },
} as const;
