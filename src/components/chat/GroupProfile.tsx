import { useState } from "react";
import { X, Users, Image as ImageIcon, Video, Mic, FileText, Download } from "lucide-react";
import { toast } from "sonner";

import { SignedAvatarImage } from "@/components/common/SignedAvatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";

type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export type ChatGroupMemberWithProfile =
  Database["public"]["Tables"]["chat_group_members"]["Row"] & {
    profiles:
      | (Database["public"]["Tables"]["profiles"]["Row"] & {
          user_roles?: { role: Database["public"]["Enums"]["app_role"] }[] | null;
        })
      | null;
  };

interface GroupProfileProps {
  group: { id: string; ad: string } | null;
  members: ChatGroupMemberWithProfile[];
  messages: ChatMessage[];
  onClose?: () => void;
}

const MEDIA_BASLIQ: Record<"sekil" | "video" | "ses" | "fayl", string> = {
  sekil: "Şəkillər",
  video: "Videolar",
  ses: "Səslər",
  fayl: "Fayllar",
};

const ROL_TƏRCÜMƏ: Record<string, string> = {
  admin: "Admin",
  dekan: "Dekan",
  muellim: "Müəllim",
  tyutor: "Tyutor",
  telebe: "Tələbə",
};

export function GroupProfile({ group, members, messages, onClose }: GroupProfileProps) {
  const [selectedMediaType, setSelectedMediaType] = useState<
    "sekil" | "video" | "ses" | "fayl" | null
  >(null);

  if (!group) return null;

  const sharedFiles = messages.filter((m) => !!m.fayl_url);
  const imageCount = sharedFiles.filter((m) => m.fayl_novu === "sekil").length;
  const videoCount = sharedFiles.filter((m) => m.fayl_novu === "video").length;
  const audioCount = sharedFiles.filter((m) => m.fayl_novu === "ses").length;
  const docCount = sharedFiles.filter((m) => m.fayl_novu === "fayl").length;

  const filteredMedia = selectedMediaType
    ? sharedFiles.filter((m) => m.fayl_novu === selectedMediaType)
    : [];

  async function handleDownloadMedia(faylUrl: string | null) {
    if (!faylUrl) return;
    try {
      const { data, error } = await supabase.storage
        .from("chat-files")
        .createSignedUrl(faylUrl, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Media faylı açılarkən xəta baş verdi.");
    }
  }

  const ilkHerf = group.ad.substring(0, 1).toUpperCase();
  const siralanmisUzvler = [...members].sort((a, b) =>
    compareStudentProfilesBySurnameThenName(a.profiles, b.profiles),
  );

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col shrink-0 min-w-0">
      <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 select-none">
        <h3 className="font-bold text-sm text-foreground">Qrup Profili</h3>
        {onClose ? (
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-xl text-muted-foreground">
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-20 rounded-full bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center">
            {ilkHerf}
          </div>
          <div>
            <h4 className="font-bold text-base text-foreground">{group.ad}</h4>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <Users className="size-3.5" /> {members.length} Üzv
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Paylaşılan Media
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setSelectedMediaType("sekil")}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors hover:bg-muted/40 ${
                selectedMediaType === "sekil"
                  ? "bg-muted border-primary"
                  : "bg-muted/10 border-border/40"
              }`}
            >
              <ImageIcon className="size-5 text-primary" />
              <span>Şəkillər ({imageCount})</span>
            </button>

            <button
              onClick={() => setSelectedMediaType("video")}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors hover:bg-muted/40 ${
                selectedMediaType === "video"
                  ? "bg-muted border-primary"
                  : "bg-muted/10 border-border/40"
              }`}
            >
              <Video className="size-5 text-primary" />
              <span>Videolar ({videoCount})</span>
            </button>

            <button
              onClick={() => setSelectedMediaType("ses")}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors hover:bg-muted/40 ${
                selectedMediaType === "ses"
                  ? "bg-muted border-primary"
                  : "bg-muted/10 border-border/40"
              }`}
            >
              <Mic className="size-5 text-primary" />
              <span>Səslər ({audioCount})</span>
            </button>

            <button
              onClick={() => setSelectedMediaType("fayl")}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors hover:bg-muted/40 ${
                selectedMediaType === "fayl"
                  ? "bg-muted border-primary"
                  : "bg-muted/10 border-border/40"
              }`}
            >
              <FileText className="size-5 text-primary" />
              <span>Fayllar ({docCount})</span>
            </button>
          </div>
        </div>

        <Dialog
          open={selectedMediaType !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedMediaType(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedMediaType ? MEDIA_BASLIQ[selectedMediaType] : ""}</DialogTitle>
            </DialogHeader>
            {filteredMedia.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Bu növdə paylaşılan media yoxdur.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {filteredMedia.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleDownloadMedia(m.fayl_url)}
                    className="w-full text-left p-2.5 bg-muted/30 hover:bg-muted rounded-xl border border-border/20 text-xs text-foreground truncate flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{m.metin || "Fayl"}</span>
                    <Download className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Üzvlər
          </h5>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {siralanmisUzvler.map((member) => {
              if (!member.profiles) return null;

              const userRole = member.profiles.user_roles?.[0]?.role || "telebe";
              const userHerf = member.profiles.ad?.substring(0, 1).toUpperCase() || "?";
              const roleDisplay = ROL_TƏRCÜMƏ[userRole] || "Tələbə";
              const tamAd = `${member.profiles.ad ?? ""} ${member.profiles.soyad ?? ""}`.trim();

              return (
                <div key={member.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-8 shrink-0 border border-border/60">
                      <SignedAvatarImage
                        src={member.profiles.avatar_url}
                        alt={tamAd || "Profil şəkli"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-[10px] font-bold text-muted-foreground">
                        {userHerf}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground truncate">
                      {member.profiles.ad} {member.profiles.soyad}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                      userRole === "muellim"
                        ? "bg-primary/10 text-primary"
                        : userRole === "tyutor"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {roleDisplay}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
