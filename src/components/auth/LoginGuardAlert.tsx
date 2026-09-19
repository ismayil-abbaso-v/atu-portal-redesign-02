import { Clock3, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type LoginGuardState =
  | { kind: "warning"; remainingAttempts: number }
  | { kind: "locked"; lockedUntil: string };

function countdownLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LoginGuardAlert({
  state,
  onExpired,
}: {
  state: LoginGuardState;
  onExpired: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.kind !== "locked") return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (Date.parse(state.lockedUntil) <= current) onExpired();
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [state, onExpired]);

  const remainingSeconds = useMemo(() => {
    if (state.kind !== "locked") return 0;
    return Math.max(0, Math.ceil((Date.parse(state.lockedUntil) - now) / 1000));
  }, [state, now]);

  if (state.kind === "warning") {
    const critical = state.remainingAttempts <= 3;
    return (
      <div
        role="alert"
        aria-live="polite"
        className={
          critical
            ? "rounded-2xl border border-red-300/80 bg-red-50/90 p-4 text-red-700 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
            : "rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-amber-800 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
        }
      >
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold">Giriş uğursuz oldu</p>
            <p className="mt-1 text-sm font-semibold">
              {state.remainingAttempts} cəhdiniz qaldı.
            </p>
            <p className="mt-2 text-sm leading-6 opacity-90">
              10 uğursuz giriş cəhdindən sonra bu hesab 1 saat bloklanacaq. Uğurlu daxil
              olduqda cəhd sayı dərhal sıfırlanır.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roundedMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-[18px] border border-red-300/80 bg-red-50/90 p-5 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
    >
      <div className="flex items-center gap-3">
        <TriangleAlert className="size-6 shrink-0" />
        <p className="text-lg font-semibold">Hesab müvəqqəti kilidləndi</p>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Clock3 className="size-5 shrink-0" />
        <p className="text-base font-medium">
          {roundedMinutes} dəqiqə gözləyin
          <span className="ml-2 font-mono text-sm font-bold">{countdownLabel(remainingSeconds)}</span>
        </p>
      </div>
      <div className="my-5 border-t border-red-200/80 dark:border-red-900/70" />
      <p className="text-sm leading-6 text-foreground/70">
        10 uğursuz giriş cəhdi qeydə alındığı üçün hesab 1 saat bloklanıb. Vaxt server və
        baza məlumatına əsaslanır; başqa cihaz və ya brauzerdən giriş etməklə sıfırlanmır.
        Müddət bitdikdə cəhd sayı avtomatik olaraq yenidən 0-dan başlayacaq.
      </p>
      <p className="mt-3 text-sm leading-6 text-foreground/70">
        Əgər şifrənizi unutmusunuzsa, şifrəni yeniləmək və ya bərpa etmək üçün müvafiq
        <span className="font-bold text-foreground/85"> dekanlıqlara müraciət</span> etməlisiniz.
        Onlar sizə bu məsələdə kömək edəcəklər.
      </p>
    </div>
  );
}
