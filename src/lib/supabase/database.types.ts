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
      clients: {
        Row: {
          billing_address: string;
          created_at: string;
          email: string;
          id: string;
          kind: string;
          name: string;
          organization_id: string;
          phone: string;
          revision: number;
        };
        Insert: {
          billing_address?: string;
          created_at?: string;
          email?: string;
          id?: string;
          kind?: string;
          name: string;
          organization_id: string;
          phone?: string;
          revision?: number;
        };
        Update: {
          billing_address?: string;
          created_at?: string;
          email?: string;
          id?: string;
          kind?: string;
          name?: string;
          organization_id?: string;
          phone?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_events: {
        Row: {
          estimate_id: string;
          from_revision: number;
          from_status: string;
          id: string;
          note: string;
          organization_id: string;
          project_id: string;
          recorded_at: string;
          recorded_by: string;
          to_status: string;
        };
        Insert: {
          estimate_id: string;
          from_revision: number;
          from_status: string;
          id: string;
          note: string;
          organization_id: string;
          project_id: string;
          recorded_at?: string;
          recorded_by?: string;
          to_status: string;
        };
        Update: {
          estimate_id?: string;
          from_revision?: number;
          from_status?: string;
          id?: string;
          note?: string;
          organization_id?: string;
          project_id?: string;
          recorded_at?: string;
          recorded_by?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_events_organization_id_estimate_id_fkey";
            columns: ["organization_id", "estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "estimate_events_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      estimates: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          lines: Json;
          organization_id: string;
          project_id: string;
          revision: number;
          sent_snapshot: Json | null;
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
          sent_snapshot?: Json | null;
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
          sent_snapshot?: Json | null;
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
      project_activity: {
        Row: {
          actor_user_id: string;
          category: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          occurred_at: string;
          organization_id: string;
          payload: Json;
          payload_version: number;
          project_id: string;
          source_key: string;
          visibility: string;
        };
        Insert: {
          actor_user_id: string;
          category: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          occurred_at?: string;
          organization_id: string;
          payload: Json;
          payload_version?: number;
          project_id: string;
          source_key: string;
          visibility: string;
        };
        Update: {
          actor_user_id?: string;
          category?: string;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          organization_id?: string;
          payload?: Json;
          payload_version?: number;
          project_id?: string;
          source_key?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_activity_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      project_activity_tracking: {
        Row: {
          singleton: boolean;
          started_at: string;
        };
        Insert: {
          singleton?: boolean;
          started_at?: string;
        };
        Update: {
          singleton?: boolean;
          started_at?: string;
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
          activity_was_ready: boolean;
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
          activity_was_ready?: boolean;
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
          activity_was_ready?: boolean;
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
      project_sketches: {
        Row: {
          created_at: string;
          current_save_id: string | null;
          id: string;
          organization_id: string;
          project_id: string;
          revision: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_save_id?: string | null;
          id?: string;
          organization_id: string;
          project_id: string;
          revision?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_save_id?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string;
          revision?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_sketches_organization_id_project_id_fkey";
            columns: ["organization_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sketch_current_save_fk";
            columns: ["organization_id", "id", "current_save_id"];
            isOneToOne: false;
            referencedRelation: "sketch_saves";
            referencedColumns: ["organization_id", "sketch_id", "id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          assignee_id: string | null;
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
          assignee_id?: string | null;
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
          assignee_id?: string | null;
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
          {
            foreignKeyName: "tasks_assignee_member";
            columns: ["organization_id", "assignee_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
        ];
      };
      projects: {
        Row: {
          address: string;
          city: string;
          client_id: string | null;
          client_name: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          property_id: string | null;
          revision: number;
          status: string;
        };
        Insert: {
          address?: string;
          city: string;
          client_id?: string | null;
          client_name: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          property_id?: string | null;
          revision?: number;
          status?: string;
        };
        Update: {
          address?: string;
          city?: string;
          client_id?: string | null;
          client_name?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          property_id?: string | null;
          revision?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_fk";
            columns: ["organization_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_property_fk";
            columns: ["organization_id", "client_id", "property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["organization_id", "client_id", "id"];
          },
        ];
      };
      properties: {
        Row: {
          address: string;
          city: string;
          client_id: string;
          country: string;
          created_at: string;
          id: string;
          label: string;
          organization_id: string;
          revision: number;
        };
        Insert: {
          address: string;
          city: string;
          client_id: string;
          country?: string;
          created_at?: string;
          id?: string;
          label: string;
          organization_id: string;
          revision?: number;
        };
        Update: {
          address?: string;
          city?: string;
          client_id?: string;
          country?: string;
          created_at?: string;
          id?: string;
          label?: string;
          organization_id?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_client_id_fkey";
            columns: ["organization_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      sketch_saves: {
        Row: {
          base_revision: number;
          committed_at: string | null;
          created_at: string;
          created_by: string;
          editor: string;
          format_version: number;
          id: string;
          organization_id: string;
          preview_bytes: number;
          preview_hash: string;
          preview_key: string | null;
          project_id: string;
          revision: number | null;
          scene_bytes: number;
          scene_hash: string;
          scene_key: string | null;
          sketch_id: string;
          title: string;
        };
        Insert: {
          base_revision: number;
          committed_at?: string | null;
          created_at?: string;
          created_by?: string;
          editor?: string;
          format_version?: number;
          id: string;
          organization_id: string;
          preview_bytes: number;
          preview_hash: string;
          preview_key?: string | null;
          project_id: string;
          revision?: number | null;
          scene_bytes: number;
          scene_hash: string;
          scene_key?: string | null;
          sketch_id: string;
          title: string;
        };
        Update: {
          base_revision?: number;
          committed_at?: string | null;
          created_at?: string;
          created_by?: string;
          editor?: string;
          format_version?: number;
          id?: string;
          organization_id?: string;
          preview_bytes?: number;
          preview_hash?: string;
          preview_key?: string | null;
          project_id?: string;
          revision?: number | null;
          scene_bytes?: number;
          scene_hash?: string;
          scene_key?: string | null;
          sketch_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sketch_saves_organization_id_project_id_sketch_id_fkey";
            columns: ["organization_id", "project_id", "sketch_id"];
            isOneToOne: false;
            referencedRelation: "project_sketches";
            referencedColumns: ["organization_id", "project_id", "id"];
          },
        ];
      };
      team_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          created_by: string;
          email: string;
          expires_at: string;
          id: string;
          organization_id: string;
          revoked_at: string | null;
          role: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by: string;
          email: string;
          expires_at?: string;
          id: string;
          organization_id: string;
          revoked_at?: string | null;
          role?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          organization_id?: string;
          revoked_at?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey";
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
      publish_sketch: {
        Args: { p_org: string; p_save: string; p_sketch: string };
        Returns: number;
      };
      record_estimate_event: {
        Args: {
          p_estimate: string;
          p_note: string;
          p_org: string;
          p_project: string;
          p_request: string;
          p_revision: number;
          p_status: string;
        };
        Returns: {
          created_at: string;
          currency: string;
          id: string;
          lines: Json;
          organization_id: string;
          project_id: string;
          revision: number;
          sent_snapshot: Json | null;
          status: string;
          title: string;
          total_cents: number;
        };
        SetofOptions: {
          from: "*";
          to: "estimates";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      team_invitation: {
        Args: { p_accept?: boolean; p_id: string };
        Returns: {
          company_name: string;
          member_role: string;
          organization_id: string;
        }[];
      };
      team_invite: {
        Args: { p_email: string; p_id: string; p_org: string };
        Returns: string;
      };
      team_members: {
        Args: { p_offset?: number; p_org: string };
        Returns: {
          email: string;
          role: string;
          user_id: string;
        }[];
      };
      team_remove: {
        Args: { p_org: string; p_user: string };
        Returns: undefined;
      };
      team_revoke: {
        Args: { p_id: string; p_org: string };
        Returns: undefined;
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
