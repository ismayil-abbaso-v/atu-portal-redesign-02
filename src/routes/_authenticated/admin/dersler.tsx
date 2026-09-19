import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { CourseFormDialog } from "@/components/admin/course/CourseFormDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const SEHIFE_OLCUSU = 50;

export const Route = createFileRoute("/_authenticated/admin/dersler")({
  head: () => ({
    meta: [
      { title: "Dərslər — ATU Şəxsi Kabinet" },
      { name: "description", content: "Dərslərin idarə edilməsi." },
      { property: "og:title", content: "Dərslər — ATU Şəxsi Kabinet" },
      { property: "og:description", content: "Dərslərin idarə edilməsi." },
    ],
  }),
  component: DerslerSehifesi,
});

function DerslerSehifesi() {
  const navigate = useNavigate();

  const [axtarisXami, setAxtarisXami] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [sehife, setSehife] = useState(0);
  const [formAçıq, setFormAçıq] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setAxtaris(axtarisXami.trim());
      setSehife(0);
    }, 400);
    return () => clearTimeout(t);
  }, [axtarisXami]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-courses", "list", axtaris, sehife],
    queryFn: async () => {
      let sorgu = supabase
        .from("courses")
        .select("id, ad, kredit, otaq", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(sehife * SEHIFE_OLCUSU, sehife * SEHIFE_OLCUSU + SEHIFE_OLCUSU - 1);

      if (axtaris) {
        sorgu = sorgu.ilike("ad", `%${axtaris.replace(/[%,]/g, "")}%`);
      }

      const { data, error, count } = await sorgu;
      if (error) throw error;

      const idler = (data ?? []).map((c) => c.id);
      let sayLugeti: Record<string, number> = {};
      if (idler.length > 0) {
        const { data: mövzular } = await supabase
          .from("course_topics")
          .select("course_id")
          .in("course_id", idler);
        sayLugeti = (mövzular ?? []).reduce<Record<string, number>>((acc, m) => {
          acc[m.course_id] = (acc[m.course_id] ?? 0) + 1;
          return acc;
        }, {});
      }

      return {
        fenler: data ?? [],
        umumiSay: count ?? 0,
        mövzuSayları: sayLugeti,
      };
    },
  });

  const fenler = data?.fenler ?? [];
  const umumiSay = data?.umumiSay ?? 0;
  const sonSehife = Math.max(0, Math.ceil(umumiSay / SEHIFE_OLCUSU) - 1);

  return (
    <>
      <PageHeader baslıq="Dərslər" />

      <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={axtarisXami}
              onChange={(e) => setAxtarisXami(e.target.value)}
              placeholder="Fənn axtar..."
              className="rounded-xl pl-9"
            />
          </div>
          <Button className="ml-auto gap-2 rounded-xl" onClick={() => setFormAçıq(true)}>
            <Plus className="size-4" />
            Yeni fənn
          </Button>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Fənlər yüklənərkən xəta baş verdi.</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => void refetch()}
            >
              Yenidən cəhd et
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : fenler.length === 0 ? (
          <EmptyState icon={BookOpen} mesaj="Heç bir fənn tapılmadı." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {fenler.map((fen) => (
              <button
                key={fen.id}
                type="button"
                onClick={() => void navigate({ to: `/fennler/${fen.id}` })}
                className="flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-4" />
                </div>
                <span className="line-clamp-2 text-sm font-semibold">{fen.ad}</span>
                <span className="text-xs text-muted-foreground">
                  {data?.mövzuSayları[fen.id] ?? 0} mövzu
                </span>
              </button>
            ))}
          </div>
        )}

        {!isLoading && !isError && umumiSay > SEHIFE_OLCUSU ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-sm text-muted-foreground">
              {sehife * SEHIFE_OLCUSU + 1}-{Math.min((sehife + 1) * SEHIFE_OLCUSU, umumiSay)} /{" "}
              {umumiSay}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                disabled={sehife === 0}
                onClick={() => setSehife((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                disabled={sehife >= sonSehife}
                onClick={() => setSehife((s) => Math.min(sonSehife, s + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <CourseFormDialog açıq={formAçıq} onOpenChange={setFormAçıq} />
    </>
  );
}
