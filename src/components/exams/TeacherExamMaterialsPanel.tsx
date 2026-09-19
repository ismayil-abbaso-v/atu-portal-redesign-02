import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createExamMaterialSignedUrl,
  examMaterialKeys,
  fetchExamMaterials,
  formatExamMaterialSize,
  uploadExamMaterial,
  validateExamMaterialFile,
  type ExamMaterial,
  type ExamMaterialType,
} from "@/lib/exam-materials";
import { useExamMaterialI18n } from "@/lib/exam-material-i18n";
import {
  fetchOfficialExamLinks,
  officialExamLinkKeys,
  retryOfficialExamSync,
  type OfficialExamLinkStatus,
} from "@/lib/official-exam-client";
import type { OfficialSyncStatus } from "@/lib/official-exam-integration";
import { cn } from "@/lib/utils";

type Course = { id: string; ad: string };
type CourseGroup = { course_id: string; group_id: string; groups: { ad: string } | null };

type Props = {
  userId: string;
  courses: Course[];
  links: CourseGroup[];
  academicYear: string;
  semester: number | null;
};

export function TeacherExamMaterialsPanel({ userId, courses, links, academicYear, semester }: Props) {
  const queryClient = useQueryClient();
  const { intlLocale, t } = useExamMaterialI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [courseId, setCourseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [examType, setExamType] = useState<ExamMaterialType>("test");
  const [file, setFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (courses.length && !courses.some((course) => course.id === courseId)) setCourseId(courses[0]!.id);
    if (!courses.length) setCourseId("");
  }, [courseId, courses]);

  const selectedLinks = useMemo(() => links.filter((link) => link.course_id === courseId), [courseId, links]);
  useEffect(() => {
    if (selectedLinks.length && !selectedLinks.some((link) => link.group_id === groupId)) setGroupId(selectedLinks[0]!.group_id);
    if (!selectedLinks.length) setGroupId("");
  }, [groupId, selectedLinks]);

  const groupIds = useMemo(() => [...new Set(links.map((link) => link.group_id))], [links]);
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);
  const materialKey = examMaterialKeys.scope(userId, "muellim", academicYear, semester, groupIds, courseIds);
  const materialsQuery = useQuery({
    queryKey: materialKey,
    enabled: Boolean(academicYear && semester && groupIds.length && courseIds.length),
    queryFn: () => fetchExamMaterials({ academicYear, semester: semester!, groupIds, courseIds }),
  });
  const materials = materialsQuery.data ?? [];
  const materialIds = useMemo(() => materials.map((material) => material.id), [materials]);

  const officialLinksQuery = useQuery({
    queryKey: officialExamLinkKeys.materials(materialIds),
    enabled: materialIds.length > 0,
    queryFn: () => fetchOfficialExamLinks(materialIds),
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      const waitingForMapping = rows.length < materialIds.length;
      const inProgress = rows.some((row) => ["pending", "processing", "retry"].includes(row.sync_status));
      return waitingForMapping || inProgress ? 3000 : 20000;
    },
  });
  const officialLinks = officialLinksQuery.data ?? [];

  const selectedMaterial = materials.find(
    (material) => material.course_id === courseId && material.group_id === groupId && material.exam_type === examType,
  ) ?? null;
  const selectedOfficialLink = selectedMaterial
    ? officialLinks.find((link) => link.material_id === selectedMaterial.id) ?? null
    : null;
  const canReplace = !selectedMaterial || selectedMaterial.uploaded_by === userId;
  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const selectedGroup = selectedLinks.find((link) => link.group_id === groupId)?.groups?.ad ?? "—";

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !courseId || !groupId || !academicYear || !semester) throw new Error("EXAM_MATERIAL_FILE_REQUIRED");
      if (selectedMaterial && selectedMaterial.uploaded_by !== userId) throw new Error("EXAM_MATERIAL_OWNER_ONLY");
      return uploadExamMaterial({
        userId,
        courseId,
        groupId,
        academicYear,
        semester,
        examType,
        file,
        existing: selectedMaterial,
      });
    },
    onSuccess: async () => {
      toast.success(selectedMaterial ? t("file.replaceSuccess") : t("file.uploadSuccess"));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["exam-materials", userId] });
      await queryClient.invalidateQueries({ queryKey: ["official-exam-links"] });
      await queryClient.invalidateQueries({ queryKey: ["student-upcoming-exams"] });
    },
    onError: (error) => toast.error(materialErrorMessage(error, t)),
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMaterial) throw new Error("MATERIAL_NOT_FOUND");
      return retryOfficialExamSync(selectedMaterial.id);
    },
    onSuccess: async (result) => {
      toast.success(result.status === "retry" ? t("officialSyncRetryQueued") : t("officialSyncProcessing"));
      await queryClient.invalidateQueries({ queryKey: ["official-exam-links"] });
    },
    onError: (error) => toast.error(officialErrorMessage(error, selectedOfficialLink?.last_error_code ?? null, t)),
  });

  async function downloadMaterial(material: ExamMaterial) {
    setDownloadingId(material.id);
    try {
      const signedUrl = await createExamMaterialSignedUrl(material);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("file.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleFileChange(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    const validation = validateExamMaterialFile(next);
    if (validation) {
      toast.error(validation === "extension" ? t("file.extensionError") : validation === "mime" ? t("file.mimeError") : t("file.sizeError"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(next);
  }

  if (!courses.length || !semester) return null;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText className="size-5" /></span>
            <div><h2 className="font-display text-lg font-semibold text-foreground">{t("title")}</h2><p className="mt-0.5 max-w-3xl text-sm leading-6 text-muted-foreground">{t("teacher.description")}</p></div>
          </div>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 rounded-full px-3 py-1.5"><ShieldCheck className="size-3.5" />DOCX · 20 MB</Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("course")}</span><select value={courseId} onChange={(event) => { setCourseId(event.target.value); setFile(null); }} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">{courses.map((course) => <option key={course.id} value={course.id}>{course.ad}</option>)}</select></label>
        <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("group")}</span><select value={groupId} onChange={(event) => { setGroupId(event.target.value); setFile(null); }} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">{selectedLinks.map((link) => <option key={link.group_id} value={link.group_id}>{link.groups?.ad ?? "—"}</option>)}</select></label>
        <div className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("type")}</span><div className="grid grid-cols-2 gap-2">{(["test", "ticket"] as const).map((type) => <button key={type} type="button" onClick={() => { setExamType(type); setFile(null); }} className={cn("min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors", examType === type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")}>{t(type === "test" ? "type.test" : "type.ticket")}</button>)}</div></div>
      </div>

      {materialsQuery.isLoading ? <div className="mt-5 flex min-h-32 items-center justify-center rounded-2xl bg-muted/30"><Loader2 className="size-6 animate-spin text-primary" /></div> : materialsQuery.isError ? <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-4 text-sm text-destructive"><span>{t("file.uploadError")}</span><Button variant="outline" className="min-h-11 rounded-xl" onClick={() => void materialsQuery.refetch()}><RefreshCw className="size-4" />{t("common.retry")}</Button></div> : (
        <div className="mt-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-foreground">{selectedCourse?.ad ?? "—"}</h3><Badge variant={selectedMaterial ? "default" : "secondary"} className="rounded-full">{selectedMaterial ? t("status.ready") : t("status.missing")}</Badge><Badge variant="outline" className="rounded-full">{t(examType === "test" ? "type.test" : "type.ticket")} · {t("file.docx")}</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">{selectedGroup}</p>
              {selectedMaterial ? <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p className="min-w-0"><span className="font-bold text-foreground">{t("file.name")}:</span> <span className="break-all">{selectedMaterial.original_file_name}</span></p><p><span className="font-bold text-foreground">{t("file.size")}:</span> {formatExamMaterialSize(selectedMaterial.file_size)}</p><p><span className="font-bold text-foreground">{t("file.uploadedAt")}:</span> {new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedMaterial.uploaded_at))}</p><p><span className="font-bold text-foreground">{t("file.updatedAt")}:</span> {new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedMaterial.updated_at))}</p></div> : null}
              {selectedMaterial ? <OfficialSyncPanel link={selectedOfficialLink} onRetry={() => retryMutation.mutate()} retrying={retryMutation.isPending} t={t} /> : null}
              {selectedMaterial && !canReplace ? <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{t("file.ownerOnly")}</p> : null}
            </div>
            {selectedMaterial ? <Button variant="outline" className="min-h-11 shrink-0 rounded-xl" onClick={() => void downloadMaterial(selectedMaterial)} disabled={downloadingId === selectedMaterial.id}>{downloadingId === selectedMaterial.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{downloadingId === selectedMaterial.id ? t("file.preparing") : t("file.download")}</Button> : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <button
              type="button"
              disabled={!canReplace || uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex min-h-24 w-full flex-col justify-center rounded-2xl border border-dashed px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                canReplace ? "border-border hover:border-primary/40 hover:bg-primary/[0.02]" : "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-foreground"><Upload className="size-4 text-primary" />{file?.name ?? t("file.choose")}</span>
              <span className="mt-1 text-xs text-muted-foreground">{file ? formatExamMaterialSize(file.size) : t("file.chooseHint")}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!canReplace || uploadMutation.isPending}
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <Button className="min-h-11 rounded-xl sm:min-w-48" disabled={!file || !canReplace || uploadMutation.isPending} aria-label={t(selectedMaterial ? "aria.replace" : "aria.upload", { type: t(examType === "test" ? "type.test" : "type.ticket") })} onClick={() => uploadMutation.mutate()}>{uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : selectedMaterial ? <FileCheck2 className="size-4" /> : <Upload className="size-4" />}{uploadMutation.isPending ? t("file.uploading") : selectedMaterial ? t("file.replace") : t("file.upload")}</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function OfficialSyncPanel({
  link,
  onRetry,
  retrying,
  t,
}: {
  link: OfficialExamLinkStatus | null;
  onRetry: () => void;
  retrying: boolean;
  t: ReturnType<typeof useExamMaterialI18n>["t"];
}) {
  const status: OfficialSyncStatus = link?.sync_status ?? "pending";
  const failed = status === "failed_permanent";
  const partial = status === "partial";
  const success = status === "synced";
  const retryable = Boolean(link && ["failed_permanent", "retry", "partial"].includes(status));

  return (
    <div className={cn(
      "mt-4 rounded-2xl border p-3.5",
      failed ? "border-destructive/25 bg-destructive/[0.04]" : partial ? "border-amber-500/25 bg-amber-500/[0.05]" : success ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-border bg-muted/30",
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {success ? <CheckCircle2 className="size-4 text-emerald-600" /> : failed || partial ? <AlertTriangle className="size-4 text-amber-600" /> : <Loader2 className="size-4 animate-spin text-primary" />}
            <Badge variant={failed ? "destructive" : success ? "default" : "outline"} className="rounded-full">{officialStatusText(status, t)}</Badge>
          </div>
          {link?.official_exam_id ? <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{t("officialExamCreated")}:</span> <span className="break-all">{link.official_exam_id}</span></p> : null}
          {success ? <p className="mt-1 text-xs text-muted-foreground">{t("semesterScoresSynced")}</p> : null}
          {partial && link && link.unmatched_student_count > 0 ? <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{t("unmatchedStudents", { count: link.unmatched_student_count })}</p> : null}
          {failed && link?.last_error_code ? <p className="mt-1 text-xs text-destructive">{officialErrorCodeMessage(link.last_error_code, t)}</p> : null}
        </div>
        {retryable ? <Button type="button" variant="outline" className="min-h-11 shrink-0 rounded-xl" disabled={retrying} onClick={onRetry}>{retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{retrying ? t("officialSyncRetrying") : t("retryOfficialSync")}</Button> : null}
      </div>
    </div>
  );
}

function officialStatusText(status: OfficialSyncStatus, t: ReturnType<typeof useExamMaterialI18n>["t"]) {
  if (status === "processing") return t("officialSyncProcessing");
  if (status === "synced") return t("officialSyncSuccess");
  if (status === "partial") return t("officialSyncPartial");
  if (status === "retry") return t("officialSyncRetrying");
  if (status === "failed_permanent") return t("officialSyncFailed");
  return t("officialSyncPending");
}

function officialErrorCodeMessage(code: string, t: ReturnType<typeof useExamMaterialI18n>["t"]) {
  if (code === "GROUP_NOT_FOUND") return t("officialGroupNotFound");
  if (code === "EXAM_ALREADY_STARTED") return t("officialExamAlreadyStarted");
  if (code === "INVALID_DOCX") return t("officialInvalidDocx");
  if (code === "PERIOD_MISMATCH") return t("officialPeriodMismatch");
  return t("officialSyncFailed");
}

function officialErrorMessage(error: unknown, fallbackCode: string | null, t: ReturnType<typeof useExamMaterialI18n>["t"]) {
  const value = error as { code?: string; message?: string };
  return officialErrorCodeMessage(value?.code ?? fallbackCode ?? value?.message ?? "", t);
}

function materialErrorMessage(error: unknown, t: ReturnType<typeof useExamMaterialI18n>["t"]) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("FILE_EXTENSION")) return t("file.extensionError");
  if (message.includes("FILE_MIME")) return t("file.mimeError");
  if (message.includes("FILE_SIZE") || message.includes("DOCX_REQUIRED")) return t("file.sizeError");
  if (message.includes("FILE_REQUIRED")) return t("file.required");
  if (message.includes("OWNER_ONLY")) return t("file.ownerOnly");
  if (message.includes("duplicate key") || message.includes("exam_materials_one_active_per_type")) return t("file.conflict");
  return t("file.uploadError");
}
