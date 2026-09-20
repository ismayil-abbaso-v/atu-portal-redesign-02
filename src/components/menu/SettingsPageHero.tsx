import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

type SettingsPageHeroProps = {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  quote?: string;
  icon?: ReactNode;
  backLabel?: string;
  showBack?: boolean;
};

export function SettingsPageHero({
  image,
  eyebrow,
  title,
  subtitle,
  quote,
  icon,
  backLabel = "Geri",
  showBack = true,
}: SettingsPageHeroProps) {
  const router = useRouter();

  return (
    <header className="settings-page-hero" style={{ backgroundImage: `url(${image})` }}>
      <span className="settings-page-hero__shade" aria-hidden />
      {showBack ? (
        <button
          type="button"
          className="settings-page-hero__back"
          aria-label={backLabel}
          onClick={() => router.history.back()}
        >
          <ArrowLeft aria-hidden />
        </button>
      ) : null}
      <div className="settings-page-hero__copy">
        <span className="settings-page-hero__eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {icon ? <span className="settings-page-hero__icon" aria-hidden>{icon}</span> : null}
      {quote ? <blockquote>“{quote}”</blockquote> : null}
    </header>
  );
}
