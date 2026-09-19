import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function InlineEditDialog({
  açıq,
  onOpenChange,
  başlıq,
  etiket,
  ilkDeyer,
  tip = "text",
  gonderilir,
  onYadda,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  başlıq: string;
  etiket: string;
  ilkDeyer: string;
  tip?: "text" | "number";
  gonderilir: boolean;
  onYadda: (deyer: string) => void;
}) {
  const [deyer, setDeyer] = useState(ilkDeyer);

  useEffect(() => {
    if (açıq) setDeyer(ilkDeyer);
  }, [açıq, ilkDeyer]);

  return (
    <Dialog open={açıq} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{başlıq}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">{etiket}</label>
          <Input
            type={tip}
            value={deyer}
            onChange={(e) => setDeyer(e.target.value)}
            className="rounded-xl"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            className="w-full rounded-xl"
            disabled={gonderilir}
            onClick={() => onYadda(deyer)}
          >
            {gonderilir ? <Loader2 className="size-4 animate-spin" /> : "Yadda saxla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
