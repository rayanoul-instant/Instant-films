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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      courts_metrages: {
        Row: {
          annee: number | null
          auteur: string | null
          created_at: string | null
          duree: string | null
          genres: string[] | null
          id: string
          lien: string | null
          synopsis: string | null
          themes: string | null
          thumbnail_url: string | null
          titre: string
        }
        Insert: {
          annee?: number | null
          auteur?: string | null
          created_at?: string | null
          duree?: string | null
          genres?: string[] | null
          id?: string
          lien?: string | null
          synopsis?: string | null
          themes?: string | null
          thumbnail_url?: string | null
          titre: string
        }
        Update: {
          annee?: number | null
          auteur?: string | null
          created_at?: string | null
          duree?: string | null
          genres?: string[] | null
          id?: string
          lien?: string | null
          synopsis?: string | null
          themes?: string | null
          thumbnail_url?: string | null
          titre?: string
        }
        Relationships: []
      }
      deleted_films: {
        Row: {
          deleted_at: string | null
          id: string
          title: string | null
          video_url: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          title?: string | null
          video_url: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          title?: string | null
          video_url?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          film_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          film_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          film_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      film_ratings: {
        Row: {
          created_at: string | null
          film_id: string
          id: string
          rating: number
          review: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          film_id: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          film_id?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_ratings_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      films: {
        Row: {
          average_rating: number | null
          created_at: string | null
          director: string | null
          display_title: string | null
          duration_minutes: number
          genres: string[] | null
          id: string
          is_featured: boolean | null
          quality_breakdown: Json | null
          quality_rated_at: string | null
          quality_score: number | null
          release_year: number | null
          slug: string
          synopsis: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
          view_count: number | null
          yt_comments: number | null
          yt_description: string | null
          yt_fetched_at: string | null
          yt_likes: number | null
          yt_published_at: string | null
          yt_views: number | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          director?: string | null
          display_title?: string | null
          duration_minutes: number
          genres?: string[] | null
          id?: string
          is_featured?: boolean | null
          quality_breakdown?: Json | null
          quality_rated_at?: string | null
          quality_score?: number | null
          release_year?: number | null
          slug: string
          synopsis?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
          view_count?: number | null
          yt_comments?: number | null
          yt_description?: string | null
          yt_fetched_at?: string | null
          yt_likes?: number | null
          yt_published_at?: string | null
          yt_views?: number | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          director?: string | null
          display_title?: string | null
          duration_minutes?: number
          genres?: string[] | null
          id?: string
          is_featured?: boolean | null
          quality_breakdown?: Json | null
          quality_rated_at?: string | null
          quality_score?: number | null
          release_year?: number | null
          slug?: string
          synopsis?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
          view_count?: number | null
          yt_comments?: number | null
          yt_description?: string | null
          yt_fetched_at?: string | null
          yt_likes?: number | null
          yt_published_at?: string | null
          yt_views?: number | null
        }
        Relationships: []
      }
      films_backup_20260930: {
        Row: {
          backed_up_at: string | null
          director: string | null
          id: string | null
          synopsis: string | null
          title: string | null
        }
        Insert: {
          backed_up_at?: string | null
          director?: string | null
          id?: string | null
          synopsis?: string | null
          title?: string | null
        }
        Update: {
          backed_up_at?: string | null
          director?: string | null
          id?: string | null
          synopsis?: string | null
          title?: string | null
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_section_films: {
        Row: {
          created_at: string
          film_id: string
          id: string
          position: number
          section_id: string
        }
        Insert: {
          created_at?: string
          film_id: string
          id?: string
          position?: number
          section_id: string
        }
        Update: {
          created_at?: string
          film_id?: string
          id?: string
          position?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_section_films_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_films_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          position: number
          slot_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          slot_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          slot_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_accessories: Json | null
          avatar_base: string | null
          bio: string | null
          created_at: string | null
          id: string
          is_admin: boolean
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_accessories?: Json | null
          avatar_base?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_accessories?: Json | null
          avatar_base?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      review_likes: {
        Row: {
          created_at: string | null
          film_id: string | null
          id: string
          rating_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          film_id?: string | null
          id?: string
          rating_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          film_id?: string | null
          id?: string
          rating_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_likes_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "film_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      top3: {
        Row: {
          created_at: string | null
          film_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          film_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          film_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          film_id: string
          id: string
          user_id: string
          watched_at: string | null
        }
        Insert: {
          film_id: string
          id?: string
          user_id: string
          watched_at?: string | null
        }
        Update: {
          film_id?: string
          id?: string
          user_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_user_id_fkey"
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
      accept_friend_request: {
        Args: { from_user: string; request_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
