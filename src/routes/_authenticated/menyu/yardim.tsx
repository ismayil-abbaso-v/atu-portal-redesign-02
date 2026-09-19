import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CreditCard, KeyRound, LifeBuoy, Search, Sparkles, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { helpMessages } from "@/lib/help-i18n";
import { faqBolmeleri } from "@/lib/help-data";
import { useI18n } from "@/lib/i18n";
import "@/help-premium.css";

export const Route = createFileRoute("/_authenticated/menyu/yardim")({
  head: () => ({
    meta: [
      { title: "Yardım Mərkəzi — ATU Şəxsi Kabinet" },
      { name: "description", content: "Tez-tez verilən suallar və problemlərin həlli yolları." },
    ],
  }),
  component: YardimSehifesi,
});

const sectionIcons = {
  account: KeyRound,
  library: BookOpen,
  payments: CreditCard,
  technical: Wrench,
} as const;

function YardimSehifesi() {
  const router = useRouter();
  const [axtarıs, setAxtarıs] = useState("");
  const { locale } = useI18n();
  const messages = helpMessages[locale];
  const tx = (key: string) => messages[key] ?? helpMessages.az[key] ?? key;

  useEffect(() => {
    document.title = tx("page.title");
    document.documentElement.lang = locale;

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }
    description.setAttribute("content", tx("page.description"));
  }, [locale]);

  const neticeler = useMemo(() => {
    const q = axtarıs.trim().toLocaleLowerCase(locale);

    return faqBolmeleri
      .map((section) => ({
        ...section,
        suallar: section.questionIds
          .map((questionId) => ({
            id: questionId,
            sual: tx(`faq.${questionId}.question`),
            cavab: tx(`faq.${questionId}.answer`),
          }))
          .filter((question) => {
            if (!q) return true;
            return (
              question.sual.toLocaleLowerCase(locale).includes(q) ||
              question.cavab.toLocaleLowerCase(locale).includes(q)
            );
          }),
      }))
      .filter((section) => section.suallar.length > 0);
  }, [axtarıs, locale]);

  const totalResults = useMemo(
    () => neticeler.reduce((total, section) => total + section.suallar.length, 0),
    [neticeler],
  );

  return (
    <div className="help-page">
      <header className="help-hero">
        <span aria-hidden className="help-hero__accent" />
        <span aria-hidden className="help-hero__grid" />
        <span aria-hidden className="help-hero__glow" />
        <span aria-hidden className="help-hero__sweep" />

        <div className="help-hero__content">
          <button
            type="button"
            className="help-hero__back"
            aria-label="Geri"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="help-hero__copy">
            <div className="help-hero__eyebrow">
              <span className="help-hero__eyebrow-dot" />
              ATU · SUPPORT
            </div>
            <h1 className="help-hero__title">{tx("page.title")}</h1>
            <p className="help-hero__subtitle">{tx("page.description")}</p>
          </div>

          <div className="help-hero__visual" aria-hidden>
            <span className="help-hero__orbit help-hero__orbit--one" />
            <span className="help-hero__orbit help-hero__orbit--two" />
            <span className="help-hero__core"><LifeBuoy className="size-6" /></span>
          </div>
        </div>
      </header>

      <section className="help-search-panel">
        <div className="help-search-panel__badge">
          <Sparkles className="size-3.5" />
          FAQ
        </div>
        <h2 className="help-search-panel__title">{tx("hero.title")}</h2>
        <p className="help-search-panel__desc">{tx("hero.description")}</p>

        <div className="help-search">
          <Search className="help-search__icon size-5" />
          <input
            value={axtarıs}
            onChange={(e) => setAxtarıs(e.target.value)}
            maxLength={120}
            aria-label={tx("search.label")}
            placeholder={tx("search.placeholder")}
            className="help-search__input"
          />
          <span className="help-search__count" aria-label={`${totalResults} FAQ`}>{totalResults}</span>
        </div>
      </section>

      {neticeler.length === 0 ? (
        <section className="help-empty">
          <div>
            <span className="help-empty__icon"><Search className="size-6" /></span>
            <p className="help-empty__text">{tx("empty")}</p>
          </div>
        </section>
      ) : (
        <div className="help-sections">
          {neticeler.map((section, sectionIndex) => {
            const SectionIcon = sectionIcons[section.id as keyof typeof sectionIcons] ?? LifeBuoy;
            return (
              <section
                key={section.id}
                className="help-section-card"
                style={{ animationDelay: `${90 + sectionIndex * 70}ms` }}
              >
                <Accordion type="single" collapsible>
                  <AccordionItem value={section.id} className="border-none">
                    <AccordionTrigger className="help-section-trigger hover:no-underline">
                      <span className="help-section-icon"><SectionIcon className="size-5" /></span>
                      <span className="help-section-copy">
                        <span className="help-section-title">{tx(`section.${section.id}`)}</span>
                        <span className="help-section-meta">FAQ · {section.suallar.length}</span>
                      </span>
                      <span className="help-section-count">{section.suallar.length}</span>
                    </AccordionTrigger>
                    <AccordionContent className="help-section-content">
                      <ul className="help-question-list">
                        {section.suallar.map((question, questionIndex) => (
                          <li
                            key={question.id}
                            className="help-question"
                            style={{ animationDelay: `${questionIndex * 45}ms` }}
                          >
                            <p className="help-question__title">{question.sual}</p>
                            <p className="help-question__answer">{question.cavab}</p>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
