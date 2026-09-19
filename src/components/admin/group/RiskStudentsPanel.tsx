import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type RiskSetri = {
  user_id: string;
  ad: string | null;
  soyad: string | null;
  course_id: string;
  course_ad: string;
  qayib_sayi: number;
  qayib_limiti: number;
  telefon: string | null;
  e_poct: string | null;
  qrup: string | null;
  fakulte: string | null;
};

function tamAd(setir: Pick<RiskSetri, "ad" | "soyad">) {
  return [setir.ad, setir.soyad].filter(Boolean).join(" ") || "Naməlum tələbə";
}

export function RiskStudentsPanel({ groupId }: { groupId: string }) {
  const [secilmisUserId, setSecilmisUserId] = useState<string | null>(null);

  const {
    data: riskSetirleri = [],
    isLoading,
    isError,
    error,
  } = useQuery<RiskSetri[]>({
    queryKey: ["at-risk-students", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("at_risk_students", {
        p_group_id: groupId,
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as RiskSetri[];
    },
  });

  const secilmisSetirler = useMemo(
    () => riskSetirleri.filter((setir) => setir.user_id === secilmisUserId),
    [riskSetirleri, secilmisUserId],
  );
  const secilmisTelebe = secilmisSetirler[0] ?? null;

  return (
    <>
      <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Risk siyahısı</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qayıb limiti keçilmiş tələbə və fənnlər.
              </p>
            </div>
          </div>
          {!isLoading ? (
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              {new Set(riskSetirleri.map((setir) => setir.user_id)).size} tələbə
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-36 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Risk siyahısı yüklənə bilmədi."}
          </div>
        ) : riskSetirleri.length === 0 ? (
          <EmptyState icon={AlertTriangle} mesaj="Qayıb limitini keçən tələbə yoxdur." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Fənn</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Qayıb / Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskSetirleri.map((setir) => (
                  <TableRow
                    key={`${setir.user_id}-${setir.course_id}`}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setSecilmisUserId(setir.user_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSecilmisUserId(setir.user_id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{tamAd(setir)}</TableCell>
                    <TableCell>{setir.course_ad}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex rounded-lg bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
                        {setir.qayib_sayi} / {setir.qayib_limiti}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={!!secilmisTelebe} onOpenChange={(open) => !open && setSecilmisUserId(null)}>
        <DialogContent className="rounded-3xl sm:max-w-xl">
          {secilmisTelebe ? (
            <>
              <DialogHeader>
                <DialogTitle>{tamAd(secilmisTelebe)}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Qrup
                    </p>
                    <p className="mt-1 text-sm font-semibold">{secilmisTelebe.qrup || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fakültə
                    </p>
                    <p className="mt-1 text-sm font-semibold">{secilmisTelebe.fakulte || "—"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {secilmisTelebe.telefon ? (
                    <a
                      href={`tel:${secilmisTelebe.telefon}`}
                      className="flex items-center gap-2 rounded-2xl border border-border/70 p-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
                    >
                      <Phone className="size-4 text-primary" />
                      <span className="truncate">{secilmisTelebe.telefon}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-border/70 p-3 text-sm text-muted-foreground">
                      <Phone className="size-4" /> Telefon yoxdur
                    </div>
                  )}

                  {secilmisTelebe.e_poct ? (
                    <a
                      href={`mailto:${secilmisTelebe.e_poct}`}
                      className="flex items-center gap-2 rounded-2xl border border-border/70 p-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
                    >
                      <Mail className="size-4 text-primary" />
                      <span className="truncate">{secilmisTelebe.e_poct}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-border/70 p-3 text-sm text-muted-foreground">
                      <Mail className="size-4" /> E-poçt yoxdur
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Risk olan fənnlər</h4>
                  <div className="space-y-2">
                    {secilmisSetirler.map((setir) => (
                      <div
                        key={setir.course_id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3"
                      >
                        <span className="min-w-0 truncate text-sm font-medium">{setir.course_ad}</span>
                        <span className="shrink-0 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
                          {setir.qayib_sayi} / {setir.qayib_limiti}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
