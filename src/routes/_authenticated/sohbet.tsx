import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { GroupList } from "@/components/chat/GroupList";
import { MessageThread, type ChatMessageWithProfile } from "@/components/chat/MessageThread";
import { GroupProfile, type ChatGroupMemberWithProfile } from "@/components/chat/GroupProfile";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-user-role";
import type { Database } from "@/integrations/supabase/types";
import { usePageI18n } from "@/lib/i18n-extra";
import "@/chat-panel.css";

type ChatGroup = Database["public"]["Tables"]["chat_groups"]["Row"];
type LastMessage = Database["public"]["Views"]["chat_group_last_message"]["Row"];

export const Route = createFileRoute("/_authenticated/sohbet")({
  head: () => ({ meta: [
    { title: "ATU Portal" },
    { name: "description", content: "ATU Portal" },
    { property: "og:title", content: "ATU Portal" },
    { property: "og:description", content: "ATU Portal" },
  ]}),
  component: SohbetSehifesi,
});

function SohbetSehifesi() {
  const queryClient = useQueryClient();
  const { userId } = useUserRoles();
  const { locale, t } = usePageI18n();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [axtaris, setAxtaris] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread" | "profile">("list");

  useEffect(() => {
    document.title = `${t("chat.metaTitle")} — ATU Portal`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = t("chat.metaDescription");
  }, [locale, t]);

  const { data: groupsData } = useQuery({ queryKey: ["chat-groups", userId], queryFn: async () => { const { data, error } = await supabase.from("chat_groups").select("*").order("created_at", { ascending: false }); if (error) throw error; return data || []; }, enabled: !!userId });
  const groups: ChatGroup[] = groupsData ?? [];
  const { data: lastMessagesData } = useQuery({ queryKey: ["chat-group-last-messages", userId], queryFn: async () => { const { data, error } = await supabase.from("chat_group_last_message").select("*"); if (error) throw error; return (data || []) as LastMessage[]; }, enabled: !!userId });
  const lastMessages: LastMessage[] = lastMessagesData ?? [];
  const { data: messagesData } = useQuery({ queryKey: ["chat-messages", selectedGroupId], queryFn: async () => { if (!selectedGroupId) return []; const { data, error } = await supabase.from("chat_messages").select("*, profiles(ad, soyad, avatar_url)").eq("chat_group_id", selectedGroupId).order("created_at", { ascending: true }); if (error) throw error; return (data || []) as ChatMessageWithProfile[]; }, enabled: !!selectedGroupId });
  const messages: ChatMessageWithProfile[] = messagesData ?? [];
  const { data: membersData } = useQuery({ queryKey: ["chat-group-members", selectedGroupId], queryFn: async () => { if (!selectedGroupId) return []; const { data, error } = await supabase.from("chat_group_members").select("*, profiles(*, user_roles(role))").eq("chat_group_id", selectedGroupId); if (error) throw error; return (data || []) as ChatGroupMemberWithProfile[]; }, enabled: !!selectedGroupId });
  const members: ChatGroupMemberWithProfile[] = membersData ?? [];

  useEffect(() => {
    if (groupsData === undefined) return;
    const pendingGroupId = sessionStorage.getItem("atu-portal:notification-chat-group");
    if (!pendingGroupId) return;
    if (groupsData.some((group) => group.id === pendingGroupId)) { setSelectedGroupId(pendingGroupId); setMobileView("thread"); }
    sessionStorage.removeItem("atu-portal:notification-chat-group");
  }, [groupsData]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const channel = supabase.channel(`chat-room-${selectedGroupId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_group_id=eq.${selectedGroupId}` }, async (payload) => {
      const newMsg = payload.new as Database["public"]["Tables"]["chat_messages"]["Row"];
      let profile: { ad: string | null; soyad: string | null; avatar_url: string | null } | null = null;
      if (newMsg.gonderen_id) { const { data } = await supabase.from("profiles").select("ad, soyad, avatar_url").eq("user_id", newMsg.gonderen_id).maybeSingle(); profile = data; }
      const messageWithProfile: ChatMessageWithProfile = { ...newMsg, profiles: profile };
      queryClient.setQueryData(["chat-messages", selectedGroupId], (oldMsgs: ChatMessageWithProfile[] = []) => oldMsgs.some((m) => m.id === messageWithProfile.id) ? oldMsgs : [...oldMsgs, messageWithProfile]);
      void queryClient.invalidateQueries({ queryKey: ["chat-group-last-messages"] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedGroupId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, fileUrl, fileType }: { text: string; fileUrl?: string; fileType?: "sekil" | "video" | "ses" | "fayl" }) => {
      const { error } = await supabase.from("chat_messages").insert({ chat_group_id: selectedGroupId, gonderen_id: userId, metin: text, fayl_url: fileUrl || null, fayl_novu: fileType || null });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-group-last-messages"] }),
    onError: (err) => toast.error(`${t("chat.messageSendError")}: ${err instanceof Error ? err.message : t("chat.unknownError")}`),
  });

  async function handleSendMessage(text: string, fileUrl?: string, fileType?: "sekil" | "video" | "ses" | "fayl") { await sendMessageMutation.mutateAsync({ text, ...(fileUrl ? { fileUrl } : {}), ...(fileType ? { fileType } : {}) }); }
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || null;

  return (
    <div className="chat-shell flex h-[calc(100vh-140px)] flex-1 overflow-hidden rounded-[28px] border border-border/80 bg-card md:h-[calc(100vh-100px)]">
      <div className="flex h-full min-w-0 flex-1 md:hidden">
        {mobileView === "list" ? <div className="h-full w-full min-w-0"><GroupList groups={groups} lastMessages={lastMessages} selectedGroupId={selectedGroupId} onSelectGroup={(id) => { setSelectedGroupId(id); setMobileView("thread"); }} axtaris={axtaris} onAxtarisChange={setAxtaris} /></div> : mobileView === "thread" ? <div className="h-full w-full min-w-0"><MessageThread group={activeGroup} messages={messages} userId={userId} onSendMessage={handleSendMessage} onBack={() => setMobileView("list")} onToggleProfile={() => setMobileView("profile")} /></div> : <div className="h-full w-full min-w-0"><GroupProfile group={activeGroup} members={members} messages={messages} onClose={() => setMobileView("thread")} /></div>}
      </div>
      <div className="hidden h-full min-w-0 flex-1 md:flex">
        <div className="w-[320px] shrink-0 border-r border-border/70"><GroupList groups={groups} lastMessages={lastMessages} selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} axtaris={axtaris} onAxtarisChange={setAxtaris} /></div>
        <div className="min-w-0 flex-1"><MessageThread group={activeGroup} messages={messages} userId={userId} onSendMessage={handleSendMessage} onBack={() => setSelectedGroupId("")} onToggleProfile={() => setShowProfile(true)} /></div>
        {showProfile ? <div className="w-[320px] shrink-0 border-l border-border/70"><GroupProfile group={activeGroup} members={members} messages={messages} onClose={() => setShowProfile(false)} /></div> : null}
      </div>
    </div>
  );
}
