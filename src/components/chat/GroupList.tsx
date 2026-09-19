import { useEffect, useState } from "react";
import { Search, CheckCircle, Users2, MessageCircleMore } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az, tr, enUS, ru } from "date-fns/locale";

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

export function GroupList({ groups, lastMessages, selectedGroupId, onSelectGroup, axtaris, onAxtarisChange }: GroupListProps) {
  const { locale, t } = usePageI18n();
  const [debouncedAxtaris, setDebouncedAxtaris] = useState(axtaris);
  useEffect(() => { const timer = setTimeout(() => setDebouncedAxtaris(axtaris), 300); return () => clearTimeout(timer); }, [axtaris]);

  const filteredGroups = groups.filter((g) => g.ad.toLowerCase().includes(debouncedAxtaris.toLowerCase()));
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;

  return (
    <div className="chat-groups-panel flex h-full min-w-0 flex-col bg-card">
      <div className="chat-groups-panel__header border-b border-border/70 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
              <MessageCircleMore className="size-3.5" />
              Qrup söhbətləri
            </div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{t("nav.groups")}</h2>
          </div>
          <span className="chat-groups-panel__count inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 px-2 text-xs font-bold text-primary">
            {groups.length}
          </span>
        </div>

        <div className="chat-groups-search relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={axtaris}
            onChange={(e) => onAxtarisChange(e.target.value)}
            placeholder={t("common.search")}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/75 pl-10 pr-4 text-xs text-foreground outline-none transition-[border-color,box-shadow,background-color] focus:border-primary/35 focus:bg-background focus:ring-4 focus:ring-primary/8"
          />
        </div>
      </div>

      <div className="chat-groups-panel__list min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {filteredGroups.length === 0 ? (
          <div className="chat-groups-empty flex h-full min-h-[260px] flex-col items-center justify-center px-5 text-center">
            <div className="chat-groups-empty__icon mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <Users2 className="size-6" />
            </div>
            <p className="text-sm font-bold text-foreground">{t("common.noData")}</p>
            <p className="mt-1.5 max-w-[210px] text-xs leading-5 text-muted-foreground">
              Qrup söhbətləri mövcud olduqda burada görünəcək.
            </p>
          </div>
        ) : filteredGroups.map((g, index) => {
          const isSelected = g.id === selectedGroupId;
          const lastMsg = lastMessages.find((m) => m.chat_group_id === g.id);
          const ilkHerf = g.ad.substring(0, 1).toUpperCase();
          const msgPreview = lastMsg ? lastMsg.fayl_url && lastMsg.fayl_novu ? `📎 [${lastMsg.fayl_novu.toUpperCase()}]` : lastMsg.metin || "" : t("common.noData");
          return (
            <button
              key={g.id}
              onClick={() => onSelectGroup(g.id)}
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              className={`chat-group-item relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform,color] duration-200 ${isSelected ? "is-selected border-primary/35 bg-primary text-primary-foreground shadow-sm" : "border-transparent bg-transparent text-foreground hover:border-border hover:bg-background/75"}`}
            >
              <span aria-hidden className="chat-group-item__accent" />
              {g.avatar_url ? (
                <img src={g.avatar_url} alt={g.ad} className="size-11 shrink-0 rounded-2xl object-cover ring-1 ring-border/50" />
              ) : (
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${isSelected ? "bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/15" : "bg-primary/10 text-primary ring-1 ring-primary/10"}`}>
                  {ilkHerf}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold">
                    <span className="truncate">{g.ad}</span>
                    {g.dogrulanmis ? <CheckCircle className={`size-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-success"}`} /> : null}
                  </span>
                  {lastMsg?.created_at ? <span className={`shrink-0 text-[9px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false, locale: dateLocale })}</span> : null}
                </div>
                <p className={`truncate text-xs ${isSelected ? "text-primary-foreground/78" : "text-muted-foreground"}`}>{msgPreview}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
