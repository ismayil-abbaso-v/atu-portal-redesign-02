import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import {
  BookOpen,
  CalendarClock,
  BellRing,
  Users,
  MessageCircle,
  FolderOpen,
  Megaphone,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/use-notifications";
import type { Database } from "@/integrations/supabase/types";
import { StudentGroupAvatarGroup } from "@/components/dashboard/StudentGroupAvatarGroup";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"] & {
  courses: Pick<Course, "ad" | "otaq"> | null;
};

/**
 * İstifadəçinin "prefers-reduced-motion" seçimini yoxlayır — animasiyaları
 * (say-up, ring dolması) ehtiyac olduqda söndürmək üçün.
 */
function reducedMotionIstenir(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Rəqəmi 0-dan hədəf qiymətə doğru sayaraq artıran hook (count-up). */
function useCountUp(target: number | null, aktiv: boolean): number | null {
  const [deyer, setDeyer] = useState<number | null>(target === null ? null : 0);
  const animeEdildi = useRef(false);

  useEffect(() => {
    if (target === null || !aktiv) {
      setDeyer(target);
      return;
    }
    if (reducedMotionIstenir()) {
      setDeyer(target);
      return;
    }
    if (animeEdildi.current) {
      setDeyer(target);
      return;
    }
    animeEdildi.current = true;
    let cur = 0;
    const addım = Math.max(1, target / 24);
    let frame: number;
    const tick = () => {
      cur += addım;
      if (cur >= target) {
        setDeyer(target);
        return;
      }
      setDeyer(Math.round(cur));
      frame = requestAnimationFrame(tick);
    };
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 500);
    return () => {
      clearTimeout(timeout);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, aktiv]);

  return deyer;
}

/** İki "HH:mm:ss" saatı arasındakı fərqi dəqiqə olaraq hesablayır. */
function deqiqeFerqi(baslangic: string, bitme: string): number | null {
  const bHissə = baslangic.split(":").map(Number);
  const eHissə = bitme.split(":").map(Number);
  const bh = bHissə[0] ?? NaN;
  const bm = bHissə[1] ?? NaN;
  const eh = eHissə[0] ?? NaN;
  const em = eHissə[1] ?? NaN;
  if ([bh, bm, eh, em].some((v) => Number.isNaN(v))) return null;
  return eh * 60 + em - (bh * 60 + bm);
}

export function StudentDashboard({ userId }: { userId: string }) {
  // ---- Profil (ad, soyad, qrup kodu, avatar) ----
  const { data: profile } = useQuery({
    queryKey: ["student-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });

  // ---- Tələbənin daxil olduğu qruplar ----
  const { data: groupMembers = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["student-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const groupIds = groupMembers.map((gm) => gm.group_id);
  const primaryGroupId = groupIds[0];

  // ---- Tələbənin fənləri (aktiv fənlər sayı üçün də istifadə olunur) ----
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["student-courses", groupIds, userId],
    queryFn: async () => {
      let groupCourses: Course[] = [];
      if (groupIds.length > 0) {
        const { data, error } = await supabase.from("courses").select("*").in("group_id", groupIds);
        if (!error && data) {
          groupCourses = data;
        }
      }

      const { data: scoreData } = await supabase
        .from("exam_scores")
        .select("course_id, courses(*)")
        .eq("user_id", userId);

      const scoreCourses = (scoreData?.map((sd) => sd.courses).filter(Boolean) || []) as Course[];

      const allCourses = [...groupCourses];
      for (const sc of scoreCourses) {
        if (!allCourses.some((c) => c.id === sc.id)) {
          allCourses.push(sc);
        }
      }
      return allCourses;
    },
    enabled: !!userId,
  });

  const courseIds = courses.map((c) => c.id);

  // ---- Ümumi orta bal: tələbənin bütün fənlər üzrə yekun qiymətlərinin ortası ----
  const { data: allScores = [] } = useQuery({
    queryKey: ["student-all-exam-scores", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_scores")
        .select("yekun_qiymet")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const qiymetlendirilmisBallar = allScores
    .map((s) => s.yekun_qiymet)
    .filter((v): v is number => v !== null && v !== undefined);
  const ortaBal =
    qiymetlendirilmisBallar.length > 0
      ? qiymetlendirilmisBallar.reduce((cəm, b) => cəm + b, 0) / qiymetlendirilmisBallar.length
      : null;

  // ---- Bugünkü dərs cədvəli ----
  const bugununTarixi = format(new Date(), "yyyy-MM-dd");
  const { data: bugunkuDersler = [], isLoading: isLoadingBugun } = useQuery({
    queryKey: ["student-today-events", groupIds, courseIds, bugununTarixi],
    queryFn: async () => {
      const şərtlər: string[] = [];
      if (groupIds.length > 0) şərtlər.push(`group_id.in.(${groupIds.join(",")})`);
      if (courseIds.length > 0) şərtlər.push(`course_id.in.(${courseIds.join(",")})`);
      if (şərtlər.length === 0) return [];

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, courses(ad, otaq)")
        .eq("tarix", bugununTarixi)
        .or(şərtlər.join(","))
        .order("baslangic_saat", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
    enabled: !isLoadingGroups && !isLoadingCourses,
  });

  // ---- Qrup məlumatı (ad) ----
  const { data: groupInfo } = useQuery({
    queryKey: ["student-primary-group-info", primaryGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", primaryGroupId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!primaryGroupId,
  });

  // ---- Qrup üzvləri (avatarlar üçün) ----
  // Qeyd: group_members.user_id -> profiles arasında birbaşa FK əlaqəsi
  // Supabase-in generated tiplərində tanınmadığı üçün (PostgREST embed işləmir),
  // əvvəlcə user_id-ləri çəkib, sonra profilləri ayrıca sorğu ilə alırıq.
  const { data: groupUzvleri = [] } = useQuery({
    queryKey: ["student-primary-group-members", primaryGroupId],
    queryFn: async (): Promise<
      { user_id: string; profile: Pick<Profile, "ad" | "soyad" | "avatar_url"> | null }[]
    > => {
      const { data: uzvler, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", primaryGroupId!);
      if (error) throw error;
      if (!uzvler || uzvler.length === 0) return [];

      const uzvIdler = uzvler.map((u) => u.user_id);
      const { data: profiller, error: profilXetasi } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, avatar_url")
        .in("user_id", uzvIdler);
      if (profilXetasi) throw profilXetasi;

      const profilXeritesi = new Map(
        (profiller ?? []).map((p) => [
          p.user_id,
          { ad: p.ad, soyad: p.soyad, avatar_url: p.avatar_url },
        ]),
      );
      return uzvler.map((u) => ({
        user_id: u.user_id,
        profile: profilXeritesi.get(u.user_id) ?? null,
      }));
    },
    enabled: !!primaryGroupId,
  });

  // ---- Bildirişlər ----
  const { notifications, unreadCount } = useNotifications();
  const sonBildirisler = notifications.slice(0, 3);

  const yuklenirIlkin = isLoadingGroups && courses.length === 0;

  const adIlk = profile?.ad || "İstifadəçi";

  const bugunkuTarixMetni = format(new Date(), "d MMMM · EEEE", { locale: az });

  // ---- Animasiyalar üçün hədəflər ----
  const fenSayiAnim = useCountUp(courses.length, !isLoadingCourses);
  const bildirisSayiAnim = useCountUp(unreadCount, true);

  const ringCemferi = 283;
  const ringOffsetHedef =
    ortaBal !== null
      ? Math.max(0, ringCemferi - (ringCemferi * Math.min(100, ortaBal)) / 100)
      : ringCemferi;
  const [ringOffset, setRingOffset] = useState(ringCemferi);
  useEffect(() => {
    if (ortaBal === null) {
      setRingOffset(ringCemferi);
      return;
    }
    if (reducedMotionIstenir()) {
      setRingOffset(ringOffsetHedef);
      return;
    }
    const t = setTimeout(() => setRingOffset(ringOffsetHedef), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ortaBal]);

  if (yuklenirIlkin) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="animate-stagger space-y-4">
        {/* ============ HERO ============ */}
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8">
          {/* incə fon naxışı (dairələr + xətlər), aşağı opasitə */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cg fill='none' stroke='%236E1A2C' stroke-width='1.2'%3E%3Ccircle cx='30' cy='40' r='3'/%3E%3Ccircle cx='90' cy='20' r='2.2'/%3E%3Ccircle cx='150' cy='60' r='3'/%3E%3Ccircle cx='220' cy='30' r='2.2'/%3E%3Ccircle cx='255' cy='110' r='3'/%3E%3Ccircle cx='60' cy='130' r='2.2'/%3E%3Ccircle cx='180' cy='150' r='3'/%3E%3Ccircle cx='20' cy='220' r='2.2'/%3E%3Ccircle cx='120' cy='240' r='3'/%3E%3Ccircle cx='230' cy='230' r='2.2'/%3E%3Cpath d='M30 40L90 20M90 20L150 60M150 60L220 30M220 30L255 110M60 130L150 60M60 130L20 220M120 240L60 130M120 240L230 230M180 150L230 230M180 150L255 110'/%3E%3C/g%3E%3C/svg%3E\")",
              backgroundSize: "280px 280px",
            }}
          />
          {/* sol kənar gradient zolaq */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[5px] bg-gradient-to-b from-primary to-[var(--portal-gold)]"
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--portal-gold)]">
                {bugunkuTarixMetni}
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-primary sm:text-3xl">
                Salam, {adIlk} <span className="animate-wave">👋</span>
              </h1>
              <p className="mt-2 max-w-[36ch] text-sm text-muted-foreground">
                {isLoadingBugun
                  ? "Bugünkü cədvəliniz yüklənir…"
                  : bugunkuDersler.length > 0
                    ? `Bu gün cədvəlinizdə ${bugunkuDersler.length} dərs var. Uğurlu bir gün keçirin.`
                    : "Bu gün cədvəlinizdə planlaşdırılmış dərs yoxdur."}
              </p>
            </div>

            <div className="flex flex-none items-center gap-4">
              <div className="relative size-[104px]">
                <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
                  <circle
                    cx="52"
                    cy="52"
                    r="45"
                    strokeWidth="8"
                    fill="none"
                    className="stroke-[var(--color-accent)]"
                  />
                  <circle
                    cx="52"
                    cy="52"
                    r="45"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCemferi}
                    strokeDashoffset={ringOffset}
                    className="ring-fg stroke-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="font-data text-xl font-semibold text-primary">
                    {ortaBal !== null ? ortaBal.toFixed(1) : "—"}
                  </b>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    Orta bal
                  </span>
                </div>
              </div>
              <div className="max-w-[15ch] text-xs leading-relaxed text-muted-foreground">
                <b className="mb-0.5 block text-[13px] text-foreground">Ümumi ortalama</b>
                {qiymetlendirilmisBallar.length > 0
                  ? "Bütün fənlər üzrə yekun qiymətlərin ortasıdır."
                  : "Hələ heç bir yekun qiymətiniz yoxdur."}
              </div>
            </div>
          </div>
        </div>

        {/* ============ STAT-STRIP ============ */}
        <div className="grid animate-stagger grid-cols-1 gap-3.5 sm:grid-cols-3">
          <StatChip icon={BookOpen} renk="maroon" value={fenSayiAnim} label="Aktiv fənlər" />
          <StatChip icon={CalendarClock} renk="gold" value={null} label="Yaxın imtahan" />
          <StatChip icon={BellRing} renk="green" value={bildirisSayiAnim} label="Yeni bildiriş" />
        </div>

        {/* ============ CONTENT GRID ============ */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
          {/* Bugünkü dərslər */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-base font-bold text-foreground">Bugünkü dərslər</h2>
            </div>

            {isLoadingBugun ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : bugunkuDersler.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarClock className="size-10 stroke-[1.25] text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Bu gün dərs yoxdur.</p>
              </div>
            ) : (
              <div className="relative pl-1.5">
                {bugunkuDersler.map((ders, idx) => {
                  const muddet = deqiqeFerqi(ders.baslangic_saat, ders.bitme_saat);
                  const otaq = ders.courses?.otaq;
                  const adOrTesvir = ders.courses?.ad ?? ders.baslıq;
                  return (
                    <div key={ders.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {idx !== bugunkuDersler.length - 1 && (
                        <div className="absolute bottom-[-6px] left-[44px] top-[26px] w-[1.5px] bg-border" />
                      )}
                      <div className="w-11 flex-none pt-0.5 font-data text-[12.5px] font-semibold text-muted-foreground">
                        {ders.baslangic_saat.slice(0, 5)}
                      </div>
                      <div className="absolute left-[39px] top-[5px] size-[11px] rounded-full border-[2.5px] border-primary bg-card" />
                      <div className="ml-3.5 flex flex-1 items-center justify-between gap-2.5 rounded-2xl border border-border/70 bg-muted/60 px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-accent/60">
                        <div className="min-w-0">
                          <b className="block truncate text-[13.5px] font-bold text-foreground">
                            {adOrTesvir}
                          </b>
                          <span className="text-[11.5px] text-muted-foreground">
                            {[otaq ? `Otaq ${otaq}` : null, muddet ? `${muddet} dəq` : null]
                              .filter(Boolean)
                              .join(" · ") || ders.baslıq}
                          </span>
                        </div>
                        <span className="flex-none rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-[0.02em] text-primary">
                          Dərs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Qrupunuz */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-base font-bold text-foreground">Qrupunuz</h2>
              </div>

              {!primaryGroupId ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Hələ heç bir qrupa təyin edilməmisiniz.
                </p>
              ) : (
                <>
                  {profile?.qrup && (
                    <span className="mb-2 inline-block rounded-lg bg-accent px-2.5 py-1 font-data text-xs font-bold text-primary">
                      {profile.qrup}
                    </span>
                  )}
                  <div className="mb-3.5 text-[14.5px] font-bold text-foreground">
                    {groupInfo?.ad ?? "Qrup"}
                  </div>

                  <div className="mb-4 flex items-center">
                    {groupUzvleri.length > 0 ? (
                      <StudentGroupAvatarGroup members={groupUzvleri} max={5} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Üzv məlumatı yoxdur</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5 rounded-xl px-1 py-2.5 text-[13px] font-semibold text-foreground">
                      <Users className="size-[15px] flex-none text-primary" />
                      Qrup yoldaşları
                      <span className="ml-auto rounded-full bg-primary px-1.5 py-px font-data text-[10.5px] text-primary-foreground">
                        {groupUzvleri.length}
                      </span>
                    </div>
                    <a
                      href="/sohbet"
                      className="flex items-center gap-2.5 rounded-xl px-1 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <MessageCircle className="size-[15px] flex-none text-primary" />
                      Qrup söhbəti
                      <ChevronRight className="ml-auto size-3 text-muted-foreground" />
                    </a>
                    <div className="flex items-center gap-2.5 rounded-xl px-1 py-2.5 text-[13px] font-semibold text-muted-foreground/70">
                      <FolderOpen className="size-[15px] flex-none" />
                      Fayllar
                      <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide">
                        Tezliklə
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-1 py-2.5 text-[13px] font-semibold text-muted-foreground/70">
                      <Megaphone className="size-[15px] flex-none" />
                      Qrup elanları
                      <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide">
                        Tezliklə
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Son bildirişlər */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-base font-bold text-foreground">Son bildirişlər</h2>
                <a
                  href="/bildirisler?tab=notifications"
                  className="flex items-center gap-0.5 text-xs font-bold text-primary"
                >
                  Hamısını gör <ChevronRight className="size-3" />
                </a>
              </div>

              {sonBildirisler.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Bildiriş yoxdur.</p>
              ) : (
                sonBildirisler.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`flex gap-2.5 py-2.5 ${idx !== sonBildirisler.length - 1 ? "border-b border-border/60" : ""}`}
                  >
                    <div className="mt-1.5 size-[7px] flex-none rounded-full bg-primary" />
                    <div className="flex-1">
                      <b className="block text-[12.8px] font-bold leading-snug text-foreground">
                        {b.baslıq}
                      </b>
                      {b.metin && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{b.metin}</p>
                      )}
                    </div>
                    <time className="flex-none pt-0.5 text-[10.5px] text-muted-foreground">
                      <BildirisVaxti tarix={b.tarix} />
                    </time>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BildirisVaxti({ tarix }: { tarix: string }) {
  const t = new Date(tarix);
  const bugun = new Date();
  const eyniGun =
    t.getFullYear() === bugun.getFullYear() &&
    t.getMonth() === bugun.getMonth() &&
    t.getDate() === bugun.getDate();
  if (eyniGun) return <>{format(t, "HH:mm")}</>;
  const dünən = new Date(bugun);
  dünən.setDate(dünən.getDate() - 1);
  const dünəndir =
    t.getFullYear() === dünən.getFullYear() &&
    t.getMonth() === dünən.getMonth() &&
    t.getDate() === dünən.getDate();
  if (dünəndir) return <>Dünən</>;
  return <>{format(t, "d MMM", { locale: az })}</>;
}

const chipRenkler = {
  maroon: { bg: "bg-accent", text: "text-primary" },
  gold: { bg: "bg-[var(--portal-gold-soft)]", text: "text-[var(--portal-gold)]" },
  green: { bg: "bg-[var(--color-success)]/15", text: "text-[var(--color-success)]" },
} as const;

function StatChip({
  icon: Icon,
  renk,
  value,
  label,
}: {
  icon: typeof BookOpen;
  renk: keyof typeof chipRenkler;
  value: number | null;
  label: string;
}) {
  const { bg, text } = chipRenkler[renk];
  return (
    <div className="flex items-center gap-3.5 rounded-3xl border border-border bg-card p-4">
      <div
        className={`flex size-[38px] flex-none items-center justify-center rounded-[11px] ${bg} ${text}`}
      >
        <Icon className="size-[17px]" />
      </div>
      <div>
        <b className="block font-data text-xl font-semibold leading-none text-foreground">
          {value === null ? "—" : value}
        </b>
        <span className="mt-1 block text-[11.5px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
