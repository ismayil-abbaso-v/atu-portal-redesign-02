import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ChevronLeft, Info, Loader2, Download, MessageCircleMore, Users2 } from "lucide-react";
import { format } from "date-fns";
import { az, tr, enUS, ru } from "date-fns/locale";
import { toast } from "sonner";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePageI18n } from "@/lib/i18n-extra";

export type ChatMessageWithProfile = Database["public"]["Tables"]["chat_messages"]["Row"] & {
  profiles: {
    ad: string | null;
    soyad: string | null;
    avatar_url: string | null;
  } | null;
};

interface MessageThreadProps {
  group: { id: string; ad: string; dogrulanmis?: boolean | null } | null;
  messages: ChatMessageWithProfile[];
  userId: string | null;
  onSendMessage: (text: string, fileUrl?: string, fileType?: "sekil" | "video" | "ses" | "fayl") => Promise<void>;
  onBack?: (() => void) | undefined;
  onToggleProfile?: (() => void) | undefined;
}

export function MessageThread({ group, messages, userId, onSendMessage, onBack, onToggleProfile }: MessageThreadProps) {
  const { locale, t } = usePageI18n();
  const dateLocale = locale === "az" ? az : locale === "tr" ? tr : locale === "ru" ? ru : enUS;
  const [metin, setMetin] = useState("");
  const [faylYuklenir, setFaylYuklenir] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, group]);

  if (!group) {
    return (
      <div className="chat-thread-empty relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-card px-6 text-center">
        <span aria-hidden className="chat-thread-empty__mesh" />
        <span aria-hidden className="chat-thread-empty__orb chat-thread-empty__orb--one" />
        <span aria-hidden className="chat-thread-empty__orb chat-thread-empty__orb--two" />
        <div className="relative z-10 flex max-w-sm flex-col items-center">
          <div className="chat-thread-empty__icon relative mb-5 flex size-[74px] items-center justify-center rounded-[24px] border border-primary/15 bg-primary/8 text-primary shadow-sm">
            <MessageCircleMore className="size-8" />
            <span className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
              <Users2 className="size-4" />
            </span>
          </div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Qrup söhbəti</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Mesajları görmək və söhbətə qoşulmaq üçün soldakı siyahıdan bir qrup seçin.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/75">
            <span className="size-1.5 rounded-full bg-primary" />
            ATU qrup ünsiyyəti
          </div>
        </div>
      </div>
    );
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!metin.trim()) return;
    try { await onSendMessage(metin.trim()); setMetin(""); } catch { /* parent handles toast */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaylYuklenir(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${group?.id ?? "unknown"}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      let faylNovu: "sekil" | "video" | "ses" | "fayl" = "fayl";
      if (file.type.startsWith("image/")) faylNovu = "sekil";
      else if (file.type.startsWith("video/")) faylNovu = "video";
      else if (file.type.startsWith("audio/")) faylNovu = "ses";
      await onSendMessage(`📎 ${file.name}`, filePath, faylNovu);
      toast.success(t("chat.fileSent"));
    } catch (err) {
      toast.error(`${t("chat.fileUploadError")}: ${err instanceof Error ? err.message : t("chat.unknownError")}`);
    } finally {
      setFaylYuklenir(false);
    }
  }

  async function handleDownloadFile(faylUrl: string) {
    try {
      const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(faylUrl, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error(t("chat.fileError"));
    }
  }

  return (
    <div className="chat-thread flex h-full min-w-0 flex-1 flex-col bg-background/35">
      <div className="chat-thread__header flex h-[72px] shrink-0 select-none items-center justify-between border-b border-border/70 bg-card/95 px-4 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? <button onClick={onBack} aria-label={t("common.back")} className="rounded-xl p-1.5 text-foreground transition-colors hover:bg-muted md:hidden"><ChevronLeft className="size-5" /></button> : null}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
            <MessageCircleMore className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">{group.ad}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              {t("chat.thread")}
            </p>
          </div>
        </div>
        {onToggleProfile ? <button onClick={onToggleProfile} aria-label={t("common.details")} className="rounded-xl border border-transparent p-2.5 text-muted-foreground transition-[background-color,color,border-color] hover:border-border hover:bg-muted/60 hover:text-foreground"><Info className="size-5" /></button> : null}
      </div>

      <div className="chat-thread__messages min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <EmptyState icon={Send} mesaj={t("chat.empty")} />
          </div>
        ) : messages.map((m) => {
          const isMe = m.gonderen_id === userId;
          const gonderenAd = m.profiles ? `${m.profiles.ad ?? ""} ${m.profiles.soyad ?? ""}`.trim() : t("chat.user");
          const initials = `${m.profiles?.ad?.trim()?.[0] ?? ""}${m.profiles?.soyad?.trim()?.[0] ?? ""}`.toUpperCase() || "?";

          return (
            <div key={m.id} className={`chat-message flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar className="mb-4 size-8 shrink-0 border border-border/70 bg-card shadow-sm">
                <SignedAvatarImage
                  src={m.profiles?.avatar_url}
                  alt={gonderenAd || "Profil şəkli"}
                  className="object-cover"
                />
                <AvatarFallback className="text-[9px] font-bold text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className={`flex min-w-0 max-w-[78%] flex-col sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                <span className="mb-1 px-1 text-[10px] font-medium text-muted-foreground">
                  {isMe ? t("chat.you") : gonderenAd}
                </span>
                <div className={`max-w-full rounded-2xl px-4 py-2.5 text-xs shadow-sm ${isMe ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border/60 bg-card text-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words leading-5">{m.metin}</p>
                  {m.fayl_url ? (
                    <button
                      onClick={() => handleDownloadFile(m.fayl_url!)}
                      className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold hover:underline ${isMe ? "text-primary-foreground/90" : "text-primary"}`}
                    >
                      <Download className="size-3.5" /> {t("chat.downloadFile")}
                    </button>
                  ) : null}
                </div>
                <span className="mt-1 px-1 text-[9px] text-muted-foreground/75">
                  {format(new Date(m.created_at), "HH:mm", { locale: dateLocale })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-thread__composer flex shrink-0 items-end gap-2.5 border-t border-border/70 bg-card/95 p-3.5 backdrop-blur-sm sm:gap-3 sm:p-4">
        <label className="shrink-0 cursor-pointer rounded-xl border border-transparent p-2.5 text-muted-foreground transition-[background-color,color,border-color] hover:border-border hover:bg-muted/60 hover:text-foreground">
          {faylYuklenir ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
          <input type="file" className="hidden" disabled={faylYuklenir} onChange={handleFileChange} />
        </label>
        <textarea value={metin} onChange={(e) => setMetin(e.target.value)} onKeyDown={handleKeyDown} placeholder={t("chat.writeMessage")} className="h-11 max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl border border-border/70 bg-background/70 px-3.5 py-3 text-xs text-foreground outline-none transition-[border-color,box-shadow,background-color] focus:border-primary/35 focus:bg-background focus:ring-4 focus:ring-primary/8" />
        <button type="submit" disabled={!metin.trim()} aria-label={t("common.add")} className="shrink-0 cursor-pointer rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-sm transition-[opacity,transform,box-shadow] hover:shadow-md active:scale-95 disabled:scale-100 disabled:opacity-50"><Send className="size-5" /></button>
      </form>
    </div>
  );
}
