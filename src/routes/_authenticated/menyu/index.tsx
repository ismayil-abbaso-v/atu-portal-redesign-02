import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  LifeBuoy,
  Palette,
  Settings2,
  Shield,
  UserRound,
} from "lucide-react";
import { useEffect } from "react";

import menuHero from "@/assets/menu-settings-hero.webp";
import { SettingsPageHero } from "@/components/menu/SettingsPageHero";
import { usePrimaryRole } from "@/hooks/use-user-role";
import { type MenuHubKey, useMenuHubI18n } from "@/lib/menu-hub-i18n";
import "@/settings-redesign.css";
import "@/notification-menu-content-redesign.css";

export const Route = createFileRoute("/_authenticated/menyu/")({
  head: () => ({
    meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }],
  }),
  component: MenyuSehifesi,
});

type MenuCard = {
  to:
    | "/menyu/profil"
    | "/menyu/tehlukesizlik"
    | "/menyu/bildiris"
    | "/menyu/gorunus"
    | "/menyu/transkript"
    | "/menyu/yardim";
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

const QUOTES = {
  az: "Texnologiya daha yaxşı bir gələcək yaradır.",
  tr: "Teknoloji daha iyi bir gelecek yaratır.",
  en: "Technology creates a better future.",
  ru: "Технологии создают лучшее будущее.",
} as const;

function setMetaContent(selector: string, content: string) {
  const meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (meta) meta.content = content;
}

function MenyuSehifesi() {
  const { locale, t } = useMenuHubI18n();
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
    <div className="menu-reference-page">
      <SettingsPageHero
        image={menuHero}
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        quote={QUOTES[locale]}
        icon={<Settings2 />}
        showBack={false}
      />

      <section className="menu-reference-section" aria-labelledby="menu-settings-title">
        <div className="menu-reference-heading">
          <div>
            <p className="menu-reference-heading__eyebrow">{t("sectionEyebrow")}</p>
            <h2 id="menu-settings-title">{t("sectionTitle")}</h2>
            <p>{t("seoDescription")}</p>
          </div>
          <span className="menu-reference-heading__count">{visibleCards.length}</span>
        </div>

        <div className="menu-reference-grid">
          {visibleCards.map((card, index) => {
            const title = t(card.titleKey);
            return (
              <Link
                key={card.to}
                to={card.to}
                aria-label={t("openSectionAria", { section: title })}
                className="menu-reference-card"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <span className="menu-reference-card__icon" aria-hidden>
                  <card.icon />
                </span>
                <span className="menu-reference-card__copy">
                  <strong>{title}</strong>
                  <span>{t(card.descriptionKey)}</span>
                  <small className="menu-reference-card__detail">{t(card.tagKey)}</small>
                </span>
                <span className="menu-reference-card__arrow" aria-hidden>
                  <ChevronRight />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="menu-reference-support-banner">
        <div>
          <h3>{t("helpTitle")}</h3>
          <p>{t("helpDescription")}</p>
        </div>
        <Link to="/menyu/yardim">
          {t("helpTitle")}
          <LifeBuoy aria-hidden />
        </Link>
      </section>
    </div>
  );
}
