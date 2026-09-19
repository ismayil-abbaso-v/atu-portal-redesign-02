import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseStudentSearchCombobox } from "@/components/admin/course/CourseStudentSearchCombobox";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { muellimAdıFormatla, type CourseStudentStatus } from "@/lib/courses";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import { cn } from "@/lib/utils";

type StatusProfil = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  istifadeci_adi: string | null;
  avatar_url: string | null;
};

export function CourseStudentStatusSection({
  courseId,
  status,
  başlıq,
  reng,
}: {
  courseId: string;
  status: "elave" | "kesilib";
  başlıq: string;
  reng: "mavi" | "qırmızı";
}) {
  const queryClient = useQueryClient();
  const [dialogAçıq, setDialogAçıq] = useState(false);
  const queryKey = ["course-student-status", courseId, status];
  const allQueryKey = ["course-student-status-all", courseId];

  const { data: butunStatuslar = [] } = useQuery({
    queryKey: allQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_student_status")
        .select("id, user_id, status")
        .eq("course_id", courseId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: setirler = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_student_status")
        .select("*")
        .eq("course_id", courseId)
        .eq("status", status)
        .order("created_at");
      if (error) throw error;

      const rows = (data ?? []) as CourseStudentStatus[];
      if (!rows.length) return [];

      const idler = rows.map((r) => r.user_id);
      const { data: profiller, error: profilXetasi } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, istifadeci_adi, avatar_url")
        .in("user_id", idler);
      if (profilXetasi) throw profilXetasi;

      return rows
        .map((r) => ({
          ...r,
          profil: (profiller?.find((p) => p.user_id === r.user_id) as StatusProfil | undefined) ?? null,
        }))
        .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profil, b.profil));
    },
  });

  const yenile = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: allQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["course-student-status", courseId, "elave"] }),
      queryClient.invalidateQueries({ queryKey: ["course-student-status", courseId, "kesilib"] }),
    ]);
  };

  const elaveEt = useMutation({
    mutationFn: async (userId: string) => {
      if (butunStatuslar.some((s) => s.user_id === userId)) {
        throw new Error("Bu tələbə artıq bu fənn üzrə Alt Qrup və ya Kəsilən siyahılarından birindədir.");
      }
      const { error } = await supabase
        .from("course_student_status")
        .insert({ course_id: courseId, user_id: userId, status });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(status === "elave" ? "Tələbə Alt Qrupa əlavə edildi." : "Tələbə Kəsilən siyahısına əlavə edildi.");
      setDialogAçıq(false);
      await yenile();
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Tələbə əlavə edilə bilmədi."),
  });

  const çıxar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_student_status").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Tələbə siyahıdan çıxarıldı.");
      await yenile();
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Tələbə çıxarıla bilmədi."),
  });

  const mavidir = reng === "mavi";
  const istisnaIdler = butunStatuslar.map((s) => s.user_id);

  return (
    <>
      <section
        className={cn(
          "rounded-3xl border bg-card p-4 shadow-sm sm:p-5",
          mavidir ? "border-sky-500/20" : "border-destructive/20",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                mavidir ? "bg-sky-500/10 text-sky-600" : "bg-destructive/10 text-destructive",
              )}
            >
              <UserRound className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight">{başlıq}</h3>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", mavidir ? "bg-sky-500/10 text-sky-700" : "bg-destructive/10 text-destructive")}>
                  {setirler.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mavidir ? "Alt qrupa əlavə olunan tələbələr." : "Fənni keçməyən tələbələr."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1.5 rounded-xl", !mavidir && "border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive")}
            onClick={() => setDialogAçıq(true)}
          >
            <Plus className="size-3.5" />
            Tələbə əlavə et
          </Button>
        </div>

        <div className="space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !setirler.length ? (
            <button
              type="button"
              onClick={() => setDialogAçıq(true)}
              className={cn(
                "flex min-h-20 w-full items-center justify-center rounded-2xl border border-dashed bg-muted/15 px-3 text-center text-xs font-medium transition-colors",
                mavidir
                  ? "border-sky-500/30 text-sky-700 hover:bg-sky-500/5"
                  : "border-destructive/30 text-destructive hover:bg-destructive/5",
              )}
            >
              <Plus className="mr-2 size-4" /> Tələbə əlavə et
            </button>
          ) : (
            setirler.map((s) => {
              const ad = muellimAdıFormatla(s.profil);
              return (
                <div
                  key={s.id}
                  className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 text-sm transition-colors hover:border-border hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8 shrink-0 border border-border/60">
                      {s.profil?.avatar_url ? <SignedAvatarImage src={s.profil.avatar_url} alt={ad} /> : null}
                      <AvatarFallback className="text-[10px] font-semibold">
                        {(s.profil?.ad?.[0] ?? s.profil?.soyad?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ad}</p>
                      {s.profil?.istifadeci_adi ? <p className="truncate text-[11px] text-muted-foreground">@{s.profil.istifadeci_adi}</p> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`${ad} tələbəsini siyahıdan çıxar`}
                    disabled={çıxar.isPending}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => çıxar.mutate(s.id)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={dialogAçıq} onOpenChange={(open) => !elaveEt.isPending && setDialogAçıq(open)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tələbə əlavə et</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={cn("rounded-2xl border p-3 text-sm text-muted-foreground", mavidir ? "border-sky-500/20 bg-sky-500/[0.035]" : "border-destructive/20 bg-destructive/[0.025]")}>
              {mavidir
                ? "Alt qrupa qoşulacaq tələbəni bu fənnin bağlı olduğu qruplardan seçin."
                : "Kəsilən siyahısına əlavə ediləcək tələbəni bu fənnin bağlı olduğu qruplardan seçin."}
            </div>
            <CourseStudentSearchCombobox
              courseId={courseId}
              istisnaIdler={istisnaIdler}
              placeholder="Tələbə axtar..."
              disabled={elaveEt.isPending}
              onSecim={(profil) => elaveEt.mutate(profil.user_id)}
            />
            {elaveEt.isPending ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Əlavə edilir...
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
