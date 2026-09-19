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
    <div className="exam-upcoming-list animate-stagger">
      {exams.map((exam) => {
        const examDate = exam.imtahan_tarixi ? startOfDay(parseISO(exam.imtahan_tarixi)) : null;
        const daysLeft = examDate ? Math.max(0, differenceInCalendarDays(examDate, startOfDay(new Date()))) : null;
        const status = daysLeft == null ? { label: mt("status.ready"), badge: "bg-primary/10 text-primary", bar: "bg-primary" } : getStatus(daysLeft, t);
        const dayLabel = examDate ? format(examDate, "dd") : "—";
        const monthLabel = examDate ? format(examDate, "MMM", { locale: dateLocale }).replace(".", "") : "";
        return <article key={exam.id} className="exam-upcoming-row">
          <div className="exam-upcoming-row__date"><span>{monthLabel}</span><strong>{dayLabel}</strong></div>
          <div className="exam-upcoming-row__main">
            <div className="exam-upcoming-row__title"><span><BookOpen aria-hidden /></span><div><h3>{exam.courses?.ad || t.unknownCourse}</h3>{exam.materialOnly ? <small>{mt("status.unscheduled")}</small> : null}</div></div>
            <div className="exam-upcoming-row__meta"><span><Clock3 aria-hidden />{exam.baslangic_saat ? exam.baslangic_saat.slice(0,5) : mt("status.unscheduled")}</span><span><MapPin aria-hidden />{exam.otaq || mt("room.unscheduled")}</span>{exam.materials.length ? <Badge variant="outline"><FileText aria-hidden />{exam.materials.length}</Badge> : null}</div>
          </div>
          <div className="exam-upcoming-row__status"><span className={status.badge}>{status.label}</span><small>{daysLeft == null ? mt("date.unscheduled") : daysLeft === 0 ? t.today : `${daysLeft} ${daysLeft === 1 ? t.day : t.dayLeft}`}</small></div>
          <button type="button" onClick={() => setSelected(exam)} aria-label={t.details} className="exam-upcoming-row__open"><ArrowUpRight aria-hidden /></button>
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
