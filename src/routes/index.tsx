import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { LoginGuardAlert, type LoginGuardState } from "@/components/auth/LoginGuardAlert";
import { supabase } from "@/integrations/supabase/client";
import atuLogo from "@/assets/atu-logo.webp";
import loginIllustration from "@/assets/login-illustration.png";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATU Şəxsi Kabinet — Giriş" },
      {
        name: "description",
        content: "Azərbaycan Texnologiya Universitetinin tələbə və müəllim şəxsi kabinetinə giriş.",
      },
      { property: "og:title", content: "ATU Şəxsi Kabinet — Giriş" },
      {
        property: "og:description",
        content: "Qiymətlər, davamiyyət, təqvim, kitabxana və sənədlər bir yerdə.",
      },
    ],
  }),
  component: GirisSehifesi,
});

type Rejim = "giris" | "sifre";
type T = (key: string, fallback?: string) => string;

type LoginResponse = {
  ok?: boolean;
  code?: string;
  error?: string;
  access_token?: string;
  refresh_token?: string;
  remaining_attempts?: number | null;
  locked_until?: string | null;
};

function authXetaMesaji(error: unknown, t: T): string {
  const xam = error instanceof Error ? error.message : String(error ?? "");
  const m = xam.toLowerCase();
  if (import.meta.env.DEV) console.error("[auth]", error);
  if (m.includes("invalid login credentials") || m.includes("istifadəçi adı və ya şifrə yanlışdır"))
    return t("auth.error.invalidCredentials", "İstifadəçi adı və ya şifrə yanlışdır.");
  if (m.includes("email not confirmed"))
    return t("auth.error.emailNotConfirmed", "E-poçt təsdiqlənməyib. Poçtunuzdakı təsdiq linkinə keçin.");
  if (m.includes("password should be") || m.includes("weak password"))
    return t("auth.error.weakPassword", "Şifrə çox zəifdir — ən azı 6 simvol olmalıdır.");
  if (m.includes("email address") && m.includes("invalid"))
    return t("auth.error.invalidEmail", "E-poçt ünvanı yanlışdır.");
  if (m.includes("rate limit") || m.includes("too many"))
    return t("auth.error.rateLimit", "Çox sayda cəhd edildi. Bir az sonra yenidən yoxlayın.");
  if (m.includes("session") && m.includes("expired"))
    return t("auth.error.sessionExpired", "Sessiya bitib. Yenidən daxil olun.");
  if (m.includes("failed to fetch") || m.includes("networkerror"))
    return t("auth.error.network", "Şəbəkə xətası. İnternet bağlantınızı yoxlayın.");
  return xam || t("auth.error.generic", "Xəta baş verdi.");
}

function GirisSehifesi() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [rejim, setRejim] = useState<Rejim>("giris");
  const [gosterSifre, setGosterSifre] = useState(false);
  const [yuklenir, setYuklenir] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaKod, setMfaKod] = useState("");
  const [loginGuard, setLoginGuard] = useState<LoginGuardState | null>(null);

  const hesabKilidli = rejim === "giris" && loginGuard?.kind === "locked";

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/ev", replace: true });
    });
  }, [navigate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (hesabKilidli) return;

    const form = new FormData(e.currentTarget);
    const identifikator = String(form.get("email") ?? "").trim();
    setYuklenir(true);

    try {
      if (rejim === "sifre") {
        const { error } = await supabase.auth.resetPasswordForEmail(identifikator, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success(t("auth.success.recovery", "Şifrə bərpa linki e-poçtunuza göndərildi."));
        setRejim("giris");
        return;
      }

      const password = String(form.get("password") ?? "");

      // Username və e-poçt girişlərinin hər ikisi eyni server-tərəfli endpointdən keçir.
      // Brute-force sayğacı browser/localStorage deyil, DB-də canonical hesab ID-si üzrə saxlanır.
      const { data, error: funksiyaXetasi } = await supabase.functions.invoke("auth-username-login", {
        body: { identifier: identifikator, password },
      });

      if (funksiyaXetasi) {
        throw new Error("Giriş müvəqqəti əlçatan deyil. Bir az sonra yenidən yoxlayın.");
      }

      const govde = (data ?? {}) as LoginResponse;
      if (!govde.ok) {
        if (govde.code === "ACCOUNT_LOCKED" && govde.locked_until) {
          setLoginGuard({ kind: "locked", lockedUntil: govde.locked_until });
          return;
        }

        if (govde.code === "INVALID_CREDENTIALS") {
          if (typeof govde.remaining_attempts === "number") {
            setLoginGuard({
              kind: "warning",
              remainingAttempts: Math.max(0, govde.remaining_attempts),
            });
          }
          return;
        }

        if (govde.code === "TRY_AGAIN") {
          toast.warning(govde.error || "Sorğu emal olunur. Bir neçə saniyə sonra yenidən yoxlayın.");
          return;
        }

        throw new Error(govde.error || t("auth.error.generic", "Xəta baş verdi."));
      }

      if (!govde.access_token || !govde.refresh_token) {
        throw new Error("Giriş sessiyası yaradıla bilmədi.");
      }

      setLoginGuard(null);
      const { error } = await supabase.auth.setSession({
        access_token: govde.access_token,
        refresh_token: govde.refresh_token,
      });
      if (error) throw error;

      await girisdenSonra();
    } catch (error) {
      toast.error(authXetaMesaji(error, t));
    } finally {
      setYuklenir(false);
    }
  }

  async function girisdenSonra() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: faktorlar } = await supabase.auth.mfa.listFactors();
      const faktor = faktorlar?.totp?.[0];
      if (!faktor) {
        await supabase.auth.signOut();
        throw new Error(
          t("auth.error.mfaMissing", "İki faktorlu identifikasiya faktoru tapılmadı."),
        );
      }
      const { data: chall, error } = await supabase.auth.mfa.challenge({ factorId: faktor.id });
      if (error || !chall) {
        await supabase.auth.signOut();
        throw new Error(
          t("auth.error.mfaChallenge", "Təsdiq kodu sorğusu yaradıla bilmədi."),
        );
      }
      setMfa({ factorId: faktor.id, challengeId: chall.id });
      return;
    }
    navigate({ to: "/ev", replace: true });
  }

  async function mfaTesdiqle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mfa) return;
    setYuklenir(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId: mfa.challengeId,
        code: mfaKod.trim(),
      });
      if (error)
        throw new Error(t("auth.error.invalidCode", "Təsdiq kodu yanlışdır. Yenidən cəhd edin."));
      setMfa(null);
      setMfaKod("");
      navigate({ to: "/ev", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.error.generic", "Xəta baş verdi."),
      );
    } finally {
      setYuklenir(false);
    }
  }

  async function mfaLegvEt() {
    await supabase.auth.signOut();
    setMfa(null);
    setMfaKod("");
  }

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative flex min-h-0 flex-col overflow-hidden bg-background px-6 pb-0 pt-6 sm:px-10 sm:pt-8 lg:min-h-[100dvh] lg:px-14 lg:pb-10 lg:pt-10">
        <div className="pointer-events-none absolute left-0 top-0 w-full bottom-6 [clip-path:polygon(0_0,68%_0,40.06%_93.15%,39.07%_95.61%,37.76%_97.53%,36.12%_98.9%,34.14%_99.73%,31.85%_100%,0_100%)] bg-brand lg:inset-0 lg:h-auto lg:[clip-path:polygon(0_0,68%_0,38%_100%,0_100%)]" />
        <img
          src={atuLogo}
          alt="Azərbaycan Texnologiya Universiteti loqosu"
          loading="eager"
          decoding="async"
          className="relative h-auto w-[190px] object-contain sm:w-[230px] lg:w-[300px]"
        />
        <div className="relative flex flex-none items-center justify-center pt-4 pb-0 -translate-y-6 lg:flex-1 lg:py-4 lg:translate-y-0">
          <img
            src={loginIllustration}
            alt="Tələbə Portalı — akademik proqres, qiymətlər və dərs cədvəli göstərən illüstrasiya"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full max-w-[640px] object-contain"
          />
        </div>
      </div>

      <div className="flex items-center justify-center px-5 pt-6 pb-10 sm:px-10 sm:py-10 lg:px-14 lg:py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-[26px] font-bold leading-[1.3] text-foreground sm:text-[28px]">
            {t("auth.title")}
          </h1>

          {mfa ? (
            <form onSubmit={mfaTesdiqle} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="mfa-kod" className="text-sm font-bold text-foreground">
                  {t("auth.confirmCode")}
                </label>
                <input
                  id="mfa-kod"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={mfaKod}
                  onChange={(e) => setMfaKod(e.target.value)}
                  placeholder="6 rəqəmli kod"
                  className="h-12 w-full rounded-xl bg-input px-4 text-foreground outline-none ring-ring/40 transition focus:ring-2"
                />
                <p className="text-sm text-muted-foreground">
                  {t(
                    "auth.mfaDescription",
                    "Hesabınızda iki faktorlu identifikasiya aktivdir. Authenticator tətbiqindəki 6 rəqəmli kodu daxil edin.",
                  )}
                </p>
              </div>
              <button
                type="submit"
                disabled={yuklenir}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {yuklenir ? <Loader2 className="size-5 animate-spin" /> : null}
                {t("auth.confirm")}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => void mfaLegvEt()}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {t("auth.back")}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              {rejim === "giris" && loginGuard ? (
                <LoginGuardAlert state={loginGuard} onExpired={() => setLoginGuard(null)} />
              ) : null}

              <Sahe
                ad="email"
                etiket={rejim === "giris" ? t("auth.username") : t("auth.email")}
                tip={rejim === "giris" ? "text" : "email"}
                autoComplete={rejim === "giris" ? "username" : "email"}
                tələb
                onChange={() => setLoginGuard(null)}
              />

              {rejim !== "sifre" ? (
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-bold text-foreground">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      required
                      minLength={6}
                      autoComplete="current-password"
                      type={gosterSifre ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 w-full rounded-xl bg-input px-4 pr-12 text-foreground outline-none ring-ring/40 transition focus:ring-2"
                    />
                    <button
                      type="button"
                      aria-label={
                        gosterSifre
                          ? t("auth.hidePassword", "Şifrəni gizlət")
                          : t("auth.showPassword", "Şifrəni göstər")
                      }
                      onClick={() => setGosterSifre((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {gosterSifre ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>
              ) : null}

              {rejim === "giris" ? (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginGuard(null);
                      setRejim("sifre");
                    }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={yuklenir || hesabKilidli}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {yuklenir ? <Loader2 className="size-5 animate-spin" /> : null}
                {rejim === "giris" ? t("auth.login") : t("auth.sendRecovery")}
              </button>

              {rejim === "sifre" ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginGuard(null);
                      setRejim("giris");
                    }}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {t("auth.back")}
                  </button>
                </div>
              ) : null}
            </form>
          )}
        </div>
      </div>

      <p className="relative col-span-1 whitespace-nowrap px-4 pt-4 pb-6 text-center text-xs font-semibold text-primary sm:text-sm lg:fixed lg:inset-x-0 lg:bottom-6 lg:z-10 lg:px-4 lg:pt-0 lg:pb-0 lg:text-[11px] lg:font-medium lg:text-muted-foreground/70">
        © Azərbaycan Texnologiya Universiteti. Bütün hüquqlar qorunur.
      </p>
    </div>
  );
}

function Sahe({
  ad,
  etiket,
  tip = "text",
  autoComplete,
  tələb = false,
  onChange,
}: {
  ad: string;
  etiket: string;
  tip?: string;
  autoComplete?: string;
  tələb?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={ad} className="text-sm font-bold text-foreground">
        {etiket}
      </label>
      <input
        id={ad}
        name={ad}
        type={tip}
        autoComplete={autoComplete}
        required={tələb}
        onChange={() => onChange?.()}
        className="h-12 w-full rounded-xl bg-input px-4 text-foreground outline-none ring-ring/40 transition focus:ring-2"
      />
    </div>
  );
}
