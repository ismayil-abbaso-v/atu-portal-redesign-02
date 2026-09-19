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
      activity_logs: {
        Row: {
          created_at: string
          emeliyyat: string
          etrafli: Json | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emeliyyat: string
          etrafli?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emeliyyat?: string
          etrafli?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          first_read_at: string
          last_read_at: string
          open_count: number
          user_id: string
        }
        Insert: {
          announcement_id: string
          first_read_at?: string
          last_read_at?: string
          open_count?: number
          user_id: string
        }
        Update: {
          announcement_id?: string
          first_read_at?: string
          last_read_at?: string
          open_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience_type: string
          audience_value: string | null
          body: string
          category: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          media: Json
          priority: number
          starts_at: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience_type?: string
          audience_value?: string | null
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          media?: Json
          priority?: number
          starts_at?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience_type?: string
          audience_value?: string | null
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          media?: Json
          priority?: number
          starts_at?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          statusu: string
          tarix: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          statusu?: string
          tarix?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          statusu?: string
          tarix?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          baslangic_saat: string
          baslıq: string
          bitme_saat: string
          course_id: string | null
          created_at: string
          group_id: string | null
          id: string
          tarix: string
          tesvir: string | null
          updated_at: string
          yaradan_id: string
        }
        Insert: {
          baslangic_saat: string
          baslıq: string
          bitme_saat: string
          course_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          tarix: string
          tesvir?: string | null
          updated_at?: string
          yaradan_id?: string
        }
        Update: {
          baslangic_saat?: string
          baslıq?: string
          bitme_saat?: string
          course_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          tarix?: string
          tesvir?: string | null
          updated_at?: string
          yaradan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "calendar_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_yaradan_id_fkey"
            columns: ["yaradan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          chat_group_id: string | null
          id: string
          qosulma_tarixi: string
          user_id: string | null
        }
        Insert: {
          chat_group_id?: string | null
          id?: string
          qosulma_tarixi?: string
          user_id?: string | null
        }
        Update: {
          chat_group_id?: string | null
          id?: string
          qosulma_tarixi?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_chat_group_id_fkey"
            columns: ["chat_group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          ad: string
          arxivlenib: boolean
          avatar_url: string | null
          course_id: string | null
          created_at: string
          dogrulanmis: boolean | null
          group_id: string | null
          id: string
          semestr: number | null
          tedris_ili: string | null
        }
        Insert: {
          ad: string
          arxivlenib?: boolean
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          dogrulanmis?: boolean | null
          group_id?: string | null
          id?: string
          semestr?: number | null
          tedris_ili?: string | null
        }
        Update: {
          ad?: string
          arxivlenib?: boolean
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          dogrulanmis?: boolean | null
          group_id?: string | null
          id?: string
          semestr?: number | null
          tedris_ili?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "chat_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_group_id: string | null
          created_at: string
          fayl_novu: string | null
          fayl_url: string | null
          gonderen_id: string | null
          id: string
          metin: string | null
        }
        Insert: {
          chat_group_id?: string | null
          created_at?: string
          fayl_novu?: string | null
          fayl_url?: string | null
          gonderen_id?: string | null
          id?: string
          metin?: string | null
        }
        Update: {
          chat_group_id?: string | null
          created_at?: string
          fayl_novu?: string | null
          fayl_url?: string | null
          gonderen_id?: string | null
          id?: string
          metin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_group_id_fkey"
            columns: ["chat_group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_gonderen_id_fkey"
            columns: ["gonderen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      colloquium_assessments: {
        Row: {
          course_id: string
          created_at: string
          grade: number | null
          id: string
          sira: number
          student_id: string
          tarix: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          grade?: number | null
          id?: string
          sira: number
          student_id: string
          tarix?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          grade?: number | null
          id?: string
          sira?: number
          student_id?: string
          tarix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colloquium_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colloquium_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_groups: {
        Row: {
          course_id: string
          group_id: string
          id: string
          semestr: number
          tedris_ili: string
        }
        Insert: {
          course_id: string
          group_id: string
          id?: string
          semestr: number
          tedris_ili: string
        }
        Update: {
          course_id?: string
          group_id?: string
          id?: string
          semestr?: number
          tedris_ili?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "course_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lesson_sessions: {
        Row: {
          auto_confirmed: boolean
          auto_confirmed_at: string | null
          auto_finalize_enabled: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          course_id: string
          created_at: string
          dars_novu: string | null
          draft_saved_at: string | null
          ends_at: string
          group_id: string
          id: string
          is_confirmed: boolean
          lesson_date: string
          movzu: string | null
          schedule_template_id: string | null
          starts_at: string
          teacher_id: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          auto_confirmed?: boolean
          auto_confirmed_at?: string | null
          auto_finalize_enabled?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          course_id: string
          created_at?: string
          dars_novu?: string | null
          draft_saved_at?: string | null
          ends_at: string
          group_id: string
          id?: string
          is_confirmed?: boolean
          lesson_date: string
          movzu?: string | null
          schedule_template_id?: string | null
          starts_at: string
          teacher_id: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_confirmed?: boolean
          auto_confirmed_at?: string | null
          auto_finalize_enabled?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          course_id?: string
          created_at?: string
          dars_novu?: string | null
          draft_saved_at?: string | null
          ends_at?: string
          group_id?: string
          id?: string
          is_confirmed?: boolean
          lesson_date?: string
          movzu?: string | null
          schedule_template_id?: string | null
          starts_at?: string
          teacher_id?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_sessions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_schedule_template_id_fkey"
            columns: ["schedule_template_id"]
            isOneToOne: false
            referencedRelation: "course_schedule_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_teacher_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_lesson_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedule_templates: {
        Row: {
          baslangic_saat: string
          bitme_saat: string
          course_id: string
          created_at: string
          dars_novu: string | null
          group_id: string
          gun_nomresi: number
          hefte_novu: Database["public"]["Enums"]["schedule_week_type"]
          id: string
          otaq: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          baslangic_saat: string
          bitme_saat: string
          course_id: string
          created_at?: string
          dars_novu?: string | null
          group_id: string
          gun_nomresi: number
          hefte_novu?: Database["public"]["Enums"]["schedule_week_type"]
          id?: string
          otaq?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          baslangic_saat?: string
          bitme_saat?: string
          course_id?: string
          created_at?: string
          dars_novu?: string | null
          group_id?: string
          gun_nomresi?: number
          hefte_novu?: Database["public"]["Enums"]["schedule_week_type"]
          id?: string
          otaq?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedule_templates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schedule_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "course_schedule_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schedule_templates_teacher_fkey"
            columns: ["course_id", "teacher_id"]
            isOneToOne: false
            referencedRelation: "course_teachers"
            referencedColumns: ["course_id", "muellim_id"]
          },
        ]
      }
      course_student_status: {
        Row: {
          course_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_student_status_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_student_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_teachers: {
        Row: {
          course_id: string
          created_at: string
          icazeler: Json
          id: string
          muellim_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          icazeler?: Json
          id?: string
          muellim_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          icazeler?: Json
          id?: string
          muellim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_teachers_muellim_id_fkey"
            columns: ["muellim_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_topic_files: {
        Row: {
          category: string
          course_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          topic_id: string
        }
        Insert: {
          category?: string
          course_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          topic_id: string
        }
        Update: {
          category?: string
          course_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_topic_files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_topic_files_topic_course_fkey"
            columns: ["topic_id", "course_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id", "course_id"]
          },
          {
            foreignKeyName: "course_topic_files_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_topics: {
        Row: {
          aciqlama: string | null
          bas_saat: string | null
          bit_saat: string | null
          course_id: string
          created_at: string
          dars_novu: string
          fayl_kateqoriyasi: string | null
          fayl_url: string | null
          id: string
          movzu: string
          sira: number
          tarix: string
        }
        Insert: {
          aciqlama?: string | null
          bas_saat?: string | null
          bit_saat?: string | null
          course_id: string
          created_at?: string
          dars_novu: string
          fayl_kateqoriyasi?: string | null
          fayl_url?: string | null
          id?: string
          movzu: string
          sira: number
          tarix: string
        }
        Update: {
          aciqlama?: string | null
          bas_saat?: string | null
          bit_saat?: string | null
          course_id?: string
          created_at?: string
          dars_novu?: string
          fayl_kateqoriyasi?: string | null
          fayl_url?: string | null
          id?: string
          movzu?: string
          sira?: number
          tarix?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_work_assessments: {
        Row: {
          course_id: string
          created_at: string
          file_url: string | null
          grade: number | null
          id: string
          sira: number
          status: Database["public"]["Enums"]["assessment_submission_status"]
          student_id: string
          submitted_at: string | null
          topic: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          sira?: number
          status?: Database["public"]["Enums"]["assessment_submission_status"]
          student_id: string
          submitted_at?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          sira?: number
          status?: Database["public"]["Enums"]["assessment_submission_status"]
          student_id?: string
          submitted_at?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_work_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_work_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_work_assessments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          ad: string
          aktiv_dars_novleri: Json
          created_at: string
          group_id: string | null
          id: string
          kod: string | null
          kredit: number | null
          kurs: number | null
          kurs_isi_var: boolean
          muellim_id: string | null
          otaq: string | null
          otaqlar: Json
          qiymetlendirme_novu:
            | Database["public"]["Enums"]["course_grading_type"]
            | null
          saat: number | null
          sillabus_url: string | null
          tyutor_id: string | null
          umumi_ders_saati: number | null
          umumi_lab_sayi: number | null
        }
        Insert: {
          ad: string
          aktiv_dars_novleri?: Json
          created_at?: string
          group_id?: string | null
          id?: string
          kod?: string | null
          kredit?: number | null
          kurs?: number | null
          kurs_isi_var?: boolean
          muellim_id?: string | null
          otaq?: string | null
          otaqlar?: Json
          qiymetlendirme_novu?:
            | Database["public"]["Enums"]["course_grading_type"]
            | null
          saat?: number | null
          sillabus_url?: string | null
          tyutor_id?: string | null
          umumi_ders_saati?: number | null
          umumi_lab_sayi?: number | null
        }
        Update: {
          ad?: string
          aktiv_dars_novleri?: Json
          created_at?: string
          group_id?: string | null
          id?: string
          kod?: string | null
          kredit?: number | null
          kurs?: number | null
          kurs_isi_var?: boolean
          muellim_id?: string | null
          otaq?: string | null
          otaqlar?: Json
          qiymetlendirme_novu?:
            | Database["public"]["Enums"]["course_grading_type"]
            | null
          saat?: number | null
          sillabus_url?: string | null
          tyutor_id?: string | null
          umumi_ders_saati?: number | null
          umumi_lab_sayi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_muellim_id_fkey"
            columns: ["muellim_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "courses_tyutor_id_fkey"
            columns: ["tyutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_detailed_results: {
        Row: {
          academic_year: string | null
          answers_data: Json
          canonical_total_score: number | null
          correct_count: number
          course_id: string | null
          current_score: number
          event_type: string | null
          exam_completed_at: string
          exam_name: string
          exam_started_at: string | null
          exam_type: string
          group_id: string | null
          id: string
          official_exam_id: string | null
          official_payload_hash: string | null
          percentage: number
          result_updated_at: string | null
          semester: number | null
          semester_score_snapshot: number
          semester_snapshot_mismatch: boolean
          source_material_id: string | null
          source_result_id: string
          student_id: string | null
          student_username: string
          sync_source: string
          synced_at: string
          total_questions: number
          total_score: number
          unanswered_count: number
          wrong_count: number
        }
        Insert: {
          academic_year?: string | null
          answers_data?: Json
          canonical_total_score?: number | null
          correct_count?: number
          course_id?: string | null
          current_score?: number
          event_type?: string | null
          exam_completed_at?: string
          exam_name?: string
          exam_started_at?: string | null
          exam_type?: string
          group_id?: string | null
          id?: string
          official_exam_id?: string | null
          official_payload_hash?: string | null
          percentage?: number
          result_updated_at?: string | null
          semester?: number | null
          semester_score_snapshot?: number
          semester_snapshot_mismatch?: boolean
          source_material_id?: string | null
          source_result_id: string
          student_id?: string | null
          student_username: string
          sync_source?: string
          synced_at?: string
          total_questions?: number
          total_score?: number
          unanswered_count?: number
          wrong_count?: number
        }
        Update: {
          academic_year?: string | null
          answers_data?: Json
          canonical_total_score?: number | null
          correct_count?: number
          course_id?: string | null
          current_score?: number
          event_type?: string | null
          exam_completed_at?: string
          exam_name?: string
          exam_started_at?: string | null
          exam_type?: string
          group_id?: string | null
          id?: string
          official_exam_id?: string | null
          official_payload_hash?: string | null
          percentage?: number
          result_updated_at?: string | null
          semester?: number | null
          semester_score_snapshot?: number
          semester_snapshot_mismatch?: boolean
          source_material_id?: string | null
          source_result_id?: string
          student_id?: string | null
          student_username?: string
          sync_source?: string
          synced_at?: string
          total_questions?: number
          total_score?: number
          unanswered_count?: number
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_detailed_results_course_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_detailed_results_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "exam_detailed_results_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_detailed_results_material_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "exam_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_detailed_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_integration_audit: {
        Row: {
          attempt_number: number
          course_id: string | null
          created_at: string
          details: Json
          direction: string
          error_code: string | null
          event_type: string
          group_id: string | null
          id: string
          material_id: string | null
          official_exam_id: string | null
          source_result_id: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          attempt_number?: number
          course_id?: string | null
          created_at?: string
          details?: Json
          direction: string
          error_code?: string | null
          event_type: string
          group_id?: string | null
          id?: string
          material_id?: string | null
          official_exam_id?: string | null
          source_result_id?: string | null
          status: string
          student_id?: string | null
        }
        Update: {
          attempt_number?: number
          course_id?: string | null
          created_at?: string
          details?: Json
          direction?: string
          error_code?: string | null
          event_type?: string
          group_id?: string | null
          id?: string
          material_id?: string | null
          official_exam_id?: string | null
          source_result_id?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: []
      }
      exam_materials: {
        Row: {
          academic_year: string
          course_id: string
          exam_type: string
          file_path: string
          file_size: number
          group_id: string
          id: string
          mime_type: string
          original_file_name: string
          semester: number
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          academic_year: string
          course_id: string
          exam_type: string
          file_path: string
          file_size: number
          group_id: string
          id?: string
          mime_type: string
          original_file_name: string
          semester: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          exam_type?: string
          file_path?: string
          file_size?: number
          group_id?: string
          id?: string
          mime_type?: string
          original_file_name?: string
          semester?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_materials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "exam_materials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_schedule: {
        Row: {
          baslangic_saat: string
          course_id: string
          created_at: string
          group_id: string
          id: string
          imtahan_tarixi: string
          otaq: string
          updated_at: string
          yaradan_id: string
        }
        Insert: {
          baslangic_saat: string
          course_id: string
          created_at?: string
          group_id: string
          id?: string
          imtahan_tarixi: string
          otaq: string
          updated_at?: string
          yaradan_id?: string
        }
        Update: {
          baslangic_saat?: string
          course_id?: string
          created_at?: string
          group_id?: string
          id?: string
          imtahan_tarixi?: string
          otaq?: string
          updated_at?: string
          yaradan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "exam_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedule_yaradan_id_fkey"
            columns: ["yaradan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_scores: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          imtahan_bali: number | null
          semestr: number | null
          semestr_qiymeti: number | null
          tedris_ili: string | null
          user_id: string
          yekun_qiymet: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          imtahan_bali?: number | null
          semestr?: number | null
          semestr_qiymeti?: number | null
          tedris_ili?: string | null
          user_id: string
          yekun_qiymet?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          imtahan_bali?: number | null
          semestr?: number | null
          semestr_qiymeti?: number | null
          tedris_ili?: string | null
          user_id?: string
          yekun_qiymet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_sync_attempts: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          source_result_id: string | null
          student_username_normalized: string | null
          student_username_raw: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          source_result_id?: string | null
          student_username_normalized?: string | null
          student_username_raw?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          source_result_id?: string | null
          student_username_normalized?: string | null
          student_username_raw?: string | null
          success?: boolean
        }
        Relationships: []
      }
      faculties: {
        Row: {
          ad: string
          created_at: string
          id: string
          kod: string | null
          updated_at: string
        }
        Insert: {
          ad: string
          created_at?: string
          id?: string
          kod?: string | null
          updated_at?: string
        }
        Update: {
          ad?: string
          created_at?: string
          id?: string
          kod?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      groups: {
        Row: {
          ad: string
          arxivlenib: boolean
          created_at: string
          faculty_id: string | null
          id: string
          tyutor_id: string | null
        }
        Insert: {
          ad: string
          arxivlenib?: boolean
          created_at?: string
          faculty_id?: string | null
          id?: string
          tyutor_id?: string | null
        }
        Update: {
          ad?: string
          arxivlenib?: boolean
          created_at?: string
          faculty_id?: string | null
          id?: string
          tyutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_tyutor_id_fkey"
            columns: ["tyutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      independent_work_assessments: {
        Row: {
          course_id: string
          created_at: string
          file_url: string | null
          grade: number | null
          id: string
          sira: number
          status: Database["public"]["Enums"]["assessment_submission_status"]
          student_id: string
          submitted_at: string | null
          topic: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          sira: number
          status?: Database["public"]["Enums"]["assessment_submission_status"]
          student_id: string
          submitted_at?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          sira?: number
          status?: Database["public"]["Enums"]["assessment_submission_status"]
          student_id?: string
          submitted_at?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "independent_work_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "independent_work_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "independent_work_assessments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_student_records: {
        Row: {
          attendance_status:
            | Database["public"]["Enums"]["lesson_attendance_status"]
            | null
          course_id: string
          created_at: string
          file_url: string | null
          grade: number | null
          id: string
          lab_submitted: boolean | null
          lesson_session_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_status?:
            | Database["public"]["Enums"]["lesson_attendance_status"]
            | null
          course_id: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          lab_submitted?: boolean | null
          lesson_session_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_status?:
            | Database["public"]["Enums"]["lesson_attendance_status"]
            | null
          course_id?: string
          created_at?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          lab_submitted?: boolean | null
          lesson_session_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_student_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_student_records_session_course_fkey"
            columns: ["lesson_session_id", "course_id"]
            isOneToOne: false
            referencedRelation: "course_lesson_sessions"
            referencedColumns: ["id", "course_id"]
          },
          {
            foreignKeyName: "lesson_student_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      library_books: {
        Row: {
          ad: string
          elave_eden_id: string | null
          elave_olunma_tarixi: string
          fayl_url: string
          format: string
          id: string
          kateqoriya: string
          muellif: string
          tesvir: string | null
          uz_qabigi_url: string | null
        }
        Insert: {
          ad: string
          elave_eden_id?: string | null
          elave_olunma_tarixi?: string
          fayl_url: string
          format: string
          id?: string
          kateqoriya: string
          muellif: string
          tesvir?: string | null
          uz_qabigi_url?: string | null
        }
        Update: {
          ad?: string
          elave_eden_id?: string | null
          elave_olunma_tarixi?: string
          fayl_url?: string
          format?: string
          id?: string
          kateqoriya?: string
          muellif?: string
          tesvir?: string | null
          uz_qabigi_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_elave_eden_id_fkey"
            columns: ["elave_eden_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notes: {
        Row: {
          course_id: string | null
          created_at: string
          fayl_url: string | null
          id: string
          kesilmezlik: string | null
          movzu: string | null
          qeyd: string | null
          tarix: string
          user_id: string
          xeyr: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          fayl_url?: string | null
          id?: string
          kesilmezlik?: string | null
          movzu?: string | null
          qeyd?: string | null
          tarix?: string
          user_id: string
          xeyr?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          fayl_url?: string | null
          id?: string
          kesilmezlik?: string | null
          movzu?: string | null
          qeyd?: string | null
          tarix?: string
          user_id?: string
          xeyr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          e_poct_kanali: boolean
          elan: boolean
          mukafat: boolean
          profile_id: string
          push_kanali: boolean
          shexsi: boolean
          sistem: boolean
          sosial: boolean
          tedbir: boolean
          xeberdarliq: boolean
          xususi_gun: boolean
        }
        Insert: {
          e_poct_kanali?: boolean
          elan?: boolean
          mukafat?: boolean
          profile_id: string
          push_kanali?: boolean
          shexsi?: boolean
          sistem?: boolean
          sosial?: boolean
          tedbir?: boolean
          xeberdarliq?: boolean
          xususi_gun?: boolean
        }
        Update: {
          e_poct_kanali?: boolean
          elan?: boolean
          mukafat?: boolean
          profile_id?: string
          push_kanali?: boolean
          shexsi?: boolean
          sistem?: boolean
          sosial?: boolean
          tedbir?: boolean
          xeberdarliq?: boolean
          xususi_gun?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          baslıq: string
          elave_data: Json | null
          id: string
          metin: string | null
          oxunub_mu: boolean
          profile_id: string
          tarix: string
          tip: string
        }
        Insert: {
          baslıq: string
          elave_data?: Json | null
          id?: string
          metin?: string | null
          oxunub_mu?: boolean
          profile_id: string
          tarix?: string
          tip: string
        }
        Update: {
          baslıq?: string
          elave_data?: Json | null
          id?: string
          metin?: string | null
          oxunub_mu?: boolean
          profile_id?: string
          tarix?: string
          tip?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      office_files: {
        Row: {
          ad: string
          fayl_novu: string | null
          fayl_url: string
          id: string
          olcusu: number
          sahib_id: string | null
          tarix: string
        }
        Insert: {
          ad: string
          fayl_novu?: string | null
          fayl_url: string
          id?: string
          olcusu: number
          sahib_id?: string | null
          tarix?: string
        }
        Update: {
          ad?: string
          fayl_novu?: string | null
          fayl_url?: string
          id?: string
          olcusu?: number
          sahib_id?: string | null
          tarix?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_files_sahib_id_fkey"
            columns: ["sahib_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      official_exam_links: {
        Row: {
          academic_year: string
          course_id: string
          course_name_snapshot: string
          created_at: string
          exam_type: string
          group_id: string
          group_name_snapshot: string
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_synced_at: string | null
          matched_student_count: number
          material_id: string
          official_exam_id: string | null
          semester: number
          sync_status: string
          unmatched_student_count: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          course_id: string
          course_name_snapshot: string
          created_at?: string
          exam_type: string
          group_id: string
          group_name_snapshot: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          matched_student_count?: number
          material_id: string
          official_exam_id?: string | null
          semester: number
          sync_status?: string
          unmatched_student_count?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          course_name_snapshot?: string
          created_at?: string
          exam_type?: string
          group_id?: string
          group_name_snapshot?: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          matched_student_count?: number
          material_id?: string
          official_exam_id?: string | null
          semester?: number
          sync_status?: string
          unmatched_student_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_exam_links_course_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_exam_links_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_performance_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "official_exam_links_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_exam_links_material_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "exam_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      official_exam_sync_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          event_type: string
          id: string
          last_error_code: string | null
          last_error_message: string | null
          material_id: string
          next_retry_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_type: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          material_id: string
          next_retry_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          material_id?: string
          next_retry_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_exam_sync_outbox_material_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "exam_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ad: string | null
          ata_adi: string | null
          avatar_url: string | null
          bitirme_ili: number | null
          bolme: string | null
          cins: string | null
          created_at: string
          dim_bali: number | null
          dogum_tarixi: string | null
          e_poct: string | null
          esd_istifadeci: boolean
          fakulte: string | null
          fin_kodu: string | null
          id: string
          istifadeci_adi: string | null
          ixtisas: string | null
          mfa_aktiv: boolean
          qebul_ili: number | null
          qrup: string | null
          sheher: string | null
          sinif: string | null
          sosial_veziyyet: string | null
          soyad: string | null
          status: string
          tedris_ili: string | null
          tehsil_haqqi: number | null
          tehsil_haqqi_statusu: string | null
          tehsil_novu: string | null
          telefon: string | null
          unvan: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad?: string | null
          ata_adi?: string | null
          avatar_url?: string | null
          bitirme_ili?: number | null
          bolme?: string | null
          cins?: string | null
          created_at?: string
          dim_bali?: number | null
          dogum_tarixi?: string | null
          e_poct?: string | null
          esd_istifadeci?: boolean
          fakulte?: string | null
          fin_kodu?: string | null
          id?: string
          istifadeci_adi?: string | null
          ixtisas?: string | null
          mfa_aktiv?: boolean
          qebul_ili?: number | null
          qrup?: string | null
          sheher?: string | null
          sinif?: string | null
          sosial_veziyyet?: string | null
          soyad?: string | null
          status?: string
          tedris_ili?: string | null
          tehsil_haqqi?: number | null
          tehsil_haqqi_statusu?: string | null
          tehsil_novu?: string | null
          telefon?: string | null
          unvan?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad?: string | null
          ata_adi?: string | null
          avatar_url?: string | null
          bitirme_ili?: number | null
          bolme?: string | null
          cins?: string | null
          created_at?: string
          dim_bali?: number | null
          dogum_tarixi?: string | null
          e_poct?: string | null
          esd_istifadeci?: boolean
          fakulte?: string | null
          fin_kodu?: string | null
          id?: string
          istifadeci_adi?: string | null
          ixtisas?: string | null
          mfa_aktiv?: boolean
          qebul_ili?: number | null
          qrup?: string | null
          sheher?: string | null
          sinif?: string | null
          sosial_veziyyet?: string | null
          soyad?: string | null
          status?: string
          tedris_ili?: string | null
          tehsil_haqqi?: number | null
          tehsil_haqqi_statusu?: string | null
          tehsil_novu?: string | null
          telefon?: string | null
          unvan?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions_log: {
        Row: {
          brauzer: string | null
          cihaz: string
          created_at: string
          id: string
          ip: string | null
          olke: string | null
          seher: string | null
          session_id: string
          son_aktivlik: string
          user_id: string
        }
        Insert: {
          brauzer?: string | null
          cihaz: string
          created_at?: string
          id?: string
          ip?: string | null
          olke?: string | null
          seher?: string | null
          session_id: string
          son_aktivlik?: string
          user_id: string
        }
        Update: {
          brauzer?: string | null
          cihaz?: string
          created_at?: string
          id?: string
          ip?: string | null
          olke?: string | null
          seher?: string | null
          session_id?: string
          son_aktivlik?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          birinci_hefte_novu:
            | Database["public"]["Enums"]["academic_week_type"]
            | null
          cari_semestr: string | null
          cari_tedris_ili: string | null
          created_at: string
          elaqe_e_poct: string | null
          elaqe_epoctu: string
          hefte_rotasiya_baslama_tarixi: string | null
          id: string
          singleton: boolean
          tedris_hefte_sayi: number
          universitet_adi: string | null
          updated_at: string
        }
        Insert: {
          birinci_hefte_novu?:
            | Database["public"]["Enums"]["academic_week_type"]
            | null
          cari_semestr?: string | null
          cari_tedris_ili?: string | null
          created_at?: string
          elaqe_e_poct?: string | null
          elaqe_epoctu?: string
          hefte_rotasiya_baslama_tarixi?: string | null
          id?: string
          singleton?: boolean
          tedris_hefte_sayi?: number
          universitet_adi?: string | null
          updated_at?: string
        }
        Update: {
          birinci_hefte_novu?:
            | Database["public"]["Enums"]["academic_week_type"]
            | null
          cari_semestr?: string | null
          cari_tedris_ili?: string | null
          created_at?: string
          elaqe_e_poct?: string | null
          elaqe_epoctu?: string
          hefte_rotasiya_baslama_tarixi?: string | null
          id?: string
          singleton?: boolean
          tedris_hefte_sayi?: number
          universitet_adi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          fayl_url: string | null
          profile_id: string
          son_yenilenme: string
        }
        Insert: {
          fayl_url?: string | null
          profile_id: string
          son_yenilenme?: string
        }
        Update: {
          fayl_url?: string | null
          profile_id?: string
          son_yenilenme?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      chat_group_last_message: {
        Row: {
          chat_group_id: string | null
          created_at: string | null
          fayl_novu: string | null
          fayl_url: string | null
          gonderen_id: string | null
          message_id: string | null
          metin: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_group_id_fkey"
            columns: ["chat_group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_gonderen_id_fkey"
            columns: ["gonderen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      faculty_attendance_trend_view: {
        Row: {
          avg_attendance_pct: number | null
          ay: string | null
          fakulte: string | null
        }
        Relationships: []
      }
      faculty_stats: {
        Row: {
          avg_attendance: number | null
          avg_score: number | null
          fakulte: string | null
          total_students: number | null
        }
        Relationships: []
      }
      group_performance_view: {
        Row: {
          avg_attendance_pct: number | null
          avg_final_grade: number | null
          fakulte: string | null
          group_ad: string | null
          group_id: string | null
          student_count: number | null
          tyutor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_tyutor_id_fkey"
            columns: ["tyutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_stats: {
        Row: {
          avg_attendance: number | null
          avg_score: number | null
          fakulte: string | null
          qrup: string | null
          total_students: number | null
          tyutor_ad_soyad: string | null
          tyutor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_tyutor_id_fkey"
            columns: ["tyutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tutor_performance_view: {
        Row: {
          avg_attendance_pct: number | null
          avg_final_grade: number | null
          fakulte: string | null
          group_count: number | null
          group_names: string | null
          student_count: number | null
          tutor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_tyutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      absence_limit: { Args: { p_total_hours: number }; Returns: number }
      academic_week_type: {
        Args: { p_date: string }
        Returns: Database["public"]["Enums"]["academic_week_type"]
      }
      admin_dashboard_stats: {
        Args: { p_end: string; p_fakulte?: string; p_start: string }
        Returns: {
          fenler: number
          kitablar: number
          muellimler: number
          qruplar: number
          telebeler: number
          total_istifadeciler: number
        }[]
      }
      admin_distinct_faculties: {
        Args: never
        Returns: {
          fakulte: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_axtaris?: string
          p_fakulte?: string
          p_limit?: number
          p_offset?: number
          p_rollar?: Database["public"]["Enums"]["app_role"][]
          p_sort_istiqamet?: string
          p_sort_sutun?: string
          p_status?: string
        }
        Returns: {
          ad: string
          ata_adi: string
          avatar_url: string
          bitirme_ili: number
          cins: string
          dim_bali: number
          dogum_tarixi: string
          e_poct: string
          esd_istifadeci: boolean
          fakulte: string
          fin_kodu: string
          istifadeci_adi: string
          ixtisas: string
          qebul_ili: number
          qrup: string
          rollar: Database["public"]["Enums"]["app_role"][]
          sheher: string
          sosial_veziyyet: string
          soyad: string
          status: string
          tehsil_haqqi: number
          tehsil_haqqi_statusu: string
          tehsil_novu: string
          telefon: string
          umumi_say: number
          user_id: string
        }[]
      }
      admin_registration_trend: {
        Args: {
          p_end: string
          p_fakulte?: string
          p_granularity?: string
          p_start: string
        }
        Returns: {
          bucket: string
          say: number
        }[]
      }
      admin_role_distribution: {
        Args: { p_fakulte?: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          say: number
        }[]
      }
      admin_set_user_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _target_user_id: string
        }
        Returns: undefined
      }
      apply_official_exam_result: {
        Args: {
          p_answers: Json
          p_idempotency_key: string
          p_payload: Json
          p_payload_hash: string
        }
        Returns: Json
      }
      at_risk_students: {
        Args: { p_group_id: string }
        Returns: {
          ad: string
          course_ad: string
          course_id: string
          e_poct: string
          fakulte: string
          qayib_limiti: number
          qayib_sayi: number
          qrup: string
          soyad: string
          telefon: string
          user_id: string
        }[]
      }
      broadcast_notification: {
        Args: {
          p_baslıq: string
          p_hedef_qrup?: string
          p_hedef_rol?: Database["public"]["Enums"]["app_role"]
          p_metin: string
          p_tip: string
        }
        Returns: number
      }
      calculate_semester_score: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: number
      }
      can_grade_now: {
        Args: { p_lesson_id: string; p_teacher_id: string }
        Returns: boolean
      }
      chat_group_accessible: {
        Args: { _chat_group_id: string }
        Returns: boolean
      }
      claim_official_exam_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          event_type: string
          id: string
          material_id: string
        }[]
      }
      confirm_lesson_grading: {
        Args: { p_lesson_id: string; p_records: Json; p_topic: string }
        Returns: boolean
      }
      course_effective_total_hours: {
        Args: { p_course_id: string; p_student_id?: string }
        Returns: number
      }
      course_teacher_detach_impact: {
        Args: { p_course_id: string; p_teacher_id: string }
        Returns: Json
      }
      create_course_for_group: {
        Args: {
          p_ad: string
          p_group_id: string
          p_kod?: string
          p_kredit?: number
          p_kurs?: number
          p_muellim_icazeler?: Json
          p_muellim_id?: string
          p_saat?: number
        }
        Returns: string
      }
      current_semester_date_range: {
        Args: never
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      ejournal_can_assess_course_now: {
        Args: { p_course_id: string; p_required_lesson_type?: string }
        Returns: boolean
      }
      ejournal_is_course_group_tutor: {
        Args: { p_course_id: string; p_group_id: string }
        Returns: boolean
      }
      ejournal_is_course_teacher: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      ejournal_is_student_course_tutor: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: boolean
      }
      ejournal_server_now: { Args: never; Returns: string }
      generate_course_lesson_sessions: {
        Args: {
          p_course_id?: string
          p_end_date: string
          p_group_id?: string
          p_start_date: string
        }
        Returns: number
      }
      generate_current_semester_lesson_sessions: {
        Args: { p_course_id?: string; p_group_id?: string }
        Returns: number
      }
      get_atu_official_result_secret: { Args: never; Returns: string }
      get_email_by_username: {
        Args: { p_istifadeci_adi: string }
        Returns: string
      }
      get_user_id_by_username: {
        Args: { p_istifadeci_adi: string }
        Returns: string
      }
      get_week_parity: {
        Args: { p_date: string }
        Returns: Database["public"]["Enums"]["academic_week_type"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_member_for_file: {
        Args: { path: string; user_id: string }
        Returns: boolean
      }
      is_course_student: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_teacher: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_tutor: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_teacher: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_same_group_member: {
        Args: { target_user_id: string; viewer_user_id?: string }
        Returns: boolean
      }
      is_tutor_of_student: {
        Args: { _student_id: string; _tutor_id: string }
        Returns: boolean
      }
      link_unassigned_course_to_group: {
        Args: { p_course_id: string; p_group_id: string }
        Returns: string
      }
      list_linkable_courses_for_group: {
        Args: { p_group_id: string; p_limit?: number; p_query?: string }
        Returns: {
          ad: string
          id: string
          kod: string
        }[]
      }
      list_own_auth_sessions: {
        Args: never
        Returns: {
          brauzer: string
          cihaz: string
          id: string
          ip: string
          olke: string
          seher: string
          session_id: string
          son_aktivlik: string
        }[]
      }
      login_guard_begin: {
        Args: { p_attempt_id: string; p_identifier: string }
        Returns: Json
      }
      login_guard_failure: { Args: { p_attempt_id: string }; Returns: Json }
      login_guard_success: {
        Args: { p_attempt_id: string; p_identifier: string }
        Returns: Json
      }
      mark_announcement_read: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      normalize_group_name: { Args: { p_name: string }; Returns: string }
      official_semester_score_export: {
        Args: {
          p_academic_year: string
          p_course_id: string
          p_group_id: string
          p_semester: number
        }
        Returns: {
          semester_score: number
          student_username: string
          user_id: string
        }[]
      }
      reassign_and_remove_course_teacher: {
        Args: {
          p_course_id: string
          p_replacement_teacher_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rebuild_current_semester_lesson_sessions: {
        Args: { p_group_id?: string }
        Returns: number
      }
      remove_course_teacher: {
        Args: { p_course_id: string; p_teacher_id: string }
        Returns: Json
      }
      revoke_own_auth_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      save_lesson_grading_draft: {
        Args: { p_lesson_id: string; p_records: Json; p_topic: string }
        Returns: boolean
      }
      semester_score_breakdown: {
        Args: { p_course_id: string; p_student_id?: string }
        Returns: Json
      }
      set_course_primary_teacher: {
        Args: { p_course_id: string; p_teacher_id: string }
        Returns: string
      }
      set_profile_status: {
        Args: { _status: string; _user_id: string }
        Returns: {
          ad: string | null
          ata_adi: string | null
          avatar_url: string | null
          bitirme_ili: number | null
          bolme: string | null
          cins: string | null
          created_at: string
          dim_bali: number | null
          dogum_tarixi: string | null
          e_poct: string | null
          esd_istifadeci: boolean
          fakulte: string | null
          fin_kodu: string | null
          id: string
          istifadeci_adi: string | null
          ixtisas: string | null
          mfa_aktiv: boolean
          qebul_ili: number | null
          qrup: string | null
          sheher: string | null
          sinif: string | null
          sosial_veziyyet: string | null
          soyad: string | null
          status: string
          tedris_ili: string | null
          tehsil_haqqi: number | null
          tehsil_haqqi_statusu: string | null
          tehsil_novu: string | null
          telefon: string | null
          unvan: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      teacher_assessment_roster: {
        Args: { p_course_id: string; p_group_id: string }
        Returns: {
          ad: string
          istifadeci_adi: string
          soyad: string
          user_id: string
        }[]
      }
      unlock_lesson_session: {
        Args: { p_lesson_id: string; p_reason: string }
        Returns: boolean
      }
      verify_official_exam_worker_token: {
        Args: { p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      academic_week_type: "ust" | "alt"
      app_role: "admin" | "dekan" | "tyutor" | "telebe" | "muellim"
      assessment_submission_status:
        | "gozleyir"
        | "teqdim_edilib"
        | "qiymetlendirilib"
      course_grading_type: "meshgele" | "laboratoriya"
      lesson_attendance_status: "iştirak edib" | "qayıb"
      schedule_week_type: "her_hefte" | "ust" | "alt"
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
    Enums: {
      academic_week_type: ["ust", "alt"],
      app_role: ["admin", "dekan", "tyutor", "telebe", "muellim"],
      assessment_submission_status: [
        "gozleyir",
        "teqdim_edilib",
        "qiymetlendirilib",
      ],
      course_grading_type: ["meshgele", "laboratoriya"],
      lesson_attendance_status: ["iştirak edib", "qayıb"],
      schedule_week_type: ["her_hefte", "ust", "alt"],
    },
  },
} as const
