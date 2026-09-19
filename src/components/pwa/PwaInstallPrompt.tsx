import { Download, Monitor, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "atu-pwa-install-dismissed";
const INSTALLED_KEY = "atu-pwa-installed";
const AUTO_HIDE_MS = 10_000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installing, setInstalling] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const showForTenSeconds = () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    setVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, AUTO_HIDE_MS);
  };

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "1") return;

    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
    setIos(isIos);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!dismissed) showForTenSeconds();
    };

    const handleInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
      setInstallEvent(null);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // iOS does not expose beforeinstallprompt; show the same prompt with the
    // platform-specific Add to Home Screen instruction.
    let iosTimer: number | null = null;
    if (isIos && !dismissed) {
      iosTimer = window.setTimeout(() => showForTenSeconds(), 900);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      if (iosTimer !== null) window.clearTimeout(iosTimer);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const install = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
    } finally {
      setInstalling(false);
      setVisible(false);
      setInstallEvent(null);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[min(390px,calc(100vw-2rem))] sm:px-0 sm:pb-0">
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5">
        <div className="relative flex items-start gap-3 px-4 pb-4 pt-4 pr-14 sm:px-5 sm:pb-4 sm:pt-5 sm:pr-14">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12">
            {ios ? <Smartphone className="size-5" /> : <Download className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-5 text-foreground sm:text-[15px]">ATU Kabinetini proqram kimi istifadə et</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-[13px]">
              Daha sürətli giriş, ayrıca pəncərə və telefon/kompüterdə rahat istifadə üçün ATU Şəxsi Kabinetini cihazına əlavə et.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:right-4 sm:top-4"
            aria-label="Bağla"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:gap-2 sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {ios ? (
              <p className="text-xs leading-5 text-muted-foreground sm:text-[13px]">Safari-də <span className="font-semibold text-foreground">Paylaş</span> → <span className="font-semibold text-foreground">Əsas ekrana əlavə et</span> seç.</p>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground sm:text-[13px]">Cihazında ayrıca tətbiq kimi açılacaq.</p>
            )}
          </div>
          {!ios && (
            <button type="button" onClick={install} disabled={installing} className="w-full shrink-0 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto">
              {installing ? "Hazırlanır..." : "Yüklə"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
