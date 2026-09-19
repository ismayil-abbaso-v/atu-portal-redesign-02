import * as SwitchPrimitives from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Cake,
  CalendarDays,
  CircleAlert,
  Gift,
  Mail,
  Megaphone,
  Send,
  Settings2,
  Smartphone,
  UserRound,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import "@/notification-settings-premium.css";

export const Route = createFileRoute("/_authenticated/menyu/bildiris")({
  head: () => ({
    meta: [
      { title: "Bildiriş parametrləri — ATU Şəxsi Kabinet" },
      { name: "description", content: "Bildiriş növləri və kanallarını tənzimləyin." },
      { property: "og:title", content: "Bildiriş parametrləri — ATU Şəxsi Kabinet" },
      { property: "og:description", content: "Bildiriş növləri və kanallarını tənzimləyin." },
    ],
  }),
  component: BildirisParametrleri,
});

type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
type NovSutunu = keyof Omit<NotificationSettings, "profile_id" | "e_poct_kanali" | "push_kanali">;
type KanalSutunu = "e_poct_kanali" | "push_kanali";
type SettingMeta<T extends NovSutunu | KanalSutunu> = {
  ad: string;
  aciqlama: string;
  sutun: T;
  icon: LucideIcon;
};

const novler: SettingMeta<NovSutunu>[] = [
  { ad: "Sistem", aciqlama: "Portal və hesabla bağlı vacib sistem yenilikləri.", sutun: "sistem", icon: Settings2 },
  { ad: "Tədbir", aciqlama: "Təqvim, görüş və akademik tədbir xatırlatmaları.", sutun: "tedbir", icon: CalendarDays },
  { ad: "Xəbərdarlıq", aciqlama: "Diqqət tələb edən dəyişiklik və xəbərdarlıqlar.", sutun: "xeberdarliq", icon: CircleAlert },
  { ad: "Mükafat", aciqlama: "Nailiyyət, mükafat və uğur bildirişləri.", sutun: "mukafat", icon: Gift },
  { ad: "Şəxsi", aciqlama: "Birbaşa sizə aid fərdi məlumat və yeniliklər.", sutun: "shexsi", icon: UserRound },
  { ad: "Sosial", aciqlama: "Qrup, söhbət və sosial fəaliyyət yenilikləri.", sutun: "sosial", icon: Users2 },
  { ad: "Xüsusi Gün", aciqlama: "Əlamətdar tarixlər və xüsusi gün xatırlatmaları.", sutun: "xususi_gun", icon: Cake },
  { ad: "Elan", aciqlama: "Universitet və portal üzrə yeni elanlar.", sutun: "elan", icon: Megaphone },
];

const kanallar: SettingMeta<KanalSutunu>[] = [
  { ad: "E-poçt", aciqlama: "Seçilmiş bildirişləri qeydiyyat e-poçtunuza qəbul edin.", sutun: "e_poct_kanali", icon: Mail },
  { ad: "Push bildirişi", aciqlama: "Uyğun cihazlarda portal yeniliklərini anında görün.", sutun: "push_kanali", icon: Smartphone },
];

const defoltDeyerler: Omit<NotificationSettings, "profile_id"> = {
  sistem: true,
  tedbir: true,
  xeberdarliq: true,
  mukafat: true,
  shexsi: true,
  sosial: true,
  xususi_gun: true,
  elan: true,
  e_poct_kanali: false,
  push_kanali: false,
};

function NotificationSwitch({
  checked,
  disabled,
  ariaLabel,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  ariaLabel: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <SwitchPrimitives.Root
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className="relative inline-flex h-7 w-[52px] min-w-[52px] shrink-0 cursor-pointer items-center overflow-hidden rounded-full border p-[3px] shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_9%,transparent)] data-[state=unchecked]:border-foreground/20 data-[state=unchecked]:bg-foreground/10 hover:scale-[1.02] max-md:hover:scale-100"
    >
      <SwitchPrimitives.Thumb className="block size-5 min-w-5 shrink-0 rounded-full border border-white/70 bg-white shadow-md transition-transform duration-200 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
  );
}

function BildirisParametrleri() {
  const router = useRouter();
  const { userId } = useUserRoles();
  const queryClient = useQueryClient();
  const queryKey = ["notification-settings", userId] as const;

  const { data: deyerler, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const goruntulenenDeyerler = { ...defoltDeyerler, ...(deyerler ?? {}) };
  const aktivNovSayi = novler.filter(({ sutun }) => Boolean(goruntulenenDeyerler[sutun])).length;
  const aktivKanalSayi = kanallar.filter(({ sutun }) => Boolean(goruntulenenDeyerler[sutun])).length;

  const yenileMutasiyasi = useMutation({
    mutationFn: async ({ sutun, deyer }: { sutun: NovSutunu | KanalSutunu; deyer: boolean }) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notification_settings")
        .upsert({ profile_id: userId, [sutun]: deyer } as never, { onConflict: "profile_id" });
      if (error) throw error;
    },
    onMutate: async ({ sutun, deyer }) => {
      await queryClient.cancelQueries({ queryKey });
      const oncekiDeyer = queryClient.getQueryData<NotificationSettings | null>(queryKey);
      queryClient.setQueryData(
        queryKey,
        (eskiDeyerler: NotificationSettings | null | undefined) => ({
          ...defoltDeyerler,
          ...(eskiDeyerler ?? {}),
          profile_id: userId ?? "",
          [sutun]: deyer,
        }),
      );
      return { oncekiDeyer };
    },
    onError: (_xeta, _deyisenler, context) => {
      queryClient.setQueryData(queryKey, context?.oncekiDeyer ?? null);
      toast.error("Parametr yenilənmədi. Yenidən cəhd edin.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const setir = <T extends NovSutunu | KanalSutunu>(item: SettingMeta<T>, index: number, kanal = false) => {
    const aktiv = Boolean(goruntulenenDeyerler[item.sutun]);
    const gozleyir = yenileMutasiyasi.isPending && yenileMutasiyasi.variables?.sutun === item.sutun;
    const Icon = item.icon;

    return (
      <li
        key={item.sutun}
        className={`notification-settings-row ${kanal ? "notification-settings-channel" : ""} ${aktiv ? "is-active" : ""}`}
        style={{ animationDelay: `${100 + index * 55}ms` }}
      >
        <span className="notification-settings-row__icon" aria-hidden>
          <Icon className="size-5" />
        </span>

        <div className="notification-settings-row__copy">
          <div className="notification-settings-row__title">{item.ad}</div>
          <div className="notification-settings-row__description">{item.aciqlama}</div>
          <div className="notification-settings-row__state">
            <span className="notification-settings-row__state-dot" />
            {aktiv ? "Aktivdir" : "Söndürülüb"}
          </div>
        </div>

        <div className="notification-settings-row__control">
          {gozleyir ? <span className="notification-settings-row__pending" aria-hidden /> : null}
          <NotificationSwitch
            ariaLabel={item.ad}
            checked={aktiv}
            disabled={gozleyir}
            onCheckedChange={(v) => yenileMutasiyasi.mutate({ sutun: item.sutun, deyer: v })}
          />
        </div>
      </li>
    );
  };

  return (
    <div className="notification-settings-page">
      <header className="notification-settings-hero">
        <span aria-hidden className="notification-settings-hero__accent" />
        <span aria-hidden className="notification-settings-hero__grid" />
        <span aria-hidden className="notification-settings-hero__glow" />
        <span aria-hidden className="notification-settings-hero__sweep" />

        <div className="notification-settings-hero__content">
          <button type="button" className="notification-settings-hero__back" aria-label="Geri" onClick={() => router.history.back()}>
            <ArrowLeft className="size-5" />
          </button>

          <div className="notification-settings-hero__copy">
            <div className="notification-settings-hero__eyebrow">
              <span className="notification-settings-hero__eyebrow-dot" />
              Bildiriş idarəetmə mərkəzi
            </div>
            <h1 className="notification-settings-hero__title">Bildiriş parametrləri</h1>
            <p className="notification-settings-hero__subtitle">
              Hansı yenilikləri və hansı kanallardan almaq istədiyinizi bir məkanda idarə edin.
            </p>
          </div>

          <div className="notification-settings-hero__summary" aria-label="Bildiriş parametrlərinin xülasəsi">
            <div className="notification-settings-hero__stat">
              <strong>{aktivNovSayi}/{novler.length}</strong>
              <span>Aktiv növ</span>
            </div>
            <div className="notification-settings-hero__stat">
              <strong>{aktivKanalSayi}/{kanallar.length}</strong>
              <span>Aktiv kanal</span>
            </div>
            <div className="notification-settings-hero__signal" aria-hidden>
              <span className="notification-settings-hero__signal-ring" />
              <span className="notification-settings-hero__signal-ring" />
              <span className="notification-settings-hero__signal-ring" />
              <span className="notification-settings-hero__signal-core"><Bell className="size-5" /></span>
            </div>
          </div>
        </div>
      </header>

      <div className="notification-settings-grid">
        <section className="notification-settings-panel">
          <div className="notification-settings-panel__head">
            <span className="notification-settings-panel__icon"><Bell className="size-5" /></span>
            <div className="notification-settings-panel__title-wrap">
              <h2 className="notification-settings-panel__title">Bildiriş növləri</h2>
              <p className="notification-settings-panel__desc">Sizə hansı mövzularda bildiriş göndəriləcəyini seçin.</p>
            </div>
            <span className="notification-settings-panel__count">{aktivNovSayi} aktiv</span>
          </div>

          {isLoading ? (
            <div className="notification-settings-list">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="notification-settings-skeleton" />)}
            </div>
          ) : (
            <ul className="notification-settings-list">{novler.map((item, index) => setir(item, index))}</ul>
          )}
        </section>

        <section className="notification-settings-panel">
          <div className="notification-settings-panel__head">
            <span className="notification-settings-panel__icon"><Send className="size-5" /></span>
            <div className="notification-settings-panel__title-wrap">
              <h2 className="notification-settings-panel__title">Bildiriş kanalları</h2>
              <p className="notification-settings-panel__desc">Yeniliklərin sizə necə çatdırılacağını idarə edin.</p>
            </div>
            <span className="notification-settings-panel__count">{aktivKanalSayi} aktiv</span>
          </div>

          {isLoading ? (
            <div className="notification-settings-list">
              {Array.from({ length: 2 }).map((_, index) => <div key={index} className="notification-settings-skeleton" />)}
            </div>
          ) : (
            <ul className="notification-settings-list">{kanallar.map((item, index) => setir(item, index, true))}</ul>
          )}

          <div className="notification-settings-panel__note">
            Kanal seçimləri bildiriş növlərindən ayrıdır. Hansı mövzuların aktiv olduğunu soldakı paneldən ayrıca idarə edə bilərsiniz.
          </div>
        </section>
      </div>
    </div>
  );
}
