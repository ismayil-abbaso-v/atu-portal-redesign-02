import { useState } from "react";
import { ArrowUpRight, BookOpen, Calendar, Clock3, Download, FileText, Loader2, MapPin } from "lucide-react";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { az, tr, enUS, ru } from "date-fns/locale";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpcomingExams, type UpcomingExam } from "@/hooks/use-upcoming-exams";
import { createExamMaterialSignedUrl, type ExamMaterial } from "@/lib/exam-materials";
import { useExamMaterialI18n } from "@/lib/exam-material-i18n";
import { useI18n } from "@/lib/i18n";

const locales = { az, tr, en: enUS, ru } as const;

const text = {
  az: { approaching: "Yaxınlaşır", scheduled: "Planlaşdırılıb", today: "Bu gün", dayLeft: "gün qalıb", day: "gün", unknownCourse: "Naməlum fənn", details: "İmtahan detallarına bax", title: "İmtahan detalları", date: "Tarix", time: "Saat", room: "Auditoriya", error: "Yaxın imtahanlar yüklənərkən xəta baş verdi. Bir az sonra yenidən cəhd edin.", empty: "Yaxın imtahan yoxdur.", emptyDescription: "İmtahan planı və ya müəllim tərəfindən əlavə edilən material burada görünəcək." },
  tr: { approaching: "Yaklaşıyor", scheduled: "Planlandı", today: "Bugün", dayLeft: "gün kaldı", day: "gün", unknownCourse: "Bilinmeyen ders", details: "Sınav detaylarına bak", title: "Sınav detayları", date: "Tarih", time: "Saat", room: "Derslik", error: "Yaklaşan sınavlar yüklenirken hata oluştu. Biraz sonra tekrar deneyin.", empty: "Yaklaşan sınav yok.", emptyDescription: "Sınav programı veya öğretmenin eklediği materyal burada görünecek." },
  en: { approaching: "Approaching", scheduled: "Scheduled", today: "Today", dayLeft: "days left", day: "day", unknownCourse: "Unknown course", details: "View exam details", title: "Exam details", date: "Date", time: "Time", room: "Room", error: "An error occurred while loading upcoming exams. Please try again later.", empty: "No upcoming exams.", emptyDescription: "An exam schedule or material added by the teacher will appear here." },
  ru: { approaching: "Приближается", scheduled: "Запланирован", today: "Сегодня", dayLeft: "дн. осталось", day: "дн.", unknownCourse: "Неизвестный предмет", details: "Подробнее об экзамене", title: "Детали экзамена", date: "Дата", time: "Время", room: "Аудитория", error: "Не удалось загрузить ближайшие экзамены. Попробуйте позже.", empty: "Ближайших экзаменов нет.", emptyDescription: "Расписание экзамена или материал преподавателя появится здесь." },
} as const;

function getStatus(daysLeft: number, t: (typeof text)[keyof typeof text]) {
  if (daysLeft <= 7) return { label: t.approaching, badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" };
  return { label: t.scheduled, badge: "bg-warning/10 text-warning", bar: "bg-warning" };
}

export function UpcomingExamsList({ userId }: { userId: string | null }) {
  const { exams, isLoading, isError } = useUpcomingExams(userId);
  const { locale } = useI18n();
  const { t: mt } = useExamMaterialI18n();
  const language = locale as keyof typeof text;
  const t = text[language] ?? text.az;
  const dateLocale = locales[language] ?? az;
  const [selected, setSelected] = useState<UpcomingExam | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function download(material: ExamMaterial) {
    setDownloadingId(material.id);
    try {
      const signedUrl = await createExamMaterialSignedUrl(material);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(mt("file.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading) return <div className="flex min-h-40 items-center justify-center rounded-3xl border border-border bg-card"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (isError) return <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><EmptyState icon={Calendar} mesaj={t.error} /></div>;
  if (exams.length === 0) return <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-sm"><Calendar className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-semibold text-foreground">{t.empty}</p><p className="mt-1 text-sm text-muted-foreground">{t.emptyDescription}</p></div>;

  return <>
    <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const examDate = exam.imtahan_tarixi ? startOfDay(parseISO(exam.imtahan_tarixi)) : null;
        const daysLeft = examDate ? Math.max(0, differenceInCalendarDays(examDate, startOfDay(new Date()))) : null;
        const status = daysLeft == null ? { label: mt("status.ready"), badge: "bg-primary/10 text-primary", bar: "bg-primary" } : getStatus(daysLeft, t);
        return <article key={exam.id} className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className={`absolute inset-x-0 top-0 h-1 ${status.bar}`} />
          <div className="flex items-start justify-between gap-2"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${status.badge}`}>{status.label}</span><span className="text-right text-xs font-semibold text-muted-foreground">{daysLeft == null ? mt("date.unscheduled") : daysLeft === 0 ? t.today : `${daysLeft} ${daysLeft === 1 ? t.day : t.dayLeft}`}</span></div>
          <div className="mt-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
          <h3 className="mt-3 break-words text-[15px] font-bold leading-snug text-foreground">{exam.courses?.ad || t.unknownCourse}</h3>
          {exam.materialOnly ? <p className="mt-1 text-xs font-semibold text-primary">{mt("status.unscheduled")}</p> : null}
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="size-3.5 shrink-0" />{examDate ? format(examDate, "d MMMM yyyy", { locale: dateLocale }) : mt("date.unscheduled")}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="size-3.5 shrink-0" />{exam.baslangic_saat ? exam.baslangic_saat.slice(0, 5) : mt("status.unscheduled")}</span>
            <span className="flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0" />{exam.otaq || mt("room.unscheduled")}</span>
          </div>

          <div className="mt-4 space-y-2">
            {exam.materials.length ? exam.materials.map((material) => <div key={material.id} className="rounded-xl border border-primary/15 bg-primary/[0.035] p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-foreground" title={material.original_file_name}>{material.original_file_name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{mt(material.exam_type === "ticket" ? "type.ticket" : "type.test")} · {mt("file.docx")}</p></div><Badge variant="outline" className="shrink-0 rounded-full text-[10px]">{mt("status.ready")}</Badge></div><Button type="button" variant="outline" className="mt-2 min-h-11 w-full rounded-xl text-xs font-bold" disabled={downloadingId === material.id} aria-label={mt("aria.download", { type: mt(material.exam_type === "ticket" ? "type.ticket" : "type.test") })} onClick={() => void download(material)}>{downloadingId === material.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{downloadingId === material.id ? mt("file.preparing") : mt("file.downloadExam")}</Button></div>) : <div className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">{mt("student.materialMissing")}</div>}
          </div>

          <button type="button" onClick={() => setSelected(exam)} className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-muted px-3.5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70">{t.details}<ArrowUpRight className="size-4 text-muted-foreground" /></button>
        </article>;
      })}
    </div>

    <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-md">
        <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">{selected?.courses?.ad || t.title}</DialogTitle></DialogHeader>
        {selected ? <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><Calendar className="size-4" /> {t.date}</span><span className="text-right font-semibold text-foreground">{selected.imtahan_tarixi ? format(startOfDay(parseISO(selected.imtahan_tarixi)), "d MMMM yyyy", { locale: dateLocale }) : mt("date.unscheduled")}</span></div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4" /> {t.time}</span><span className="text-right font-semibold text-foreground">{selected.baslangic_saat?.slice(0, 5) ?? mt("status.unscheduled")}</span></div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {t.room}</span><span className="text-right font-semibold text-foreground">{selected.otaq ?? mt("room.unscheduled")}</span></div>
          <div className="pt-2"><h4 className="mb-2 font-bold text-foreground">{mt("student.materials")}</h4>{selected.materials.length ? <div className="space-y-2">{selected.materials.map((material) => <Button key={material.id} type="button" variant="outline" className="min-h-11 w-full justify-start rounded-xl" disabled={downloadingId === material.id} onClick={() => void download(material)}>{downloadingId === material.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}<span className="min-w-0 flex-1 truncate text-left">{mt(material.exam_type === "ticket" ? "type.ticket" : "type.test")} · {material.original_file_name}</span></Button>)}</div> : <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">{mt("student.materialMissing")}</p>}</div>
        </div> : null}
      </DialogContent>
    </Dialog>
  </>;
}
