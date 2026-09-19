import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProfileSearchCombobox } from "@/components/admin/ProfileSearchCombobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function GroupLeaderDialog({
  açıq,
  onOpenChange,
  groupId,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  groupId: string;
}) {
  const queryClient = useQueryClient();

  const mutasiya = useMutation({
    mutationFn: async (tyutorId: string) => {
      const { error } = await supabase
        .from("groups")
        .update({ tyutor_id: tyutorId })
        .eq("id", groupId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Qrup rəhbəri təyin edildi.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] }),
      ]);
      onOpenChange(false);
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Rəhbər təyin edilə bilmədi."),
  });

  return (
    <Dialog
      open={açıq}
      onOpenChange={(deyer) => {
        if (mutasiya.isPending) return;
        onOpenChange(deyer);
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Rəhbər təyin et</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Rəhbər</label>
          <ProfileSearchCombobox
            rol="tyutor"
            placeholder="Axtar..."
            disabled={mutasiya.isPending}
            onSecim={(profil) => mutasiya.mutate(profil.user_id)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={mutasiya.isPending} onClick={() => onOpenChange(false)} className="rounded-xl">
            Ləğv et
          </Button>
          {mutasiya.isPending ? <Loader2 className="size-4 animate-spin self-center text-muted-foreground" /> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
