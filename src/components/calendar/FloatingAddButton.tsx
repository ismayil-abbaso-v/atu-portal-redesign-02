import { Plus } from "lucide-react";
import { useUserRoles } from "@/hooks/use-user-role";
import { useI18n } from "@/lib/i18n";

interface FloatingAddButtonProps { onClick: () => void; }

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  const { roles } = useUserRoles();
  const { t } = useI18n();
  const hasWriteAccess = roles?.includes("admin") || roles?.includes("dekan") || roles?.includes("tyutor");
  if (!hasWriteAccess) return null;
  return <button type="button" onClick={onClick} className="fixed bottom-20 right-6 z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 md:bottom-6" aria-label={t("common.add")}><Plus className="size-6 shrink-0" /></button>;
}
