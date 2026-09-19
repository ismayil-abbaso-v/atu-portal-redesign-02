import { CalendarCog } from "lucide-react";
import { useEffect, useState } from "react";

import { CurrentWeekBadge } from "@/components/calendar/CurrentWeekBadge";
import { ScheduleTemplateEditor } from "@/components/calendar/ScheduleTemplateEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarManagementI18n } from "@/lib/calendar-management-i18n";

type GroupOption = { id: string; ad: string };

export function ScheduleManagementView({ groups }: { groups: GroupOption[] }) {
  const { t } = useCalendarManagementI18n();
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (groups.length === 0) {
      setGroupId("");
      return;
    }
    if (!groups.some((group) => group.id === groupId)) setGroupId(groups[0]!.id);
  }, [groups, groupId]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarCog className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("management.title")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("management.description")}
            </p>
          </div>
        </div>
        <CurrentWeekBadge className="shrink-0" />
      </section>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold">{t("management.noGroups")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("management.group")}
            </label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="min-h-11 max-w-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.ad}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {groupId ? <ScheduleTemplateEditor groupId={groupId} /> : null}
        </>
      )}
    </div>
  );
}
