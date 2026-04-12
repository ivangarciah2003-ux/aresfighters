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
      athlete_competitions: {
        Row: {
          athlete_name: string
          created_at: string
          evento: string
          fecha: string
          id: string
          notas: string | null
          resultado: string | null
          rival: string | null
        }
        Insert: {
          athlete_name: string
          created_at?: string
          evento: string
          fecha: string
          id?: string
          notas?: string | null
          resultado?: string | null
          rival?: string | null
        }
        Update: {
          athlete_name?: string
          created_at?: string
          evento?: string
          fecha?: string
          id?: string
          notas?: string | null
          resultado?: string | null
          rival?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_competitions_athlete_name_fkey"
            columns: ["athlete_name"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["name"]
          },
        ]
      }
      athlete_profiles: {
        Row: {
          cmj: number | null
          colgarse: number | null
          created_at: string
          deporte: string | null
          dominada_lastrada: number | null
          fase: string | null
          fi: number | null
          fr: number | null
          hero: string | null
          id: string
          name: string
          peso: number | null
          peso_muerto: number | null
          press_banca: number | null
          rsi: number | null
          sentadilla_bulgara: number | null
          sj: number | null
          updated_at: string
          vehicle: string | null
          w1: number | null
          w2: number | null
        }
        Insert: {
          cmj?: number | null
          colgarse?: number | null
          created_at?: string
          deporte?: string | null
          dominada_lastrada?: number | null
          fase?: string | null
          fi?: number | null
          fr?: number | null
          hero?: string | null
          id?: string
          name: string
          peso?: number | null
          peso_muerto?: number | null
          press_banca?: number | null
          rsi?: number | null
          sentadilla_bulgara?: number | null
          sj?: number | null
          updated_at?: string
          vehicle?: string | null
          w1?: number | null
          w2?: number | null
        }
        Update: {
          cmj?: number | null
          colgarse?: number | null
          created_at?: string
          deporte?: string | null
          dominada_lastrada?: number | null
          fase?: string | null
          fi?: number | null
          fr?: number | null
          hero?: string | null
          id?: string
          name?: string
          peso?: number | null
          peso_muerto?: number | null
          press_banca?: number | null
          rsi?: number | null
          sentadilla_bulgara?: number | null
          sj?: number | null
          updated_at?: string
          vehicle?: string | null
          w1?: number | null
          w2?: number | null
        }
        Relationships: []
      }
      athlete_tests: {
        Row: {
          athlete_name: string
          cmj: number | null
          colgarse_segs: number | null
          created_at: string
          dominada_lastrada_1rm: number | null
          dominada_lastrada_kg: number | null
          dominada_lastrada_reps: number | null
          fi: number | null
          fr: number | null
          hero: string | null
          id: string
          notas: string | null
          peso: number | null
          peso_muerto_1rm: number | null
          peso_muerto_kg: number | null
          peso_muerto_reps: number | null
          press_banca_1rm: number | null
          press_banca_kg: number | null
          press_banca_reps: number | null
          rsi: number | null
          sentadilla_bulgara_1rm: number | null
          sentadilla_bulgara_kg: number | null
          sentadilla_bulgara_reps: number | null
          sj: number | null
          test_date: string
          vehicle: string | null
          w1: number | null
          w2: number | null
        }
        Insert: {
          athlete_name: string
          cmj?: number | null
          colgarse_segs?: number | null
          created_at?: string
          dominada_lastrada_1rm?: number | null
          dominada_lastrada_kg?: number | null
          dominada_lastrada_reps?: number | null
          fi?: number | null
          fr?: number | null
          hero?: string | null
          id?: string
          notas?: string | null
          peso?: number | null
          peso_muerto_1rm?: number | null
          peso_muerto_kg?: number | null
          peso_muerto_reps?: number | null
          press_banca_1rm?: number | null
          press_banca_kg?: number | null
          press_banca_reps?: number | null
          rsi?: number | null
          sentadilla_bulgara_1rm?: number | null
          sentadilla_bulgara_kg?: number | null
          sentadilla_bulgara_reps?: number | null
          sj?: number | null
          test_date: string
          vehicle?: string | null
          w1?: number | null
          w2?: number | null
        }
        Update: {
          athlete_name?: string
          cmj?: number | null
          colgarse_segs?: number | null
          created_at?: string
          dominada_lastrada_1rm?: number | null
          dominada_lastrada_kg?: number | null
          dominada_lastrada_reps?: number | null
          fi?: number | null
          fr?: number | null
          hero?: string | null
          id?: string
          notas?: string | null
          peso?: number | null
          peso_muerto_1rm?: number | null
          peso_muerto_kg?: number | null
          peso_muerto_reps?: number | null
          press_banca_1rm?: number | null
          press_banca_kg?: number | null
          press_banca_reps?: number | null
          rsi?: number | null
          sentadilla_bulgara_1rm?: number | null
          sentadilla_bulgara_kg?: number | null
          sentadilla_bulgara_reps?: number | null
          sj?: number | null
          test_date?: string
          vehicle?: string | null
          w1?: number | null
          w2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tests_athlete_name_fkey"
            columns: ["athlete_name"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
