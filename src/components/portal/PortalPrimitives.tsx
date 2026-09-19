import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, LoaderCircle, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function PortalPage({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("portal-page", className)} {...props} />;
}

export function PortalHero({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("portal-hero", className)} {...props} />;
}

export function PortalCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("portal-card", className)} {...props} />;
}

export function PortalStatCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("portal-stat-card", className)} {...props} />;
}

export function PortalSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("portal-section", className)} {...props} />;
}

export function PortalSectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("portal-section-header", className)}>
      <div className="min-w-0">
        <h2 className="portal-section-title">{title}</h2>
        {description ? <p className="portal-section-description">{description}</p> : null}
      </div>
      {action ? <div className="portal-section-action">{action}</div> : null}
    </div>
  );
}

type BadgeTone = "neutral" | "primary" | "positive" | "warning" | "negative" | "info";

export function PortalBadge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("portal-badge", `portal-badge--${tone}`, className)} {...props} />;
}

export function PortalTabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("portal-tabs", className)} {...props} />;
}

export function PortalSearch({
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <label className={cn("portal-search", className)}>
      <Search aria-hidden className="portal-search__icon" />
      <input type="search" className={cn("portal-search__input", inputClassName)} {...props} />
    </label>
  );
}

export function PortalTable({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("portal-table-wrap", className)} {...props}>
      {children}
    </div>
  );
}

export function PortalQuickAction({
  icon: Icon,
  title,
  description,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className={cn("portal-quick-action", className)} {...props}>
      <span className="portal-quick-action__icon">
        <Icon aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="portal-quick-action__title">{title}</span>
        {description ? (
          <span className="portal-quick-action__description">{description}</span>
        ) : null}
      </span>
    </div>
  );
}

function PortalState({
  icon: Icon,
  title,
  description,
  className,
  children,
  busy,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
  busy?: boolean | undefined;
}) {
  return (
    <div
      className={cn("portal-state", className)}
      role={busy ? "status" : undefined}
      aria-live={busy ? "polite" : undefined}
    >
      <span className="portal-state__icon">
        <Icon aria-hidden className={busy ? "animate-spin" : undefined} />
      </span>
      <h3 className="portal-state__title">{title}</h3>
      {description ? <p className="portal-state__description">{description}</p> : null}
      {children ? <div className="portal-state__action">{children}</div> : null}
    </div>
  );
}

export function PortalEmptyState({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <PortalState icon={Inbox} title={title} description={description} className={className}>
      {children}
    </PortalState>
  );
}

export function PortalLoadingState({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <PortalState
      icon={LoaderCircle}
      title={title}
      description={description}
      className={className}
      busy
    />
  );
}

export function PortalErrorState({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <PortalState
      icon={AlertCircle}
      title={title}
      description={description}
      className={cn("portal-state--error", className)}
    >
      {children}
    </PortalState>
  );
}
