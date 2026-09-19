import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookPlus,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Users2,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineEditDialog } from "@/components/admin/course/InlineEditDialog";
import { GroupCourseDialog } from "@/components/admin/group/GroupCourseDialog";
import { GroupLeaderDialog } from "@/components/admin/group/GroupLeaderDialog";
import { GroupStudentDialog } from "@/components/admin/group/GroupStudentDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { muellimAdıFormatla, type Course } from "@/lib/courses";
import { KURSLAR, KURS_ETIKETLERI } from "@/lib/groups";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";
import { cn } from "@/lib/utils";
import { SignedAvatarImage } from "@/components/common/SignedAvatar";

export const Route = createFileRoute("/_authenticated/admin/qruplar_/$groupId")({
  head: () => ({
    meta: [
      { title: "Qrup — ATU Şəxsi Kabinet" },
      { name: "description", content: "Qrupun təfərrüatları." },
      { property: "og:title", content: "Qrup — ATU Şəxsi Kabinet" },
      { property: "og:description", content: "Qrupun təfərrüatları." },
    ],
  }),
  component: QrupDetal,
});

type UzvProfil = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  avatar_url?: string | null;
};

function QrupDetal() {
  // Bu route birbaşa "/admin/qruplar/$groupId" altında render olunanda işə düşür.
  // "/qruplar/$groupId" (qeyri-admin) altında render olunarkən isə GroupDetailView
  // birbaşa öz groupId-sini alır — çünki bu route-un Route.useParams() yalnız
  // "/admin/qruplar/$groupId" uyğunluğu tapılanda işləyir, əks halda xəta verib
  // bütöv səhifənin boş (ağ) görünməsinə səbəb olur.
  const { groupId } = Route.useParams();
  return <GroupDetailView groupId={groupId} />;
}

export function GroupDetailView({ groupId }: { groupId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [redakteDialogAçıq, setRedakteDialogAçıq] = useState(false);
  const [rehberDialogAçıq, setRehberDialogAçıq] = useState(false);
  const [telebeDialogAçıq, setTelebeDialogAçıq] = useState(false);
  const [fennDialogAçıq, setFennDialogAçıq] = useState(false);
  const [silmeHedefi, setSilmeHedefi] = useState<UzvProfil | null>(null);

  const { data: qrup, isLoading: qrupYuklenir, isError: qrupXetasi } = useQuery({
    queryKey: ["group-detail", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).single();
      if (error) throw error;

      let rehber: UzvProfil | null = null;
      if (data.tyutor_id) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("user_id, ad, soyad, avatar_url")
          .eq("user_id", data.tyutor_id)
          .maybeSingle();
        rehber = profil;
      }

      return { ...data, rehber };
    },
  });

  const { data: uzvler = [], isLoading: uzvlerYuklenir } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, user_id")
        .eq("group_id", groupId);
      if (error) throw error;
      const setirler = data ?? [];
      if (setirler.length === 0) return [];

      const idler = setirler.map((s) => s.user_id);
      const { data: profiller, error: profilXetasi } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, avatar_url")
        .in("user_id", idler);
      if (profilXetasi) throw profilXetasi;

      return setirler
        .map((s) => ({
          uzvlukId: s.id,
          profil: profiller?.find((p) => p.user_id === s.user_id) ?? {
            user_id: s.user_id,
            ad: null,
            soyad: null,
            avatar_url: null,
          },
        }))
        .sort((a, b) => compareStudentProfilesBySurnameThenName(a.profil, b.profil));
    },
  });

  const { data: fenler = [], isLoading: fenlerYuklenir } = useQuery({
    queryKey: ["group-courses", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("course_id")
        .eq("group_id", groupId);
      if (error) throw error;

      const courseIdler = (data ?? []).map((r) => r.course_id);
      if (courseIdler.length === 0) return [];

      const { data: courses, error: courseXetasi } = await supabase
        .from("courses")
        .select("id, ad, kurs")
        .in("id", courseIdler)
        .order("ad");
      if (courseXetasi) throw courseXetasi;

      return (courses ?? []) as Pick<Course, "id" | "ad" | "kurs">[];
    },
  });

  const adYenileMutasiyası = useMutation({
    mutationFn: async (ad: string) => {
      if (!ad.trim()) throw new Error("Qrup adını daxil edin.");
      const { error } = await supabase.from("groups").update({ ad: ad.trim() }).eq("id", groupId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Qrup adı yeniləndi.");
      setRedakteDialogAçıq(false);
      void queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] });
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Qrup adı yenilənə bilmədi."),
  });

  const uzvSilMutasiyası = useMutation({
    mutationFn: async (uzvlukId: string) => {
      const { error } = await supabase.from("group_members").delete().eq("id", uzvlukId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Tələbə qrupdan çıxarıldı.");
      setSilmeHedefi(null);
      void queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] });
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Tələbə çıxarıla bilmədi."),
  });

  if (qrupYuklenir) {
    return (
      <>
        <PageHeader baslıq="Qrup təfərrüatı" geri />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        </div>
      </>
    );
  }

  if (qrupXetasi || !qrup) {
    return (
      <>
        <PageHeader baslıq="Qrup təfərrüatı" geri />
        <div className="flex min-h-64 flex-1 items-center justify-center rounded-3xl bg-card p-6 shadow-sm">
          <EmptyState icon={Users2} mesaj="Qrup məlumatları yüklənə bilmədi və ya qrup tapılmadı." />
        </div>
      </>
    );
  }

  const fenlerKursaGore = KURSLAR.map((kurs) => ({
    kurs,
    fenler: fenler.filter((f) => f.kurs === kurs),
  }));
  const kursYoxFenler = fenler.filter(
    (f) => !f.kurs || !KURSLAR.includes(f.kurs as (typeof KURSLAR)[number]),
  );
  const qrupRehberi = qrup.rehber;

  return (
    <>
      <PageHeader baslıq={qrup.ad} geri>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl px-3" onClick={() => setRedakteDialogAçıq(true)}>
            <Pencil className="size-3.5" />
            <span className="hidden xl:inline">Qrupu redaktə et</span>
            <span className="xl:hidden">Redaktə</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl px-3" onClick={() => setRehberDialogAçıq(true)}>
            <UserCog className="size-3.5" />
            <span className="hidden xl:inline">Rəhbər təyin et</span>
            <span className="xl:hidden">Rəhbər</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl px-3" onClick={() => setTelebeDialogAçıq(true)}>
            <UserPlus className="size-3.5" />
            <span className="hidden xl:inline">Tələbə əlavə et</span>
            <span className="xl:hidden">Tələbə</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl px-3" onClick={() => setFennDialogAçıq(true)}>
            <BookPlus className="size-3.5" />
            <span className="hidden xl:inline">Fənn əlavə et</span>
            <span className="xl:hidden">Fənn</span>
          </Button>
        </div>
      </PageHeader>

      <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Fənlər</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Qrup üzrə tədris olunan fənlər kurslara görə qruplaşdırılıb.</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{fenler.length} fənn</span>
          </div>

          {fenlerYuklenir ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
            </div>
          ) : fenler.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <BookPlus className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="text-sm font-medium">Bu qrupa hələ fənn əlavə edilməyib.</p>
              <p className="mt-1 text-xs text-muted-foreground">Yeni fənn əlavə etmək üçün yuxarıdakı düymədən istifadə edin.</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={KURSLAR.map(String)} className="space-y-2">
              {fenlerKursaGore.map(({ kurs, fenler: kursFenleri }) => (
                <AccordionItem key={kurs} value={String(kurs)} className="overflow-hidden rounded-2xl border border-border/80 bg-background/70 px-4 shadow-none transition-colors data-[state=open]:border-primary/20">
                  <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline [&>svg]:size-4 [&>svg]:text-muted-foreground">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{kurs}</span>
                      <span>{KURS_ETIKETLERI[kurs]}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{kursFenleri.length}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-0">
                    {kursFenleri.length === 0 ? (
                      <div className="rounded-xl bg-muted/40 px-3 py-3 text-xs text-muted-foreground">Bu kursda fənn əlavə edilməyib.</div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {kursFenleri.map((fenn) => (
                          <button key={fenn.id} type="button" onClick={() => void navigate({ to: `/fennler/${fenn.id}` })} className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-primary/[0.035] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="min-w-0 truncate font-medium text-foreground">{fenn.ad}</span>
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><ChevronRight className="size-4" /></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}

              {kursYoxFenler.length > 0 ? (
                <AccordionItem value="kurssuz" className="overflow-hidden rounded-2xl border border-border/80 bg-background/70 px-4">
                  <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">Digər fənlər</AccordionTrigger>
                  <AccordionContent className="pb-4 pt-0">
                    <div className="grid gap-2 md:grid-cols-2">
                      {kursYoxFenler.map((fenn) => (
                        <button key={fenn.id} type="button" onClick={() => void navigate({ to: `/fennler/${fenn.id}` })} className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-primary/[0.035] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0 truncate font-medium text-foreground">{fenn.ad}</span>
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><ChevronRight className="size-4" /></span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : null}
            </Accordion>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-3xl bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Qrup rəhbəri</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Təyin olunmuş rəhbər</p>
              </div>
              <UserCog className="size-4 text-muted-foreground" />
            </div>

            {qrupRehberi ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3">
                <Avatar className="size-10 shrink-0">
                  {qrupRehberi.avatar_url ? <SignedAvatarImage src={qrupRehberi.avatar_url} alt={muellimAdıFormatla(qrupRehberi)} /> : null}
                  <AvatarFallback>{(qrupRehberi.ad?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{muellimAdıFormatla(qrupRehberi)}</p>
                  <p className="text-xs text-muted-foreground">Qrup rəhbəri</p>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRehberDialogAçıq(true)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.035]">
                <Avatar className="size-10 shrink-0"><AvatarFallback>?</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Rəhbər təyin edilməyib</p>
                  <p className="text-xs text-muted-foreground">Təyin etmək üçün klikləyin</p>
                </div>
              </button>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-3xl bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Tələbələr</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Qrup üzvləri</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{uzvler.length}</span>
            </div>

            {uzvlerYuklenir ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
              </div>
            ) : uzvler.length === 0 ? (
              <button type="button" onClick={() => setTelebeDialogAçıq(true)} className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.035]">
                <Users2 className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="text-sm font-medium">Tələbə əlavə edilməyib</p>
                <p className="mt-1 text-xs text-muted-foreground">Tələbə əlavə etmək üçün klikləyin</p>
              </button>
            ) : (
              <div className="max-h-[min(58vh,620px)] min-h-0 space-y-1 overflow-y-auto pr-1">
                {uzvler.map(({ uzvlukId, profil }) => (
                  <div key={uzvlukId} className="group flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        {profil.avatar_url ? <SignedAvatarImage src={profil.avatar_url} alt={muellimAdıFormatla(profil)} /> : null}
                        <AvatarFallback className="text-[11px]">{(profil.ad?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{muellimAdıFormatla(profil)}</span>
                    </div>
                    <button type="button" aria-label={`${muellimAdıFormatla(profil)} tələbəsini qrupdan çıxar`} className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-60 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setSilmeHedefi(profil)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <InlineEditDialog açıq={redakteDialogAçıq} onOpenChange={setRedakteDialogAçıq} başlıq="Qrupu redaktə et" etiket="Qrup adı" ilkDeyer={qrup.ad} gonderilir={adYenileMutasiyası.isPending} onYadda={(deyer) => adYenileMutasiyası.mutate(deyer)} />
      <GroupLeaderDialog açıq={rehberDialogAçıq} onOpenChange={setRehberDialogAçıq} groupId={groupId} />
      <GroupStudentDialog açıq={telebeDialogAçıq} onOpenChange={setTelebeDialogAçıq} groupId={groupId} mövcudUzvIdler={uzvler.map((u) => u.profil.user_id)} />
      <GroupCourseDialog açıq={fennDialogAçıq} onOpenChange={setFennDialogAçıq} groupId={groupId} mövcudFennIdler={fenler.map((f) => f.id)} />

      <AlertDialog open={!!silmeHedefi} onOpenChange={(açıq) => !açıq && setSilmeHedefi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tələbəni qrupdan çıxarmaq istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {silmeHedefi ? `"${muellimAdıFormatla(silmeHedefi)}" ` : ""}tələbəsi bu qrupdan çıxarılacaq. Tələbənin digər fənn/davamiyyət qeydlərinə toxunulmayacaq.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={uzvSilMutasiyası.isPending} onClick={(e) => {
              e.preventDefault();
              const uzv = uzvler.find((u) => u.profil.user_id === silmeHedefi?.user_id);
              if (uzv) uzvSilMutasiyası.mutate(uzv.uzvlukId);
            }}>
              {uzvSilMutasiyası.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
