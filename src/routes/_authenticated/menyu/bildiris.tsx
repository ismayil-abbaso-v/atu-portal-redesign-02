import * as SwitchPrimitives from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
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
import { useEffect } from "react";
import { toast } from "sonner";

import notificationSettingsHero from "@/assets/notification-settings-hero.svg";
import { SettingsPageHero } from "@/components/menu/SettingsPageHero";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useI18n, type Locale } from "@/lib/i18n";
import "@/notification-settings-premium.css";
import "@/settings-redesign.css";

export const Route = createFileRoute("/_authenticated/menyu/bildiris")({
  head: () => ({
    meta: [
      { title: "ATU Portal" },
      { name: "description", content: "ATU Portal notification preferences" },
    ],
  }),
  component: BildirisParametrleri,
});

type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
type NovSutunu = keyof Omit<NotificationSettings, "profile_id" | "e_poct_kanali" | "push_kanali">;
type KanalSutunu = "e_poct_kanali" | "push_kanali";
type SettingMeta<T extends NovSutunu | KanalSutunu> = { sutun: T; icon: LucideIcon };

const novler: SettingMeta<NovSutunu>[] = [
  { sutun: "sistem", icon: Settings2 },
  { sutun: "tedbir", icon: CalendarDays },
  { sutun: "xeberdarliq", icon: CircleAlert },
  { sutun: "mukafat", icon: Gift },
  { sutun: "shexsi", icon: UserRound },
  { sutun: "sosial", icon: Users2 },
  { sutun: "xususi_gun", icon: Cake },
  { sutun: "elan", icon: Megaphone },
];

const kanallar: SettingMeta<KanalSutunu>[] = [
  { sutun: "e_poct_kanali", icon: Mail },
  { sutun: "push_kanali", icon: Smartphone },
];

const COPY = {
  az: {
    title: "Bildiriş parametrləri", eyebrow: "BİLDİRİŞ İDARƏETMƏSİ", subtitle: "Hansı yenilikləri və hansı kanallardan almaq istədiyinizi bir məkanda idarə edin.", quote: "Vacib məlumat sizə doğru zamanda çatmalıdır.",
    types: "Bildiriş növləri", typesDesc: "Sizə hansı mövzularda bildiriş göndəriləcəyini seçin.", channels: "Bildiriş kanalları", channelsDesc: "Yeniliklərin sizə necə çatdırılacağını idarə edin.", active: "Aktivdir", off: "Söndürülüb", activeShort: "aktiv", typeStat: "Aktiv növ", channelStat: "Aktiv kanal", note: "Kanal seçimləri bildiriş növlərindən ayrıdır. Hansı mövzuların aktiv olduğunu ayrıca idarə edə bilərsiniz.", error: "Parametr yenilənmədi. Yenidən cəhd edin.", back: "Geri",
    items: {
      sistem: ["Sistem", "Portal və hesabla bağlı vacib sistem yenilikləri."], tedbir: ["Tədbir", "Təqvim, görüş və akademik tədbir xatırlatmaları."], xeberdarliq: ["Xəbərdarlıq", "Diqqət tələb edən dəyişiklik və xəbərdarlıqlar."], mukafat: ["Mükafat", "Nailiyyət, mükafat və uğur bildirişləri."], shexsi: ["Şəxsi", "Birbaşa sizə aid fərdi məlumat və yeniliklər."], sosial: ["Sosial", "Qrup, söhbət və sosial fəaliyyət yenilikləri."], xususi_gun: ["Xüsusi Gün", "Əlamətdar tarixlər və xüsusi gün xatırlatmaları."], elan: ["Elan", "Universitet və portal üzrə yeni elanlar."], e_poct_kanali: ["E-poçt", "Seçilmiş bildirişləri qeydiyyat e-poçtunuza qəbul edin."], push_kanali: ["Push bildirişi", "Uyğun cihazlarda portal yeniliklərini anında görün."],
    },
  },
  tr: {
    title: "Bildirim ayarları", eyebrow: "BİLDİRİM YÖNETİMİ", subtitle: "Hangi güncellemeleri hangi kanallardan almak istediğinizi tek yerde yönetin.", quote: "Önemli bilgi size doğru zamanda ulaşmalıdır.",
    types: "Bildirim türleri", typesDesc: "Hangi konularda bildirim alacağınızı seçin.", channels: "Bildirim kanalları", channelsDesc: "Güncellemelerin size nasıl ulaşacağını yönetin.", active: "Aktif", off: "Kapalı", activeShort: "aktif", typeStat: "Aktif tür", channelStat: "Aktif kanal", note: "Kanal tercihleri bildirim türlerinden ayrıdır; aktif konuları ayrıca yönetebilirsiniz.", error: "Ayar güncellenemedi. Yeniden deneyin.", back: "Geri",
    items: {
      sistem: ["Sistem", "Portal ve hesapla ilgili önemli sistem güncellemeleri."], tedbir: ["Etkinlik", "Takvim, toplantı ve akademik etkinlik hatırlatmaları."], xeberdarliq: ["Uyarı", "Dikkat gerektiren değişiklikler ve uyarılar."], mukafat: ["Ödül", "Başarı ve ödül bildirimleri."], shexsi: ["Kişisel", "Doğrudan size ait bilgiler ve güncellemeler."], sosial: ["Sosyal", "Grup, sohbet ve sosyal etkinlik güncellemeleri."], xususi_gun: ["Özel Gün", "Önemli tarih ve özel gün hatırlatmaları."], elan: ["Duyuru", "Üniversite ve portal duyuruları."], e_poct_kanali: ["E-posta", "Seçili bildirimleri kayıtlı e-postanıza alın."], push_kanali: ["Push bildirimi", "Uyumlu cihazlarda portal güncellemelerini anında görün."],
    },
  },
  en: {
    title: "Notification settings", eyebrow: "NOTIFICATION CONTROL", subtitle: "Choose which updates you receive and how they reach you.", quote: "Important information should reach you at the right time.",
    types: "Notification types", typesDesc: "Choose the topics for which the portal should notify you.", channels: "Notification channels", channelsDesc: "Control how updates are delivered to you.", active: "Enabled", off: "Disabled", activeShort: "active", typeStat: "Active types", channelStat: "Active channels", note: "Channel choices are separate from notification types; manage active topics independently.", error: "The preference could not be updated. Try again.", back: "Back",
    items: {
      sistem: ["System", "Important portal and account system updates."], tedbir: ["Event", "Calendar, meeting and academic event reminders."], xeberdarliq: ["Warning", "Changes and alerts that require attention."], mukafat: ["Achievement", "Achievement and award notifications."], shexsi: ["Personal", "Updates addressed directly to you."], sosial: ["Social", "Group, chat and social activity updates."], xususi_gun: ["Special day", "Important date and special-day reminders."], elan: ["Announcement", "New university and portal announcements."], e_poct_kanali: ["Email", "Receive selected notifications at your registered email."], push_kanali: ["Push notification", "See portal updates instantly on compatible devices."],
    },
  },
  ru: {
    title: "Настройки уведомлений", eyebrow: "УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ", subtitle: "Выберите, какие обновления получать и по каким каналам.", quote: "Важная информация должна приходить вовремя.",
    types: "Типы уведомлений", typesDesc: "Выберите темы, по которым портал будет присылать уведомления.", channels: "Каналы уведомлений", channelsDesc: "Настройте способ доставки обновлений.", active: "Включено", off: "Выключено", activeShort: "активно", typeStat: "Активных типов", channelStat: "Активных каналов", note: "Каналы настраиваются отдельно от типов уведомлений; активные темы можно менять независимо.", error: "Не удалось обновить настройку. Повторите попытку.", back: "Назад",
    items: {
      sistem: ["Система", "Важные системные обновления портала и аккаунта."], tedbir: ["Событие", "Напоминания календаря, встреч и учебных событий."], xeberdarliq: ["Предупреждение", "Изменения и предупреждения, требующие внимания."], mukafat: ["Достижение", "Уведомления о достижениях и наградах."], shexsi: ["Личное", "Обновления, адресованные непосредственно вам."], sosial: ["Социальное", "Обновления групп, чатов и социальной активности."], xususi_gun: ["Особый день", "Напоминания о важных датах и особых днях."], elan: ["Объявление", "Новые объявления университета и портала."], e_poct_kanali: ["Эл. почта", "Получайте выбранные уведомления на зарегистрированную почту."], push_kanali: ["Push-уведомления", "Мгновенно получайте обновления портала на совместимых устройствах."],
    },
  },
} as const satisfies Record<Locale, {
  title: string; eyebrow: string; subtitle: string; quote: string; types: string; typesDesc: string; channels: string; channelsDesc: string; active: string; off: string; activeShort: string; typeStat: string; channelStat: string; note: string; error: string; back: string;
  items: Record<NovSutunu | KanalSutunu, readonly [string, string]>;
}>;

const defoltDeyerler: Omit<NotificationSettings, "profile_id"> = {
  sistem: true, tedbir: true, xeberdarliq: true, mukafat: true, shexsi: true, sosial: true, xususi_gun: true, elan: true, e_poct_kanali: false, push_kanali: false,
};

function NotificationSwitch({ checked, disabled, ariaLabel, onCheckedChange }: { checked: boolean; disabled: boolean; ariaLabel: string; onCheckedChange: (checked: boolean) => void }) {
  return (
    <SwitchPrimitives.Root
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className="relative inline-flex h-7 w-[52px] min-w-[52px] shrink-0 cursor-pointer items-center overflow-hidden rounded-full border p-[3px] shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_9%,transparent)] data-[state=unchecked]:border-foreground/20 data-[state=unchecked]:bg-foreground/10"
    >
      <SwitchPrimitives.Thumb className="block size-5 min-w-5 shrink-0 rounded-full border border-white/70 bg-white shadow-md transition-transform duration-200 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
  );
}

function BildirisParametrleri() {
  const { userId } = useUserRoles();
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryKey = ["notification-settings", userId] as const;

  useEffect(() => {
    document.title = `${copy.title} — ATU Portal`;
  }, [copy.title]);

  const { data: deyerler, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("notification_settings").select("*").eq("profile_id", userId).maybeSingle();
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
      const { error } = await supabase.from("notification_settings").upsert({ profile_id: userId, [sutun]: deyer } as never, { onConflict: "profile_id" });
      if (error) throw error;
    },
    onMutate: async ({ sutun, deyer }) => {
      await queryClient.cancelQueries({ queryKey });
      const oncekiDeyer = queryClient.getQueryData<NotificationSettings | null>(queryKey);
      queryClient.setQueryData(queryKey, (eskiDeyerler: NotificationSettings | null | undefined) => ({
        ...defoltDeyerler, ...(eskiDeyerler ?? {}), profile_id: userId ?? "", [sutun]: deyer,
      }));
      return { oncekiDeyer };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.oncekiDeyer ?? null);
      toast.error(copy.error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const setir = <T extends NovSutunu | KanalSutunu>(item: SettingMeta<T>, index: number, kanal = false) => {
    const aktiv = Boolean(goruntulenenDeyerler[item.sutun]);
    const gozleyir = yenileMutasiyasi.isPending && yenileMutasiyasi.variables?.sutun === item.sutun;
    const Icon = item.icon;
    const [name, description] = copy.items[item.sutun];

    return (
      <li key={item.sutun} className={`notification-settings-row ${kanal ? "notification-settings-channel" : ""} ${aktiv ? "is-active" : ""}`} style={{ animationDelay: `${index * 35}ms` }}>
        <span className="notification-settings-row__icon" aria-hidden><Icon className="size-5" /></span>
        <div className="notification-settings-row__copy">
          <div className="notification-settings-row__title">{name}</div>
          <div className="notification-settings-row__description">{description}</div>
          <div className="notification-settings-row__state"><span className="notification-settings-row__state-dot" />{aktiv ? copy.active : copy.off}</div>
        </div>
        <div className="notification-settings-row__control">
          {gozleyir ? <span className="notification-settings-row__pending" aria-hidden /> : null}
          <NotificationSwitch ariaLabel={name} checked={aktiv} disabled={gozleyir} onCheckedChange={(value) => yenileMutasiyasi.mutate({ sutun: item.sutun, deyer: value })} />
        </div>
      </li>
    );
  };

  return (
    <div className="notification-settings-page prompt8-notification-settings settings-page-stack">
      <SettingsPageHero image={notificationSettingsHero} eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} quote={copy.quote} icon={<Bell />} backLabel={copy.back} />

      <div className="notification-settings-grid">
        <section className="notification-settings-panel">
          <div className="notification-settings-panel__head">
            <span className="notification-settings-panel__icon"><Bell className="size-5" /></span>
            <div className="notification-settings-panel__title-wrap"><h2 className="notification-settings-panel__title">{copy.types}</h2><p className="notification-settings-panel__desc">{copy.typesDesc}</p></div>
            <span className="notification-settings-panel__count">{aktivNovSayi} {copy.activeShort}</span>
          </div>
          {isLoading ? <div className="notification-settings-list">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="notification-settings-skeleton" />)}</div> : <ul className="notification-settings-list">{novler.map((item, index) => setir(item, index))}</ul>}
        </section>

        <section className="notification-settings-panel">
          <div className="notification-settings-panel__head">
            <span className="notification-settings-panel__icon"><Send className="size-5" /></span>
            <div className="notification-settings-panel__title-wrap"><h2 className="notification-settings-panel__title">{copy.channels}</h2><p className="notification-settings-panel__desc">{copy.channelsDesc}</p></div>
            <span className="notification-settings-panel__count">{aktivKanalSayi} {copy.activeShort}</span>
          </div>
          {isLoading ? <div className="notification-settings-list">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="notification-settings-skeleton" />)}</div> : <ul className="notification-settings-list">{kanallar.map((item, index) => setir(item, index, true))}</ul>}
          <div className="notification-settings-panel__note">{copy.note}</div>
        </section>
      </div>
    </div>
  );
}
