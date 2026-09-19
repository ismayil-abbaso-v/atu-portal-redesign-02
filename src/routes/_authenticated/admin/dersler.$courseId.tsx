import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseRoomsDialog } from "@/components/admin/course/CourseRoomsDialog";
import { CourseStudentStatusSection } from "@/components/admin/course/CourseStudentStatusSection";
import { InlineEditDialog } from "@/components/admin/course/InlineEditDialog";
import { LessonTypesPanel } from "@/components/admin/course/LessonTypesPanel";
import { QiymetlendirmeNovuPanel } from "@/components/admin/course/QiymetlendirmeNovuPanel";
import { SyllabusUploadDialog } from "@/components/admin/course/SyllabusUploadDialog";
import { TeacherEditDialog } from "@/components/admin/course/TeacherEditDialog";
import { TopicFormDialog } from "@/components/admin/course/TopicFormDialog";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  courseFayliEndir,
  courseRoomSummary,
  DARS_NOVLERI,
  DARS_NOVU_ETIKETLERI,
  FAYL_KATEQORIYASI_ETIKETLERI,
  muellimAdıFormatla,
  saatFormatla,
  tarixFormatla,
  type CourseTopic,
  type DarsNovu,
  type FaylKateqoriyasi,
} from "@/lib/courses";

export const Route = createFileRoute("/_authenticated/admin/dersler/$courseId")({
  head: () => ({
    meta: [
      { title: "Dərs — ATU Şəxsi Kabinet" },
      { name: "description", content: "Dərsin təfərrüatları." },
      { property: "og:title", content: "Dərs — ATU Şəxsi Kabinet" },
      { property: "og:description", content: "Dərsin təfərrüatları." },
    ],
  }),
  component: DersDetal,
});

type TabDeyeri = "hamısı" | DarsNovu;

function DersDetal() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [aktivTab, setAktivTab] = useState<TabDeyeri>("hamısı");
  const [teacherDialogAçıq, setTeacherDialogAçıq] = useState(false);
  const [syllabusDialogAçıq, setSyllabusDialogAçıq] = useState(false);
  const [krediDialogAçıq, setKrediDialogAçıq] = useState(false);
  const [otaqDialogAçıq, setOtaqDialogAçıq] = useState(false);
  const [silmeDialoguAçıq, setSilmeDialoguAçıq] = useState(false);
  const [topicForm, setTopicForm] = useState<{ açıq: boolean; movzu: CourseTopic | null }>({
    açıq: false,
    movzu: null,
  });
  const [topicSilmeDialogu, setTopicSilmeDialogu] = useState<CourseTopic | null>(null);

  const { data: fenn, isLoading: fennYuklenir } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      if (error) throw error;

      let esasMuellim = null;
      if (data.muellim_id) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("user_id, ad, soyad")
          .eq("user_id", data.muellim_id)
          .maybeSingle();
        esasMuellim = profil;
      }

      return { ...data, esasMuellim };
    },
  });

  const aktivDarsNovleri = (fenn?.aktiv_dars_novleri as Record<string, boolean>) ?? {};
  const görünenTablar = DARS_NOVLERI.filter((nov) => aktivDarsNovleri[nov]);

  const { data: mövzular = [], isLoading: mövzularYuklenir } = useQuery({
    queryKey: ["course-topics", courseId, aktivTab],
    queryFn: async () => {
      let sorgu = supabase
        .from("course_topics")
        .select("*")
        .eq("course_id", courseId)
        .order("tarix", { ascending: false })
        .order("sira", { ascending: false });
      if (aktivTab !== "hamısı") sorgu = sorgu.eq("dars_novu", aktivTab);
      const { data, error } = await sorgu;
      if (error) throw error;
      return (data ?? []) as CourseTopic[];
    },
  });

  const krediMutasiyasi = useMutation({
    mutationFn: async (deyer: string) => {
      const { error } = await supabase
        .from("courses")
        .update({ kredit: deyer ? Number(deyer) : null })
        .eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Kredit yeniləndi.");
      setKrediDialogAçıq(false);
      void queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Kredit yenilənə bilmədi."),
  });


  const dersSilMutasiyasi = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Dərs silindi.");
      void navigate({ to: "/admin/dersler" });
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Dərs silinə bilmədi."),
  });

  const topicSilMutasiyasi = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_topics").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Mövzu silindi.");
      setTopicSilmeDialogu(null);
      void queryClient.invalidateQueries({ queryKey: ["course-topics", courseId] });
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Mövzu silinə bilmədi."),
  });

  if (fennYuklenir) {
    return (
      <>
        <PageHeader baslıq="Dərs təfərrüatı" geri />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    );
  }

  if (!fenn) {
    return (
      <>
        <PageHeader baslıq="Dərs təfərrüatı" geri />
        <div className="flex flex-1 rounded-3xl bg-card shadow-sm">
          <EmptyState icon={ScrollText} mesaj="Fənn tapılmadı." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader baslıq={fenn.ad} geri>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => setTopicForm({ açıq: true, movzu: null })}
        >
          <Plus className="size-4" />
          Mövzu əlavə et
        </Button>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => setSyllabusDialogAçıq(true)}
        >
          <UploadCloud className="size-4" />
          Sillabus
        </Button>
        <Button
          variant="outline"
          className="gap-2 rounded-xl text-destructive hover:text-destructive"
          onClick={() => setSilmeDialoguAçıq(true)}
        >
          <Trash2 className="size-4" />
          Dərsi sil
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard
            başlıq="Müəllim"
            deyer={muellimAdıFormatla(fenn.esasMuellim)}
            onRedakte={() => setTeacherDialogAçıq(true)}
          />
          <InfoCard
            başlıq="Kredit"
            deyer={fenn.kredit != null ? String(fenn.kredit) : "—"}
            onRedakte={() => setKrediDialogAçıq(true)}
          />
          <InfoCard
            başlıq="Otaq"
            deyer={courseRoomSummary(fenn.otaqlar, fenn.otaq)}
            onRedakte={() => setOtaqDialogAçıq(true)}
          />
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <TabDüyməsi
                etiket="Hamısı"
                aktiv={aktivTab === "hamısı"}
                onClick={() => setAktivTab("hamısı")}
              />
              {görünenTablar.map((nov) => (
                <TabDüyməsi
                  key={nov}
                  etiket={DARS_NOVU_ETIKETLERI[nov]}
                  aktiv={aktivTab === nov}
                  onClick={() => setAktivTab(nov)}
                />
              ))}
            </div>

            {mövzularYuklenir ? (
              <div className="flex flex-col gap-2 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : mövzular.length === 0 ? (
              <EmptyState icon={ScrollText} mesaj="Hələ heç bir mövzu əlavə edilməyib." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>№</TableHead>
                      <TableHead>Tarix</TableHead>
                      <TableHead>Mövzu</TableHead>
                      <TableHead>Fayl</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mövzular.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground">{m.sira}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {tarixFormatla(m.tarix)}
                          {saatFormatla(m.bas_saat) ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {saatFormatla(m.bas_saat)}
                              {saatFormatla(m.bit_saat) ? `–${saatFormatla(m.bit_saat)}` : ""}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.movzu}</div>
                          <div className="text-xs text-muted-foreground">
                            {DARS_NOVU_ETIKETLERI[m.dars_novu as DarsNovu]}
                            {m.fayl_kateqoriyasi
                              ? ` · ${FAYL_KATEQORIYASI_ETIKETLERI[m.fayl_kateqoriyasi as FaylKateqoriyasi]}`
                              : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.fayl_url ? (
                            <button
                              type="button"
                              aria-label="Endir"
                              className="text-primary hover:underline"
                              onClick={() => void courseFayliEndir(m.fayl_url!)}
                            >
                              <Download className="size-4" />
                            </button>
                          ) : (
                            <FileText className="size-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Redaktə et"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setTopicForm({ açıq: true, movzu: m })}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Sil"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setTopicSilmeDialogu(m)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <LessonTypesPanel courseId={courseId} aktivDarsNovleri={aktivDarsNovleri} />
            <QiymetlendirmeNovuPanel
              courseId={courseId}
              qiymetlendirmeNovu={fenn.qiymetlendirme_novu}
              kursIsiVar={fenn.kurs_isi_var}
              umumiLabSayi={fenn.umumi_lab_sayi}
              umumiDersSaati={fenn.umumi_ders_saati}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CourseStudentStatusSection
            courseId={courseId}
            status="elave"
            başlıq="Alt Qrup"
            reng="mavi"
          />
          <CourseStudentStatusSection
            courseId={courseId}
            status="kesilib"
            başlıq="Kəsilən"
            reng="qırmızı"
          />
        </div>
      </div>

      <TeacherEditDialog
        açıq={teacherDialogAçıq}
        onOpenChange={setTeacherDialogAçıq}
        courseId={courseId}
      />
      <SyllabusUploadDialog
        açıq={syllabusDialogAçıq}
        onOpenChange={setSyllabusDialogAçıq}
        courseId={courseId}
      />
      <TopicFormDialog
        açıq={topicForm.açıq}
        onOpenChange={(açıq) => setTopicForm((cari) => ({ ...cari, açıq }))}
        courseId={courseId}
        movzu={topicForm.movzu}
        aktivDarsNovleri={aktivDarsNovleri}
      />

      <InlineEditDialog
        açıq={krediDialogAçıq}
        onOpenChange={setKrediDialogAçıq}
        başlıq="Krediti redaktə et"
        etiket="Kredit"
        tip="number"
        ilkDeyer={fenn.kredit != null ? String(fenn.kredit) : ""}
        gonderilir={krediMutasiyasi.isPending}
        onYadda={(deyer) => krediMutasiyasi.mutate(deyer)}
      />
      <CourseRoomsDialog
        açıq={otaqDialogAçıq}
        onOpenChange={setOtaqDialogAçıq}
        courseId={courseId}
        otaqlar={fenn.otaqlar}
        legacyOtaq={fenn.otaq}
        aktivDarsNovleri={aktivDarsNovleri}
      />

      <AlertDialog open={silmeDialoguAçıq} onOpenChange={setSilmeDialoguAçıq}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dərsi silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{fenn.ad}&quot; fənni və bütün əlaqəli məlumatları (mövzular, müəllimlər,
              statuslar) HƏMİŞƏLİK silinəcək. Bu əməliyyat GERİ QAYTARILA BİLMƏZ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={dersSilMutasiyasi.isPending}
              onClick={(e) => {
                e.preventDefault();
                dersSilMutasiyasi.mutate();
              }}
            >
              {dersSilMutasiyasi.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!topicSilmeDialogu}
        onOpenChange={(açıq) => !açıq && setTopicSilmeDialogu(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mövzunu silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {topicSilmeDialogu ? `"${topicSilmeDialogu.movzu}" ` : ""}
              mövzusu HƏMİŞƏLİK silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={topicSilMutasiyasi.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (topicSilmeDialogu) topicSilMutasiyasi.mutate(topicSilmeDialogu.id);
              }}
            >
              {topicSilMutasiyasi.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InfoCard({
  başlıq,
  deyer,
  onRedakte,
}: {
  başlıq: string;
  deyer: string;
  onRedakte: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{başlıq}</span>
        <button
          type="button"
          aria-label={`${başlıq} redaktə et`}
          className="text-muted-foreground hover:text-foreground"
          onClick={onRedakte}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
      <p className="text-lg font-semibold">{deyer}</p>
    </div>
  );
}

function TabDüyməsi({
  etiket,
  aktiv,
  onClick,
}: {
  etiket: string;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
        aktiv
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent"
      }`}
    >
      {etiket}
    </button>
  );
}
