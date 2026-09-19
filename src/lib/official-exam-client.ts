import { supabase } from "@/integrations/supabase/client";
import type { OfficialSyncStatus } from "@/lib/official-exam-integration";

export interface OfficialExamLinkStatus {
  material_id: string;
  official_exam_id: string | null;
  sync_status: OfficialSyncStatus;
  last_error_code: string | null;
  last_error_message: string | null;
  last_synced_at: string | null;
  matched_student_count: number;
  unmatched_student_count: number;
}

export const officialExamLinkKeys = {
  materials: (materialIds: string[]) => ["official-exam-links", [...materialIds].sort()] as const,
};

export async function fetchOfficialExamLinks(materialIds: string[]): Promise<OfficialExamLinkStatus[]> {
  if (materialIds.length === 0) return [];

  // official_exam_links is a Prompt 1/2 live-schema table. Keep this narrow cast
  // local until the next full Supabase type regeneration; RLS still applies.
  const client = supabase as any;
  const { data, error } = await client
    .from("official_exam_links")
    .select(
      "material_id,official_exam_id,sync_status,last_error_code,last_error_message,last_synced_at,matched_student_count,unmatched_student_count",
    )
    .in("material_id", materialIds);

  if (error) throw error;
  return (data ?? []) as OfficialExamLinkStatus[];
}

export interface ManualOfficialSyncResult {
  success: boolean;
  status?: OfficialSyncStatus | "synced" | "partial";
  error_code?: string;
  official_exam_id?: string;
  source_material_id?: string;
  matched_students?: number;
  unmatched_students?: string[];
}

export async function retryOfficialExamSync(materialId: string): Promise<ManualOfficialSyncResult> {
  const { data, error } = await supabase.functions.invoke("sync-exam-material-to-official", {
    body: { material_id: materialId },
  });

  if (error) throw error;
  const result = (data ?? {}) as ManualOfficialSyncResult;
  if (result.success === false && result.status !== "retry") {
    const syncError = new Error(result.error_code || "OFFICIAL_SYNC_FAILED");
    Object.assign(syncError, { code: result.error_code });
    throw syncError;
  }
  return result;
}
