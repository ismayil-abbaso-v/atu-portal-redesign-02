import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { bildirisTipKonfiqurasiyasi, type BildirisTipi } from "@/lib/notification-types";
import { notificationRoleKeys, notificationTypeKeys, useNotificationHubI18n } from "@/lib/notification-hub-i18n";

type AppRole = Database["public"]["Enums"]["app_role"];

const roller: AppRole[] = ["telebe", "tyutor", "muellim", "dekan"];

type Hedef = "hamisi" | "rol" | "qrup";

export function BroadcastNotificationDialog() {
  const { t } = useNotificationHubI18n();
  const [acıq, setAcıq] = useState(false);
  const [baslıq, setBaslıq] = useState("");
  const [metin, setMetin] = useState("");
  const [tip, setTip] = useState<BildirisTipi>("elan");
  const [hedef, setHedef] = useState<Hedef>("hamisi");
  const [hedefRol, setHedefRol] = useState<AppRole>("telebe");
  const [hedefQrup, setHedefQrup] = useState<string>("");

  const { data: qruplar = [] } = useQuery({
    queryKey: ["all-groups-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, ad").order("ad");
      if (error) throw error;
      return data || [];
    },
    enabled: acıq && hedef === "qrup",
  });

  function formuSıfırla() {
    setBaslıq("");
    setMetin("");
    setTip("elan");
    setHedef("hamisi");
    setHedefRol("telebe");
    setHedefQrup("");
  }

  const gonderMutasiyasi = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("broadcast_notification", {
        p_tip: tip,
        p_baslıq: baslıq.trim(),
        p_metin: metin.trim(),
        ...(hedef === "rol" ? { p_hedef_rol: hedefRol } : {}),
        ...(hedef === "qrup" ? { p_hedef_qrup: hedefQrup } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (alıcıSayı) => {
      toast.success(t("broadcast.success", { count: alıcıSayı ?? 0 }));
      formuSıfırla();
      setAcıq(false);
    },
    onError: (xeta: Error) => {
      toast.error(xeta.message || t("broadcast.error"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!baslıq.trim()) return;
    if (hedef === "qrup" && !hedefQrup) {
      toast.error(t("broadcast.selectGroupError"));
      return;
    }
    gonderMutasiyasi.mutate();
  }

  return (
    <Dialog
      open={acıq}
      onOpenChange={(v) => {
        setAcıq(v);
        if (!v) formuSıfırla();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold">
          <Send className="size-4" />
          {t("broadcast.open")}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl bg-card border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">{t("broadcast.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-basliq">{t("broadcast.heading")}</Label>
            <Input
              id="broadcast-basliq"
              value={baslıq}
              onChange={(e) => setBaslıq(e.target.value)}
              placeholder={t("broadcast.headingPlaceholder")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-metin">{t("broadcast.body")}</Label>
            <Textarea
              id="broadcast-metin"
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder={t("broadcast.bodyPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("broadcast.type")}</Label>
            <Select value={tip} onValueChange={(v) => setTip(v as BildirisTipi)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("broadcast.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(bildirisTipKonfiqurasiyasi).map((deyer) => (
                  <SelectItem key={deyer} value={deyer}>
                    {t(notificationTypeKeys[deyer as BildirisTipi])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("broadcast.recipient")}</Label>
            <RadioGroup value={hedef} onValueChange={(v) => setHedef(v as Hedef)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="hamisi" id="hedef-hamisi" />
                <Label htmlFor="hedef-hamisi" className="font-normal">
                  {t("broadcast.allUsers")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="rol" id="hedef-rol" />
                <Label htmlFor="hedef-rol" className="font-normal">
                  {t("broadcast.selectedRole")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="qrup" id="hedef-qrup" />
                <Label htmlFor="hedef-qrup" className="font-normal">
                  {t("broadcast.selectedGroup")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {hedef === "rol" ? (
            <div className="space-y-1.5">
              <Label>{t("broadcast.role")}</Label>
              <Select value={hedefRol} onValueChange={(v) => setHedefRol(v as AppRole)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("broadcast.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  {roller.map((rol) => (
                    <SelectItem key={rol} value={rol}>
                      {t(notificationRoleKeys[rol as keyof typeof notificationRoleKeys])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {hedef === "qrup" ? (
            <div className="space-y-1.5">
              <Label>{t("broadcast.group")}</Label>
              <Select value={hedefQrup} onValueChange={setHedefQrup}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("broadcast.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {qruplar.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAcıq(false)}
              disabled={gonderMutasiyasi.isPending}
              className="rounded-xl font-bold"
            >
              {t("broadcast.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={gonderMutasiyasi.isPending}
              className="rounded-xl font-bold"
            >
              {gonderMutasiyasi.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("broadcast.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
