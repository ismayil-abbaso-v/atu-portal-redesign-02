import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, mesaj }: { icon: LucideIcon; mesaj: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <Icon className="size-14 stroke-[1.25] text-muted-foreground/50" />
      <p className="text-base text-muted-foreground">{mesaj}</p>
    </div>
  );
}
