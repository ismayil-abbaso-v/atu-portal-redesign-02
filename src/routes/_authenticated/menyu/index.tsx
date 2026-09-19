import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Palette,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect } from "react";

import { usePrimaryRole } from "@/hooks/use-user-role";
import { type MenuHubKey, useMenuHubI18n } from "@/lib/menu-hub-i18n";
import "@/menu-premium.css";

export const Route = createFileRoute("/_authenticated/menyu/")({
  head: () => ({
    meta: [
      { title: "ATU Portal" },
      { name: "description", content: "ATU Portal" },
    ],
  }),
  component: MenyuSehifesi,
});

type MenuCard = {
  to: "/menyu/profil" | "/menyu/tehlukesizlik" | "/menyu/bildiris" | "/menyu/gorunus" | "/menyu/transkript" | "/menyu/yardim";
  titleKey: MenuHubKey;
  descriptionKey: MenuHubKey;
  tagKey: MenuHubKey;
  icon: typeof UserRound;
  studentOnly?: boolean;
};

const kartlar: readonly MenuCard[] = [
  {
    to: "/menyu/profil",
    titleKey: "profileTitle",
    descriptionKey: "profileDescription",
    tagKey: "profileTag",
    icon: UserRound,
  },
  {
    to: "/menyu/tehlukesizlik",
    titleKey: "securityTitle",
    descriptionKey: "securityDescription",
    tagKey: "securityTag",
    icon: Shield,
  },
  {
    to: "/menyu/bildiris",
    titleKey: "notificationsTitle",
    descriptionKey: "notificationsDescription",
    tagKey: "notificationsTag",
    icon: Bell,
  },
  {
    to: "/menyu/gorunus",
    titleKey: "appearanceTitle",
    descriptionKey: "appearanceDescription",
    tagKey: "appearanceTag",
    icon: Palette,
  },
  {
    to: "/menyu/transkript",
    titleKey: "transcriptTitle",
    descriptionKey: "transcriptDescription",
    tagKey: "transcriptTag",
    icon: FileText,
    studentOnly: true,
  },
  {
    to: "/menyu/yardim",
    titleKey: "helpTitle",
    descriptionKey: "helpDescription",
    tagKey: "helpTag",
    icon: CircleHelp,
  },
];

function setMetaContent(selector: string, content: string) {
  const meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (meta) meta.content = content;
}

function MenyuSehifesi() {
  const { t } = useMenuHubI18n();
  const { primaryRole } = usePrimaryRole();
  const visibleCards = kartlar.filter((card) => !card.studentOnly || primaryRole === "telebe");

  useEffect(() => {
    const title = t("seoTitle");
    const description = t("seoDescription");

    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
  }, [t]);

  return (
    <div className="menu-premium-page">
      <section className="menu-premium-hero" aria-labelledby="menu-hub-title">
        <span aria-hidden className="menu-premium-hero__pattern" />
        <span aria-hidden className="menu-premium-hero__glow menu-premium-hero__glow--one" />
        <span aria-hidden className="menu-premium-hero__glow menu-premium-hero__glow--two" />
        <span aria-hidden className="menu-premium-hero__accent" />
        <span aria-hidden className="menu-premium-hero__sweep" />

        <div className="menu-premium-hero__content">
          <div className="menu-premium-hero__copy">
            <div className="menu-premium-hero__eyebrow">
              <Sparkles className="size-3.5" aria-hidden />
              {t("heroEyebrow")}
            </div>
            <h1 id="menu-hub-title" className="menu-premium-hero__title">{t("heroTitle")}</h1>
            <p className="menu-premium-hero__subtitle">{t("heroSubtitle")}</p>
          </div>

          <div className="menu-premium-hero__visual" aria-hidden>
            <span className="menu-premium-orbit menu-premium-orbit--one" />
            <span className="menu-premium-orbit menu-premium-orbit--two" />
            <span className="menu-premium-orbit__dot menu-premium-orbit__dot--one" />
            <span className="menu-premium-orbit__dot menu-premium-orbit__dot--two" />
            <span className="menu-premium-hero__core">
              <Settings2 className="size-8" />
            </span>
          </div>
        </div>
      </section>

      <section className="menu-premium-section" aria-labelledby="menu-settings-title">
        <div className="menu-premium-section__header">
          <div>
            <p className="menu-premium-section__eyebrow">{t("sectionEyebrow")}</p>
            <h2 id="menu-settings-title" className="menu-premium-section__title">{t("sectionTitle")}</h2>
          </div>
          <span className="menu-premium-section__count">{t("sectionCount", { count: visibleCards.length })}</span>
        </div>

        <div className="menu-premium-grid">
          {visibleCards.map((kart, index) => {
            const sectionTitle = t(kart.titleKey);
            return (
              <Link
                key={kart.to}
                to={kart.to}
                aria-label={t("openSectionAria", { section: sectionTitle })}
                className="menu-premium-card group"
                style={{ animationDelay: `${90 + index * 65}ms` }}
              >
                <span aria-hidden className="menu-premium-card__shine" />
                <span className="menu-premium-card__icon" aria-hidden>
                  <kart.icon className="size-5" />
                </span>

                <span className="menu-premium-card__content">
                  <span className="menu-premium-card__tag">{t(kart.tagKey)}</span>
                  <span className="menu-premium-card__title">{sectionTitle}</span>
                  <span className="menu-premium-card__text">{t(kart.descriptionKey)}</span>
                </span>

                <span className="menu-premium-card__arrow" aria-hidden>
                  <ChevronRight className="size-5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
