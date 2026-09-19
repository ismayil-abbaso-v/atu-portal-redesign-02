import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProfileSearchCombobox } from "@/components/admin/ProfileSearchCombobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function GroupStudentDialog({
  açıq,
  onOpenChange,
  groupId,
  mövcudUzvIdler,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  groupId: string;
  mövcudUzvIdler: string[];
}) {
  const queryClient = useQueryClient();

  const mutasiya = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Tələbə qrupa əlavə edildi.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group-members", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-groups", "list"] }),
      ]);
      onOpenChange(false);
    },
    onError: (xeta: Error) => toast.error(xeta.message || "Tələbə əlavə edilə bilmədi."),
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
          <DialogTitle>Tələbə əlavə et</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Tələbə</label>
          <ProfileSearchCombobox
            rol="telebe"
            istisnaIdler={mövcudUzvIdler}
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
