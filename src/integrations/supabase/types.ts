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
      archived_projects: {
        Row: {
          archived_at: string
          archived_by: string | null
          id: string
          project_name: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          id?: string
          project_name: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          id?: string
          project_name?: string
        }
        Relationships: []
      }
      board_files: {
        Row: {
          board_name: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          board_name: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          board_name?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      board_members: {
        Row: {
          board_name: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          board_name: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          board_name?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string
          created_at: string
          date: string
          description: string | null
          event_type: string
          id: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          color?: string
          created_at?: string
          date: string
          description?: string | null
          event_type?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          color?: string
          created_at?: string
          date?: string
          description?: string | null
          event_type?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      calendar_notes: {
        Row: {
          color: string
          created_at: string
          date: string
          id: string
          project_id: string | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          date: string
          id?: string
          project_id?: string | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          date?: string
          id?: string
          project_id?: string | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_history: {
        Row: {
          board_name: string
          call_type: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          initiated_by: string
          participants: string[]
        }
        Insert: {
          board_name: string
          call_type: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          initiated_by: string
          participants: string[]
        }
        Update: {
          board_name?: string
          call_type?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          initiated_by?: string
          participants?: string[]
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          board_name: string | null
          content: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          mentioned_users: string[] | null
          message_type: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          board_name?: string | null
          content?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mentioned_users?: string[] | null
          message_type?: string
          reply_to?: string | null
          user_id: string
        }
        Update: {
          board_name?: string | null
          content?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mentioned_users?: string[] | null
          message_type?: string
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          campaign: string | null
          caption: string | null
          created_at: string
          crosspost: string | null
          cta: string | null
          cycle: string | null
          date: string | null
          day: string | null
          format: string | null
          hashtags: string | null
          id: string
          instagram_account: string | null
          media: string | null
          notes: string | null
          owner: string | null
          performance: string | null
          platform: string | null
          post_format: string | null
          scheduled_date: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          caption?: string | null
          created_at?: string
          crosspost?: string | null
          cta?: string | null
          cycle?: string | null
          date?: string | null
          day?: string | null
          format?: string | null
          hashtags?: string | null
          id?: string
          instagram_account?: string | null
          media?: string | null
          notes?: string | null
          owner?: string | null
          performance?: string | null
          platform?: string | null
          post_format?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          caption?: string | null
          created_at?: string
          crosspost?: string | null
          cta?: string | null
          cycle?: string | null
          date?: string | null
          day?: string | null
          format?: string | null
          hashtags?: string | null
          id?: string
          instagram_account?: string | null
          media?: string | null
          notes?: string | null
          owner?: string | null
          performance?: string | null
          platform?: string | null
          post_format?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          account_type: string
          app_id: string | null
          app_name: string | null
          app_secret_name: string | null
          created_at: string
          follower_count: number | null
          id: string
          instagram_user_id: string
          is_active: boolean | null
          page_id: string | null
          profile_picture_url: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          account_type?: string
          app_id?: string | null
          app_name?: string | null
          app_secret_name?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_user_id: string
          is_active?: boolean | null
          page_id?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string
          account_type?: string
          app_id?: string | null
          app_name?: string | null
          app_secret_name?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_user_id?: string
          is_active?: boolean | null
          page_id?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string | null
          content_item_id: string
          created_at: string
          engagement: Json | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          instagram_account_id: string
          instagram_post_id: string | null
          media_type: string
          media_urls: string[] | null
          post_type: string
          posted_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          content_item_id: string
          created_at?: string
          engagement?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          instagram_account_id: string
          instagram_post_id?: string | null
          media_type?: string
          media_urls?: string[] | null
          post_type?: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          content_item_id?: string
          created_at?: string
          engagement?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          instagram_account_id?: string
          instagram_post_id?: string | null
          media_type?: string
          media_urls?: string[] | null
          post_type?: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          assigned_to: string | null
          card_emoji: string | null
          checklist: Json | null
          column_id: string
          created_at: string
          description: string | null
          due_date: string | null
          file_attachments: Json | null
          id: string
          is_holiday: boolean
          moved_date: string | null
          number: string | null
          owner_id: string | null
          priority: string | null
          project_name: string | null
          quarter: string | null
          start_date: string | null
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          card_emoji?: string | null
          checklist?: Json | null
          column_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_attachments?: Json | null
          id?: string
          is_holiday?: boolean
          moved_date?: string | null
          number?: string | null
          owner_id?: string | null
          priority?: string | null
          project_name?: string | null
          quarter?: string | null
          start_date?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          card_emoji?: string | null
          checklist?: Json | null
          column_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_attachments?: Json | null
          id?: string
          is_holiday?: boolean
          moved_date?: string | null
          number?: string | null
          owner_id?: string | null
          priority?: string | null
          project_name?: string | null
          quarter?: string | null
          start_date?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          id: string
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      make_webhooks: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      moon_phases: {
        Row: {
          created_at: string
          date: string
          id: string
          phase: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          phase: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          phase?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          media_type: string | null
          position: number | null
          project_id: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          media_type?: string | null
          position?: number | null
          project_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          media_type?: string | null
          position?: number | null
          project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solar_events: {
        Row: {
          created_at: string
          date: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zapier_webhooks: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_board_role: {
        Args: { _board_name: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { role_name: string; user_id: string }; Returns: boolean }
      is_board_member: {
        Args: { _board_name: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
