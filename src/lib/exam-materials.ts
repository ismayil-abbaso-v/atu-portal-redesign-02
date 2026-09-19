import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/live-database";

export const EXAM_MATERIAL_BUCKET = "exam-materials";
export const EXAM_MATERIAL_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const EXAM_MATERIAL_MAX_BYTES = 20 * 1024 * 1024;
export const EXAM_MATERIAL_SIGNED_URL_SECONDS = 120;

export type ExamMaterialType = "test" | "ticket";
export type ExamMaterial = Omit<Database["public"]["Tables"]["exam_materials"]["Row"], "exam_type"> & {
  exam_type: ExamMaterialType;
};

export type ExamMaterialScope = {
  academicYear: string;
  semester: number;
  groupIds: readonly string[];
  courseIds: readonly string[];
};

export type ExamMaterialUploadInput = {
  userId: string;
  courseId: string;
  groupId: string;
  academicYear: string;
  semester: number;
  examType: ExamMaterialType;
  file: File;
  existing?: ExamMaterial | null;
};

export type ScheduledExamForMerge = {
  id: string;
  group_id: string;
  course_id: string;
  imtahan_tarixi: string;
  baslangic_saat: string;
  otaq: string;
  courses?: { ad: string } | null;
};

export type StudentUpcomingExam = {
  id: string;
  group_id: string;
  course_id: string;
  imtahan_tarixi: string | null;
  baslangic_saat: string | null;
  otaq: string | null;
  courses?: { ad: string } | null;
  materials: ExamMaterial[];
  materialOnly: boolean;
};

export const examMaterialKeys = {
  root: (userId: string, role: string) => ["exam-materials", userId, role] as const,
  scope: (
    userId: string,
    role: string,
    academicYear: string,
    semester: number | null,
    groupIds: readonly string[],
    courseIds: readonly string[],
  ) => [
    "exam-materials",
    userId,
    role,
    academicYear,
    semester ?? "none",
    [...groupIds].sort().join(","),
    [...courseIds].sort().join(","),
  ] as const,
};

export function validateExamMaterialFile(file: File): "extension" | "mime" | "size" | null {
  if (!file.name.toLocaleLowerCase("en-US").endsWith(".docx")) return "extension";
  if (file.type !== EXAM_MATERIAL_DOCX_MIME) return "mime";
  if (file.size <= 0 || file.size > EXAM_MATERIAL_MAX_BYTES) return "size";
  return null;
}

export function buildExamMaterialPath(input: {
  academicYear: string;
  semester: number;
  groupId: string;
  courseId: string;
  examType: ExamMaterialType;
  userId: string;
}) {
  const id = crypto.randomUUID();
  return `${input.academicYear}/${input.semester}/${input.groupId}/${input.courseId}/${input.examType}/${input.userId}/${id}.docx`;
}

export function formatExamMaterialSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fetchExamMaterials(scope: ExamMaterialScope): Promise<ExamMaterial[]> {
  if (!scope.academicYear || !scope.semester || !scope.groupIds.length || !scope.courseIds.length) return [];
  const { data, error } = await supabase
    .from("exam_materials")
    .select("id, course_id, group_id, academic_year, semester, exam_type, file_path, original_file_name, mime_type, file_size, uploaded_by, uploaded_at, updated_at")
    .eq("academic_year", scope.academicYear)
    .eq("semester", scope.semester)
    .in("group_id", [...scope.groupIds])
    .in("course_id", [...scope.courseIds])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExamMaterial[];
}

async function resolveExistingMaterial(input: ExamMaterialUploadInput): Promise<ExamMaterial | null> {
  if (input.existing) return input.existing;

  const { data, error } = await supabase
    .from("exam_materials")
    .select("id, course_id, group_id, academic_year, semester, exam_type, file_path, original_file_name, mime_type, file_size, uploaded_by, uploaded_at, updated_at")
    .eq("course_id", input.courseId)
    .eq("group_id", input.groupId)
    .eq("academic_year", input.academicYear)
    .eq("semester", input.semester)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ExamMaterial | null) ?? null;
}

export async function uploadExamMaterial(input: ExamMaterialUploadInput): Promise<ExamMaterial> {
  const validation = validateExamMaterialFile(input.file);
  if (validation) throw new Error(`EXAM_MATERIAL_FILE_${validation.toUpperCase()}`);

  // One course/group/period maps to one official exam. If the teacher switches
  // Test <-> Ticket before the official exam starts, reuse the same material ID
  // so the server-side idempotency key and official mapping remain stable.
  const existing = await resolveExistingMaterial(input);
  if (existing && existing.uploaded_by !== input.userId) throw new Error("EXAM_MATERIAL_OWNER_ONLY");

  // Every replacement gets a fresh immutable object path. Reusing the old path
  // can make the official portal download a stale DOCX from Storage/CDN cache
  // immediately after an upsert (especially with cacheControl enabled).
  const path = buildExamMaterialPath({
    academicYear: input.academicYear,
    semester: input.semester,
    groupId: input.groupId,
    courseId: input.courseId,
    examType: input.examType,
    userId: input.userId,
  });

  const { error: uploadError } = await supabase.storage
    .from(EXAM_MATERIAL_BUCKET)
    .upload(path, input.file, {
      contentType: EXAM_MATERIAL_DOCX_MIME,
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  if (existing) {
    const { data, error } = await supabase
      .from("exam_materials")
      .update({
        exam_type: input.examType,
        file_path: path,
        original_file_name: input.file.name,
        mime_type: EXAM_MATERIAL_DOCX_MIME,
        file_size: input.file.size,
      })
      .eq("id", existing.id)
      .eq("uploaded_by", input.userId)
      .select("id, course_id, group_id, academic_year, semester, exam_type, file_path, original_file_name, mime_type, file_size, uploaded_by, uploaded_at, updated_at")
      .single();
    if (error) {
      await supabase.storage.from(EXAM_MATERIAL_BUCKET).remove([path]).catch(() => undefined);
      throw error;
    }
    if (existing.file_path !== path) {
      await supabase.storage.from(EXAM_MATERIAL_BUCKET).remove([existing.file_path]).catch(() => undefined);
    }
    return data as ExamMaterial;
  }

  const { data, error } = await supabase
    .from("exam_materials")
    .insert({
      course_id: input.courseId,
      group_id: input.groupId,
      academic_year: input.academicYear,
      semester: input.semester,
      exam_type: input.examType,
      file_path: path,
      original_file_name: input.file.name,
      mime_type: EXAM_MATERIAL_DOCX_MIME,
      file_size: input.file.size,
      uploaded_by: input.userId,
    })
    .select("id, course_id, group_id, academic_year, semester, exam_type, file_path, original_file_name, mime_type, file_size, uploaded_by, uploaded_at, updated_at")
    .single();

  if (error) {
    await supabase.storage.from(EXAM_MATERIAL_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  return data as ExamMaterial;
}

export async function createExamMaterialSignedUrl(material: Pick<ExamMaterial, "file_path">) {
  const { data, error } = await supabase.storage
    .from(EXAM_MATERIAL_BUCKET)
    .createSignedUrl(material.file_path, EXAM_MATERIAL_SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export function mergeUpcomingExamsWithMaterials(
  scheduled: readonly ScheduledExamForMerge[],
  materials: readonly ExamMaterial[],
  courseNames: ReadonlyMap<string, string>,
): StudentUpcomingExam[] {
  const materialMap = new Map<string, ExamMaterial[]>();
  for (const material of materials) {
    const key = `${material.group_id}:${material.course_id}`;
    const list = materialMap.get(key) ?? [];
    list.push(material);
    materialMap.set(key, list);
  }

  const scheduledKeys = new Set<string>();
  const merged: StudentUpcomingExam[] = scheduled.map((exam) => {
    const key = `${exam.group_id}:${exam.course_id}`;
    scheduledKeys.add(key);
    return {
      ...exam,
      materials: (materialMap.get(key) ?? []).sort((a, b) => a.exam_type.localeCompare(b.exam_type)),
      materialOnly: false,
    };
  });

  for (const [key, pairMaterials] of materialMap) {
    if (scheduledKeys.has(key) || !pairMaterials.length) continue;
    const material = pairMaterials[0]!;
    merged.push({
      id: `material-${key}`,
      group_id: material.group_id,
      course_id: material.course_id,
      imtahan_tarixi: null,
      baslangic_saat: null,
      otaq: null,
      courses: { ad: courseNames.get(material.course_id) ?? "" },
      materials: [...pairMaterials].sort((a, b) => a.exam_type.localeCompare(b.exam_type)),
      materialOnly: true,
    });
  }

  return merged.sort((a, b) => {
    if (a.imtahan_tarixi && b.imtahan_tarixi) return `${a.imtahan_tarixi} ${a.baslangic_saat ?? ""}`.localeCompare(`${b.imtahan_tarixi} ${b.baslangic_saat ?? ""}`);
    if (a.imtahan_tarixi) return -1;
    if (b.imtahan_tarixi) return 1;
    return (a.courses?.ad ?? "").localeCompare(b.courses?.ad ?? "");
  });
}

// Final production verification marker: keeps Git/Vercel deployment SHA aligned with the audited exam-material runtime.