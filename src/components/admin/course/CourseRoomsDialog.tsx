import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useCourseManagementI18n } from "@/lib/course-management-i18n";
import { AKTIV_DARS_NOVU_ACARLARI, courseRoomMap, type AktivDarsNovuAcari } from "@/lib/courses";

type RoomRow = { lessonType: AktivDarsNovuAcari | ""; room: string };

export function CourseRoomsDialog({
  açıq,
  onOpenChange,
  courseId,
  otaqlar,
  legacyOtaq,
  aktivDarsNovleri,
}: {
  açıq: boolean;
  onOpenChange: (value: boolean) => void;
  courseId: string;
  otaqlar: Json | null | undefined;
  legacyOtaq?: string | null;
  aktivDarsNovleri: Record<string, boolean>;
}) {
  const queryClient = useQueryClient();
  const { t, lessonTypeLabel } = useCourseManagementI18n();
  const [rows, setRows] = useState<RoomRow[]>([{ lessonType: "", room: "" }]);

  const preferredTypes = useMemo(() => {
    const active = AKTIV_DARS_NOVU_ACARLARI.filter((type) => aktivDarsNovleri[type]);
    return active.length ? active : [...AKTIV_DARS_NOVU_ACARLARI];
  }, [aktivDarsNovleri]);

  useEffect(() => {
    if (!açıq) return;
    const current = courseRoomMap(otaqlar);
    const existing: RoomRow[] = AKTIV_DARS_NOVU_ACARLARI.flatMap((lessonType) => {
      const room = current[lessonType];
      return room ? [{ lessonType, room }] : [];
    });
    setRows(existing.length ? existing.slice(0, 2) : [{ lessonType: "", room: legacyOtaq?.trim() ?? "" }]);
  }, [açıq, legacyOtaq, otaqlar]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Record<AktivDarsNovuAcari, string>> = {};
      const used = new Set<AktivDarsNovuAcari>();
      for (const row of rows) {
        const room = row.room.trim();
        if (!row.lessonType && !room) continue;
        if (!row.lessonType) throw new Error(t("rooms.typeError"));
        if (!room) throw new Error(t("rooms.roomError", { type: lessonTypeLabel(row.lessonType) }));
        if (used.has(row.lessonType)) throw new Error(t("rooms.duplicateError"));
        used.add(row.lessonType);
        payload[row.lessonType] = room;
      }
      if (Object.keys(payload).length > 2) throw new Error(t("rooms.maxError"));

      const firstRoom = Object.values(payload)[0] ?? null;
      const { error } = await supabase.from("courses").update({ otaqlar: payload, otaq: firstRoom }).eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(t("rooms.success"));
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    },
    onError: (error: Error) => toast.error(error.message || t("rooms.error")),
  });

  const updateRow = (index: number, patch: Partial<RoomRow>) => setRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row));

  return (
    <Dialog open={açıq} onOpenChange={(value) => !saveMutation.isPending && onOpenChange(value)}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader><DialogTitle>{t("rooms.title")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{t("rooms.description")}</p>
          {rows.map((row, index) => {
            const selectedElsewhere = new Set(rows.filter((_, i) => i !== index).map((item) => item.lessonType).filter((value): value is AktivDarsNovuAcari => Boolean(value)));
            const options = [...new Set([...preferredTypes, ...(row.lessonType ? [row.lessonType] : [])])].filter((type) => !selectedElsewhere.has(type));
            return (
              <div key={index} className="grid gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("rooms.type")}</label>
                  <Select value={row.lessonType} onValueChange={(value) => updateRow(index, { lessonType: value as AktivDarsNovuAcari })}>
                    <SelectTrigger className="min-h-11 rounded-xl bg-background"><SelectValue placeholder={t("rooms.typePlaceholder")} /></SelectTrigger>
                    <SelectContent>{options.map((type) => <SelectItem key={type} value={type}>{lessonTypeLabel(type)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("rooms.room")}</label>
                  <Input value={row.room} onChange={(event) => updateRow(index, { room: event.target.value })} placeholder={t("rooms.roomPlaceholder")} className="min-h-11 rounded-xl bg-background" />
                </div>
                {rows.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" className="size-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t("rooms.removeRow")} onClick={() => setRows((current) => current.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
                ) : <span className="hidden size-11 sm:block" />}
              </div>
            );
          })}
          {rows.length < 2 ? <Button type="button" variant="outline" className="min-h-11 w-full gap-2 rounded-xl border-dashed" onClick={() => setRows((current) => [...current, { lessonType: "", room: "" }])}><Plus className="size-4" />{t("rooms.addSecond")}</Button> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={saveMutation.isPending} onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="button" className="min-h-11 rounded-xl" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
