export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_calendar_days: {
        Row: {
          academic_year_id: string
          calendar_date: string
          created_at: string
          id: string
          is_instructional: boolean
          is_short_official_week: boolean
          label: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          calendar_date: string
          created_at?: string
          id?: string
          is_instructional?: boolean
          is_short_official_week?: boolean
          label?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          calendar_date?: string
          created_at?: string
          id?: string
          is_instructional?: boolean
          is_short_official_week?: boolean
          label?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_days_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_days_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          ends_on: string
          id: string
          name: string
          school_id: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          ends_on: string
          id?: string
          name: string
          school_id: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string
          id?: string
          name?: string
          school_id?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          school_id: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          school_id: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          school_id?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          locked: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          locked?: boolean
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          locked?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      house_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          house: string
          id: string
          note: string | null
          point_value: number
          school_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          house: string
          id?: string
          note?: string | null
          point_value: number
          school_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          house?: string
          id?: string
          note?: string | null
          point_value?: number
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          is_primary: boolean
          parent_user_id: string
          relationship: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          parent_user_id: string
          relationship?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          parent_user_id?: string
          relationship?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string
          permission_name: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          permission_name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          permission_name?: string
        }
        Relationships: []
      }
      point_values: {
        Row: {
          created_at: string
          description: string
          is_active: boolean
          label: string
          sort_order: number
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          is_active?: boolean
          label: string
          sort_order: number
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_house: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          name: string | null
          role: string | null
          school_id: string
          staff_name: string | null
          student_name: string | null
          updated_at: string
        }
        Insert: {
          assigned_house?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          name?: string | null
          role?: string | null
          school_id: string
          staff_name?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Update: {
          assigned_house?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          role?: string | null
          school_id?: string
          staff_name?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_candidate_reviews: {
        Row: {
          award_definition_id: string
          award_period_id: string
          candidate_score_id: string
          created_at: string
          dismissal_reason: string | null
          id: string
          internal_notes: string | null
          public_citation_draft: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          award_definition_id: string
          award_period_id: string
          candidate_score_id: string
          created_at?: string
          dismissal_reason?: string | null
          id?: string
          internal_notes?: string | null
          public_citation_draft?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          award_definition_id?: string
          award_period_id?: string
          candidate_score_id?: string
          created_at?: string
          dismissal_reason?: string | null
          id?: string
          internal_notes?: string | null
          public_citation_draft?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_candidate_reviews_award_definition_id_fkey"
            columns: ["award_definition_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_reviews_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_reviews_candidate_score_id_fkey"
            columns: ["candidate_score_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_candidate_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_reviews_candidate_score_id_fkey"
            columns: ["candidate_score_id"]
            isOneToOne: false
            referencedRelation: "v_current_award_candidate_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_reviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_candidate_scores: {
        Row: {
          algorithm_version: string
          award_definition_id: string
          award_period_id: string
          calculated_at: string
          component_scores: Json
          created_at: string
          eligibility_reasons: string[]
          eligible: boolean
          evidence_summary: Json
          fairness_flags: string[]
          id: string
          is_current: boolean
          normalisation_cohort: Json
          rank_in_cohort: number | null
          rank_in_school: number | null
          raw_metrics: Json
          school_id: string
          score_run_id: string
          student_id: string
          total_score: number
        }
        Insert: {
          algorithm_version: string
          award_definition_id: string
          award_period_id: string
          calculated_at?: string
          component_scores: Json
          created_at?: string
          eligibility_reasons?: string[]
          eligible: boolean
          evidence_summary?: Json
          fairness_flags?: string[]
          id?: string
          is_current?: boolean
          normalisation_cohort?: Json
          rank_in_cohort?: number | null
          rank_in_school?: number | null
          raw_metrics: Json
          school_id: string
          score_run_id: string
          student_id: string
          total_score: number
        }
        Update: {
          algorithm_version?: string
          award_definition_id?: string
          award_period_id?: string
          calculated_at?: string
          component_scores?: Json
          created_at?: string
          eligibility_reasons?: string[]
          eligible?: boolean
          evidence_summary?: Json
          fairness_flags?: string[]
          id?: string
          is_current?: boolean
          normalisation_cohort?: Json
          rank_in_cohort?: number | null
          rank_in_school?: number | null
          raw_metrics?: Json
          school_id?: string
          score_run_id?: string
          student_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_candidate_scores_award_definition_id_fkey"
            columns: ["award_definition_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_score_run_id_fkey"
            columns: ["score_run_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_score_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_definitions: {
        Row: {
          active: boolean
          algorithm_version: string
          code: string
          configuration: Json
          created_at: string
          detailed_description: string
          display_order: number
          id: string
          name: string
          school_id: string | null
          short_description: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          algorithm_version?: string
          code: string
          configuration?: Json
          created_at?: string
          detailed_description: string
          display_order: number
          id?: string
          name: string
          school_id?: string | null
          short_description: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          algorithm_version?: string
          code?: string
          configuration?: Json
          created_at?: string
          detailed_description?: string
          display_order?: number
          id?: string
          name?: string
          school_id?: string | null
          short_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_definitions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_notifications: {
        Row: {
          action_url: string
          award_period_id: string
          created_at: string
          deduplication_key: string
          dismissed_at: string | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          recipient_user_id: string
          school_id: string
          title: string
        }
        Insert: {
          action_url?: string
          award_period_id: string
          created_at?: string
          deduplication_key: string
          dismissed_at?: string | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          recipient_user_id: string
          school_id: string
          title: string
        }
        Update: {
          action_url?: string
          award_period_id?: string
          created_at?: string
          deduplication_key?: string
          dismissed_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_user_id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_notifications_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_periods: {
        Row: {
          academic_year_id: string | null
          baseline_period_id: string | null
          code: string
          created_at: string
          created_by: string | null
          ends_on: string
          finalised_at: string | null
          finalised_by: string | null
          id: string
          linked_academic_period_id: string | null
          name: string
          recipient_limit_per_award: number
          reopened_at: string | null
          reopened_by: string | null
          review_opens_at: string | null
          school_id: string
          scoring_algorithm_version: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          baseline_period_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          ends_on: string
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          linked_academic_period_id?: string | null
          name: string
          recipient_limit_per_award?: number
          reopened_at?: string | null
          reopened_by?: string | null
          review_opens_at?: string | null
          school_id: string
          scoring_algorithm_version?: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          baseline_period_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          linked_academic_period_id?: string | null
          name?: string
          recipient_limit_per_award?: number
          reopened_at?: string | null
          reopened_by?: string | null
          review_opens_at?: string | null
          school_id?: string
          scoring_algorithm_version?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_periods_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_periods_baseline_period_id_fkey"
            columns: ["baseline_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_recipients: {
        Row: {
          award_definition_id: string
          award_period_id: string
          candidate_score_id: string | null
          created_at: string
          finalised_at: string | null
          finalised_by: string | null
          id: string
          internal_selection_note: string | null
          override_reason: string | null
          public_citation: string | null
          recipient_slot: number
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          school_id: string
          scope_key: string
          scope_type: string
          selected_at: string | null
          selected_by: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          award_definition_id: string
          award_period_id: string
          candidate_score_id?: string | null
          created_at?: string
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          internal_selection_note?: string | null
          override_reason?: string | null
          public_citation?: string | null
          recipient_slot?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          school_id: string
          scope_key?: string
          scope_type?: string
          selected_at?: string | null
          selected_by?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          award_definition_id?: string
          award_period_id?: string
          candidate_score_id?: string | null
          created_at?: string
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          internal_selection_note?: string | null
          override_reason?: string | null
          public_citation?: string | null
          recipient_slot?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          school_id?: string
          scope_key?: string
          scope_type?: string
          selected_at?: string | null
          selected_by?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_recipients_award_definition_id_fkey"
            columns: ["award_definition_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_recipients_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_recipients_candidate_score_id_fkey"
            columns: ["candidate_score_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_candidate_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_recipients_candidate_score_id_fkey"
            columns: ["candidate_score_id"]
            isOneToOne: false
            referencedRelation: "v_current_award_candidate_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_recipients_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_recipients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_score_runs: {
        Row: {
          algorithm_version: string
          award_period_id: string
          calculation_metadata: Json
          candidate_count: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          school_id: string
          source_record_count: number
          started_at: string
          status: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          algorithm_version: string
          award_period_id: string
          calculation_metadata?: Json
          candidate_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          school_id: string
          source_record_count?: number
          started_at?: string
          status?: string
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          algorithm_version?: string
          award_period_id?: string
          calculation_metadata?: Json
          candidate_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          school_id?: string
          source_record_count?: number
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_score_runs_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_score_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_award_signal_mappings: {
        Row: {
          active: boolean
          award_definition_id: string
          created_at: string
          created_by: string | null
          id: string
          qualifies_as_peer_impact: boolean
          qualifies_as_significant: boolean
          school_id: string
          signal_type: string
          source_key: string
          source_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          award_definition_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          qualifies_as_peer_impact?: boolean
          qualifies_as_significant?: boolean
          school_id: string
          signal_type: string
          source_key: string
          source_type: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          award_definition_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          qualifies_as_peer_impact?: boolean
          qualifies_as_significant?: boolean
          school_id?: string
          signal_type?: string
          source_key?: string
          source_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_signal_mappings_award_definition_id_fkey"
            columns: ["award_definition_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_signal_mappings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      graduate_values: {
        Row: {
          code: string
          created_at: string
          display_label: string
          id: string
          islamic_term: string
          parent_r_value_id: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_label: string
          id?: string
          islamic_term: string
          parent_r_value_id: string
          school_id: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_label?: string
          id?: string
          islamic_term?: string
          parent_r_value_id?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduate_values_parent_r_value_id_fkey"
            columns: ["parent_r_value_id"]
            isOneToOne: false
            referencedRelation: "r_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduate_values_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_definition_graduate_values: {
        Row: {
          created_at: string
          graduate_value_id: string
          recognition_definition_id: string
          relationship: string
          school_id: string
        }
        Insert: {
          created_at?: string
          graduate_value_id: string
          recognition_definition_id: string
          relationship: string
          school_id: string
        }
        Update: {
          created_at?: string
          graduate_value_id?: string
          recognition_definition_id?: string
          relationship?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_definition_graduate_values_graduate_value_id_fkey"
            columns: ["graduate_value_id"]
            isOneToOne: false
            referencedRelation: "graduate_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_definition_graduate_values_recognition_definition_id_fkey"
            columns: ["recognition_definition_id"]
            isOneToOne: false
            referencedRelation: "recognition_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_definition_graduate_values_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_definitions: {
        Row: {
          award_mode: string
          code: string
          created_at: string
          description: string
          fixed_points: number
          framework_version: string
          id: string
          is_active: boolean
          label: string
          r_value_id: string
          requires_note: boolean
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          award_mode: string
          code: string
          created_at?: string
          description: string
          fixed_points: number
          framework_version?: string
          id?: string
          is_active?: boolean
          label: string
          r_value_id: string
          requires_note?: boolean
          school_id: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          award_mode?: string
          code?: string
          created_at?: string
          description?: string
          fixed_points?: number
          framework_version?: string
          id?: string
          is_active?: boolean
          label?: string
          r_value_id?: string
          requires_note?: boolean
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_definitions_fixed_points_fkey"
            columns: ["fixed_points"]
            isOneToOne: false
            referencedRelation: "point_values"
            referencedColumns: ["value"]
          },
          {
            foreignKeyName: "recognition_definitions_r_value_id_fkey"
            columns: ["r_value_id"]
            isOneToOne: false
            referencedRelation: "r_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_definitions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_nominations: {
        Row: {
          approved_award_id: string | null
          created_at: string
          domain_id: string
          explanation: string
          id: string
          idempotency_key: string
          nominated_by_profile_id: string
          observed_at: string
          recognition_definition_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
          witness_information: string | null
        }
        Insert: {
          approved_award_id?: string | null
          created_at?: string
          domain_id: string
          explanation: string
          id?: string
          idempotency_key: string
          nominated_by_profile_id: string
          observed_at?: string
          recognition_definition_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
          witness_information?: string | null
        }
        Update: {
          approved_award_id?: string | null
          created_at?: string
          domain_id?: string
          explanation?: string
          id?: string
          idempotency_key?: string
          nominated_by_profile_id?: string
          observed_at?: string
          recognition_definition_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
          witness_information?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recognition_nominations_approved_award_id_fkey"
            columns: ["approved_award_id"]
            isOneToOne: true
            referencedRelation: "recognition_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_recognition_definition_id_fkey"
            columns: ["recognition_definition_id"]
            isOneToOne: false
            referencedRelation: "recognition_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      r_values: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          locked: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          locked?: boolean
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          locked?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      recognition_logs: {
        Row: {
          admin_review_status: string
          award_mode_snapshot: string | null
          award_status: string
          behaviour_description_snapshot: string | null
          behaviour_label_snapshot: string | null
          behaviour_note: string
          created_at: string
          deduplication_key: string | null
          deleted_at: string | null
          domain_id: string
          framework_version: string
          grade_snapshot: number | null
          graduate_values_snapshot: Json
          house_snapshot: string
          id: string
          legacy_merit_log_id: string | null
          observed_at: string
          parent_visible: boolean
          point_value: number
          points_snapshot: number
          r_value_id: string
          r_value_snapshot: string | null
          recognition_date: string
          recognition_definition_id: string | null
          recognition_nomination_id: string | null
          record_status: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          school_id: string
          section_snapshot: string | null
          source: string
          staff_name_snapshot: string
          staff_user_id: string
          student_id: string
          student_name_snapshot: string
          student_visible: boolean
          submission_idempotency_key: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          admin_review_status?: string
          award_mode_snapshot?: string | null
          award_status?: string
          behaviour_description_snapshot?: string | null
          behaviour_label_snapshot?: string | null
          behaviour_note: string
          created_at?: string
          deduplication_key?: string | null
          deleted_at?: string | null
          domain_id: string
          framework_version?: string
          grade_snapshot?: number | null
          graduate_values_snapshot?: Json
          house_snapshot: string
          id?: string
          legacy_merit_log_id?: string | null
          observed_at: string
          parent_visible?: boolean
          point_value: number
          points_snapshot: number
          r_value_id: string
          r_value_snapshot?: string | null
          recognition_date: string
          recognition_definition_id?: string | null
          recognition_nomination_id?: string | null
          record_status?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          school_id: string
          section_snapshot?: string | null
          source?: string
          staff_name_snapshot: string
          staff_user_id: string
          student_id: string
          student_name_snapshot: string
          student_visible?: boolean
          submission_idempotency_key?: string | null
          updated_at?: string
          visibility: string
        }
        Update: {
          admin_review_status?: string
          award_mode_snapshot?: string | null
          award_status?: string
          behaviour_description_snapshot?: string | null
          behaviour_label_snapshot?: string | null
          behaviour_note?: string
          created_at?: string
          deduplication_key?: string | null
          deleted_at?: string | null
          domain_id?: string
          framework_version?: string
          grade_snapshot?: number | null
          graduate_values_snapshot?: Json
          house_snapshot?: string
          id?: string
          legacy_merit_log_id?: string | null
          observed_at?: string
          parent_visible?: boolean
          point_value?: number
          points_snapshot?: number
          r_value_id?: string
          r_value_snapshot?: string | null
          recognition_date?: string
          recognition_definition_id?: string | null
          recognition_nomination_id?: string | null
          record_status?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          school_id?: string
          section_snapshot?: string | null
          source?: string
          staff_name_snapshot?: string
          staff_user_id?: string
          student_id?: string
          student_name_snapshot?: string
          student_visible?: boolean
          submission_idempotency_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_point_value_fkey"
            columns: ["point_value"]
            isOneToOne: false
            referencedRelation: "point_values"
            referencedColumns: ["value"]
          },
          {
            foreignKeyName: "recognition_logs_r_value_id_fkey"
            columns: ["r_value_id"]
            isOneToOne: false
            referencedRelation: "r_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_recognition_definition_id_fkey"
            columns: ["recognition_definition_id"]
            isOneToOne: false
            referencedRelation: "recognition_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_recognition_nomination_id_fkey"
            columns: ["recognition_nomination_id"]
            isOneToOne: true
            referencedRelation: "recognition_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string
          permission_name: string
          role_name: string
        }
        Insert: {
          granted_at?: string
          permission_name: string
          role_name: string
        }
        Update: {
          granted_at?: string
          permission_name?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_name_fkey"
            columns: ["permission_name"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["permission_name"]
          },
          {
            foreignKeyName: "role_permissions_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          priority: number
          role_name: string
        }
        Insert: {
          created_at?: string
          description: string
          priority: number
          role_name: string
        }
        Update: {
          created_at?: string
          description?: string
          priority?: number
          role_name?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_enrolments: {
        Row: {
          created_at: string
          dates_inferred: boolean
          ends_on: string | null
          id: string
          school_id: string
          starts_on: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dates_inferred?: boolean
          ends_on?: string | null
          id?: string
          school_id: string
          starts_on: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dates_inferred?: boolean
          ends_on?: string | null
          id?: string
          school_id?: string
          starts_on?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrolments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrolments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_user_links: {
        Row: {
          created_at: string
          school_id: string
          student_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          school_id: string
          student_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          school_id?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_user_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_user_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          grade: number | null
          house: string
          id: string
          is_active: boolean
          school_id: string
          section: string | null
          student_id: string | null
          student_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: number | null
          house: string
          id?: string
          is_active?: boolean
          school_id: string
          section?: string | null
          student_id?: string | null
          student_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: number | null
          house?: string
          id?: string
          is_active?: boolean
          school_id?: string
          section?: string | null
          student_id?: string | null
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_active_recognition_awards: {
        Row: {
          admin_review_status: string | null
          award_mode_snapshot: string | null
          award_status: string | null
          behaviour_description_snapshot: string | null
          behaviour_label_snapshot: string | null
          behaviour_note: string | null
          created_at: string | null
          deduplication_key: string | null
          deleted_at: string | null
          domain_id: string | null
          framework_version: string | null
          grade_snapshot: number | null
          graduate_values_snapshot: Json | null
          house_snapshot: string | null
          id: string | null
          legacy_merit_log_id: string | null
          observed_at: string | null
          parent_visible: boolean | null
          point_value: number | null
          points_snapshot: number | null
          r_value_id: string | null
          r_value_snapshot: string | null
          recognition_date: string | null
          recognition_definition_id: string | null
          recognition_nomination_id: string | null
          record_status: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          school_id: string | null
          section_snapshot: string | null
          source: string | null
          staff_name_snapshot: string | null
          staff_user_id: string | null
          student_id: string | null
          student_name_snapshot: string | null
          student_visible: boolean | null
          submission_idempotency_key: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: []
      }
      v_award_eligible_recognitions: {
        Row: {
          behaviour_note: string | null
          created_at: string | null
          domain_id: string | null
          domain_key: string | null
          domain_name: string | null
          id: string | null
          point_value: number | null
          r_key: string | null
          r_name: string | null
          r_value_id: string | null
          recognition_date: string | null
          school_id: string | null
          source: string | null
          staff_name_snapshot: string | null
          staff_user_id: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recognition_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_point_value_fkey"
            columns: ["point_value"]
            isOneToOne: false
            referencedRelation: "point_values"
            referencedColumns: ["value"]
          },
          {
            foreignKeyName: "recognition_logs_r_value_id_fkey"
            columns: ["r_value_id"]
            isOneToOne: false
            referencedRelation: "r_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recognition_possible_duplicates: {
        Row: {
          behaviour_code: string | null
          behaviour_description: string | null
          behaviour_label: string | null
          created_at: string | null
          domain_code: string | null
          domain_id: string | null
          domain_name: string | null
          framework_version: string | null
          grade_snapshot: number | null
          graduate_value_codes: string[] | null
          graduate_value_labels: string | null
          graduate_values_snapshot: Json | null
          house_snapshot: string | null
          id: string | null
          note: string | null
          observed_at: string | null
          parent_visible: boolean | null
          points: number | null
          previous_matching_award_at: string | null
          r_value_code: string | null
          r_value_id: string | null
          r_value_name: string | null
          recognition_date: string | null
          recognition_definition_id: string | null
          recognition_mode: string | null
          recognition_nomination_id: string | null
          school_id: string | null
          section_snapshot: string | null
          staff_name_snapshot: string | null
          staff_user_id: string | null
          student_id: string | null
          student_name_snapshot: string | null
          student_visible: boolean | null
          visibility: string | null
        }
        Relationships: []
      }
      v_recognition_reporting: {
        Row: {
          behaviour_code: string | null
          behaviour_description: string | null
          behaviour_label: string | null
          created_at: string | null
          domain_code: string | null
          domain_id: string | null
          domain_name: string | null
          framework_version: string | null
          grade_snapshot: number | null
          graduate_value_codes: string[] | null
          graduate_value_labels: string | null
          graduate_values_snapshot: Json | null
          house_snapshot: string | null
          id: string | null
          note: string | null
          observed_at: string | null
          parent_visible: boolean | null
          points: number | null
          r_value_code: string | null
          r_value_id: string | null
          r_value_name: string | null
          recognition_date: string | null
          recognition_definition_id: string | null
          recognition_mode: string | null
          recognition_nomination_id: string | null
          school_id: string | null
          section_snapshot: string | null
          staff_name_snapshot: string | null
          staff_user_id: string | null
          student_id: string | null
          student_name_snapshot: string | null
          student_visible: boolean | null
          visibility: string | null
        }
        Relationships: []
      }
      v_current_award_candidate_scores: {
        Row: {
          algorithm_version: string | null
          award_code: string | null
          award_definition_id: string | null
          award_name: string | null
          award_period_id: string | null
          calculated_at: string | null
          component_scores: Json | null
          created_at: string | null
          dismissal_reason: string | null
          display_order: number | null
          eligibility_reasons: string[] | null
          eligible: boolean | null
          evidence_summary: Json | null
          fairness_flags: string[] | null
          grade: number | null
          house: string | null
          id: string | null
          internal_notes: string | null
          is_current: boolean | null
          normalisation_cohort: Json | null
          public_citation: string | null
          public_citation_draft: string | null
          rank_in_cohort: number | null
          rank_in_school: number | null
          raw_metrics: Json | null
          recipient_id: string | null
          recipient_status: string | null
          review_status: string | null
          school_id: string | null
          score_run_id: string | null
          section: string | null
          student_id: string | null
          student_name: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_award_candidate_scores_award_definition_id_fkey"
            columns: ["award_definition_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_award_period_id_fkey"
            columns: ["award_period_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_score_run_id_fkey"
            columns: ["score_run_id"]
            isOneToOne: false
            referencedRelation: "quarterly_award_score_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_award_candidate_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_recognition_awards_v2: {
        Args: {
          p_domain_code: string
          p_idempotency_key: string
          p_note?: string
          p_observed_at?: string
          p_recognition_definition_code: string
          p_student_ids: string[]
          p_visibility?: string
        }
        Returns: Json
      }
      create_quarterly_award_period: {
        Args: {
          p_baseline_period_id?: string
          p_code: string
          p_ends_on: string
          p_name: string
          p_recipient_limit?: number
          p_review_opens_at?: string
          p_starts_on: string
        }
        Returns: Json
      }
      current_user_has_permission: {
        Args: { permission_to_check: string }
        Returns: boolean
      }
      current_user_school_id: { Args: never; Returns: string }
      deactivate_quarterly_award_signal_mapping: {
        Args: { p_mapping_id: string; p_reason: string }
        Returns: Json
      }
      finalise_quarterly_award_recipient: {
        Args: {
          p_override_reason?: string
          p_public_citation: string
          p_recipient_id: string
        }
        Returns: Json
      }
      finalise_quarterly_award_without_recipient: {
        Args: {
          p_award_definition_id: string
          p_award_period_id: string
          p_reason: string
          p_recipient_slot?: number
          p_scope_key?: string
          p_scope_type?: string
        }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_user_role: { Args: { user_id: string }; Returns: string }
      has_admin_portal_access: { Args: never; Returns: boolean }
      has_permission: {
        Args: { perm: string; user_id: string }
        Returns: boolean
      }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      mark_quarterly_award_notification: {
        Args: { p_dismiss?: boolean; p_notification_id: string }
        Returns: Json
      }
      recognition_graduate_value_snapshot: {
        Args: { p_definition_id: string }
        Returns: Json
      }
      recognition_submission_result: {
        Args: { p_idempotency_key: string; p_school_id: string }
        Returns: Json
      }
      review_recognition_nomination_v2: {
        Args: {
          p_decision: string
          p_nomination_id: string
          p_review_note?: string
        }
        Returns: Json
      }
      reverse_recognition_award_v2: {
        Args: { p_award_id: string; p_reason: string }
        Returns: Json
      }
      persist_quarterly_award_score_snapshots: {
        Args: {
          p_calculation_metadata: Json
          p_score_run_id: string
          p_snapshots: Json
          p_source_record_count: number
        }
        Returns: number
      }
      reopen_quarterly_award_period: {
        Args: { p_award_period_id: string; p_reason: string }
        Returns: Json
      }
      resolve_quarterly_award_academic_year: {
        Args: {
          p_actor_id: string
          p_ends_on: string
          p_school_id: string
          p_starts_on: string
        }
        Returns: string
      }
      revoke_quarterly_award_recipient: {
        Args: { p_reason: string; p_recipient_id: string }
        Returns: Json
      }
      select_quarterly_award_recipient: {
        Args: {
          p_candidate_score_id: string
          p_internal_selection_note?: string
          p_override_reason?: string
          p_public_citation?: string
          p_recipient_slot?: number
          p_scope_key?: string
          p_scope_type?: string
        }
        Returns: Json
      }
      set_recognition_definition_active_v2: {
        Args: { p_definition_code: string; p_is_active: boolean }
        Returns: Json
      }
      submit_recognition_nomination_v2: {
        Args: {
          p_domain_code: string
          p_explanation: string
          p_idempotency_key: string
          p_observed_at?: string
          p_recognition_definition_code: string
          p_student_id: string
          p_witness_information?: string
        }
        Returns: Json
      }
      update_quarterly_award_definition: {
        Args: {
          p_algorithm_version: string
          p_award_definition_id: string
          p_configuration: Json
        }
        Returns: Json
      }
      update_quarterly_award_period: {
        Args: {
          p_award_period_id: string
          p_baseline_period_id?: string
          p_code: string
          p_ends_on: string
          p_name: string
          p_recipient_limit?: number
          p_review_opens_at?: string
          p_starts_on: string
        }
        Returns: Json
      }
      update_quarterly_award_review: {
        Args: {
          p_candidate_score_id: string
          p_dismissal_reason?: string
          p_internal_notes?: string
          p_public_citation_draft?: string
          p_review_status: string
        }
        Returns: Json
      }
      upsert_quarterly_award_signal_mapping: {
        Args: {
          p_award_definition_id: string
          p_qualifies_as_peer_impact?: boolean
          p_qualifies_as_significant?: boolean
          p_signal_type: string
          p_source_key: string
          p_source_type: string
          p_weight?: number
        }
        Returns: Json
      }
      withdraw_recognition_nomination_v2: {
        Args: { p_nomination_id: string }
        Returns: Json
      }
      write_honours_audit: {
        Args: {
          p_action: string
          p_new_data: Json
          p_old_data: Json
          p_record_id: string
          p_school_id: string
          p_table_name: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
