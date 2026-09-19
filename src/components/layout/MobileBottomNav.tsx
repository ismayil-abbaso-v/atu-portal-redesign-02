import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpenCheck,
  CalendarDays,
  Grid2X2,
  Home,
  LayoutDashboard,
  MessageSquare,
  PanelsTopLeft,
  PenLine,
  Settings2,
  Shield,
  UserRound,
  Users2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNotifications } from "@/hooks/use-notifications";
import { usePrimaryRole, useUserRoles } from "@/hooks/use-user-role";
import { useI18n } from "@/lib/i18n";
import {
  getMobileNavModel,
  getMobileRouteContext,
  routeMatchesMobileNavItem,
  type MobileNavIconName,
  type MobileNavItem,
} from "@/lib/mobile-navigation";
import { cn } from "@/lib/utils";

const iconByName: Record<MobileNavIconName, LucideIcon> = {
  home: Home,
  journal: BookOpenCheck,
  calendar: CalendarDays,
  exams: PenLine,
  chat: MessageSquare,
  library: BookMarked,
  office: PanelsTopLeft,
  notifications: Bell,
  profile: UserRound,
  services: Settings2,
  groups: Users2,
  faculty: BarChart3,
  tutor: LayoutDashboard,
  admin: Shield,
};

const MENU_ID = "portal-mobile-secondary-menu";
const MENU_TITLE_ID = "portal-mobile-secondary-menu-title";
const MENU_OPEN_EVENT = "portal:mobile-secondary-menu-open";

export function MobileBottomNav() {
  const { t } = useI18n();
  const { roles } = useUserRoles();
  const { primaryRole } = usePrimaryRole();
  const { unreadCount } = useNotifications();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const firstSecondaryRef = useRef<HTMLAnchorElement>(null);

  const model = useMemo(() => getMobileNavModel(primaryRole, roles), [primaryRole, roles]);
  const routeContext = useMemo(() => getMobileRouteContext(pathname, model), [model, pathname]);

  const closeAndRestoreFocus = useCallback(() => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const resetMenu = () => setMenuOpen(false);

    resetMenu();
    window.addEventListener("pageshow", resetMenu);

    return () => {
      window.removeEventListener("pageshow", resetMenu);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const focusFrame = window.requestAnimationFrame(() => {
      firstSecondaryRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAndRestoreFocus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(".portal-mobile-bottom-nav__backdrop"))
        return;
      setMenuOpen(false);
    };

    const handleExternalClose = () => setMenuOpen(false);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("portal:close-mobile-secondary-menu", handleExternalClose);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("portal:close-mobile-secondary-menu", handleExternalClose);
    };
  }, [closeAndRestoreFocus, menuOpen]);

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    window.dispatchEvent(new Event(MENU_OPEN_EVENT));
    setMenuOpen(true);
  }

  function renderPrimaryItem(item: MobileNavItem) {
    const active = routeContext.primaryTo === item.to;
    const Icon = iconByName[item.icon];
    const isNotifications = item.to === "/bildirisler";

    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={cn("portal-mobile-bottom-nav__item", active && "is-active")}
      >
        <span className="portal-mobile-bottom-nav__icon" aria-hidden>
          <Icon />
          {isNotifications && unreadCount > 0 ? (
            <span className="portal-mobile-bottom-nav__badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
        <span className="portal-mobile-bottom-nav__label">{t(item.labelKey)}</span>
      </Link>
    );
  }

  return (
    <nav
      className="portal-mobile-bottom-nav md:hidden"
      aria-label={t("nav.main")}
      data-mobile-app-nav
      data-menu-open={menuOpen || undefined}
    >
      {menuOpen ? (
        <>
          <button
            type="button"
            className="portal-mobile-bottom-nav__backdrop is-open"
            aria-hidden
            tabIndex={-1}
            onPointerDown={(event) => {
              event.preventDefault();
              closeAndRestoreFocus();
            }}
            onClick={closeAndRestoreFocus}
          />

          <section
            ref={panelRef}
            id={MENU_ID}
            role="dialog"
            aria-modal="false"
            aria-labelledby={MENU_TITLE_ID}
            className="portal-mobile-secondary-menu is-open"
          >
            <div className="portal-mobile-secondary-menu__header">
              <div className="min-w-0">
                <p className="portal-mobile-secondary-menu__eyebrow">{t("nav.more")}</p>
                <h2 id={MENU_TITLE_ID}>{t("nav.additionalServices")}</h2>
              </div>
              <button
                type="button"
                className="portal-mobile-secondary-menu__close"
                aria-label={t("nav.closeAdditionalMenu")}
                onPointerDown={(event) => {
                  event.preventDefault();
                  closeAndRestoreFocus();
                }}
                onClick={closeAndRestoreFocus}
              >
                <X aria-hidden />
              </button>
            </div>

            <div className="portal-mobile-secondary-menu__grid">
              {model.secondary.map((item, index) => {
                const Icon = iconByName[item.icon];
                const active = routeMatchesMobileNavItem(pathname, item);

                return (
                  <Link
                    ref={index === 0 ? firstSecondaryRef : undefined}
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn("portal-mobile-secondary-menu__item", active && "is-active")}
                  >
                    <span className="portal-mobile-secondary-menu__icon" aria-hidden>
                      <Icon />
                    </span>
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <div className="portal-mobile-bottom-nav__inner">
        {renderPrimaryItem(model.primary[0])}
        {renderPrimaryItem(model.primary[1])}

        <button
          ref={triggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? MENU_ID : undefined}
          aria-haspopup="dialog"
          aria-label={menuOpen ? t("nav.closeAdditionalMenu") : t("nav.openAdditionalMenu")}
          onClick={toggleMenu}
          className={cn(
            "portal-mobile-bottom-nav__center",
            menuOpen && "is-open",
            routeContext.secondaryActive && "has-context",
          )}
        >
          <span className="portal-mobile-bottom-nav__center-icon" aria-hidden>
            {menuOpen ? <X /> : <Grid2X2 />}
          </span>
          <span className="portal-mobile-bottom-nav__label">{t("nav.more")}</span>
        </button>

        {renderPrimaryItem(model.primary[2])}
        {renderPrimaryItem(model.primary[3])}
      </div>
    </nav>
  );
}
