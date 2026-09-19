import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";
import { useCalendarManagementI18n } from "@/lib/calendar-management-i18n";
import type { EventWithDetails } from "./DayDetails";

type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit: EventWithDetails | null;
  groups: { id: string; ad: string }[];
  courses: { id: string; ad: string }[];
  onSubmit: (data: {
    baslıq: string;
    tesvir: string | null;
    tarix: string;
    baslangic_saat: string;
    bitme_saat: string;
    group_id: string | null;
    course_id: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  roles: string[];
}

export function EventFormModal({
  isOpen,
  onClose,
  eventToEdit,
  groups,
  courses,
  onSubmit,
  onDelete,
  roles,
}: EventFormModalProps) {
  const { intlLocale, t } = useCalendarManagementI18n();
  const [baslıq, setBaslıq] = useState("");
  const [tesvir, setTesvir] = useState("");
  const [tarix, setTarix] = useState<Date | undefined>(new Date());
  const [baslangicSaat, setBaslangicSaat] = useState("09:00");
  const [bitmeSaat, setBitmeSaat] = useState("10:00");
  const [groupId, setGroupId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [gonderilir, setGonderilir] = useState(false);

  const isEdit = !!eventToEdit;

  useEffect(() => {
    if (eventToEdit) {
      setBaslıq(eventToEdit.baslıq || "");
      setTesvir(eventToEdit.tesvir || "");
      setTarix(eventToEdit.tarix ? new Date(`${eventToEdit.tarix}T00:00:00`) : new Date());
      setBaslangicSaat(eventToEdit.baslangic_saat ? eventToEdit.baslangic_saat.substring(0, 5) : "09:00");
      setBitmeSaat(eventToEdit.bitme_saat ? eventToEdit.bitme_saat.substring(0, 5) : "10:00");
      setGroupId(eventToEdit.group_id || "");
      setCourseId(eventToEdit.course_id || "");
    } else {
      setBaslıq("");
      setTesvir("");
      setTarix(new Date());
      setBaslangicSaat("09:00");
      setBitmeSaat("10:00");
      setGroupId("");
      setCourseId("");
    }
  }, [eventToEdit, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!baslıq.trim() || !tarix) return;

    setGonderilir(true);
    try {
      await onSubmit({
        baslıq: baslıq.trim(),
        tesvir: tesvir.trim() || null,
        tarix: format(tarix, "yyyy-MM-dd"),
        baslangic_saat: `${baslangicSaat}:00`,
        bitme_saat: `${bitmeSaat}:00`,
        group_id: groupId || null,
        course_id: courseId || null,
      });
      onClose();
    } catch {
      // Parent mutation owns the localized toast.
    } finally {
      setGonderilir(false);
    }
  }

  async function handleConfirmDelete() {
    if (!eventToEdit?.id) return;
    setGonderilir(true);
    try {
      await onDelete(eventToEdit.id);
      setShowDeleteAlert(false);
      onClose();
    } catch {
      // Parent mutation owns the localized toast.
    } finally {
      setGonderilir(false);
    }
  }

  const isTeacher = roles.includes("muellim") && !roles.includes("admin") && !roles.includes("dekan");
  const displayDate = tarix
    ? new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "long", day: "numeric" }).format(tarix)
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t(isEdit ? "event.editTitle" : "event.createTitle")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="modal-basliq" className="text-xs font-bold uppercase text-muted-foreground">
                {t("event.title")}
              </label>
              <input
                id="modal-basliq"
                value={baslıq}
                onChange={(e) => setBaslıq(e.target.value)}
                placeholder={t("event.titlePlaceholder")}
                className="h-11 w-full rounded-xl border-none bg-muted px-3 text-sm text-foreground ring-primary/30 focus:outline-none focus:ring-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">{t("event.date")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-start rounded-xl border-none bg-muted px-3 text-left text-sm font-normal text-foreground hover:bg-muted/80"
                    aria-label={t("event.datePlaceholder")}
                  >
                    <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                    {displayDate ?? <span>{t("event.datePlaceholder")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl border-border bg-card p-0" align="start">
                  <Calendar mode="single" selected={tarix} onSelect={setTarix} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="modal-start-time" className="text-xs font-bold uppercase text-muted-foreground">{t("event.start")}</label>
                <input id="modal-start-time" type="time" value={baslangicSaat} onChange={(e) => setBaslangicSaat(e.target.value)} className="h-11 w-full rounded-xl border-none bg-muted px-3 text-sm text-foreground ring-primary/30 focus:outline-none focus:ring-2" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="modal-end-time" className="text-xs font-bold uppercase text-muted-foreground">{t("event.end")}</label>
                <input id="modal-end-time" type="time" value={bitmeSaat} onChange={(e) => setBitmeSaat(e.target.value)} className="h-11 w-full rounded-xl border-none bg-muted px-3 text-sm text-foreground ring-primary/30 focus:outline-none focus:ring-2" required />
              </div>
            </div>

            {!isTeacher ? (
              <div className="space-y-1">
                <label htmlFor="modal-group" className="text-xs font-bold uppercase text-muted-foreground">{t("event.group")}</label>
                <select id="modal-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="h-11 w-full rounded-xl border-none bg-muted px-3 text-sm text-foreground focus:outline-none">
                  <option value="">{t("event.university")}</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.ad}</option>)}
                </select>
              </div>
            ) : null}

            {isTeacher || roles.includes("admin") || roles.includes("dekan") ? (
              <div className="space-y-1">
                <label htmlFor="modal-course" className="text-xs font-bold uppercase text-muted-foreground">{t("event.course")}</label>
                <select id="modal-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-11 w-full rounded-xl border-none bg-muted px-3 text-sm text-foreground focus:outline-none">
                  <option value="">{t("event.notSelected")}</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
                </select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label htmlFor="modal-desc" className="text-xs font-bold uppercase text-muted-foreground">{t("event.description")}</label>
              <textarea id="modal-desc" placeholder={t("event.descriptionPlaceholder")} value={tesvir} onChange={(e) => setTesvir(e.target.value)} className="h-24 w-full resize-none rounded-xl border-none bg-muted p-3 text-sm text-foreground ring-primary/30 focus:outline-none focus:ring-2" />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2 sm:justify-between">
              {isEdit ? (
                <Button type="button" variant="destructive" onClick={() => setShowDeleteAlert(true)} disabled={gonderilir} className="h-11 rounded-xl font-bold">
                  {t("event.delete")}
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={gonderilir} className="h-11 rounded-xl font-bold">{t("event.cancel")}</Button>
                <Button type="submit" disabled={gonderilir} className="h-11 rounded-xl bg-primary font-bold text-primary-foreground transition-opacity hover:opacity-90">
                  {gonderilir ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  {t(isEdit ? "event.update" : "event.create")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-3xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-foreground">{t("event.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">{t("event.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteAlert(false)} disabled={gonderilir} className="min-h-11 rounded-xl font-bold">{t("event.dismiss")}</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={gonderilir} className="min-h-11 rounded-xl font-bold">
              {gonderilir ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              {t("event.confirmDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
