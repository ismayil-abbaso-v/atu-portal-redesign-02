import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Download, Info, Loader2, MessageCircleMore, MoreVertical, Paperclip, Search, Send, Smile, Users2, X } from "lucide-react";
import { format } from "date-fns";
import { az, enUS, ru, tr } from "date-fns/locale";
import { toast } from "sonner";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePageI18n } from "@/lib/i18n-extra";

export type ChatMessageWithProfile = Database["public"]["Tables"]["chat_messages"]["Row"] & {
  profiles: { ad: string | null; soyad: string | null; avatar_url: string | null } | null;
};

interface MessageThreadProps {
  group: { id: string; ad: string; dogrulanmis?: boolean | null } | null;
  messages: ChatMessageWithProfile[];
  userId: string | null;
  memberCount?: number;
  onSendMessage: (text: string, fileUrl?: string, fileType?: "sekil" | "video" | "ses" | "fayl") => Promise<void>;
  onBack?: (() => void) | undefined;
  onToggleProfile?: (() => void) | undefined;
}

const COPY = {
  az: { select: "Söhbət seçin", selectHint: "Mesajları görmək və söhbətə qoşulmaq üçün siyahıdan bir qrup seçin.", search: "Mesajlarda axtar...", participants: "iştirakçı", noMatch: "Axtarışa uyğun mesaj yoxdur.", emoji: "Emoji əlavə et", members: "Üzvlərə bax", more: "Ətraflı" },
  tr: { select: "Sohbet seçin", selectHint: "Mesajları görmek ve sohbete katılmak için listeden bir grup seçin.", search: "Mesajlarda ara...", participants: "katılımcı", noMatch: "Aramayla eşleşen mesaj yok.", emoji: "Emoji ekle", members: "Üyeleri görüntüle", more: "Daha fazla" },
  en: { select: "Select a conversation", selectHint: "Choose a group from the list to view messages and join the conversation.", search: "Search messages...", participants: "participants", noMatch: "No messages match your search.", emoji: "Add emoji", members: "View members", more: "More" },
  ru: { select: "Выберите чат", selectHint: "Выберите группу из списка, чтобы увидеть сообщения и присоединиться к беседе.", search: "Поиск по сообщениям...", participants: "участников", noMatch: "Сообщений по запросу нет.", emoji: "Добавить эмодзи", members: "Участники", more: "Подробнее" },
} as const;

export function MessageThread({ group, messages, userId, memberCount = 0, onSendMessage, onBack, onToggleProfile }: MessageThreadProps) {
  const { locale, t } = usePageI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.az;
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;
  const [metin, setMetin] = useState("");
  const [faylYuklenir, setFaylYuklenir] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!messageSearch) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, group, messageSearch]);

  const visibleMessages = useMemo(() => {
    const needle = messageSearch.trim().toLocaleLowerCase();
    if (!needle) return messages;
    return messages.filter((message) => (message.metin ?? "").toLocaleLowerCase().includes(needle));
  }, [messages, messageSearch]);

  if (!group) {
    return (
      <div className="chat-thread-empty relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-card px-6 text-center">
        <span aria-hidden className="chat-thread-empty__mesh" />
        <div className="relative z-10 flex max-w-sm flex-col items-center">
          <div className="chat-thread-empty__icon"><MessageCircleMore aria-hidden /></div>
          <h3>{copy.select}</h3>
          <p>{copy.selectHint}</p>
        </div>
      </div>
    );
  }

  async function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    if (!metin.trim()) return;
    try {
      await onSendMessage(metin.trim());
      setMetin("");
    } catch {
      // Parent mutation owns the user-facing error toast.
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFaylYuklenir(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${group.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      let fileType: "sekil" | "video" | "ses" | "fayl" = "fayl";
      if (file.type.startsWith("image/")) fileType = "sekil";
      else if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "ses";
      await onSendMessage(`📎 ${file.name}`, filePath, fileType);
      toast.success(t("chat.fileSent"));
    } catch (error) {
      toast.error(`${t("chat.fileUploadError")}: ${error instanceof Error ? error.message : t("chat.unknownError")}`);
    } finally {
      setFaylYuklenir(false);
      event.target.value = "";
    }
  }

  async function handleDownloadFile(fileUrl: string) {
    try {
      const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(fileUrl, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("chat.fileError"));
    }
  }

  return (
    <div className="chat-thread flex h-full min-w-0 flex-1 flex-col bg-background/35">
      <header className="chat-thread__header">
        <div className="chat-thread__identity">
          {onBack ? <button type="button" onClick={onBack} aria-label={t("common.back")} className="chat-thread__back"><ChevronLeft aria-hidden /></button> : null}
          <span className="chat-thread__group-icon"><Users2 aria-hidden /></span>
          <div className="min-w-0">
            <h3>{group.ad}</h3>
            <p>{memberCount ? `${memberCount} ${copy.participants}` : t("chat.thread")}</p>
          </div>
        </div>
        <div className="chat-thread__actions">
          <button type="button" onClick={() => { setSearchOpen((value) => !value); if (searchOpen) setMessageSearch(""); }} aria-label={copy.search} aria-expanded={searchOpen}><Search aria-hidden /></button>
          {onToggleProfile ? <button type="button" onClick={onToggleProfile} aria-label={copy.members}><Users2 aria-hidden /></button> : null}
          {onToggleProfile ? <button type="button" onClick={onToggleProfile} aria-label={copy.more}><MoreVertical aria-hidden /></button> : <button type="button" aria-label={copy.more} disabled><MoreVertical aria-hidden /></button>}
        </div>
      </header>

      {searchOpen ? (
        <div className="chat-thread__search">
          <Search aria-hidden />
          <input autoFocus value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
          <button type="button" onClick={() => { setMessageSearch(""); setSearchOpen(false); }} aria-label={t("common.clear")}><X aria-hidden /></button>
        </div>
      ) : null}

      <div className="chat-thread__messages min-h-0 flex-1 overflow-y-auto">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <EmptyState icon={messageSearch ? Search : Send} mesaj={messageSearch ? copy.noMatch : t("chat.empty")} />
          </div>
        ) : visibleMessages.map((message) => {
          const isMe = message.gonderen_id === userId;
          const sender = message.profiles ? `${message.profiles.ad ?? ""} ${message.profiles.soyad ?? ""}`.trim() : t("chat.user");
          const initials = `${message.profiles?.ad?.trim()?.[0] ?? ""}${message.profiles?.soyad?.trim()?.[0] ?? ""}`.toUpperCase() || "?";

          return (
            <div key={message.id} className={`chat-message ${isMe ? "is-me" : ""}`}>
              {!isMe ? (
                <Avatar className="chat-message__avatar">
                  <SignedAvatarImage src={message.profiles?.avatar_url} alt={sender || t("chat.user")} className="object-cover" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              ) : null}

              <div className="chat-message__column">
                {!isMe ? <span className="chat-message__sender">{sender}</span> : null}
                <div className="chat-message__bubble">
                  <p>{message.metin}</p>
                  {message.fayl_url ? (
                    <button type="button" onClick={() => handleDownloadFile(message.fayl_url!)}><Download aria-hidden />{t("chat.downloadFile")}</button>
                  ) : null}
                  <time>{format(new Date(message.created_at), "HH:mm", { locale: dateLocale })}</time>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-thread__composer">
        <label className="chat-composer-action" aria-label={t("office.upload")}>
          {faylYuklenir ? <Loader2 className="animate-spin" aria-hidden /> : <Paperclip aria-hidden />}
          <input type="file" className="hidden" disabled={faylYuklenir} onChange={handleFileChange} />
        </label>
        <textarea value={metin} onChange={(event) => setMetin(event.target.value)} onKeyDown={handleKeyDown} placeholder={t("chat.writeMessage")} />
        <button type="button" className="chat-composer-action" onClick={() => setMetin((current) => `${current}${current ? " " : ""}🙂`)} aria-label={copy.emoji}><Smile aria-hidden /></button>
        <button type="submit" disabled={!metin.trim()} className="chat-composer-send" aria-label={t("common.add")}><Send aria-hidden /></button>
      </form>
    </div>
  );
}
