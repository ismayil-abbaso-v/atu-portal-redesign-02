import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, EyeOff, KeyRound, Laptop, Loader2, LogOut, MapPin, MonitorSmartphone, QrCode, RefreshCw, ShieldCheck, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { SettingsPageHero } from "@/components/menu/SettingsPageHero";
import securityHero from "@/assets/security-settings-hero.webp";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import "@/settings-redesign.css";

export const Route = createFileRoute("/_authenticated/menyu/tehlukesizlik")({
  head: () => ({ meta: [{ title: "Təhlükəsizlik — ATU Şəxsi Kabinet" }, { name: "description", content: "Şifrə, iki faktorlu identifikasiya və aktiv sessiyaların idarəsi." }] }),
  component: TehlukesizlikSehifesi,
});

type Locale = "az" | "tr" | "en" | "ru";
type Sessiya = { id: string; session_id: string; cihaz: string; brauzer: string | null; ip: string | null; seher: string | null; olke: string | null; son_aktivlik: string };
type Presentation = { device: string; browser: string; mobile: boolean };
type ClientInfo = { presentation: Presentation; ip: string | null; city: string | null; country: string | null };

const SECURITY_HERO: Record<Locale, { eyebrow: string; subtitle: string; quote: string }> = {
  az: { eyebrow: "HESAB TƏHLÜKƏSİZLİYİ", subtitle: "Şifrənizi, iki faktorlu doğrulamanı və aktiv sessiyalarınızı bir məkandan idarə edin.", quote: "Təhlükəsiz hesab, etibarlı rəqəmsal təcrübə." },
  tr: { eyebrow: "HESAP GÜVENLİĞİ", subtitle: "Şifrenizi, iki faktörlü doğrulamayı ve aktif oturumlarınızı tek yerden yönetin.", quote: "Güvenli hesap, güvenilir dijital deneyim." },
  en: { eyebrow: "ACCOUNT SECURITY", subtitle: "Manage your password, two-factor authentication and active sessions from one place.", quote: "A secure account enables a trusted digital experience." },
  ru: { eyebrow: "БЕЗОПАСНОСТЬ АККАУНТА", subtitle: "Управляйте паролем, двухфакторной аутентификацией и активными сеансами в одном месте.", quote: "Защищённый аккаунт — основа надёжного цифрового опыта." },
};

const text: Record<Locale, Record<string, string>> = {
  az: {
    title: "Təhlükəsizlik", loginSecurity: "Giriş və Təhlükəsizlik", password: "Şifrə", lastUpdated: "Son yenilənmə", never: "Heç vaxt", change: "Dəyişdir", twoFactor: "İki mərhələli doğrulama", twoFactorActive: "Aktivdir və giriş zamanı kod tələb olunur.", extraSecurity: "Əlavə təhlükəsizlik", sessions: "Aktiv Sessiyalar", logoutAll: "Hamısından çıx", noSessions: "Aktiv sessiya tapılmadı", refresh: "Yenilə", thisDevice: "BU CİHAZ", unknownDevice: "Naməlum cihaz", unknownBrowser: "Naməlum brauzer", unknownCity: "Naməlum şəhər", unknownIp: "IP naməlum", now: "İndi", minute: "dəqiqə əvvəl", hour: "saat əvvəl", day: "gün əvvəl", month: "ay əvvəl", logoutDevice: "Sessiyadan çıx", passwordModal: "Şifrəni dəyişdir", newPassword: "Yeni şifrə", repeatPassword: "Yeni şifrəni təkrar edin", atLeast8: "Ən azı 8 simvol", lower: "Kiçik hərf", upper: "Böyük hərf", number: "Rəqəm", cancel: "Ləğv et", save: "Yadda saxla", passwordWeak: "Yeni şifrə ən azı 8 simvol, böyük və kiçik hərf, həmçinin rəqəm ehtiva etməlidir.", passwordMismatch: "Yeni şifrələr eyni deyil.", passwordSaveError: "Şifrə dəyişdirilə bilmədi.", passwordChanged: "Şifrəniz uğurla dəyişdirildi.", setup2fa: "2FA Qurulumu", authenticator: "Authenticator tətbiqi ilə hesabınızı qoruyun.", accountPassword: "HESAB ŞİFRİ", enterPassword: "Şifrənizi daxil edin", continue: "Davam et", scanQr: "Authenticator tətbiqi ilə QR kodu skan edin.", manualKey: "ƏL İLƏ DAXİL ETMƏK ÜÇÜN AÇAR", copyKey: "Açarı kopyala", copied: "Açar kopyalandı.", copyError: "Açar kopyalana bilmədi.", code: "6 rəqəmli kod", verify: "Təsdiqlə", invalidCode: "Təsdiq kodu yanlışdır.", twoFactorEnabled: "İki faktorlu identifikasiya aktiv edildi.", twoFactorDisabled: "İki faktorlu identifikasiya söndürüldü.", disable2fa: "2FA-nı söndür", disableConfirm: "Authenticator kodunu daxil edərək 2FA-nı söndürün.", close: "Bağla", confirmLogout: "Sessiyadan çıxış", confirmLogoutDescription: "Bu cihazdakı sessiya ləğv ediləcək. Davam etmək istəyirsiniz?", confirmAll: "Bütün sessiyalardan çıxış", confirmAllDescription: "Hesabınız bütün cihazlarda sessiyadan çıxarılacaq.", confirm: "Təsdiqlə", sessionError: "Aktiv sessiyalar yüklənmədi.", revokeError: "Sessiya ləğv edilə bilmədi. Yenidən cəhd edin.", selectedLoggedOut: "Seçilmiş cihaz sessiyadan çıxarıldı.", allLogoutError: "Bütün sessiyalardan çıxış mümkün olmadı.", ipLocationError: "Məkan məlumatı alınmadı." },
  tr: {
    title: "Güvenlik", loginSecurity: "Giriş ve Güvenlik", password: "Şifre", lastUpdated: "Son güncelleme", never: "Hiçbir zaman", change: "Değiştir", twoFactor: "İki aşamalı doğrulama", twoFactorActive: "Aktif ve giriş sırasında kod gerekiyor.", extraSecurity: "Ek güvenlik", sessions: "Aktif Oturumlar", logoutAll: "Tümünden çık", noSessions: "Aktif oturum bulunamadı", refresh: "Yenile", thisDevice: "BU CİHAZ", unknownDevice: "Bilinmeyen cihaz", unknownBrowser: "Bilinmeyen tarayıcı", unknownCity: "Bilinmeyen şehir", unknownIp: "IP bilinmiyor", now: "Şimdi", minute: "dakika önce", hour: "saat önce", day: "gün önce", month: "ay önce", logoutDevice: "Oturumu kapat", passwordModal: "Şifreyi değiştir", newPassword: "Yeni şifre", repeatPassword: "Yeni şifreyi tekrar edin", atLeast8: "En az 8 karakter", lower: "Küçük harf", upper: "Büyük harf", number: "Rakam", cancel: "İptal", save: "Kaydet", passwordWeak: "Yeni şifre en az 8 karakter, büyük ve küçük harf ve rakam içermelidir.", passwordMismatch: "Yeni şifreler aynı değil.", passwordSaveError: "Şifre değiştirilemedi.", passwordChanged: "Şifreniz başarıyla değiştirildi.", setup2fa: "2FA Kurulumu", authenticator: "Authenticator uygulamasıyla hesabınızı koruyun.", accountPassword: "HESAP ŞİFRESİ", enterPassword: "Şifrenizi girin", continue: "Devam et", scanQr: "Authenticator uygulamasıyla QR kodunu tarayın.", manualKey: "ELLE GİRİŞ İÇİN ANAHTAR", copyKey: "Anahtarı kopyala", copied: "Anahtar kopyalandı.", copyError: "Anahtar kopyalanamadı.", code: "6 haneli kod", verify: "Doğrula", invalidCode: "Doğrulama kodu yanlış.", twoFactorEnabled: "İki aşamalı doğrulama etkinleştirildi.", twoFactorDisabled: "İki aşamalı doğrulama kapatıldı.", disable2fa: "2FA'yı kapat", disableConfirm: "2FA'yı kapatmak için Authenticator kodunu girin.", close: "Kapat", confirmLogout: "Oturumu kapat", confirmLogoutDescription: "Bu cihazdaki oturum iptal edilecek. Devam etmek istiyor musunuz?", confirmAll: "Tüm oturumlardan çık", confirmAllDescription: "Hesabınız tüm cihazlardaki oturumlardan çıkarılacak.", confirm: "Onayla", sessionError: "Aktif oturumlar yüklenemedi.", revokeError: "Oturum iptal edilemedi. Tekrar deneyin.", selectedLoggedOut: "Seçilen cihazın oturumu kapatıldı.", allLogoutError: "Tüm oturumlardan çıkılamadı.", ipLocationError: "Konum bilgisi alınamadı." },
  en: {
    title: "Security", loginSecurity: "Login & Security", password: "Password", lastUpdated: "Last updated", never: "Never", change: "Change", twoFactor: "Two-factor authentication", twoFactorActive: "Enabled and required during sign-in.", extraSecurity: "Additional security", sessions: "Active Sessions", logoutAll: "Sign out all", noSessions: "No active sessions found", refresh: "Refresh", thisDevice: "THIS DEVICE", unknownDevice: "Unknown device", unknownBrowser: "Unknown browser", unknownCity: "Unknown city", unknownIp: "IP unknown", now: "Now", minute: "minutes ago", hour: "hours ago", day: "days ago", month: "months ago", logoutDevice: "Sign out", passwordModal: "Change password", newPassword: "New password", repeatPassword: "Repeat new password", atLeast8: "At least 8 characters", lower: "Lowercase", upper: "Uppercase", number: "Number", cancel: "Cancel", save: "Save", passwordWeak: "The new password must contain at least 8 characters, an uppercase letter, a lowercase letter, and a number.", passwordMismatch: "The new passwords do not match.", passwordSaveError: "The password could not be changed.", passwordChanged: "Your password was changed successfully.", setup2fa: "2FA Setup", authenticator: "Protect your account with an authenticator app.", accountPassword: "ACCOUNT PASSWORD", enterPassword: "Enter your password", continue: "Continue", scanQr: "Scan the QR code with your authenticator app.", manualKey: "KEY FOR MANUAL ENTRY", copyKey: "Copy key", copied: "Key copied.", copyError: "Could not copy the key.", code: "6-digit code", verify: "Verify", invalidCode: "The verification code is incorrect.", twoFactorEnabled: "Two-factor authentication enabled.", twoFactorDisabled: "Two-factor authentication disabled.", disable2fa: "Disable 2FA", disableConfirm: "Enter your authenticator code to disable 2FA.", close: "Close", confirmLogout: "Sign out session", confirmLogoutDescription: "This device session will be revoked. Do you want to continue?", confirmAll: "Sign out all sessions", confirmAllDescription: "Your account will be signed out on all devices.", confirm: "Confirm", sessionError: "Active sessions could not be loaded.", revokeError: "The session could not be revoked. Please try again.", selectedLoggedOut: "The selected device was signed out.", allLogoutError: "Could not sign out all sessions.", ipLocationError: "Location information could not be retrieved." },
  ru: {
    title: "Безопасность", loginSecurity: "Вход и безопасность", password: "Пароль", lastUpdated: "Последнее обновление", never: "Никогда", change: "Изменить", twoFactor: "Двухэтапная проверка", twoFactorActive: "Включена и требуется при входе.", extraSecurity: "Дополнительная безопасность", sessions: "Активные сеансы", logoutAll: "Выйти из всех", noSessions: "Активные сеансы не найдены", refresh: "Обновить", thisDevice: "ЭТО УСТРОЙСТВО", unknownDevice: "Неизвестное устройство", unknownBrowser: "Неизвестный браузер", unknownCity: "Неизвестный город", unknownIp: "IP неизвестен", now: "Сейчас", minute: "мин назад", hour: "ч назад", day: "дн назад", month: "мес назад", logoutDevice: "Выйти", passwordModal: "Изменить пароль", newPassword: "Новый пароль", repeatPassword: "Повторите новый пароль", atLeast8: "Не менее 8 символов", lower: "Строчная буква", upper: "Заглавная буква", number: "Цифра", cancel: "Отмена", save: "Сохранить", passwordWeak: "Новый пароль должен содержать не менее 8 символов, прописную и строчную буквы и цифру.", passwordMismatch: "Новые пароли не совпадают.", passwordSaveError: "Не удалось изменить пароль.", passwordChanged: "Пароль успешно изменён.", setup2fa: "Настройка 2FA", authenticator: "Защитите аккаунт с помощью приложения-аутентификатора.", accountPassword: "ПАРОЛЬ АККАУНТА", enterPassword: "Введите пароль", continue: "Продолжить", scanQr: "Отсканируйте QR-код приложением-аутентификатором.", manualKey: "КЛЮЧ ДЛЯ РУЧНОГО ВВОДА", copyKey: "Скопировать ключ", copied: "Ключ скопирован.", copyError: "Не удалось скопировать ключ.", code: "6-значный код", verify: "Подтвердить", invalidCode: "Неверный код подтверждения.", twoFactorEnabled: "Двухэтапная проверка включена.", twoFactorDisabled: "Двухэтапная проверка отключена.", disable2fa: "Отключить 2FA", disableConfirm: "Введите код аутентификатора, чтобы отключить 2FA.", close: "Закрыть", confirmLogout: "Выход из сеанса", confirmLogoutDescription: "Сеанс этого устройства будет отозван. Продолжить?", confirmAll: "Выйти из всех сеансов", confirmAllDescription: "Аккаунт будет выведен из всех устройств.", confirm: "Подтвердить", sessionError: "Не удалось загрузить активные сеансы.", revokeError: "Не удалось отозвать сеанс. Попробуйте снова.", selectedLoggedOut: "Сеанс выбранного устройства завершён.", allLogoutError: "Не удалось выйти из всех сеансов.", ipLocationError: "Не удалось получить данные о местоположении." },
};

function relativeTime(value: string, locale: Locale, t: (key: string) => string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("now");
  if (minutes < 60) return `${minutes} ${t("minute")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t("hour")}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${t("day")}`;
  return `${Math.floor(days / 30)} ${t("month")}`;
}

function presentation(session: Pick<Sessiya, "cihaz" | "brauzer">, t: (key: string) => string): Presentation {
  const raw = `${session.cihaz ?? ""} ${session.brauzer ?? ""}`.trim();
  const mobile = /android|iphone|ipad|mobile/i.test(raw);
  let device = t("unknownDevice");
  if (/windows nt 10/i.test(raw)) device = "Windows 10";
  else if (/windows nt 6\.1/i.test(raw)) device = "Windows 7";
  else if (/mac os x|macintosh/i.test(raw)) device = "macOS";
  else if (/android/i.test(raw)) device = "Android";
  else if (/iphone/i.test(raw)) device = "iPhone";
  else if (/ipad/i.test(raw)) device = "iPad";
  else if (/linux/i.test(raw) && !/android/i.test(raw)) device = "Linux";
  let browser = t("unknownBrowser");
  const match = (pattern: RegExp, name: string) => { const found = raw.match(pattern); return found ? `${name} ${found[1]}` : null; };
  browser = match(/(?:Edg|Edge)\/(\d+(?:\.\d+){1,3})/i, "Edge") ?? match(/(?:OPR|Opera)\/(\d+(?:\.\d+){1,3})/i, "Opera") ?? match(/Chrome\/(\d+(?:\.\d+){1,3})/i, "Chrome") ?? match(/Firefox\/(\d+(?:\.\d+){1,3})/i, "Firefox") ?? match(/Version\/(\d+(?:\.\d+){1,3}).*Safari\//i, "Safari") ?? browser;
  return { device, browser, mobile };
}

function cleanIp(ip: string | null, t: (key: string) => string) { return (ip || t("unknownIp")).replace(/\/\d+$/, ""); }
function decodeSessionId(accessToken?: string) { try { const part = accessToken?.split(".")[1]; if (!part) return null; const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))); return typeof json.session_id === "string" ? json.session_id : null; } catch { return null; } }
function isBrowserSession(session: Sessiya) { const raw = `${session.cihaz ?? ""} ${session.brauzer ?? ""}`.toLowerCase(); return !/deno\/|supabaseedgeruntime|supabase edge runtime|edge runtime/.test(raw) && /mozilla\/|chrome\/|firefox\/|safari\/|edg\/|opr\/|opera\//.test(raw); }
function qrMarkup(value: string) { const qr = value.trim(); if (qr.startsWith("data:image/")) return { type: "image" as const, value: qr }; if (qr.includes("<svg")) return { type: "svg" as const, value: qr.slice(qr.indexOf("<svg")) }; return { type: "image" as const, value: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}` }; }

function TehlukesizlikSehifesi() {
  const { locale: activeLocale, t: baseT } = useI18n();
  const locale = activeLocale as Locale;
  const t = (key: string) => text[locale][key] ?? text.az[key] ?? baseT(key);
  const [sessions, setSessions] = useState<Sessiya[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [disableMfaOpen, setDisableMfaOpen] = useState(false);
  const [confirmSession, setConfirmSession] = useState<Sessiya | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaSetupPassword, setMfaSetupPassword] = useState("");
  const [mfaRegistration, setMfaRegistration] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [showMfaPassword, setShowMfaPassword] = useState(false);
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);
  const mfaRefs = useRef<Array<HTMLInputElement | null>>([]);
  const disableRefs = useRef<Array<HTMLInputElement | null>>([]);

  const passwordStrong = useMemo(() => ({ length: newPassword.length >= 8, lower: /[a-zəğıöüçş]/.test(newPassword), upper: /[A-ZƏĞİÖÜÇŞ]/.test(newPassword), number: /\d/.test(newPassword) }), [newPassword]);

  const getClientInfo = async (): Promise<ClientInfo> => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const clientPresentation = presentation({ cihaz: ua, brauzer: ua }, t);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);
      const response = await fetch("https://ipapi.co/json/", { headers: { Accept: "application/json" }, signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) return { presentation: clientPresentation, ip: null, city: null, country: null };
      const data = await response.json();
      return { presentation: clientPresentation, ip: typeof data.ip === "string" ? data.ip : null, city: typeof data.city === "string" ? data.city : null, country: typeof data.country_name === "string" ? data.country_name : null };
    } catch { return { presentation: clientPresentation, ip: null, city: null, country: null }; }
  };

  const loadSecurity = async () => {
    setLoading(true);
    const [{ data: authData }, { data: authSession }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
    if (!authData.user) { setLoading(false); return; }
    const current = decodeSessionId(authSession.session?.access_token);
    setCurrentId(current);
    setClientInfo(await getClientInfo());
    setLastPasswordChange(localStorage.getItem(`atu-password-changed-at:${authData.user.id}`));
    const { data, error } = await (supabase as any).rpc("list_own_auth_sessions");
    if (error) toast.error(t("sessionError"));
    else {
      const all = ((data ?? []) as Sessiya[]).filter(isBrowserSession);
      setSessions(current && !all.some((item) => item.session_id === current) ? [{ id: "current", session_id: current, cihaz: navigator.userAgent, brauzer: navigator.userAgent, ip: null, seher: null, olke: null, son_aktivlik: new Date().toISOString() }, ...all] : all);
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    setMfaFactorId(factors?.totp?.find((factor) => factor.status === "verified")?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { void loadSecurity(); }, [activeLocale]);

  const closePassword = () => { if (passwordSaving) return; setPasswordOpen(false); setNewPassword(""); setRepeatPassword(""); };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordStrong.length || !passwordStrong.lower || !passwordStrong.upper || !passwordStrong.number) return toast.error(t("passwordWeak"));
    if (newPassword !== repeatPassword) return toast.error(t("passwordMismatch"));
    setPasswordSaving(true);
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) return toast.error(t("passwordSaveError"));
    const changed = new Date().toISOString();
    if (data.user?.id) localStorage.setItem(`atu-password-changed-at:${data.user.id}`, changed);
    setLastPasswordChange(changed); toast.success(t("passwordChanged")); closePassword();
  };

  const startMfa = async () => {
    if (!mfaSetupPassword) return;
    setMfaLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email) { setMfaLoading(false); return; }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password: mfaSetupPassword });
    if (reauthError) { setMfaLoading(false); return toast.error(t("passwordSaveError")); }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "ATU Şəxsi Kabinet" });
    setMfaLoading(false);
    if (error || !data) return toast.error(error?.message || t("passwordSaveError"));
    setMfaRegistration({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }); setMfaSetupPassword("");
  };

  const verifyMfa = async () => {
    if (!mfaRegistration || mfaCode.length !== 6) return;
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaRegistration.factorId, code: mfaCode });
    setMfaLoading(false);
    if (error) return toast.error(t("invalidCode"));
    setMfaFactorId(mfaRegistration.factorId); setMfaRegistration(null); setMfaCode(""); setMfaOpen(false); toast.success(t("twoFactorEnabled"));
  };

  const disableMfa = async () => {
    if (!mfaFactorId || disableCode.length !== 6) return;
    setMfaLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: disableCode });
    if (verifyError) { setMfaLoading(false); return toast.error(t("invalidCode")); }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    setMfaLoading(false);
    if (error) return toast.error(t("passwordSaveError"));
    setMfaFactorId(null); setDisableCode(""); setDisableMfaOpen(false); await supabase.auth.refreshSession(); toast.success(t("twoFactorDisabled"));
  };

  const revokeSession = async (session: Sessiya) => {
    setSessionLoading(true);
    const isCurrent = session.session_id === currentId;
    const { data, error } = await (supabase as any).rpc("revoke_own_auth_session", { p_session_id: session.session_id });
    if (error || data !== true) { setSessionLoading(false); return toast.error(t("revokeError")); }
    await (supabase as any).from("sessions_log").delete().eq("session_id", session.session_id);
    setSessions((items) => items.filter((item) => item.session_id !== session.session_id)); setConfirmSession(null); setSessionLoading(false);
    if (isCurrent) return void (await supabase.auth.signOut({ scope: "local" }));
    toast.success(t("selectedLoggedOut"));
  };

  const revokeAll = async () => {
    setSessionLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSessionLoading(false);
    if (error) return toast.error(t("allLogoutError"));
    setSessions([]); setConfirmAll(false);
  };

  const codeInput = (value: string, setter: (value: string) => void, refs: React.MutableRefObject<Array<HTMLInputElement | null>>, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1); const chars = Array.from(setter === setMfaCode ? mfaCode : disableCode); chars[index] = digit; setter(chars.join("").slice(0, 6)); if (digit && index < 5) refs.current[index + 1]?.focus();
  };
  const handleCodeKey = (event: KeyboardEvent<HTMLInputElement>, index: number, refs: React.MutableRefObject<Array<HTMLInputElement | null>>, value: string) => { if (event.key === "Backspace" && !value[index] && index > 0) refs.current[index - 1]?.focus(); };

  const qr = mfaRegistration ? qrMarkup(mfaRegistration.qr) : null;
  const passwordDate = lastPasswordChange ? new Date(lastPasswordChange).toLocaleDateString(activeLocale === "az" ? "az-AZ" : activeLocale === "tr" ? "tr-TR" : activeLocale === "ru" ? "ru-RU" : "en-US") : t("never");
  const hero = SECURITY_HERO[locale];

  return <div className="settings-page-stack security-settings-redesign">
    <SettingsPageHero image={securityHero} eyebrow={hero.eyebrow} title={t("title")} subtitle={hero.subtitle} quote={hero.quote} icon={<ShieldCheck />} backLabel={t("cancel")} />
    <div className="grid gap-4 xl:grid-cols-[38%_62%]">
      <section className="min-w-0 rounded-[24px] border border-border/50 bg-card p-5 shadow-sm">
        <h2 className="mb-6 text-[20px] font-bold tracking-tight text-foreground">{t("loginSecurity")}</h2>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-border/60 bg-background p-4"><div className="flex min-h-[82px] items-center gap-4"><span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-6" /></span><div className="min-w-0"><p className="text-[17px] font-semibold text-foreground">{t("password")}</p><p className="mt-1 text-sm text-muted-foreground">{t("lastUpdated")} <span className="font-medium text-foreground/80">{passwordDate}</span></p></div><button type="button" onClick={() => setPasswordOpen(true)} className="ml-auto shrink-0 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/15">{t("change")}</button></div></div>
          <div className="rounded-[20px] border border-border/60 bg-background p-4"><div className="flex min-h-[82px] items-center gap-4"><span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600"><ShieldCheck className="size-6" /></span><div className="min-w-0"><p className="text-[17px] font-semibold leading-6 text-foreground">{t("twoFactor")}</p><p className="mt-1 text-sm text-muted-foreground">{mfaFactorId ? t("twoFactorActive") : t("extraSecurity")}</p></div><button type="button" role="switch" aria-checked={Boolean(mfaFactorId)} aria-label={t("twoFactor")} onClick={() => mfaFactorId ? setDisableMfaOpen(true) : setMfaOpen(true)} className={`relative ml-auto h-8 w-14 shrink-0 rounded-full p-1 transition ${mfaFactorId ? "bg-primary" : "bg-muted-foreground/20"}`}><span className={`block size-6 rounded-full bg-white shadow-sm transition-transform ${mfaFactorId ? "translate-x-6" : "translate-x-0"}`} /></button></div></div>
        </div>
      </section>

      <section className="min-w-0 rounded-[24px] border border-border/50 bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><h2 className="text-[20px] font-bold tracking-tight text-foreground">{t("sessions")}</h2><button type="button" disabled={sessionLoading || sessions.length === 0} onClick={() => setConfirmAll(true)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"><LogOut className="size-4" />{t("logoutAll")}</button></div>
        <div className="max-h-[calc(100dvh-230px)] min-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin]">
          {loading ? <div className="flex min-h-[390px] items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div> : sessions.length === 0 ? <div className="flex min-h-[390px] flex-col items-center justify-center rounded-[20px] border border-dashed border-border text-center"><MonitorSmartphone className="mb-3 size-9 text-muted-foreground/50" /><p className="font-semibold text-foreground">{t("noSessions")}</p><button type="button" onClick={() => void loadSecurity()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><RefreshCw className="size-4" />{t("refresh")}</button></div> : <ul className="space-y-3">{sessions.map((session) => { const current = session.session_id === currentId; const p = current && clientInfo ? clientInfo.presentation : presentation(session, t); const ip = current && clientInfo?.ip ? clientInfo.ip : cleanIp(session.ip, t); const city = current && clientInfo?.city ? clientInfo.city : session.seher || t("unknownCity"); const country = current && clientInfo?.country ? `, ${clientInfo.country}` : session.olke ? `, ${session.olke}` : ""; return <li key={session.session_id} className={`rounded-[20px] border p-3.5 transition ${current ? "border-emerald-300/80 bg-emerald-50/55 dark:bg-emerald-950/10" : "border-border/60 bg-background hover:border-primary/20"}`}><div className="flex items-center gap-3"><span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl ${current ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{p.mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-[16px] font-semibold text-foreground">{p.device} <span className="font-normal text-muted-foreground">•</span> {p.browser}</p>{current ? <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-extrabold tracking-wide text-emerald-700">{t("thisDevice")}</span> : null}</div><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{city}{country}</span><span>{ip}</span></div></div><div className="flex shrink-0 items-center gap-2"><span className={`text-sm font-semibold ${current ? "text-emerald-600" : "text-muted-foreground"}`}>{relativeTime(session.son_aktivlik, locale, t)}</span><button type="button" aria-label={`${p.device} — ${t("logoutDevice")}`} disabled={sessionLoading} onClick={() => setConfirmSession(session)} className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><LogOut className="size-4" /></button></div></div></li>; })}</ul>}
        </div>
      </section>
    </div>

    {passwordOpen ? <Modal title={t("passwordModal")} onClose={closePassword}><form onSubmit={(event) => void changePassword(event)} className="space-y-5"><PasswordField id="new-password" label={t("newPassword")} value={newPassword} onChange={setNewPassword} show={showNewPassword} setShow={setShowNewPassword} /><PasswordField id="repeat-password" label={t("repeatPassword")} value={repeatPassword} onChange={setRepeatPassword} show={showRepeatPassword} setShow={setShowRepeatPassword} /><div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-3 text-xs"><Rule ok={passwordStrong.length} text={t("atLeast8")} /><Rule ok={passwordStrong.lower} text={t("lower")} /><Rule ok={passwordStrong.upper} text={t("upper")} /><Rule ok={passwordStrong.number} text={t("number")} /></div><div className="flex justify-end gap-2"><button type="button" onClick={closePassword} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">{t("cancel")}</button><button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{passwordSaving ? <Loader2 className="size-4 animate-spin" /> : null}{t("save")}</button></div></form></Modal> : null}

    {mfaOpen ? <Modal title={t("setup2fa")} onClose={() => { if (!mfaLoading) { setMfaOpen(false); setMfaRegistration(null); setMfaCode(""); setMfaSetupPassword(""); } }} wide>{!mfaRegistration ? <div className="space-y-5"><p className="text-center text-sm text-muted-foreground">{t("authenticator")}</p><PasswordField id="mfa-password" label={t("accountPassword")} value={mfaSetupPassword} onChange={setMfaSetupPassword} show={showMfaPassword} setShow={setShowMfaPassword} placeholder={t("enterPassword")} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setMfaOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">{t("cancel")}</button><button type="button" disabled={mfaLoading || !mfaSetupPassword} onClick={() => void startMfa()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{mfaLoading ? <Loader2 className="size-4 animate-spin" /> : null}{t("continue")}</button></div></div> : <div className="space-y-5"><p className="text-center text-sm text-muted-foreground">{t("scanQr")}</p><div className="mx-auto flex size-64 items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-inner ring-1 ring-border/50">{qr?.type === "svg" ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr.value }} /> : <img src={qr?.value} alt="2FA QR" className="size-full object-contain" />}</div><div className="rounded-2xl bg-muted/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("manualKey")}</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 break-all font-mono text-xs">{mfaRegistration.secret}</code><button type="button" onClick={() => navigator.clipboard.writeText(mfaRegistration.secret).then(() => toast.success(t("copied"))).catch(() => toast.error(t("copyError")))} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground hover:text-primary" aria-label={t("copyKey")}><Copy className="size-4" /></button></div></div><CodeBoxes value={mfaCode} setValue={setMfaCode} refs={mfaRefs} onSubmit={() => void verifyMfa()} t={t} loading={mfaLoading} /></div>}</Modal> : null}

    {disableMfaOpen ? <Modal title={t("disable2fa")} onClose={() => setDisableMfaOpen(false)}><p className="mb-5 text-sm text-muted-foreground">{t("disableConfirm")}</p><CodeBoxes value={disableCode} setValue={setDisableCode} refs={disableRefs} onSubmit={() => void disableMfa()} t={t} loading={mfaLoading} /><div className="mt-5 flex justify-end"><button type="button" onClick={() => setDisableMfaOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">{t("cancel")}</button></div></Modal> : null}

    {confirmSession ? <ConfirmModal title={t("confirmLogout")} description={t("confirmLogoutDescription")} onClose={() => setConfirmSession(null)} onConfirm={() => void revokeSession(confirmSession)} loading={sessionLoading} t={t} /> : null}
    {confirmAll ? <ConfirmModal title={t("confirmAll")} description={t("confirmAllDescription")} onClose={() => setConfirmAll(false)} onConfirm={() => void revokeAll()} loading={sessionLoading} t={t} /> : null}
  </div>;;
}

function PasswordField({ id, label, value, onChange, show, setShow, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (value: boolean) => void; placeholder?: string }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-bold text-foreground">{label}</label><div className="relative"><input id={id} value={value} onChange={(e) => onChange(e.target.value)} type={show ? "text" : "password"} placeholder={placeholder} autoComplete="new-password" className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-12 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></div>; }
function Rule({ ok, text }: { ok: boolean; text: string }) { return <span className={ok ? "font-semibold text-emerald-600" : "text-muted-foreground"}>{ok ? "✓ " : "○ "}{text}</span>; }
function CodeBoxes({ value, setValue, refs, onSubmit, t, loading }: { value: string; setValue: (value: string) => void; refs: React.MutableRefObject<Array<HTMLInputElement | null>>; onSubmit: () => void; t: (key: string) => string; loading: boolean }) { return <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("code")}</p><div className="flex justify-center gap-2">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(el) => { refs.current[index] = el; }} value={value[index] ?? ""} inputMode="numeric" maxLength={1} onChange={(e) => { const digit = e.target.value.replace(/\D/g, "").slice(-1); const chars = Array.from(value.padEnd(6, " ")); chars[index] = digit || " "; const next = chars.join("").trimEnd(); setValue(next); if (digit && index < 5) refs.current[index + 1]?.focus(); }} onKeyDown={(e) => { if (e.key === "Backspace" && !value[index] && index > 0) refs.current[index - 1]?.focus(); if (e.key === "Enter" && value.length === 6) onSubmit(); }} className="size-12 rounded-xl border border-border bg-background text-center text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" aria-label={`${t("code")} ${index + 1}`} />)}</div><button type="button" disabled={loading || value.length !== 6} onClick={onSubmit} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{t("verify")}</button></div>; }
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} max-h-[90dvh] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6`}><div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-xl font-bold text-foreground">{title}</h3><button type="button" onClick={onClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label="Close"><X className="size-4" /></button></div>{children}</div></div>; }
function ConfirmModal({ title, description, onClose, onConfirm, loading, t }: { title: string; description: string; onClose: () => void; onConfirm: () => void; loading: boolean; t: (key: string) => string }) { return <Modal title={title} onClose={onClose}><p className="text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">{t("cancel")}</button><button type="button" onClick={onConfirm} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{t("confirm")}</button></div></Modal>; }
