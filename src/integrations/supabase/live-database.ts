import type { Database as GeneratedDatabase, Json } from "./types";

type PublicSchema = GeneratedDatabase["public"];
type SessionTable = PublicSchema["Tables"]["course_lesson_sessions"];

type ExamMaterialRow = {
  id: string;
  course_id: string;
  group_id: string;
  academic_year: string;
  semester: number;
  exam_type: string;
  file_path: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
};

type ExamMaterialTable = {
  Row: ExamMaterialRow;
  Insert: Omit<ExamMaterialRow, "id" | "uploaded_at" | "updated_at"> & {
    id?: string;
    uploaded_at?: string;
    updated_at?: string;
  };
  Update: Partial<ExamMaterialRow>;
  Relationships: [];
};

/**
 * Live-schema additions generated from Supabase and verified on 2026-08-31.
 *
 * The main generated file intentionally contains a few hand-tuned optional Insert
 * fields for BEFORE INSERT trigger workflows. This narrow extension keeps those
 * ergonomics while syncing fields/functions added by later migrations.
 */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Tables" | "Functions"> & {
    Tables: Omit<PublicSchema["Tables"], "course_lesson_sessions"> & {
      course_lesson_sessions: Omit<SessionTable, "Row" | "Insert" | "Update"> & {
        Row: SessionTable["Row"] & {
          draft_saved_at: string | null;
          auto_confirmed: boolean;
          auto_confirmed_at: string | null;
          auto_finalize_enabled: boolean;
        };
        Insert: SessionTable["Insert"] & {
          draft_saved_at?: string | null;
          auto_confirmed?: boolean;
          auto_confirmed_at?: string | null;
          auto_finalize_enabled?: boolean;
        };
        Update: SessionTable["Update"] & {
          draft_saved_at?: string | null;
          auto_confirmed?: boolean;
          auto_confirmed_at?: string | null;
          auto_finalize_enabled?: boolean;
        };
      };
      exam_materials: ExamMaterialTable;
    };
    Functions: PublicSchema["Functions"] & {
      confirm_lesson_grading: {
        Args: { p_lesson_id: string; p_records: Json; p_topic: string };
        Returns: boolean;
      };
      ejournal_can_assess_course_now: {
        Args: { p_course_id: string; p_required_lesson_type?: string };
        Returns: boolean;
      };
      ejournal_is_course_group_tutor: {
        Args: { p_course_id: string; p_group_id: string };
        Returns: boolean;
      };
      ejournal_is_course_teacher: {
        Args: { p_course_id: string };
        Returns: boolean;
      };
      ejournal_is_student_course_tutor: {
        Args: { p_course_id: string; p_student_id: string };
        Returns: boolean;
      };
      ejournal_server_now: {
        Args: never;
        Returns: string;
      };
      rebuild_current_semester_lesson_sessions: {
        Args: { p_group_id?: string };
        Returns: number;
      };
      save_lesson_grading_draft: {
        Args: { p_lesson_id: string; p_records: Json; p_topic: string };
        Returns: boolean;
      };
      teacher_assessment_roster: {
        Args: { p_course_id: string; p_group_id: string };
        Returns: {
          ad: string;
          istifadeci_adi: string;
          soyad: string;
          user_id: string;
        }[];
      };
    };
  };
};
