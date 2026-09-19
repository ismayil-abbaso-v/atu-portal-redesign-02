import { useEffect, useState } from "react";
import { CheckCircle, MessageCircleMore, Search, Users2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";

import type { Database } from "@/integrations/supabase/types";
import { usePageI18n } from "@/lib/i18n-extra";

type ChatGroup = Database["public"]["Tables"]["chat_groups"]["Row"];
type LastMessage = Database["public"]["Views"]["chat_group_last_message"]["Row"];

interface GroupListProps {
  groups: ChatGroup[];
  lastMessages: LastMessage[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  axtaris: string;
  onAxtarisChange: (val: string) => void;
}

const COPY = {
  az: { title: "Söhbətlər", eyebrow: "Universitet ünsiyyəti", search: "Söhbətlərdə axtar...", all: "Hamısı", groups: "Qruplar", teachers: "Müəllimlər", office: "Ofis", unsupported: "Bu söhbət növü hazırkı məlumat modelində ayrıca mövcud deyil.", empty: "Uyğun söhbət tapılmadı.", emptyHint: "Qrup söhbətləri mövcud olduqda burada görünəcək." },
  tr: { title: "Sohbetler", eyebrow: "Üniversite iletişimi", search: "Sohbetlerde ara...", all: "Tümü", groups: "Gruplar", teachers: "Öğretmenler", office: "Ofis", unsupported: "Bu sohbet türü mevcut veri modelinde ayrı olarak bulunmuyor.", empty: "Uygun sohbet bulunamadı.", emptyHint: "Grup sohbetleri olduğunda burada görünecek." },
  en: { title: "Conversations", eyebrow: "University communication", search: "Search conversations...", all: "All", groups: "Groups", teachers: "Teachers", office: "Office", unsupported: "This conversation type is not separately available in the current data model.", empty: "No matching conversation.", emptyHint: "Group conversations will appear here when available." },
  ru: { title: "Диалоги", eyebrow: "Университетское общение", search: "Поиск по чатам...", all: "Все", groups: "Группы", teachers: "Преподаватели", office: "Офис", unsupported: "Этот тип чата отдельно не представлен в текущей модели данных.", empty: "Подходящих чатов нет.", emptyHint: "Групповые чаты появятся здесь, когда будут доступны." },
} as const;

export function GroupList({ groups, lastMessages, selectedGroupId, onSelectGroup, axtaris, onAxtarisChange }: GroupListProps) {
  const { locale, t } = usePageI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.az;
  const [debouncedAxtaris, setDebouncedAxtaris] = useState(axtaris);
  const [scope, setScope] = useState<"all" | "groups">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAxtaris(axtaris), 300);
    return () => clearTimeout(timer);
  }, [axtaris]);

  const filteredGroups = groups.filter((group) => group.ad.toLocaleLowerCase().includes(debouncedAxtaris.toLocaleLowerCase()));
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;

  const scopes = [
    { id: "all" as const, label: copy.all, supported: true },
    { id: "groups" as const, label: copy.groups, supported: true },
    { id: "teachers" as const, label: copy.teachers, supported: false },
    { id: "office" as const, label: copy.office, supported: false },
  ];

  return (
    <div className="chat-groups-panel flex h-full min-w-0 flex-col bg-card">
      <div className="chat-groups-panel__header border-b border-border/70">
        <div className="chat-list-heading">
          <div className="min-w-0">
            <div className="chat-list-heading__eyebrow"><MessageCircleMore aria-hidden />{copy.eyebrow}</div>
            <h2>{copy.title}</h2>
          </div>
          <span className="chat-groups-panel__count">{groups.length}</span>
        </div>

        <label className="chat-groups-search">
          <Search aria-hidden />
          <input value={axtaris} onChange={(event) => onAxtarisChange(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
        </label>

        <div className="chat-scope-tabs" role="tablist" aria-label={copy.title}>
          {scopes.map((item) => item.supported ? (
            <button key={item.id} type="button" role="tab" aria-selected={scope === item.id} className={scope === item.id ? "is-active" : ""} onClick={() => setScope(item.id)}>
              {item.label}
            </button>
          ) : (
            <button key={item.id} type="button" role="tab" aria-selected="false" disabled title={copy.unsupported}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-groups-panel__list min-h-0 flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="chat-groups-empty flex h-full min-h-[260px] flex-col items-center justify-center px-5 text-center">
            <div className="chat-groups-empty__icon"><Users2 aria-hidden /></div>
            <p>{copy.empty}</p>
            <span>{copy.emptyHint}</span>
          </div>
        ) : filteredGroups.map((group, index) => {
          const isSelected = group.id === selectedGroupId;
          const lastMsg = lastMessages.find((message) => message.chat_group_id === group.id);
          const initial = group.ad.substring(0, 1).toUpperCase();
          const preview = lastMsg ? lastMsg.fayl_url && lastMsg.fayl_novu ? `📎 [${lastMsg.fayl_novu.toUpperCase()}]` : lastMsg.metin || "" : t("common.noData");

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
              className={`chat-group-item ${isSelected ? "is-selected" : ""}`}
            >
              <span aria-hidden className="chat-group-item__accent" />
              {group.avatar_url ? <img src={group.avatar_url} alt={group.ad} className="chat-group-item__avatar" /> : <span className="chat-group-item__avatar chat-group-item__avatar--fallback">{initial}</span>}
              <span className="chat-group-item__body">
                <span className="chat-group-item__top">
                  <strong>{group.ad}{group.dogrulanmis ? <CheckCircle aria-hidden /> : null}</strong>
                  {lastMsg?.created_at ? <time>{formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false, locale: dateLocale })}</time> : null}
                </span>
                <span className="chat-group-item__preview">{preview}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
