import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Grid2X2, Home, Menu, MessageSquare } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  to: "/ev" | "/teqvim" | "/ofis" | "/sohbet" | "/menyu";
  labelKey: string;
  icon: typeof Home;
  featured?: boolean;
};

const items: BottomNavItem[] = [
  { to: "/ev", labelKey: "nav.home", icon: Home },
  { to: "/teqvim", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/ofis", labelKey: "nav.office", icon: Grid2X2, featured: true },
  { to: "/sohbet", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/menyu", labelKey: "nav.menu", icon: Menu },
];

export function MobileBottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="portal-mobile-bottom-nav md:hidden" aria-label={t("nav.menu")} data-mobile-app-nav>
      <div className="portal-mobile-bottom-nav__inner">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "portal-mobile-bottom-nav__item",
                item.featured && "portal-mobile-bottom-nav__item--featured",
                active && "is-active",
              )}
            >
              <span className="portal-mobile-bottom-nav__icon" aria-hidden>
                <Icon />
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
