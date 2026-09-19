import { useNavigate } from "@tanstack/react-router";
import { CalendarOff, Clock, Trash2, Edit2, Users, BookOpen, ClipboardCheck, ExternalLink, MapPin, UserRound, PlayCircle } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import { usePageI18n } from "@/lib/i18n-extra";
import { useRoleDashboardI18n } from "@/lib/role-dashboard-i18n";

type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export type EventWithDetails = EventRow & {
  groups?: { ad: string } | null;
  courses?: { ad: string } | null;
  profiles?: { ad: string | null; soyad: string | null } | null;
  isExam?: boolean;
  examCompleted?: boolean;
  examScore?: number | null;
  examMaxScore?: number | null;
  isLessonSession?: boolean;
  lessonSessionId?: string;
  scheduleTemplateId?: string | null;
  teacherName?: string | null;
  room?: string | null;
};

interface DayDetailsProps {
  tarix: Date;
  events: EventWithDetails[];
  userId: string | null;
  roles: string[];
  onEditClick: (event: EventWithDetails) => void;
  onDeleteClick: (event: EventWithDetails) => void;
}

export function DayDetails({ tarix, events, roles, onEditClick, onDeleteClick }: DayDetailsProps) {
  const navigate = useNavigate();
  const { locale, t } = usePageI18n();
  const { t: roleT } = useRoleDashboardI18n();
  const intlLocale = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  const formatTime = (timeStr: string) => timeStr ? timeStr.split(":").slice(0, 2).join(":") : "";
  const formatSecilmisTarix = (d: Date) => d.toLocaleDateString(intlLocale, { day: "numeric", month: "long", year: "numeric" });
  const hasWriteAccess = roles.includes("admin") || roles.includes("tyutor");
  const isTeacher = roles.includes("muellim") && !roles.includes("admin") && !roles.includes("dekan") && !roles.includes("tyutor");
  const displayEvents = [...events].sort((a, b) => a.baslangic_saat.localeCompare(b.baslangic_saat));
  const goToExamResults = () => { void navigate({ to: "/imtahanlar" }); };
  const openTeacherLesson = (event: EventWithDetails) => {
    if (!isTeacher || !event.isLessonSession || !event.lessonSessionId || !event.group_id || !event.course_id) return;
    void navigate({
      to: "/muellim/$groupId/$courseId",
      params: { groupId: event.group_id, courseId: event.course_id },
      search: { session: event.lessonSessionId },
    });
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">{formatSecilmisTarix(tarix)}</h3>
          <p className="text-xs text-muted-foreground">{t("calendar.todayPlanned")}</p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {displayEvents.length === 0 ? (
            <EmptyState icon={CalendarOff} mesaj={t("calendar.noEventsToday")} />
          ) : (
            displayEvents.map((event) => {
              const examEvent = event.isExam === true;
              const lessonEvent = event.isLessonSession === true;
              const eventTitle = lessonEvent
                ? event.courses?.ad ?? roleT("common.lesson")
                : examEvent && event.courses?.ad
                  ? event.courses.ad
                  : event.baslıq;
              return (
                <div key={event.id} className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-border/40 bg-muted/40 p-4 transition-all hover:border-primary/30 hover:bg-muted/60 active:scale-[.995]">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-foreground">{eventTitle}</h4>
                        {lessonEvent ? <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">{roleT("common.lesson")}</p> : null}
                      </div>
                      {examEvent ? (
                        <ClipboardCheck className={`size-4 shrink-0 ${event.examCompleted ? "text-success" : "text-warning"}`} aria-label={t("calendar.exam")} />
                      ) : hasWriteAccess && !lessonEvent ? (
                        <div className="flex shrink-0 items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" onClick={() => onEditClick(event)} aria-label={t("common.edit")} className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><Edit2 className="size-4" aria-hidden="true" /></button>
                            </TooltipTrigger>
                            <TooltipContent>{t("common.edit")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" onClick={() => onDeleteClick(event)} aria-label={t("common.delete")} className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"><Trash2 className="size-4" aria-hidden="true" /></button>
                            </TooltipTrigger>
                            <TooltipContent>{t("common.delete")}</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : null}
                    </div>

                    {examEvent ? (
                      <div className="mt-2 rounded-xl border border-border/40 bg-background/70 p-3">
                        <div className="text-xs font-semibold text-muted-foreground">{t("calendar.examResult")}</div>
                        <div className="mt-1 text-base font-extrabold text-foreground">
                          {typeof event.examScore === "number" ? `${event.examScore}/${event.examMaxScore ?? 50}` : event.examCompleted ? t("calendar.resultAvailable") : t("calendar.resultPending")}
                        </div>
                      </div>
                    ) : !lessonEvent && event.tesvir ? (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{event.tesvir}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid min-w-0 gap-2 border-t border-border/30 pt-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-1.5"><Clock className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span>{formatTime(event.baslangic_saat)} - {formatTime(event.bitme_saat)}</span></div>
                    <div className="flex min-w-0 items-center gap-1.5"><Users className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{event.groups?.ad || t("calendar.university")}</span></div>
                    {event.courses ? <div className="flex min-w-0 items-center gap-1.5"><BookOpen className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{event.courses.ad}</span></div> : null}
                    {lessonEvent ? <div className="flex min-w-0 items-center gap-1.5"><UserRound className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{event.teacherName || "—"}</span></div> : null}
                    {lessonEvent ? <div className="flex min-w-0 items-center gap-1.5 sm:col-span-2"><MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{event.room ? `${roleT("common.room")}: ${event.room}` : "—"}</span></div> : null}

                    {lessonEvent && isTeacher && event.lessonSessionId ? (
                      <button type="button" onClick={() => openTeacherLesson(event)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:col-span-2">
                        <PlayCircle className="size-4" aria-hidden="true" /> {roleT("teacher.openWorkspace")}
                      </button>
                    ) : examEvent ? (
                      <button type="button" onClick={goToExamResults} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:col-span-2">
                        {t("calendar.viewExamResults")} <ExternalLink className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : !lessonEvent ? (
                      <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground/80 sm:col-span-2">
                        <span>{t("calendar.creator")}</span>
                        <span className="truncate font-semibold text-foreground/80">
                          {event.profiles?.ad || event.profiles?.soyad ? `${event.profiles.ad ?? ""} ${event.profiles.soyad ?? ""}`.trim() : t("calendar.system")}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
