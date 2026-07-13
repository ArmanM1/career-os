export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      academic_contexts: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          current_term: string | null
          current_year: string | null
          degree_program: string | null
          expected_graduation_date: string | null
          id: string
          institution: string | null
          labels: string[]
          metadata: Json
          recruiting_season: string | null
          status: string
          term_end_date: string | null
          term_start_date: string | null
          timezone: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_term?: string | null
          current_year?: string | null
          degree_program?: string | null
          expected_graduation_date?: string | null
          id?: string
          institution?: string | null
          labels?: string[]
          metadata?: Json
          recruiting_season?: string | null
          status?: string
          term_end_date?: string | null
          term_start_date?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_term?: string | null
          current_year?: string | null
          degree_program?: string | null
          expected_graduation_date?: string | null
          id?: string
          institution?: string | null
          labels?: string[]
          metadata?: Json
          recruiting_season?: string | null
          status?: string
          term_end_date?: string | null
          term_start_date?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      agent_definitions: {
        Row: {
          agent_id: string
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          default_queue: string
          id: string
          labels: string[]
          metadata: Json
          skill_path: string
          status: string
          thread_policy: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_id: string
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          default_queue: string
          id?: string
          labels?: string[]
          metadata?: Json
          skill_path: string
          status?: string
          thread_policy: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_id?: string
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          default_queue?: string
          id?: string
          labels?: string[]
          metadata?: Json
          skill_path?: string
          status?: string
          thread_policy?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      agent_events: {
        Row: {
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          event_type: string
          id: string
          message: string
          payload: Json
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_type: string
          id?: string
          message?: string
          payload?: Json
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_type?: string
          id?: string
          message?: string
          payload?: Json
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_jobs: {
        Row: {
          agent_id: string
          archived_at: string | null
          attempt_count: number
          cancelled_at: string | null
          claimed_by_device_id: string | null
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          created_state_version: number
          dedupe_key: string | null
          error_message: string | null
          heartbeat_at: string | null
          id: string
          input: Json
          input_type: string
          labels: string[]
          lease_expires_at: string | null
          locked_at: string | null
          max_attempts: number
          metadata: Json
          priority: number
          prompt: string | null
          queue: string
          related_object_ids: string[]
          required_capabilities: string[]
          retry_after: string | null
          scheduled_for: string
          schema_version: number
          status: Database["public"]["Enums"]["agent_job_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_id: string
          archived_at?: string | null
          attempt_count?: number
          cancelled_at?: string | null
          claimed_by_device_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          created_state_version?: number
          dedupe_key?: string | null
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          input?: Json
          input_type?: string
          labels?: string[]
          lease_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          metadata?: Json
          priority?: number
          prompt?: string | null
          queue?: string
          related_object_ids?: string[]
          required_capabilities?: string[]
          retry_after?: string | null
          scheduled_for?: string
          schema_version?: number
          status?: Database["public"]["Enums"]["agent_job_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_id?: string
          archived_at?: string | null
          attempt_count?: number
          cancelled_at?: string | null
          claimed_by_device_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          created_state_version?: number
          dedupe_key?: string | null
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          input?: Json
          input_type?: string
          labels?: string[]
          lease_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          metadata?: Json
          priority?: number
          prompt?: string | null
          queue?: string
          related_object_ids?: string[]
          required_capabilities?: string[]
          retry_after?: string | null
          scheduled_for?: string
          schema_version?: number
          status?: Database["public"]["Enums"]["agent_job_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_claimed_by_device_id_fkey"
            columns: ["claimed_by_device_id"]
            isOneToOne: false
            referencedRelation: "worker_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          agent_job_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          error_message: string | null
          id: string
          input: Json
          metadata: Json
          output: Json | null
          status: Database["public"]["Enums"]["agent_run_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_id: string
          agent_job_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          status?: Database["public"]["Enums"]["agent_run_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_id?: string
          agent_job_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          status?: Database["public"]["Enums"]["agent_run_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_job_id_fkey"
            columns: ["agent_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_packets: {
        Row: {
          application_id: string
          archived_at: string | null
          contents: Json
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          project_spec_id: string | null
          readiness: Json
          resume_variant_id: string | null
          state_version: number | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id: string
          archived_at?: string | null
          contents?: Json
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          project_spec_id?: string | null
          readiness?: Json
          resume_variant_id?: string | null
          state_version?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string
          archived_at?: string | null
          contents?: Json
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          project_spec_id?: string | null
          readiness?: Json
          resume_variant_id?: string | null
          state_version?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_packets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packets_project_spec_id_fkey"
            columns: ["project_spec_id"]
            isOneToOne: false
            referencedRelation: "project_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packets_resume_variant_id_fkey"
            columns: ["resume_variant_id"]
            isOneToOne: false
            referencedRelation: "resume_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      application_requirements: {
        Row: {
          application_id: string
          artifact_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          required: boolean
          requirement_type: string
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          value: Json | null
          version: number
        }
        Insert: {
          application_id: string
          artifact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          required?: boolean
          requirement_type: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          value?: Json | null
          version?: number
        }
        Update: {
          application_id?: string
          artifact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          required?: boolean
          requirement_type?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          value?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_requirements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_requirements_artifact_fk"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_checks: {
        Row: {
          application_id: string
          archived_at: string | null
          check_source: Database["public"]["Enums"]["status_check_source"]
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          detected_application_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          evidence_ids: string[]
          id: string
          labels: string[]
          metadata: Json
          previous_application_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          result_status:
            | Database["public"]["Enums"]["status_check_result"]
            | null
          scheduled_for: string
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id: string
          archived_at?: string | null
          check_source: Database["public"]["Enums"]["status_check_source"]
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          detected_application_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          previous_application_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          result_status?:
            | Database["public"]["Enums"]["status_check_result"]
            | null
          scheduled_for: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string
          archived_at?: string | null
          check_source?: Database["public"]["Enums"]["status_check_source"]
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          detected_application_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          previous_application_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          result_status?:
            | Database["public"]["Enums"]["status_check_result"]
            | null
          scheduled_for?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_status_checks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          confidence: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          effective_at: string
          evidence_ids: string[]
          id: string
          new_status: Database["public"]["Enums"]["application_status"]
          previous_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          rationale: string
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id: string
          confidence?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          effective_at?: string
          evidence_ids?: string[]
          id?: string
          new_status: Database["public"]["Enums"]["application_status"]
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          rationale?: string
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string
          confidence?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          effective_at?: string
          evidence_ids?: string[]
          id?: string
          new_status?: Database["public"]["Enums"]["application_status"]
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          rationale?: string
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          archived_at: string | null
          company_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          deadline_at: string | null
          due_at: string | null
          evidence_ids: string[]
          id: string
          labels: string[]
          last_status_checked_at: string | null
          last_status_evidence_id: string | null
          metadata: Json
          next_action_task_id: string | null
          next_status_check_at: string | null
          opportunity_id: string | null
          priority: number | null
          related_contact_ids: string[]
          related_goal_ids: string[]
          related_opportunity_ids: string[]
          resume_variant_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          status_check_policy: Database["public"]["Enums"]["status_check_policy"]
          submitted_at: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          due_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          last_status_checked_at?: string | null
          last_status_evidence_id?: string | null
          metadata?: Json
          next_action_task_id?: string | null
          next_status_check_at?: string | null
          opportunity_id?: string | null
          priority?: number | null
          related_contact_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          resume_variant_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          status_check_policy?: Database["public"]["Enums"]["status_check_policy"]
          submitted_at?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          due_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          last_status_checked_at?: string | null
          last_status_evidence_id?: string | null
          metadata?: Json
          next_action_task_id?: string | null
          next_status_check_at?: string | null
          opportunity_id?: string | null
          priority?: number | null
          related_contact_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          resume_variant_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          status_check_policy?: Database["public"]["Enums"]["status_check_policy"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_next_action_task_id_fkey"
            columns: ["next_action_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_variant_id_fkey"
            columns: ["resume_variant_id"]
            isOneToOne: false
            referencedRelation: "resume_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action_type: string
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          decided_at: string | null
          evidence_ids: string[]
          id: string
          labels: string[]
          payload: Json
          rationale: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["approval_status"]
          target_object_id: string | null
          target_object_type: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          action_type: string
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          decided_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          payload?: Json
          rationale?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["approval_status"]
          target_object_id?: string | null
          target_object_type?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          action_type?: string
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          decided_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          payload?: Json
          rationale?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["approval_status"]
          target_object_id?: string | null
          target_object_type?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          archived_at: string | null
          artifact_type: string
          bucket: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          expires_at: string | null
          id: string
          labels: string[]
          local_path: string | null
          metadata: Json
          mime_type: string | null
          origin: string
          retention_policy: string
          sha256: string
          size_bytes: number | null
          status: string
          storage_path: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          artifact_type: string
          bucket: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          expires_at?: string | null
          id?: string
          labels?: string[]
          local_path?: string | null
          metadata?: Json
          mime_type?: string | null
          origin: string
          retention_policy?: string
          sha256: string
          size_bytes?: number | null
          status?: string
          storage_path: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          artifact_type?: string
          bucket?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          expires_at?: string | null
          id?: string
          labels?: string[]
          local_path?: string | null
          metadata?: Json
          mime_type?: string | null
          origin?: string
          retention_policy?: string
          sha256?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      audit_log_entries: {
        Row: {
          action_type: string
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          id: string
          payload: Json
          summary: string
          target_object_id: string | null
          target_object_type: string | null
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          action_type: string
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          payload?: Json
          summary?: string
          target_object_id?: string | null
          target_object_type?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          action_type?: string
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          payload?: Json
          summary?: string
          target_object_id?: string | null
          target_object_type?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_entries_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      career_seasons: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          ends_on: string | null
          id: string
          intensity: string
          labels: string[]
          metadata: Json
          objectives: Json
          season_type: string
          starts_on: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          ends_on?: string | null
          id?: string
          intensity?: string
          labels?: string[]
          metadata?: Json
          objectives?: Json
          season_type: string
          starts_on?: string | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          ends_on?: string | null
          id?: string
          intensity?: string
          labels?: string[]
          metadata?: Json
          objectives?: Json
          season_type?: string
          starts_on?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      check_in_answers: {
        Row: {
          answer: Json
          answered_at: string
          check_in_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          question_id: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          answer: Json
          answered_at?: string
          check_in_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          question_id: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          answer?: Json
          answered_at?: string
          check_in_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          question_id?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "check_in_answers_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "check_in_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_questions: {
        Row: {
          affected_state_fields: string[]
          check_in_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          options: Json
          position: number
          question: string
          question_type: string
          reason: string
          required: boolean
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          affected_state_fields?: string[]
          check_in_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          options?: Json
          position?: number
          question: string
          question_type: string
          reason?: string
          required?: boolean
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          affected_state_fields?: string[]
          check_in_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          options?: Json
          position?: number
          question?: string
          question_type?: string
          reason?: string
          required?: boolean
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "check_in_questions_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          archived_at: string | null
          check_in_type: string
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          metadata: Json
          scheduled_for: string | null
          state_version_after: number | null
          state_version_before: number | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          check_in_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          scheduled_for?: string | null
          state_version_after?: number | null
          state_version_before?: number | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          check_in_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          scheduled_for?: string | null
          state_version_after?: number | null
          state_version_before?: number | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          metadata: Json
          ranking: number | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          ranking?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          ranking?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          website_url?: string | null
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          approval_required_for_expanded_scopes: boolean
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          external_account_id: string | null
          id: string
          labels: string[]
          last_synced_at: string | null
          metadata: Json
          provider: Database["public"]["Enums"]["connected_account_provider"]
          scopes: string[]
          status: Database["public"]["Enums"]["connected_account_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          approval_required_for_expanded_scopes?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          external_account_id?: string | null
          id?: string
          labels?: string[]
          last_synced_at?: string | null
          metadata?: Json
          provider: Database["public"]["Enums"]["connected_account_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["connected_account_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          approval_required_for_expanded_scopes?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          external_account_id?: string | null
          id?: string
          labels?: string[]
          last_synced_at?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["connected_account_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["connected_account_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      connector_sync_runs: {
        Row: {
          completed_at: string | null
          connected_account_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          cursor_after: string | null
          cursor_before: string | null
          error_message: string | null
          id: string
          metadata: Json
          records_seen: number
          signals_created: number
          started_at: string | null
          status: string
          sync_type: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          connected_account_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          cursor_after?: string | null
          cursor_before?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          records_seen?: number
          signals_created?: number
          started_at?: string | null
          status?: string
          sync_type: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          connected_account_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          cursor_after?: string | null
          cursor_before?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          records_seen?: number
          signals_created?: number
          started_at?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_sync_runs_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      constraints: {
        Row: {
          archived_at: string | null
          constraint_type: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          details: string
          ends_at: string | null
          id: string
          labels: string[]
          metadata: Json
          severity: string
          source: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          constraint_type: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          details?: string
          ends_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          severity: string
          source: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          constraint_type?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          details?: string
          ends_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          severity?: string
          source?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      contact_signals: {
        Row: {
          confidence: number
          contact_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          id: string
          payload: Json
          signal_type: string
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          confidence?: number
          contact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          payload: Json
          signal_type: string
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          confidence?: number
          contact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          payload?: Json
          signal_type?: string
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_signals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          company: string | null
          company_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          email: string | null
          full_name: string | null
          id: string
          labels: string[]
          linkedin_url: string | null
          metadata: Json
          notes: string | null
          role: string | null
          role_title: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          email?: string | null
          full_name?: string | null
          id?: string
          labels?: string[]
          linkedin_url?: string | null
          metadata?: Json
          notes?: string | null
          role?: string | null
          role_title?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          email?: string | null
          full_name?: string | null
          id?: string
          labels?: string[]
          linkedin_url?: string | null
          metadata?: Json
          notes?: string | null
          role?: string | null
          role_title?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plans: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          generated_at: string
          id: string
          plan_date: string
          rationale: string
          state_version: number
          status: string
          timezone: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          generated_at?: string
          id?: string
          plan_date: string
          rationale?: string
          state_version: number
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          generated_at?: string
          id?: string
          plan_date?: string
          rationale?: string
          state_version?: number
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      decisions: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          decided_at: string
          decision: string
          id: string
          labels: string[]
          metadata: Json
          rationale: string
          source_message_id: string | null
          status: string
          superseded_by: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          decided_at?: string
          decision: string
          id?: string
          labels?: string[]
          metadata?: Json
          rationale?: string
          source_message_id?: string | null
          status?: string
          superseded_by?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          decided_at?: string
          decision?: string
          id?: string
          labels?: string[]
          metadata?: Json
          rationale?: string
          source_message_id?: string | null
          status?: string
          superseded_by?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "decisions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          attended_at: string | null
          contact_ids: string[]
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          event_id: string
          evidence_ids: string[]
          id: string
          notes: string | null
          registered_at: string | null
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          attended_at?: string | null
          contact_ids?: string[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_id: string
          evidence_ids?: string[]
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          attended_at?: string | null
          contact_ids?: string[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_id?: string
          evidence_ids?: string[]
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recommendations: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          event_id: string
          evidence_ids: string[]
          id: string
          rationale: string
          related_contact_ids: string[]
          related_goal_ids: string[]
          related_opportunity_ids: string[]
          score: number
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_id: string
          evidence_ids?: string[]
          id?: string
          rationale: string
          related_contact_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          score: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_id?: string
          evidence_ids?: string[]
          id?: string
          rationale?: string
          related_contact_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          score?: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          ends_at: string | null
          evidence_ids: string[]
          id: string
          labels: string[]
          location: string | null
          metadata: Json
          related_application_ids: string[]
          related_company_ids: string[]
          related_goal_ids: string[]
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          url: string | null
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          ends_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          related_application_ids?: string[]
          related_company_ids?: string[]
          related_goal_ids?: string[]
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          ends_at?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          related_application_ids?: string[]
          related_company_ids?: string[]
          related_goal_ids?: string[]
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      evidence: {
        Row: {
          archived_at: string | null
          artifact_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          excerpt: string | null
          expired_at: string | null
          expires_at: string | null
          external_ref: string | null
          id: string
          labels: string[]
          payload: Json
          retention_policy: string
          source_type: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          artifact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          excerpt?: string | null
          expired_at?: string | null
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          labels?: string[]
          payload?: Json
          retention_policy?: string
          source_type: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          artifact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          excerpt?: string | null
          expired_at?: string | null
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          labels?: string[]
          payload?: Json
          retention_policy?: string
          source_type?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_achievements: {
        Row: {
          achievement: string
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          experience_id: string
          id: string
          metrics: Json
          provenance: string
          skill_ids: string[]
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          achievement: string
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          experience_id: string
          id?: string
          metrics?: Json
          provenance?: string
          skill_ids?: string[]
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          achievement?: string
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          experience_id?: string
          id?: string
          metrics?: Json
          provenance?: string
          skill_ids?: string[]
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "experience_achievements_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          description: string | null
          ends_at: string | null
          id: string
          labels: string[]
          metadata: Json
          organization: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          description?: string | null
          ends_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          organization?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          description?: string | null
          ends_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          organization?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      external_refs: {
        Row: {
          canonical_object_id: string | null
          canonical_object_type: string | null
          connected_account_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          external_id: string
          external_type: string
          id: string
          last_seen_at: string
          payload: Json
          provider: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          url: string | null
          user_id: string
          version: number
        }
        Insert: {
          canonical_object_id?: string | null
          canonical_object_type?: string | null
          connected_account_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          external_id: string
          external_type: string
          id?: string
          last_seen_at?: string
          payload?: Json
          provider: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id: string
          version?: number
        }
        Update: {
          canonical_object_id?: string | null
          canonical_object_type?: string | null
          connected_account_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          external_id?: string
          external_type?: string
          id?: string
          last_seen_at?: string
          payload?: Json
          provider?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "external_refs_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          allocation_percent: number | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          due_at: string | null
          evidence_ids: string[]
          horizon: Database["public"]["Enums"]["goal_horizon"]
          id: string
          labels: string[]
          metadata: Json
          parent_goal_id: string | null
          priority: number | null
          rationale: string
          related_goal_ids: string[]
          status: string
          target_date: string | null
          title: string
          track: Database["public"]["Enums"]["goal_track"]
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          allocation_percent?: number | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          due_at?: string | null
          evidence_ids?: string[]
          horizon: Database["public"]["Enums"]["goal_horizon"]
          id?: string
          labels?: string[]
          metadata?: Json
          parent_goal_id?: string | null
          priority?: number | null
          rationale?: string
          related_goal_ids?: string[]
          status?: string
          target_date?: string | null
          title: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          allocation_percent?: number | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          due_at?: string | null
          evidence_ids?: string[]
          horizon?: Database["public"]["Enums"]["goal_horizon"]
          id?: string
          labels?: string[]
          metadata?: Json
          parent_goal_id?: string | null
          priority?: number | null
          rationale?: string
          related_goal_ids?: string[]
          status?: string
          target_date?: string | null
          title?: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          archived_at: string | null
          contact_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          direction: string | null
          evidence_ids: string[]
          follow_up_at: string | null
          id: string
          interaction_type: string
          labels: string[]
          metadata: Json
          occurred_at: string
          relationship_id: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          direction?: string | null
          evidence_ids?: string[]
          follow_up_at?: string | null
          id?: string
          interaction_type: string
          labels?: string[]
          metadata?: Json
          occurred_at: string
          relationship_id?: string | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          direction?: string | null
          evidence_ids?: string[]
          follow_up_at?: string | null
          id?: string
          interaction_type?: string
          labels?: string[]
          metadata?: Json
          occurred_at?: string
          relationship_id?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_relationships: {
        Row: {
          archived_at: string | null
          cadence: string | null
          contact_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          last_interaction_at: string | null
          metadata: Json
          next_follow_up_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          cadence?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_interaction_at?: string | null
          metadata?: Json
          next_follow_up_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          cadence?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_interaction_at?: string | null
          metadata?: Json
          next_follow_up_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_parts: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          message_id: string
          part_type: string
          payload: Json
          position: number
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          message_id: string
          part_type: string
          payload: Json
          position?: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          message_id?: string
          part_type?: string
          payload?: Json
          position?: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_parts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_message_id: string | null
          content: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          role: string
          runtime_turn_id: string | null
          state_version: number | null
          status: string
          thread_id: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          client_message_id?: string | null
          content?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          role: string
          runtime_turn_id?: string | null
          state_version?: number | null
          status?: string
          thread_id: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          client_message_id?: string | null
          content?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          role?: string
          runtime_turn_id?: string | null
          state_version?: number | null
          status?: string
          thread_id?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_runtime_turn_id_fkey"
            columns: ["runtime_turn_id"]
            isOneToOne: false
            referencedRelation: "runtime_turns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          goal_id: string | null
          id: string
          labels: string[]
          metadata: Json
          outcome: string | null
          status: string
          target_at: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          goal_id?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          outcome?: string | null
          status?: string
          target_at?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          goal_id?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          outcome?: string | null
          status?: string
          target_at?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_batches: {
        Row: {
          agent_run_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          error_message: string | null
          id: string
          state_version_after: number | null
          state_version_before: number | null
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          state_version_after?: number | null
          state_version_before?: number | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          state_version_after?: number | null
          state_version_before?: number | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mutation_batches_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          event_at: string
          id: string
          outbox_id: string
          payload: Json
          provider: string
          provider_message_id: string | null
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_at?: string
          id?: string
          outbox_id: string
          payload?: Json
          provider: string
          provider_message_id?: string | null
          status: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          event_at?: string
          id?: string
          outbox_id?: string
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          category: string
          channel: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          idempotency_key: string
          last_error: string | null
          payload: Json
          recipient: string | null
          scheduled_for: string
          severity: string
          status: string
          subject: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          attempt_count?: number
          category: string
          channel: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          idempotency_key: string
          last_error?: string | null
          payload: Json
          recipient?: string | null
          scheduled_for?: string
          severity: string
          status?: string
          subject: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          attempt_count?: number
          category?: string
          channel?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          idempotency_key?: string
          last_error?: string | null
          payload?: Json
          recipient?: string | null
          scheduled_for?: string
          severity?: string
          status?: string
          subject?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          channel: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          enabled: boolean
          id: string
          minimum_severity: string
          quiet_hours: Json
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          category: string
          channel?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          enabled?: boolean
          id?: string
          minimum_severity?: string
          quiet_hours?: Json
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          enabled?: boolean
          id?: string
          minimum_severity?: string
          quiet_hours?: Json
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      oauth_credentials: {
        Row: {
          connected_account_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          expires_at: string | null
          id: string
          rotated_at: string | null
          scopes: string[]
          status: string
          token_nonce: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          connected_account_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          rotated_at?: string | null
          scopes?: string[]
          status?: string
          token_nonce: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          connected_account_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          rotated_at?: string | null
          scopes?: string[]
          status?: string
          token_nonce?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "oauth_credentials_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: true
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          provider: string
          scopes: string[]
          service: string
          state_hash: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          provider: string
          scopes: string[]
          service: string
          state_hash: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string
          scopes?: string[]
          service?: string
          state_hash?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_sessions: {
        Row: {
          answers: Json
          archived_at: string | null
          blockers: Json
          completed_at: string | null
          completed_steps: number[]
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          current_step: number
          id: string
          started_at: string | null
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          answers?: Json
          archived_at?: string | null
          blockers?: Json
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_step?: number
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          answers?: Json
          archived_at?: string | null
          blockers?: Json
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_step?: number
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      onboarding_work_items: {
        Row: {
          archived_at: string | null
          attempt_count: number
          blocking_reason: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          explicitly_deferred: boolean
          id: string
          labels: string[]
          latest_job_id: string | null
          latest_run_id: string | null
          metadata: Json
          next_user_action: Json
          onboarding_session_id: string
          phase: string
          progress: number
          readiness_confirmed_at: string | null
          related_object_id: string | null
          related_object_type: string | null
          required: boolean
          stable_key: string
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          work_type: string
        }
        Insert: {
          archived_at?: string | null
          attempt_count?: number
          blocking_reason?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          explicitly_deferred?: boolean
          id?: string
          labels?: string[]
          latest_job_id?: string | null
          latest_run_id?: string | null
          metadata?: Json
          next_user_action?: Json
          onboarding_session_id: string
          phase?: string
          progress?: number
          readiness_confirmed_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          required?: boolean
          stable_key: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          work_type: string
        }
        Update: {
          archived_at?: string | null
          attempt_count?: number
          blocking_reason?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          explicitly_deferred?: boolean
          id?: string
          labels?: string[]
          latest_job_id?: string | null
          latest_run_id?: string | null
          metadata?: Json
          next_user_action?: Json
          onboarding_session_id?: string
          phase?: string
          progress?: number
          readiness_confirmed_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          required?: boolean
          stable_key?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_work_items_latest_job_id_fkey"
            columns: ["latest_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_work_items_latest_run_id_fkey"
            columns: ["latest_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_work_items_session_user_fk"
            columns: ["onboarding_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      open_questions: {
        Row: {
          affected_fields: string[]
          answer: string | null
          answered_at: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          metadata: Json
          question: string
          reason: string
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          affected_fields?: string[]
          answer?: string | null
          answered_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          question: string
          reason?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          affected_fields?: string[]
          answer?: string | null
          answered_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          question?: string
          reason?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          archived_at: string | null
          canonical_url: string | null
          company_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          deadline_at: string | null
          description: string | null
          discovered_at: string
          due_at: string | null
          eligibility: Json
          evidence_ids: string[]
          fit_rationale: string
          id: string
          labels: string[]
          location: string | null
          metadata: Json
          opportunity_type: string
          posted_at: string | null
          priority: number | null
          related_goal_ids: string[]
          role_target_id: string | null
          source_monitor_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          url: string | null
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          canonical_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          description?: string | null
          discovered_at?: string
          due_at?: string | null
          eligibility?: Json
          evidence_ids?: string[]
          fit_rationale?: string
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          opportunity_type: string
          posted_at?: string | null
          priority?: number | null
          related_goal_ids?: string[]
          role_target_id?: string | null
          source_monitor_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          description?: string | null
          discovered_at?: string
          due_at?: string | null
          eligibility?: Json
          evidence_ids?: string[]
          fit_rationale?: string
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          opportunity_type?: string
          posted_at?: string | null
          priority?: number | null
          related_goal_ids?: string[]
          role_target_id?: string | null
          source_monitor_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_role_target_id_fkey"
            columns: ["role_target_id"]
            isOneToOne: false
            referencedRelation: "role_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_monitor_id_fkey"
            columns: ["source_monitor_id"]
            isOneToOne: false
            referencedRelation: "source_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_recommendations: {
        Row: {
          aggressiveness_used: Database["public"]["Enums"]["ranking_aggressiveness"]
          archived_at: string | null
          confidence: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          id: string
          labels: string[]
          metadata: Json
          opportunity_id: string | null
          planner_hints: Json
          priority: number | null
          project_bridge_assessment: Json | null
          rationale: string
          recommendation: Database["public"]["Enums"]["opportunity_recommendation_action"]
          role_brief: Json
          score: number | null
          score_breakdown: Json
          source_signal_ids: string[]
          status: string
          suggested_tasks: Json
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          aggressiveness_used?: Database["public"]["Enums"]["ranking_aggressiveness"]
          archived_at?: string | null
          confidence: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          opportunity_id?: string | null
          planner_hints?: Json
          priority?: number | null
          project_bridge_assessment?: Json | null
          rationale?: string
          recommendation: Database["public"]["Enums"]["opportunity_recommendation_action"]
          role_brief?: Json
          score?: number | null
          score_breakdown?: Json
          source_signal_ids?: string[]
          status?: string
          suggested_tasks?: Json
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          aggressiveness_used?: Database["public"]["Enums"]["ranking_aggressiveness"]
          archived_at?: string | null
          confidence?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          opportunity_id?: string | null
          planner_hints?: Json
          priority?: number | null
          project_bridge_assessment?: Json | null
          rationale?: string
          recommendation?: Database["public"]["Enums"]["opportunity_recommendation_action"]
          role_brief?: Json
          score?: number | null
          score_breakdown?: Json
          source_signal_ids?: string[]
          status?: string
          suggested_tasks?: Json
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_recommendations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_drafts: {
        Row: {
          application_id: string | null
          archived_at: string | null
          body: string
          channel: string
          contact_id: string | null
          copied_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          draft_type: string
          evidence_ids: string[]
          id: string
          referral_path_id: string | null
          sent_manually_at: string | null
          status: string
          subject: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id?: string | null
          archived_at?: string | null
          body: string
          channel: string
          contact_id?: string | null
          copied_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          draft_type: string
          evidence_ids?: string[]
          id?: string
          referral_path_id?: string | null
          sent_manually_at?: string | null
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string | null
          archived_at?: string | null
          body?: string
          channel?: string
          contact_id?: string | null
          copied_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          draft_type?: string
          evidence_ids?: string[]
          id?: string
          referral_path_id?: string | null
          sent_manually_at?: string | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "outreach_drafts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_referral_path_id_fkey"
            columns: ["referral_path_id"]
            isOneToOne: false
            referencedRelation: "referral_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          daily_plan_id: string | null
          id: string
          position: number
          rationale: string
          section: string
          status: string
          task_id: string | null
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          weekly_plan_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          daily_plan_id?: string | null
          id?: string
          position?: number
          rationale?: string
          section: string
          status?: string
          task_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          weekly_plan_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          daily_plan_id?: string | null
          id?: string
          position?: number
          rationale?: string
          section?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          weekly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          metadata: Json
          preference_type: string
          source: string
          status: string
          strength: number | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          value: Json
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          preference_type: string
          source?: string
          status?: string
          strength?: number | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          value: Json
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          preference_type?: string
          source?: string
          status?: string
          strength?: number | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          value?: Json
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          full_name: string | null
          headline: string | null
          id: string
          labels: string[]
          metadata: Json
          state_version: number
          status: string
          timezone: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          full_name?: string | null
          headline?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          state_version?: number
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          full_name?: string | null
          headline?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          state_version?: number
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      project_specs: {
        Row: {
          application_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          estimated_hours: number | null
          evidence_ids: string[]
          id: string
          labels: string[]
          metadata: Json
          opportunity_id: string | null
          rationale: string
          specification: Json
          state_version: number | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          estimated_hours?: number | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          opportunity_id?: string | null
          rationale?: string
          specification: Json
          state_version?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          estimated_hours?: number | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          opportunity_id?: string | null
          rationale?: string
          specification?: Json
          state_version?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_specs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_specs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          description: string | null
          id: string
          labels: string[]
          metadata: Json
          related_goal_ids: string[]
          repository_url: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          url: string | null
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          description?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          related_goal_ids?: string[]
          repository_url?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          description?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          related_goal_ids?: string[]
          repository_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      proposed_mutations: {
        Row: {
          agent_run_id: string | null
          applied_at: string | null
          approval_policy: string
          archived_at: string | null
          confidence: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          expected_object_version: number | null
          id: string
          idempotency_key: string | null
          mutation_batch_id: string | null
          mutation_type: string
          payload: Json
          rationale: string
          result: Json | null
          status: Database["public"]["Enums"]["mutation_status"]
          target_object_id: string | null
          target_object_type: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          applied_at?: string | null
          approval_policy: string
          archived_at?: string | null
          confidence: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          expected_object_version?: number | null
          id?: string
          idempotency_key?: string | null
          mutation_batch_id?: string | null
          mutation_type: string
          payload?: Json
          rationale?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["mutation_status"]
          target_object_id?: string | null
          target_object_type: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          applied_at?: string | null
          approval_policy?: string
          archived_at?: string | null
          confidence?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          expected_object_version?: number | null
          id?: string
          idempotency_key?: string | null
          mutation_batch_id?: string | null
          mutation_type?: string
          payload?: Json
          rationale?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["mutation_status"]
          target_object_id?: string | null
          target_object_type?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposed_mutations_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposed_mutations_mutation_batch_id_fkey"
            columns: ["mutation_batch_id"]
            isOneToOne: false
            referencedRelation: "mutation_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_paths: {
        Row: {
          application_id: string | null
          appropriateness: number
          archived_at: string | null
          connection_reason: string
          contact_id: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          id: string
          next_action: string | null
          opportunity_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id?: string | null
          appropriateness?: number
          archived_at?: string | null
          connection_reason: string
          contact_id: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          next_action?: string | null
          opportunity_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string | null
          appropriateness?: number
          archived_at?: string | null
          connection_reason?: string
          contact_id?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          next_action?: string | null
          opportunity_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_paths_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_paths_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_paths_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          archived_at: string | null
          contact_id: string
          context: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          last_interaction_at: string | null
          metadata: Json
          next_action_at: string | null
          relationship_type: string
          status: string
          strength: number
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          contact_id: string
          context?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_interaction_at?: string | null
          metadata?: Json
          next_action_at?: string | null
          relationship_type?: string
          status?: string
          strength?: number
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          contact_id?: string
          context?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_interaction_at?: string | null
          metadata?: Json
          next_action_at?: string | null
          relationship_type?: string
          status?: string
          strength?: number
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_bullets: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          experience_id: string | null
          id: string
          labels: string[]
          metadata: Json
          metrics: string[]
          status: string
          target_roles: string[]
          text: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          experience_id?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          metrics?: string[]
          status?: string
          target_roles?: string[]
          text: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          experience_id?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          metrics?: string[]
          status?: string
          target_roles?: string[]
          text?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resume_bullets_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          is_default: boolean
          labels: string[]
          latex_path: string
          metadata: Json
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          is_default?: boolean
          labels?: string[]
          latex_path: string
          metadata?: Json
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          is_default?: boolean
          labels?: string[]
          latex_path?: string
          metadata?: Json
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      resume_variant_items: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          item_type: string
          position: number
          rationale: string
          rendered_text: string
          resume_variant_id: string
          source_object_id: string | null
          source_text: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          item_type: string
          position?: number
          rationale?: string
          rendered_text: string
          resume_variant_id: string
          source_object_id?: string | null
          source_text: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          item_type?: string
          position?: number
          rationale?: string
          rendered_text?: string
          resume_variant_id?: string
          source_object_id?: string | null
          source_text?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resume_variant_items_resume_variant_id_fkey"
            columns: ["resume_variant_id"]
            isOneToOne: false
            referencedRelation: "resume_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_variants: {
        Row: {
          application_id: string | null
          archived_at: string | null
          base_version_id: string | null
          company_id: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          diff_path: string | null
          evidence_ids: string[]
          id: string
          labels: string[]
          latex_path: string
          metadata: Json
          pdf_path: string | null
          rationale: string
          resume_template_id: string | null
          role_target_id: string | null
          status: Database["public"]["Enums"]["resume_variant_status"]
          target_company: string | null
          target_role: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          application_id?: string | null
          archived_at?: string | null
          base_version_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          diff_path?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          latex_path: string
          metadata?: Json
          pdf_path?: string | null
          rationale?: string
          resume_template_id?: string | null
          role_target_id?: string | null
          status?: Database["public"]["Enums"]["resume_variant_status"]
          target_company?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          application_id?: string | null
          archived_at?: string | null
          base_version_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          diff_path?: string | null
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          latex_path?: string
          metadata?: Json
          pdf_path?: string | null
          rationale?: string
          resume_template_id?: string | null
          role_target_id?: string | null
          status?: Database["public"]["Enums"]["resume_variant_status"]
          target_company?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resume_variants_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_variants_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_variants_resume_template_id_fkey"
            columns: ["resume_template_id"]
            isOneToOne: false
            referencedRelation: "resume_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_variants_role_target_id_fkey"
            columns: ["role_target_id"]
            isOneToOne: false
            referencedRelation: "role_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_versions: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          latex_path: string
          metadata: Json
          pdf_path: string | null
          status: string
          template_id: string | null
          title: string
          track: Database["public"]["Enums"]["goal_track"]
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          latex_path: string
          metadata?: Json
          pdf_path?: string | null
          status?: string
          template_id?: string | null
          title: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          latex_path?: string
          metadata?: Json
          pdf_path?: string | null
          status?: string
          template_id?: string | null
          title?: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "resume_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_targets: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          metadata: Json
          status: string
          title: string
          track: Database["public"]["Enums"]["goal_track"]
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          status?: string
          title: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          metadata?: Json
          status?: string
          title?: string
          track?: Database["public"]["Enums"]["goal_track"]
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      runtime_threads: {
        Row: {
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          metadata: Json
          provider: Database["public"]["Enums"]["runtime_provider"]
          related_object_id: string | null
          runtime_thread_id: string
          status: string
          summary: string | null
          thread_type: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          metadata?: Json
          provider: Database["public"]["Enums"]["runtime_provider"]
          related_object_id?: string | null
          runtime_thread_id: string
          status?: string
          summary?: string | null
          thread_type: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          metadata?: Json
          provider?: Database["public"]["Enums"]["runtime_provider"]
          related_object_id?: string | null
          runtime_thread_id?: string
          status?: string
          summary?: string | null
          thread_type?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "runtime_threads_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_turns: {
        Row: {
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          input: Json
          metadata: Json
          output: Json | null
          runtime_thread_id: string | null
          runtime_turn_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          runtime_thread_id?: string | null
          runtime_turn_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          runtime_thread_id?: string | null
          runtime_turn_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "runtime_turns_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_turns_runtime_thread_id_fkey"
            columns: ["runtime_thread_id"]
            isOneToOne: false
            referencedRelation: "runtime_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          archived_at: string | null
          catch_up: boolean
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          cron_expression: string | null
          dedupe_prefix: string
          id: string
          job_template: Json
          labels: string[]
          last_run_at: string | null
          metadata: Json
          next_run_at: string | null
          schedule_type: string
          status: string
          timezone: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          catch_up?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          cron_expression?: string | null
          dedupe_prefix: string
          id?: string
          job_template: Json
          labels?: string[]
          last_run_at?: string | null
          metadata?: Json
          next_run_at?: string | null
          schedule_type: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          catch_up?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          cron_expression?: string | null
          dedupe_prefix?: string
          id?: string
          job_template?: Json
          labels?: string[]
          last_run_at?: string | null
          metadata?: Json
          next_run_at?: string | null
          schedule_type?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      signals: {
        Row: {
          archived_at: string | null
          canonical_url: string | null
          company_name: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          deadline_at: string | null
          evidence_ids: string[]
          external_ref: string | null
          id: string
          labels: string[]
          location: string | null
          metadata: Json
          normalized_payload: Json
          opportunity_id: string | null
          opportunity_type: string | null
          parser_confidence: string | null
          parser_name: string | null
          posted_at: string | null
          rationale: string
          raw_payload: Json
          role_title: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          source_candidate_id: string | null
          source_monitor_id: string | null
          source_run_id: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
          source_url: string | null
          status: Database["public"]["Enums"]["signal_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          canonical_url?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          evidence_ids?: string[]
          external_ref?: string | null
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          normalized_payload?: Json
          opportunity_id?: string | null
          opportunity_type?: string | null
          parser_confidence?: string | null
          parser_name?: string | null
          posted_at?: string | null
          rationale?: string
          raw_payload?: Json
          role_title?: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          source_candidate_id?: string | null
          source_monitor_id?: string | null
          source_run_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          deadline_at?: string | null
          evidence_ids?: string[]
          external_ref?: string | null
          id?: string
          labels?: string[]
          location?: string | null
          metadata?: Json
          normalized_payload?: Json
          opportunity_id?: string | null
          opportunity_type?: string | null
          parser_confidence?: string | null
          parser_name?: string | null
          posted_at?: string | null
          rationale?: string
          raw_payload?: Json
          role_title?: string | null
          signal_type?: Database["public"]["Enums"]["signal_type"]
          source_candidate_id?: string | null
          source_monitor_id?: string | null
          source_run_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "signals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_source_candidate_id_fkey"
            columns: ["source_candidate_id"]
            isOneToOne: false
            referencedRelation: "source_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_source_monitor_id_fkey"
            columns: ["source_monitor_id"]
            isOneToOne: false
            referencedRelation: "source_monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "source_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          evidence_ids: string[]
          id: string
          labels: string[]
          metadata: Json
          proficiency: string | null
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          proficiency?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          proficiency?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      source_adapters: {
        Row: {
          adapter_type: string
          approved_at: string | null
          archived_at: string | null
          checksum: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          definition: Json
          domain_allowlist: string[]
          id: string
          source_monitor_id: string | null
          status: string
          test_result: Json | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          version_number: number
        }
        Insert: {
          adapter_type: string
          approved_at?: string | null
          archived_at?: string | null
          checksum: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          definition: Json
          domain_allowlist?: string[]
          id?: string
          source_monitor_id?: string | null
          status?: string
          test_result?: Json | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          version_number?: number
        }
        Update: {
          adapter_type?: string
          approved_at?: string | null
          archived_at?: string | null
          checksum?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          definition?: Json
          domain_allowlist?: string[]
          id?: string
          source_monitor_id?: string | null
          status?: string
          test_result?: Json | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_adapters_source_monitor_id_fkey"
            columns: ["source_monitor_id"]
            isOneToOne: false
            referencedRelation: "source_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      source_candidates: {
        Row: {
          agent_run_id: string | null
          archived_at: string | null
          browser_use_enabled: boolean
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          discovery_mode: Database["public"]["Enums"]["source_discovery_mode"]
          evidence_ids: string[]
          fetch_strategy_guess: Database["public"]["Enums"]["fetch_strategy"]
          id: string
          labels: string[]
          metadata: Json
          rationale: string
          recommendation: Database["public"]["Enums"]["source_candidate_recommendation"]
          related_source_monitor_id: string | null
          requires_auth: boolean
          scores: Json
          source_discovery_run_id: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          status: string
          target_roles: string[]
          target_season: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          url: string
          user_id: string
          version: number
        }
        Insert: {
          agent_run_id?: string | null
          archived_at?: string | null
          browser_use_enabled?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          discovery_mode?: Database["public"]["Enums"]["source_discovery_mode"]
          evidence_ids?: string[]
          fetch_strategy_guess: Database["public"]["Enums"]["fetch_strategy"]
          id?: string
          labels?: string[]
          metadata?: Json
          rationale?: string
          recommendation?: Database["public"]["Enums"]["source_candidate_recommendation"]
          related_source_monitor_id?: string | null
          requires_auth?: boolean
          scores?: Json
          source_discovery_run_id?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          status?: string
          target_roles?: string[]
          target_season?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url: string
          user_id: string
          version?: number
        }
        Update: {
          agent_run_id?: string | null
          archived_at?: string | null
          browser_use_enabled?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          discovery_mode?: Database["public"]["Enums"]["source_discovery_mode"]
          evidence_ids?: string[]
          fetch_strategy_guess?: Database["public"]["Enums"]["fetch_strategy"]
          id?: string
          labels?: string[]
          metadata?: Json
          rationale?: string
          recommendation?: Database["public"]["Enums"]["source_candidate_recommendation"]
          related_source_monitor_id?: string | null
          requires_auth?: boolean
          scores?: Json
          source_discovery_run_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: string
          target_roles?: string[]
          target_season?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          url?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_candidates_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_candidates_related_source_monitor_id_fkey"
            columns: ["related_source_monitor_id"]
            isOneToOne: false
            referencedRelation: "source_monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_candidates_source_discovery_run_id_fkey"
            columns: ["source_discovery_run_id"]
            isOneToOne: false
            referencedRelation: "source_discovery_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      source_discovery_runs: {
        Row: {
          account_hints: string[]
          agent_run_id: string | null
          archived_at: string | null
          browser_use_allowed: boolean
          computer_use_allowed: boolean
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          error_message: string | null
          id: string
          labels: string[]
          log_path: string | null
          max_duration_minutes: number | null
          metadata: Json
          mode: Database["public"]["Enums"]["source_discovery_mode"]
          next_recommended_run_at: string | null
          parser_jobs_queued: number
          query: string
          scope: string[]
          source_candidates_found: number
          source_monitors_created: number
          source_monitors_updated: number
          status: Database["public"]["Enums"]["source_discovery_status"]
          target_companies: string[]
          target_roles: string[]
          target_season: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          account_hints?: string[]
          agent_run_id?: string | null
          archived_at?: string | null
          browser_use_allowed?: boolean
          computer_use_allowed?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          labels?: string[]
          log_path?: string | null
          max_duration_minutes?: number | null
          metadata?: Json
          mode: Database["public"]["Enums"]["source_discovery_mode"]
          next_recommended_run_at?: string | null
          parser_jobs_queued?: number
          query: string
          scope?: string[]
          source_candidates_found?: number
          source_monitors_created?: number
          source_monitors_updated?: number
          status?: Database["public"]["Enums"]["source_discovery_status"]
          target_companies?: string[]
          target_roles?: string[]
          target_season?: string | null
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          account_hints?: string[]
          agent_run_id?: string | null
          archived_at?: string | null
          browser_use_allowed?: boolean
          computer_use_allowed?: boolean
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          labels?: string[]
          log_path?: string | null
          max_duration_minutes?: number | null
          metadata?: Json
          mode?: Database["public"]["Enums"]["source_discovery_mode"]
          next_recommended_run_at?: string | null
          parser_jobs_queued?: number
          query?: string
          scope?: string[]
          source_candidates_found?: number
          source_monitors_created?: number
          source_monitors_updated?: number
          status?: Database["public"]["Enums"]["source_discovery_status"]
          target_companies?: string[]
          target_roles?: string[]
          target_season?: string | null
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_discovery_runs_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      source_monitors: {
        Row: {
          approval_required: boolean
          archived_at: string | null
          browser_use_enabled: boolean
          claimed_by_device_id: string | null
          consecutive_failures: number
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          created_by_agent_run_id: string | null
          evaluation: Json
          evidence_ids: string[]
          fetch_strategy: Database["public"]["Enums"]["fetch_strategy"]
          id: string
          labels: string[]
          last_error: string | null
          last_run_at: string | null
          last_seen_cursor: string | null
          last_seen_hash: string | null
          last_useful_signal_at: string | null
          lease_expires_at: string | null
          local_path: string | null
          metadata: Json
          next_run_at: string | null
          parser_script_path: string | null
          parser_version: string | null
          priority: number | null
          related_company_ids: string[]
          related_goal_ids: string[]
          requires_auth: boolean
          schedule: string
          source_rationale: string
          source_type: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["monitor_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          updated_by_agent_run_id: string | null
          url: string
          useful_signal_count: number
          user_id: string
          version: number
        }
        Insert: {
          approval_required?: boolean
          archived_at?: string | null
          browser_use_enabled?: boolean
          claimed_by_device_id?: string | null
          consecutive_failures?: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          created_by_agent_run_id?: string | null
          evaluation?: Json
          evidence_ids?: string[]
          fetch_strategy: Database["public"]["Enums"]["fetch_strategy"]
          id?: string
          labels?: string[]
          last_error?: string | null
          last_run_at?: string | null
          last_seen_cursor?: string | null
          last_seen_hash?: string | null
          last_useful_signal_at?: string | null
          lease_expires_at?: string | null
          local_path?: string | null
          metadata?: Json
          next_run_at?: string | null
          parser_script_path?: string | null
          parser_version?: string | null
          priority?: number | null
          related_company_ids?: string[]
          related_goal_ids?: string[]
          requires_auth?: boolean
          schedule: string
          source_rationale?: string
          source_type: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["monitor_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          updated_by_agent_run_id?: string | null
          url: string
          useful_signal_count?: number
          user_id: string
          version?: number
        }
        Update: {
          approval_required?: boolean
          archived_at?: string | null
          browser_use_enabled?: boolean
          claimed_by_device_id?: string | null
          consecutive_failures?: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          created_by_agent_run_id?: string | null
          evaluation?: Json
          evidence_ids?: string[]
          fetch_strategy?: Database["public"]["Enums"]["fetch_strategy"]
          id?: string
          labels?: string[]
          last_error?: string | null
          last_run_at?: string | null
          last_seen_cursor?: string | null
          last_seen_hash?: string | null
          last_useful_signal_at?: string | null
          lease_expires_at?: string | null
          local_path?: string | null
          metadata?: Json
          next_run_at?: string | null
          parser_script_path?: string | null
          parser_version?: string | null
          priority?: number | null
          related_company_ids?: string[]
          related_goal_ids?: string[]
          requires_auth?: boolean
          schedule?: string
          source_rationale?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["monitor_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          updated_by_agent_run_id?: string | null
          url?: string
          useful_signal_count?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_monitors_claimed_by_device_id_fkey"
            columns: ["claimed_by_device_id"]
            isOneToOne: false
            referencedRelation: "worker_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_monitors_created_by_agent_run_id_fkey"
            columns: ["created_by_agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_monitors_updated_by_agent_run_id_fkey"
            columns: ["updated_by_agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      source_runs: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          error_message: string | null
          id: string
          labels: string[]
          log_path: string | null
          metadata: Json
          new_opportunity_count: number
          new_signal_count: number
          source_monitor_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["source_run_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          labels?: string[]
          log_path?: string | null
          metadata?: Json
          new_opportunity_count?: number
          new_signal_count?: number
          source_monitor_id?: string | null
          started_at?: string
          status: Database["public"]["Enums"]["source_run_status"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          error_message?: string | null
          id?: string
          labels?: string[]
          log_path?: string | null
          metadata?: Json
          new_opportunity_count?: number
          new_signal_count?: number
          source_monitor_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["source_run_status"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_runs_source_monitor_id_fkey"
            columns: ["source_monitor_id"]
            isOneToOne: false
            referencedRelation: "source_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      state_item_revisions: {
        Row: {
          confidence: number
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          effective_at: string
          expires_at: string | null
          human_value: string
          id: string
          rationale: string
          revision: number
          salience: number
          source_id: string | null
          source_type: string
          state_item_id: string
          status: string
          supersedes_revision_id: string | null
          undo_of_revision_id: string | null
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          user_stated: boolean
          value: Json
          version: number
        }
        Insert: {
          confidence: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          effective_at: string
          expires_at?: string | null
          human_value: string
          id?: string
          rationale?: string
          revision: number
          salience: number
          source_id?: string | null
          source_type: string
          state_item_id: string
          status?: string
          supersedes_revision_id?: string | null
          undo_of_revision_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          user_stated?: boolean
          value: Json
          version?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          effective_at?: string
          expires_at?: string | null
          human_value?: string
          id?: string
          rationale?: string
          revision?: number
          salience?: number
          source_id?: string | null
          source_type?: string
          state_item_id?: string
          status?: string
          supersedes_revision_id?: string | null
          undo_of_revision_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          user_stated?: boolean
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "state_item_revisions_state_item_id_fkey"
            columns: ["state_item_id"]
            isOneToOne: false
            referencedRelation: "state_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "state_item_revisions_supersedes_revision_id_fkey"
            columns: ["supersedes_revision_id"]
            isOneToOne: false
            referencedRelation: "state_item_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "state_item_revisions_undo_of_revision_id_fkey"
            columns: ["undo_of_revision_id"]
            isOneToOne: false
            referencedRelation: "state_item_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      state_items: {
        Row: {
          archived_at: string | null
          confidence: number
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          current_value: Json
          effective_at: string
          expires_at: string | null
          human_value: string
          id: string
          item_type: string
          labels: string[]
          metadata: Json
          salience: number
          source_id: string | null
          source_type: string
          stable_key: string
          status: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          user_stated: boolean
          version: number
        }
        Insert: {
          archived_at?: string | null
          confidence?: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_value: Json
          effective_at?: string
          expires_at?: string | null
          human_value: string
          id?: string
          item_type: string
          labels?: string[]
          metadata?: Json
          salience?: number
          source_id?: string | null
          source_type: string
          stable_key: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          user_stated?: boolean
          version?: number
        }
        Update: {
          archived_at?: string | null
          confidence?: number
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          current_value?: Json
          effective_at?: string
          expires_at?: string | null
          human_value?: string
          id?: string
          item_type?: string
          labels?: string[]
          metadata?: Json
          salience?: number
          source_id?: string | null
          source_type?: string
          stable_key?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          user_stated?: boolean
          version?: number
        }
        Relationships: []
      }
      state_snapshots: {
        Row: {
          as_of: string
          bundle: Json
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          reason: string
          state_version: number
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          as_of?: string
          bundle: Json
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          reason?: string
          state_version: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          as_of?: string
          bundle?: Json
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          reason?: string
          state_version?: number
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          dependency_type: string
          depends_on_task_id: string
          id: string
          status: string
          task_id: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          status?: string
          task_id: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          due_at: string | null
          effort: Database["public"]["Enums"]["task_effort"]
          energy: Database["public"]["Enums"]["energy_level"]
          evidence_ids: string[]
          id: string
          labels: string[]
          metadata: Json
          priority: number | null
          related_application_ids: string[]
          related_contact_ids: string[]
          related_event_ids: string[]
          related_goal_ids: string[]
          related_opportunity_ids: string[]
          source: string
          status: string
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          urgency: Database["public"]["Enums"]["task_urgency"]
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          due_at?: string | null
          effort?: Database["public"]["Enums"]["task_effort"]
          energy?: Database["public"]["Enums"]["energy_level"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          priority?: number | null
          related_application_ids?: string[]
          related_contact_ids?: string[]
          related_event_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          source: string
          status?: string
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          urgency?: Database["public"]["Enums"]["task_urgency"]
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          due_at?: string | null
          effort?: Database["public"]["Enums"]["task_effort"]
          energy?: Database["public"]["Enums"]["energy_level"]
          evidence_ids?: string[]
          id?: string
          labels?: string[]
          metadata?: Json
          priority?: number | null
          related_application_ids?: string[]
          related_contact_ids?: string[]
          related_event_ids?: string[]
          related_goal_ids?: string[]
          related_opportunity_ids?: string[]
          source?: string
          status?: string
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          urgency?: Database["public"]["Enums"]["task_urgency"]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      thread_object_links: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          object_id: string
          object_type: string
          relationship: string
          status: string
          thread_id: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          object_id: string
          object_type: string
          relationship?: string
          status?: string
          thread_id: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          object_id?: string
          object_type?: string
          relationship?: string
          status?: string
          thread_id?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "thread_object_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_summaries: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          from_message_id: string | null
          id: string
          message_count: number
          state_version: number | null
          status: string
          summary: string
          thread_id: string
          through_message_id: string | null
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          from_message_id?: string | null
          id?: string
          message_count: number
          state_version?: number | null
          status?: string
          summary: string
          thread_id: string
          through_message_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          from_message_id?: string | null
          id?: string
          message_count?: number
          state_version?: number | null
          status?: string
          summary?: string
          thread_id?: string
          through_message_id?: string | null
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "thread_summaries_from_message_id_fkey"
            columns: ["from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_summaries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_summaries_through_message_id_fkey"
            columns: ["through_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          active_runtime_thread_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          id: string
          labels: string[]
          last_message_at: string | null
          metadata: Json
          pinned: boolean
          status: string
          thread_type: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        Insert: {
          active_runtime_thread_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_message_at?: string | null
          metadata?: Json
          pinned?: boolean
          status?: string
          thread_type: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
        }
        Update: {
          active_runtime_thread_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          id?: string
          labels?: string[]
          last_message_at?: string | null
          metadata?: Json
          pinned?: boolean
          status?: string
          thread_type?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "threads_active_runtime_thread_id_fkey"
            columns: ["active_runtime_thread_id"]
            isOneToOne: false
            referencedRelation: "runtime_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          generated_at: string
          id: string
          rationale: string
          state_version: number
          status: string
          timezone: string
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          week_start: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          generated_at?: string
          id?: string
          rationale?: string
          state_version: number
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          week_start: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          generated_at?: string
          id?: string
          rationale?: string
          state_version?: number
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          week_start?: string
        }
        Relationships: []
      }
      worker_devices: {
        Row: {
          archived_at: string | null
          capabilities: string[]
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          health: Json
          id: string
          labels: string[]
          last_error: string | null
          last_heartbeat_at: string | null
          last_seen_ip: unknown
          metadata: Json
          name: string
          secret_hash: string | null
          secret_rotated_at: string | null
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
          worker_version: string | null
        }
        Insert: {
          archived_at?: string | null
          capabilities?: string[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          health?: Json
          id?: string
          labels?: string[]
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_seen_ip?: unknown
          metadata?: Json
          name: string
          secret_hash?: string | null
          secret_rotated_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version?: number
          worker_version?: string | null
        }
        Update: {
          archived_at?: string | null
          capabilities?: string[]
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          health?: Json
          id?: string
          labels?: string[]
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_seen_ip?: unknown
          metadata?: Json
          name?: string
          secret_hash?: string | null
          secret_rotated_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          user_id?: string
          version?: number
          worker_version?: string | null
        }
        Relationships: []
      }
      worker_pairing_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          expires_at: string
          id: string
          status: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          used_at: string | null
          user_id: string
          version: number
          worker_device_id: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          expires_at: string
          id?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          used_at?: string | null
          user_id: string
          version?: number
          worker_device_id?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["actor_type"]
          expires_at?: string
          id?: string
          status?: string
          updated_at?: string
          updated_by?: Database["public"]["Enums"]["actor_type"]
          used_at?: string | null
          user_id?: string
          version?: number
          worker_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_pairing_codes_worker_device_id_fkey"
            columns: ["worker_device_id"]
            isOneToOne: false
            referencedRelation: "worker_devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_career_mutation: { Args: { p_mutation_id: string }; Returns: Json }
      apply_career_mutation_legacy: {
        Args: { p_mutation_id: string }
        Returns: Json
      }
      apply_onboarding_mutation: {
        Args: { p_mutation_id: string }
        Returns: Json
      }
      bump_state_version: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      claim_agent_jobs: {
        Args: {
          p_device_id: string
          p_lease_seconds?: number
          p_limit?: number
        }
        Returns: {
          agent_id: string
          archived_at: string | null
          attempt_count: number
          cancelled_at: string | null
          claimed_by_device_id: string | null
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          created_state_version: number
          dedupe_key: string | null
          error_message: string | null
          heartbeat_at: string | null
          id: string
          input: Json
          input_type: string
          labels: string[]
          lease_expires_at: string | null
          locked_at: string | null
          max_attempts: number
          metadata: Json
          priority: number
          prompt: string | null
          queue: string
          related_object_ids: string[]
          required_capabilities: string[]
          retry_after: string | null
          scheduled_for: string
          schema_version: number
          status: Database["public"]["Enums"]["agent_job_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_source_monitors: {
        Args: { p_device_id: string; p_limit?: number }
        Returns: {
          approval_required: boolean
          archived_at: string | null
          browser_use_enabled: boolean
          claimed_by_device_id: string | null
          consecutive_failures: number
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          created_by_agent_run_id: string | null
          evaluation: Json
          evidence_ids: string[]
          fetch_strategy: Database["public"]["Enums"]["fetch_strategy"]
          id: string
          labels: string[]
          last_error: string | null
          last_run_at: string | null
          last_seen_cursor: string | null
          last_seen_hash: string | null
          last_useful_signal_at: string | null
          lease_expires_at: string | null
          local_path: string | null
          metadata: Json
          next_run_at: string | null
          parser_script_path: string | null
          parser_version: string | null
          priority: number | null
          related_company_ids: string[]
          related_goal_ids: string[]
          requires_auth: boolean
          schedule: string
          source_rationale: string
          source_type: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["monitor_status"]
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          updated_by_agent_run_id: string | null
          url: string
          useful_signal_count: number
          user_id: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "source_monitors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_agent_job: {
        Args: {
          p_device_id: string
          p_job_id: string
          p_output: Json
          p_runtime?: Json
        }
        Returns: string
      }
      complete_onboarding: {
        Args: { p_expected_version: number; p_session_id: string }
        Returns: Json
      }
      consume_worker_pairing_code: {
        Args: {
          p_capabilities?: string[]
          p_code_hash: string
          p_device_secret_hash: string
          p_worker_version?: string
        }
        Returns: {
          device_id: string
          user_id: string
        }[]
      }
      decide_approval: {
        Args: { p_approval_id: string; p_decision: string; p_user_id: string }
        Returns: {
          action_type: string
          agent_run_id: string | null
          archived_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["actor_type"]
          decided_at: string | null
          evidence_ids: string[]
          id: string
          labels: string[]
          payload: Json
          rationale: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["approval_status"]
          target_object_id: string | null
          target_object_type: string | null
          title: string
          updated_at: string
          updated_by: Database["public"]["Enums"]["actor_type"]
          user_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "approval_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_onboarding_readiness: {
        Args: { p_session_id: string }
        Returns: Json
      }
      expire_stale_state_items: { Args: never; Returns: number }
      recover_stale_agent_jobs: { Args: never; Returns: number }
      undo_state_item: { Args: { p_state_item_id: string }; Returns: Json }
    }
    Enums: {
      actor_type: "user" | "agent" | "system"
      agent_job_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "needs_user_input"
        | "cancelled"
        | "dead_letter"
      agent_run_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "needs_user_input"
        | "cancelled"
      application_status:
        | "found"
        | "interested"
        | "drafting"
        | "ready_to_submit"
        | "submitted"
        | "oa"
        | "interview"
        | "rejected"
        | "ghosted"
        | "offer"
        | "withdrawn"
      approval_status: "pending" | "approved" | "rejected" | "cancelled"
      connected_account_provider:
        | "google_calendar"
        | "gmail"
        | "github"
        | "supabase"
        | "browser_profile"
        | "other"
      connected_account_status:
        | "not_connected"
        | "connected"
        | "needs_reauth"
        | "disabled"
      energy_level: "low" | "medium" | "high"
      fetch_strategy: "http" | "git_pull" | "browser" | "manual" | "api"
      goal_horizon: "long_term" | "1_year" | "90_day" | "30_day" | "week"
      goal_track: "swe" | "entrepreneurship" | "fde" | "exploration" | "general"
      monitor_status:
        | "proposed"
        | "active"
        | "paused"
        | "broken"
        | "archived"
        | "auth_required"
        | "stale"
      mutation_status: "pending" | "applied" | "approval_required" | "rejected"
      opportunity_recommendation_action:
        | "apply_now"
        | "prepare_then_apply"
        | "build_project_then_apply"
        | "research"
        | "save"
        | "ignore"
        | "needs_review"
      ranking_aggressiveness: "conservative" | "balanced" | "high" | "very_high"
      resume_variant_status:
        | "draft"
        | "ready_for_review"
        | "approved"
        | "used"
        | "archived"
      risk_level: "low" | "medium" | "high"
      runtime_provider:
        | "codex_app_server"
        | "codex_exec"
        | "claude_code"
        | "openhands"
        | "mock"
        | "codex-app-server"
      signal_status:
        | "new"
        | "queued_for_ranking"
        | "ranked"
        | "ignored"
        | "duplicate"
      signal_type:
        | "job_post"
        | "internship_post"
        | "event"
        | "program"
        | "fellowship"
        | "repo_update"
        | "social_post"
        | "newsletter_item"
        | "application_status"
        | "calendar_event"
        | "other"
      source_candidate_recommendation:
        | "activate"
        | "propose"
        | "ignore"
        | "replace_existing"
      source_discovery_mode: "onboarding" | "scheduled" | "manual" | "repair"
      source_discovery_status:
        | "queued"
        | "running"
        | "success"
        | "failed"
        | "partial"
        | "needs_review"
      source_run_status: "success" | "failed" | "no_change" | "needs_review"
      source_type:
        | "github_repo"
        | "company_careers_page"
        | "greenhouse_board"
        | "lever_board"
        | "ashby_board"
        | "school_event_calendar"
        | "newsletter"
        | "social_account"
        | "community_page"
        | "manual_list"
        | "email_application_status"
        | "application_portal"
        | "calendar_events"
      status_check_policy:
        | "manual"
        | "email"
        | "portal"
        | "calendar"
        | "scheduled_agent"
      status_check_result:
        | "no_change"
        | "status_changed"
        | "needs_review"
        | "failed"
      status_check_source:
        | "email"
        | "portal"
        | "calendar"
        | "manual"
        | "browser"
      task_effort: "small" | "medium" | "large"
      task_type:
        | "job_app"
        | "mentor"
        | "event"
        | "resume"
        | "project"
        | "skill"
        | "research"
        | "admin"
        | "check_in"
        | "source_setup"
        | "status_check"
      task_urgency: "low" | "normal" | "high" | "time_sensitive"
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
      actor_type: ["user", "agent", "system"],
      agent_job_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "needs_user_input",
        "cancelled",
        "dead_letter",
      ],
      agent_run_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "needs_user_input",
        "cancelled",
      ],
      application_status: [
        "found",
        "interested",
        "drafting",
        "ready_to_submit",
        "submitted",
        "oa",
        "interview",
        "rejected",
        "ghosted",
        "offer",
        "withdrawn",
      ],
      approval_status: ["pending", "approved", "rejected", "cancelled"],
      connected_account_provider: [
        "google_calendar",
        "gmail",
        "github",
        "supabase",
        "browser_profile",
        "other",
      ],
      connected_account_status: [
        "not_connected",
        "connected",
        "needs_reauth",
        "disabled",
      ],
      energy_level: ["low", "medium", "high"],
      fetch_strategy: ["http", "git_pull", "browser", "manual", "api"],
      goal_horizon: ["long_term", "1_year", "90_day", "30_day", "week"],
      goal_track: ["swe", "entrepreneurship", "fde", "exploration", "general"],
      monitor_status: [
        "proposed",
        "active",
        "paused",
        "broken",
        "archived",
        "auth_required",
        "stale",
      ],
      mutation_status: ["pending", "applied", "approval_required", "rejected"],
      opportunity_recommendation_action: [
        "apply_now",
        "prepare_then_apply",
        "build_project_then_apply",
        "research",
        "save",
        "ignore",
        "needs_review",
      ],
      ranking_aggressiveness: ["conservative", "balanced", "high", "very_high"],
      resume_variant_status: [
        "draft",
        "ready_for_review",
        "approved",
        "used",
        "archived",
      ],
      risk_level: ["low", "medium", "high"],
      runtime_provider: [
        "codex_app_server",
        "codex_exec",
        "claude_code",
        "openhands",
        "mock",
        "codex-app-server",
      ],
      signal_status: [
        "new",
        "queued_for_ranking",
        "ranked",
        "ignored",
        "duplicate",
      ],
      signal_type: [
        "job_post",
        "internship_post",
        "event",
        "program",
        "fellowship",
        "repo_update",
        "social_post",
        "newsletter_item",
        "application_status",
        "calendar_event",
        "other",
      ],
      source_candidate_recommendation: [
        "activate",
        "propose",
        "ignore",
        "replace_existing",
      ],
      source_discovery_mode: ["onboarding", "scheduled", "manual", "repair"],
      source_discovery_status: [
        "queued",
        "running",
        "success",
        "failed",
        "partial",
        "needs_review",
      ],
      source_run_status: ["success", "failed", "no_change", "needs_review"],
      source_type: [
        "github_repo",
        "company_careers_page",
        "greenhouse_board",
        "lever_board",
        "ashby_board",
        "school_event_calendar",
        "newsletter",
        "social_account",
        "community_page",
        "manual_list",
        "email_application_status",
        "application_portal",
        "calendar_events",
      ],
      status_check_policy: [
        "manual",
        "email",
        "portal",
        "calendar",
        "scheduled_agent",
      ],
      status_check_result: [
        "no_change",
        "status_changed",
        "needs_review",
        "failed",
      ],
      status_check_source: ["email", "portal", "calendar", "manual", "browser"],
      task_effort: ["small", "medium", "large"],
      task_type: [
        "job_app",
        "mentor",
        "event",
        "resume",
        "project",
        "skill",
        "research",
        "admin",
        "check_in",
        "source_setup",
        "status_check",
      ],
      task_urgency: ["low", "normal", "high", "time_sensitive"],
    },
  },
} as const

