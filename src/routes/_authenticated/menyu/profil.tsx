import { createFileRoute } from "@tanstack/react-router";
import { AtSign, BadgeCheck, Building2, CalendarDays, Eye, GraduationCap, HeartHandshake, Mail, Pencil, Phone, Save, Star, Trash2, Upload, UserRound, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsPageHero } from "@/components/menu/SettingsPageHero";
import profileHero from "@/assets/profile-settings-hero.webp";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { SignedAvatarImg } from "@/components/common/SignedAvatar";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import "@/profile-premium.css";
import "@/settings-redesign.css";

export const Route = createFileRoute("/_authenticated/menyu/profil")({
  head: () => ({ meta: [{ title: "Profil parametrləri — ATU Şəxsi Kabinet" }, { name: "description", content: "Şəxsi, əlaqə və akademik məlumatlarınız." }] }),
  component: ProfilSehifesi,
});

type Profil = Database["public"]["Tables"]["profiles"]["Row"];
type ProfilUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type Locale = "az" | "tr" | "en" | "ru";

type Msg = Record<string, string>;
const M: Record<Locale, Msg> = {
  az: { title:"Profil parametrləri", personal:"Şəxsi məlumatlar", contact:"Əlaqə Məlumatı", academic:"Akademik məlumat", username:"İstifadəçi adı", status:"Vəziyyət", social:"Sosial vəziyyət", edit:"Redaktə et", save:"Yadda saxla", cancel:"Ləğv et", loading:"Yüklənir...", notFound:"Profil məlumatı tapılmadı.", loadError:"Profil məlumatları yüklənmədi.", adminOnly:"Profil məlumatlarını yalnız admin dəyişə bilər.", saved:"Profil yadda saxlanıldı.", saveError:"Profil yadda saxlanmadı.", changePhoto:"Profil şəklini dəyiş", photoHelp:"Şəklinizlə bağlı əməliyyatı seçin.", addPhoto:"Yeni şəkil əlavə et", addPhotoHelp:"Cihazınızdan şəkil seçin və yerləşdirin", viewPhoto:"Şəkilə bax", viewPhotoHelp:"Mövcud profil şəklini açın", deletePhoto:"Şəkli sil", deletePhotoHelp:"Profil şəklini hesabınızdan silin", close:"Bağla", deleteTitle:"Profil şəklini sil?", deleteText:"Bu əməliyyatdan sonra profilinizdə şəkil göstərilməyəcək.", deleted:"Profil şəkli silindi.", uploadError:"Profil şəkli yüklənmədi.", imageOnly:"Yalnız şəkil faylı seçin.", uploadSavedError:"Profil şəkli yadda saxlanmadı.", updated:"Profil şəkli yeniləndi.", deleteError:"Profil şəkli silinmədi.", fieldAdmin:"Bu sahələri yalnız admin dəyişə bilər." },
  tr: { title:"Profil ayarları", personal:"Kişisel bilgiler", contact:"İletişim Bilgileri", academic:"Akademik bilgiler", username:"Kullanıcı adı", status:"Durum", social:"Sosyal durum", edit:"Düzenle", save:"Kaydet", cancel:"İptal", loading:"Yükleniyor...", notFound:"Profil bilgisi bulunamadı.", loadError:"Profil bilgileri yüklenemedi.", adminOnly:"Profil bilgilerini yalnızca yönetici değiştirebilir.", saved:"Profil kaydedildi.", saveError:"Profil kaydedilemedi.", changePhoto:"Profil fotoğrafını değiştir", photoHelp:"Fotoğrafınızla ilgili işlemi seçin.", addPhoto:"Yeni fotoğraf ekle", addPhotoHelp:"Cihazınızdan fotoğraf seçin ve yerleştirin", viewPhoto:"Fotoğrafa bak", viewPhotoHelp:"Mevcut profil fotoğrafını açın", deletePhoto:"Fotoğrafı sil", deletePhotoHelp:"Profil fotoğrafını hesabınızdan silin", close:"Kapat", deleteTitle:"Profil fotoğrafı silinsin mi?", deleteText:"Bu işlemden sonra profilinizde fotoğraf gösterilmeyecek.", deleted:"Profil fotoğrafı silindi.", uploadError:"Profil fotoğrafı yüklenemedi.", imageOnly:"Yalnızca resim dosyası seçin.", uploadSavedError:"Profil fotoğrafı kaydedilemedi.", updated:"Profil fotoğrafı güncellendi.", deleteError:"Profil fotoğrafı silinemedi.", fieldAdmin:"Bu alanları yalnızca yönetici değiştirebilir." },
  en: { title:"Profile settings", personal:"Personal information", contact:"Contact information", academic:"Academic information", username:"Username", status:"Status", social:"Social status", edit:"Edit", save:"Save", cancel:"Cancel", loading:"Loading...", notFound:"Profile information was not found.", loadError:"Profile information could not be loaded.", adminOnly:"Only an administrator can change profile information.", saved:"Profile saved.", saveError:"Profile could not be saved.", changePhoto:"Change profile picture", photoHelp:"Choose an action for your profile picture.", addPhoto:"Add new picture", addPhotoHelp:"Choose and position a picture from your device", viewPhoto:"View picture", viewPhotoHelp:"Open the current profile picture", deletePhoto:"Delete picture", deletePhotoHelp:"Remove the profile picture from your account", close:"Close", deleteTitle:"Delete profile picture?", deleteText:"Your profile will no longer show a picture after this action.", deleted:"Profile picture deleted.", uploadError:"Profile picture could not be uploaded.", imageOnly:"Please select an image file.", uploadSavedError:"Profile picture could not be saved.", updated:"Profile picture updated.", deleteError:"Profile picture could not be deleted.", fieldAdmin:"Only an administrator can change these fields." },
  ru: { title:"Настройки профиля", personal:"Личные данные", contact:"Контактные данные", academic:"Академические данные", username:"Имя пользователя", status:"Статус", social:"Социальный статус", edit:"Изменить", save:"Сохранить", cancel:"Отмена", loading:"Загрузка...", notFound:"Данные профиля не найдены.", loadError:"Не удалось загрузить данные профиля.", adminOnly:"Только администратор может изменять данные профиля.", saved:"Профиль сохранён.", saveError:"Не удалось сохранить профиль.", changePhoto:"Изменить фото профиля", photoHelp:"Выберите действие с фото профиля.", addPhoto:"Добавить фото", addPhotoHelp:"Выберите и разместите фото с устройства", viewPhoto:"Посмотреть фото", viewPhotoHelp:"Открыть текущее фото профиля", deletePhoto:"Удалить фото", deletePhotoHelp:"Удалить фото профиля из аккаунта", close:"Закрыть", deleteTitle:"Удалить фото профиля?", deleteText:"После этого действия фото больше не будет отображаться в профиле.", deleted:"Фото профиля удалено.", uploadError:"Не удалось загрузить фото профиля.", imageOnly:"Выберите файл изображения.", uploadSavedError:"Не удалось сохранить фото профиля.", updated:"Фото профиля обновлено.", deleteError:"Не удалось удалить фото профиля.", fieldAdmin:"Только администратор может изменять эти поля." },
};

const FIELDS = [
  ["ad", "AD"], ["soyad", "SOYAD"], ["ata_adi", "ATA ADI"], ["dogum_tarixi", "DOĞUM TARİXİ"], ["cins", "CİNS"], ["fin_kodu", "FİN KODU"],
  ["e_poct", "E-POÇT"], ["telefon", "TELEFON"], ["sheher", "ŞƏHƏR"], ["bolme", "BÖLMƏ"], ["fakulte", "FAKÜLTƏ"], ["qrup", "QRUP"],
  ["sinif", "SİNİF"], ["tedris_ili", "TƏDRİS İLİ"], ["tehsil_novu", "TƏHSİL NÖVÜ"], ["dim_bali", "DİM BALI"],
] as const;
const PROFILE_HERO: Record<Locale, { eyebrow: string; subtitle: string; quote: string }> = {
  az: { eyebrow: "MƏNİM PROFİLİM", subtitle: "Şəxsi, əlaqə və akademik məlumatlarınızı təhlükəsiz şəkildə nəzərdən keçirin və icazəniz daxilində yeniləyin.", quote: "Dəqiq məlumat, daha rahat tələbə təcrübəsi." },
  tr: { eyebrow: "PROFİLİM", subtitle: "Kişisel, iletişim ve akademik bilgilerinizi güvenli biçimde görüntüleyin ve yetkiniz dahilinde güncelleyin.", quote: "Doğru bilgi, daha rahat bir öğrenci deneyimi." },
  en: { eyebrow: "MY PROFILE", subtitle: "Review your personal, contact and academic information securely and update fields where your role permits.", quote: "Accurate information supports a smoother student experience." },
  ru: { eyebrow: "МОЙ ПРОФИЛЬ", subtitle: "Безопасно просматривайте личные, контактные и академические данные и обновляйте доступные поля.", quote: "Точные данные делают студенческий опыт удобнее." },
};

const FIELD_LABELS: Record<Locale, Record<string, string>> = {
  az: { ad:"AD", soyad:"SOYAD", ata_adi:"ATA ADI", dogum_tarixi:"DOĞUM TARİXİ", cins:"CİNS", fin_kodu:"FİN KODU", e_poct:"E-POÇT", telefon:"TELEFON", sheher:"ŞƏHƏR", bolme:"BÖLMƏ", fakulte:"FAKÜLTƏ", qrup:"QRUP", sinif:"SİNİF", tedris_ili:"TƏDRİS İLİ", tehsil_novu:"TƏHSİL NÖVÜ", dim_bali:"DİM BALI" },
  tr: { ad:"AD", soyad:"SOYAD", ata_adi:"BABA ADI", dogum_tarixi:"DOĞUM TARİHİ", cins:"CİNSİYET", fin_kodu:"FİN KODU", e_poct:"E-POSTA", telefon:"TELEFON", sheher:"ŞEHİR", bolme:"BÖLÜM", fakulte:"FAKÜLTE", qrup:"GRUP", sinif:"SINIF", tedris_ili:"ÖĞRETİM YILI", tehsil_novu:"EĞİTİM TÜRÜ", dim_bali:"DİM PUANI" },
  en: { ad:"FIRST NAME", soyad:"LAST NAME", ata_adi:"FATHER NAME", dogum_tarixi:"DATE OF BIRTH", cins:"GENDER", fin_kodu:"FIN CODE", e_poct:"EMAIL", telefon:"PHONE", sheher:"CITY", bolme:"DEPARTMENT", fakulte:"FACULTY", qrup:"GROUP", sinif:"CLASS", tedris_ili:"ACADEMIC YEAR", tehsil_novu:"EDUCATION TYPE", dim_bali:"ADMISSION SCORE" },
  ru: { ad:"ИМЯ", soyad:"ФАМИЛИЯ", ata_adi:"ИМЯ ОТЦА", dogum_tarixi:"ДАТА РОЖДЕНИЯ", cins:"ПОЛ", fin_kodu:"ФИН-КОД", e_poct:"ЭЛ. ПОЧТА", telefon:"ТЕЛЕФОН", sheher:"ГОРОД", bolme:"ОТДЕЛЕНИЕ", fakulte:"ФАКУЛЬТЕТ", qrup:"ГРУППА", sinif:"КЛАСС", tedris_ili:"УЧЕБНЫЙ ГОД", tehsil_novu:"ТИП ОБРАЗОВАНИЯ", dim_bali:"БАЛЛ DİM" },
};

function ProfilSehifesi() {
  const { roles, userId } = useUserRoles();
  const { locale } = useI18n();
  const lang = (locale as Locale) || "az";
  const t = (key: string) => M[lang][key] ?? M.az[key] ?? key;
  const label = (key: string) => FIELD_LABELS[lang][key] ?? FIELD_LABELS.az[key] ?? key;
  const [profil, setProfil] = useState<Profil | null>(null);
  const [forma, setForma] = useState<Profil | null>(null);
  const [redakte, setRedakte] = useState(false);
  const [yuklenir, setYuklenir] = useState(true);
  const [yuklenirAvatar, setYuklenirAvatar] = useState(false);
  const [avatarPaneli, setAvatarPaneli] = useState(false);
  const [avatarGoster, setAvatarGoster] = useState(false);
  const [silTesdiqi, setSilTesdiqi] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const faylRef = useRef<HTMLInputElement>(null);
  const admin = useMemo(() => roles.includes("admin"), [roles]);
  const hero = PROFILE_HERO[lang];

  useEffect(() => {
    if (!userId) return;
    let aktiv = true;
    void supabase.from("profiles").select("*").eq("user_id", userId).single().then(({ data, error }) => {
      if (!aktiv) return;
      if (error) toast.error(t("loadError"));
      else { setProfil(data as Profil); setForma(data as Profil); }
      setYuklenir(false);
    });
    return () => { aktiv = false; };
  }, [userId]);

  useEffect(() => {
    const open = avatarPaneli || avatarGoster || silTesdiqi;
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [avatarPaneli, avatarGoster, silTesdiqi]);

  const save = async () => {
    if (!admin) { setRedakte(false); toast.error(t("adminOnly")); return; }
    if (!userId || !forma) return;
    const payload: ProfilUpdate = {};
    for (const [field] of FIELDS) (payload as Record<string, unknown>)[field] = forma[field] === "" ? null : forma[field];
    const { data, error } = await supabase.from("profiles").update(payload).eq("user_id", userId).select("*").single();
    if (error) { toast.error(error.message.includes("yalnız admin") ? t("fieldAdmin") : t("saveError")); return; }
    setProfil(data as Profil); setForma(data as Profil); setRedakte(false); toast.success(t("saved"));
  };

  const avatarYukle = async (file?: File) => {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { toast.error(t("imageOnly")); return; }
    setYuklenirAvatar(true);
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: "image/webp" });
    if (uploadError) { toast.error(t("uploadError")); setYuklenirAvatar(false); return; }
    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: publicData.publicUrl }).eq("user_id", userId);
    if (error) toast.error(t("uploadSavedError"));
    else { setProfil((p) => p ? { ...p, avatar_url: publicData.publicUrl } : p); setAvatarCropFile(null); setAvatarPaneli(false); toast.success(t("updated")); }
    setYuklenirAvatar(false);
  };

  const avatarSil = async () => {
    if (!userId || !profil?.avatar_url) return;
    setYuklenirAvatar(true);
    const marker = "/avatars/";
    const i = profil.avatar_url.indexOf(marker);
    const path = i >= 0 ? decodeURIComponent(profil.avatar_url.slice(i + marker.length).split("?")[0] ?? "") : null;
    if (path) {
      const { error } = await supabase.storage.from("avatars").remove([path]);
      if (error) { toast.error(t("deleteError")); setYuklenirAvatar(false); return; }
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
    if (error) toast.error(t("uploadSavedError"));
    else { setProfil((p) => p ? { ...p, avatar_url: null } : p); setAvatarPaneli(false); setSilTesdiqi(false); toast.success(t("deleted")); }
    setYuklenirAvatar(false);
  };

  if (yuklenir) {
    return (
      <div className="settings-page-stack profile-settings-redesign">
        <SettingsPageHero
          variant="profile"
          image={profileHero}
          eyebrow={hero.eyebrow}
          title={t("title")}
          subtitle={hero.subtitle}
          quote={hero.quote}
          icon={<UserRound />}
          backLabel={t("cancel")}
        />
        <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (!profil || !forma) {
    return (
      <div className="settings-page-stack profile-settings-redesign">
        <SettingsPageHero
          variant="profile"
          image={profileHero}
          eyebrow={hero.eyebrow}
          title={t("title")}
          subtitle={hero.subtitle}
          quote={hero.quote}
          icon={<UserRound />}
          backLabel={t("cancel")}
        />
        <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground">
          {t("notFound")}
        </div>
      </div>
    );
  }

  return <div className="settings-page-stack profile-settings-redesign">
    <SettingsPageHero
      variant="profile"
      image={profileHero}
      eyebrow={hero.eyebrow}
      title={t("title")}
      subtitle={hero.subtitle}
      quote={hero.quote}
      icon={<UserRound />}
      backLabel={t("cancel")}
    />
    <div className="profile-premium-grid">
      <aside className="profile-premium-card">
        <div className="profile-premium-avatar-wrap">
          {profil.avatar_url ? <SignedAvatarImg src={profil.avatar_url} alt={t("photo")} className="profile-premium-avatar" /> : <div className="profile-premium-avatar flex items-center justify-center bg-muted text-muted-foreground"><UserRound className="size-16" /></div>}
          <button type="button" disabled={yuklenirAvatar} onClick={() => setAvatarPaneli(true)} aria-label={t("changePhoto")} className="profile-premium-avatar-edit disabled:opacity-50"><Pencil className="size-4" /></button>
          <input ref={faylRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) { setAvatarPaneli(false); setAvatarCropFile(file); } }} />
        </div>
        <h2 className="profile-premium-name">{profil.ad || ""} {profil.soyad || ""}</h2>
        <span className="profile-premium-department">{profil.bolme || "—"}</span>
        <dl className="profile-premium-meta text-sm">
          <Setir icon={AtSign} etiket={t("username")} deyer={profil.istifadeci_adi || "—"} />
          <div className="profile-premium-meta-row"><BadgeCheck className="size-4 text-muted-foreground" /><dt className="text-muted-foreground">{t("status")}</dt><dd className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">{profil.status}</dd></div>
          <Setir icon={HeartHandshake} etiket={t("social")} deyer={profil.sosial_veziyyet || "—"} />
        </dl>
      </aside>
      <div className="profile-premium-details">
        {admin && <div className="profile-premium-toolbar">{redakte ? <><button type="button" onClick={() => { setForma(profil); setRedakte(false); }} className="rounded-xl border border-border px-4 py-2 text-sm font-bold transition-colors hover:bg-muted">{t("cancel")}</button><button type="button" onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-[.98]"><Save className="size-4" />{t("save")}</button></> : <button type="button" onClick={() => setRedakte(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-[.98]"><Pencil className="size-4" />{t("edit")}</button>}</div>}
        <Bolme icon={UserRound} baslıq={t("personal")}><Xana sahə="ad" forma={forma} setForma={setForma} redakte={redakte && admin} label={label("ad")} /><Xana sahə="soyad" forma={forma} setForma={setForma} redakte={redakte && admin} label={label("soyad")} /><Xana sahə="ata_adi" forma={forma} setForma={setForma} redakte={redakte && admin} label={label("ata_adi")} /><Xana sahə="dogum_tarixi" forma={forma} setForma={setForma} redakte={redakte && admin} tip="date" label={label("dogum_tarixi")} /><Xana sahə="cins" forma={forma} setForma={setForma} redakte={redakte && admin} label={label("cins")} /><Xana sahə="fin_kodu" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} label={label("fin_kodu")} /></Bolme>
        <Bolme icon={Phone} baslıq={t("contact")}><Xana sahə="e_poct" forma={forma} setForma={setForma} redakte={redakte && admin} icon={Mail} label={label("e_poct")} /><Xana sahə="telefon" forma={forma} setForma={setForma} redakte={redakte && admin} icon={Phone} label={label("telefon")} /><Xana sahə="sheher" forma={forma} setForma={setForma} redakte={redakte && admin} icon={Building2} label={label("sheher")} /></Bolme>
        <Bolme icon={GraduationCap} baslıq={t("academic")}><Xana sahə="bolme" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} label={label("bolme")} /><Xana sahə="fakulte" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} label={label("fakulte")} /><Xana sahə="qrup" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} icon={Users} label={label("qrup")} /><Xana sahə="sinif" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} label={label("sinif")} /><Xana sahə="tedris_ili" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} icon={CalendarDays} label={label("tedris_ili")} /><Xana sahə="tehsil_novu" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} label={label("tehsil_novu")} /><Xana sahə="dim_bali" forma={forma} setForma={setForma} redakte={redakte && admin} disabled={!admin} tip="number" icon={Star} label={label("dim_bali")} /></Bolme>
      </div>
    </div>

    {avatarPaneli && <div className="fixed inset-0 z-[100] flex h-[100dvh] min-h-0 items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-panel-title" onMouseDown={(e) => { if (e.target === e.currentTarget) setAvatarPaneli(false); }}><div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-card p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div className="min-w-0 pr-3"><h3 id="avatar-panel-title" className="text-lg font-bold text-foreground">{t("changePhoto")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("photoHelp")}</p></div><button type="button" onClick={() => setAvatarPaneli(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label={t("close")}><X className="size-4" /></button></div><div className="space-y-2"><button type="button" disabled={yuklenirAvatar} onClick={() => faylRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted disabled:opacity-50"><span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Upload className="size-5" /></span><span><span className="block font-semibold text-foreground">{t("addPhoto")}</span><span className="block text-sm text-muted-foreground">{t("addPhotoHelp")}</span></span></button>{profil.avatar_url && <button type="button" onClick={() => setAvatarGoster(true)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted"><span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Eye className="size-5" /></span><span><span className="block font-semibold text-foreground">{t("viewPhoto")}</span><span className="block text-sm text-muted-foreground">{t("viewPhotoHelp")}</span></span></button>}{profil.avatar_url && <button type="button" disabled={yuklenirAvatar} onClick={() => setSilTesdiqi(true)} className="flex w-full items-center gap-3 rounded-2xl border border-destructive/30 p-4 text-left transition-colors hover:bg-destructive/5 disabled:opacity-50"><span className="inline-flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="size-5" /></span><span><span className="block font-semibold text-foreground">{t("deletePhoto")}</span><span className="block text-sm text-muted-foreground">{t("deletePhotoHelp")}</span></span></button>}</div><button type="button" onClick={() => setAvatarPaneli(false)} className="mt-4 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t("cancel")}</button></div></div>}
    <AvatarCropDialog file={avatarCropFile} open={Boolean(avatarCropFile)} loading={yuklenirAvatar} onCancel={() => setAvatarCropFile(null)} onConfirm={(file) => void avatarYukle(file)} />
    {avatarGoster && profil.avatar_url && <div className="fixed inset-0 z-[110] flex h-[100dvh] items-center justify-center overflow-auto overscroll-contain bg-black/70 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setAvatarGoster(false); }}><div className="relative my-auto max-w-lg"><SignedAvatarImg src={profil.avatar_url} alt={t("photo")} className="max-h-[calc(100dvh-2rem)] max-w-full rounded-3xl object-contain shadow-2xl" /><button type="button" onClick={() => setAvatarGoster(false)} className="absolute -right-2 -top-2 inline-flex size-9 items-center justify-center rounded-full bg-card text-foreground shadow-lg" aria-label={t("close")}><X className="size-4" /></button></div></div>}
    {silTesdiqi && <div className="fixed inset-0 z-[120] flex h-[100dvh] items-center justify-center overflow-auto overscroll-contain bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sil-title"><div className="my-auto w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"><h3 id="sil-title" className="text-lg font-bold text-foreground">{t("deleteTitle")}</h3><p className="mt-2 text-sm text-muted-foreground">{t("deleteText")}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setSilTesdiqi(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">{t("cancel")}</button><button type="button" disabled={yuklenirAvatar} onClick={() => void avatarSil()} className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">{t("deletePhoto")}</button></div></div></div>}
  </div>;;
}

type Icon = typeof UserRound;
function Setir({ icon: Icon, etiket, deyer }: { icon: Icon; etiket: string; deyer: string }) { return <div className="profile-premium-meta-row"><Icon className="size-4 text-muted-foreground" /><dt className="min-w-0 truncate text-muted-foreground">{etiket}</dt><dd className="max-w-[48%] truncate font-semibold text-foreground">{deyer}</dd></div>; }
function Bolme({ icon: Icon, baslıq, children }: { icon: Icon; baslıq: string; children: React.ReactNode }) { return <section className="profile-premium-section"><div className="profile-premium-section-heading"><span className="profile-premium-section-icon"><Icon className="size-5" /></span><h3 className="text-lg font-bold text-foreground">{baslıq}</h3></div><div className="profile-premium-fields">{children}</div></section>; }
function Xana({ sahə, forma, setForma, redakte, disabled, tip = "text", icon: Icon, label }: { sahə: string; forma: Profil; setForma: React.Dispatch<React.SetStateAction<Profil | null>>; redakte: boolean; disabled?: boolean; tip?: string; icon?: Icon; label: string }) { const raw = (forma as Record<string, unknown>)[sahə]; const value = raw === null || raw === undefined ? "" : String(raw); return <div className="profile-premium-field"><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{Icon ? <Icon className="size-4" /> : null}{label}</p>{redakte ? <input type={tip} value={value} disabled={disabled} onChange={(e) => setForma((p) => p ? { ...p, [sahə]: tip === "number" ? Number(e.target.value) : e.target.value } : p)} className="profile-premium-input disabled:cursor-not-allowed disabled:opacity-60" /> : <p className="mt-1.5 truncate font-semibold text-foreground">{value || "—"}</p>}</div>; }
