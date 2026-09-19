import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GroupCombobox } from "@/components/admin/GroupCombobox";
import { RoleMultiSelect } from "@/components/admin/RoleMultiSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { IstifadeciSetri } from "@/lib/admin-users";
import { adminCreateUser } from "@/server-functions/admin-users";

const dimBaliSxemi = z
  .string()
  .trim()
  .refine((deyer) => deyer === "" || Number.isFinite(Number(deyer)), "DİM balı rəqəm olmalıdır")
  .refine((deyer) => deyer === "" || (Number(deyer) >= 0 && Number(deyer) <= 700), "DİM balı 0–700 aralığında olmalıdır");

const formSxemi = z.object({
  soyad: z.string().trim().min(1, "Soyad tələb olunur"),
  ad: z.string().trim().min(1, "Ad tələb olunur"),
  ata_adi: z.string().trim().optional(),
  fin_kodu: z.string().trim().min(1, "FİN Kodu tələb olunur"),
  dogum_tarixi: z.string().trim().optional(),
  cins: z.string().trim().optional(),
  telefon: z.string().trim().optional(),
  e_poct: z.string().trim().email("Düzgün e-poçt daxil edin").or(z.literal("")).optional(),
  sheher: z.string().trim().optional(),
  rollar: z
    .array(z.enum(["admin", "dekan", "tyutor", "muellim", "telebe"]))
    .min(1, "Ən azı bir rol seçin"),
  istifadeci_adi: z.string().trim().optional(),
  ixtisas: z.string().trim().optional(),
  fakulte: z.string().trim().optional(),
  qebul_ili: z.string().trim().optional(),
  bitirme_ili: z.string().trim().optional(),
  sinif: z.string().trim().optional(),
  dim_bali: dimBaliSxemi.optional(),
  tehsil_novu: z.string().trim().optional(),
  sosial_veziyyet: z.string().trim().optional(),
  tehsil_haqqi: z.string().trim().optional(),
  esd_istifadeci: z.boolean(),
  muveqqeti_sifre: z.string().trim().optional(),
});

type FormDeyerleri = z.infer<typeof formSxemi>;

const BOŞ_DEYERLER: FormDeyerleri = {
  soyad: "",
  ad: "",
  ata_adi: "",
  fin_kodu: "",
  dogum_tarixi: "",
  cins: "",
  telefon: "",
  e_poct: "",
  sheher: "",
  rollar: [],
  istifadeci_adi: "",
  ixtisas: "",
  fakulte: "",
  qebul_ili: "",
  bitirme_ili: "",
  sinif: "",
  dim_bali: "",
  tehsil_novu: "",
  sosial_veziyyet: "",
  tehsil_haqqi: "",
  esd_istifadeci: false,
  muveqqeti_sifre: "",
};

const KURS_SEÇENƏKLƏRI = ["I", "II", "III", "IV", "V"];

export function UserFormDialog({
  açıq,
  onOpenChange,
  rejim,
  istifadeci,
}: {
  açıq: boolean;
  onOpenChange: (deyer: boolean) => void;
  rejim: "yeni" | "redakte";
  /** rejim === "redakte" olduqda mütləqdir. */
  istifadeci?: IstifadeciSetri | null;
}) {
  const queryClient = useQueryClient();
  const [qrupId, setQrupId] = useState<string | null>(null);
  const [qrupAdi, setQrupAdi] = useState<string | null>(null);

  const form = useForm<FormDeyerleri>({
    resolver: zodResolver(formSxemi),
    defaultValues: BOŞ_DEYERLER,
  });

  const { data: fakulteler } = useQuery({
    queryKey: ["admin-users", "faculties"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_distinct_faculties");
      if (error) throw error;
      return data.map((f) => f.fakulte).filter(Boolean);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!açıq) return;
    if (rejim === "redakte" && istifadeci) {
      form.reset({
        soyad: istifadeci.soyad ?? "",
        ad: istifadeci.ad ?? "",
        ata_adi: istifadeci.ata_adi ?? "",
        fin_kodu: istifadeci.fin_kodu ?? "",
        dogum_tarixi: istifadeci.dogum_tarixi ?? "",
        cins: istifadeci.cins ?? "",
        telefon: istifadeci.telefon ?? "",
        e_poct: istifadeci.e_poct ?? "",
        sheher: istifadeci.sheher ?? "",
        rollar: istifadeci.rollar,
        istifadeci_adi: istifadeci.istifadeci_adi ?? "",
        ixtisas: istifadeci.ixtisas ?? "",
        fakulte: istifadeci.fakulte ?? "",
        qebul_ili: istifadeci.qebul_ili?.toString() ?? "",
        bitirme_ili: istifadeci.bitirme_ili?.toString() ?? "",
        sinif: "",
        dim_bali: istifadeci.dim_bali?.toString() ?? "",
        tehsil_novu: "",
        sosial_veziyyet: "",
        tehsil_haqqi: "",
        esd_istifadeci: false,
        muveqqeti_sifre: "",
      });
      void supabase
        .from("profiles")
        .select("sinif, tehsil_novu, sosial_veziyyet, tehsil_haqqi, esd_istifadeci, qrup")
        .eq("user_id", istifadeci.user_id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          form.setValue("sinif", data.sinif ?? "");
          form.setValue("tehsil_novu", data.tehsil_novu ?? "");
          form.setValue("sosial_veziyyet", data.sosial_veziyyet ?? "");
          form.setValue("tehsil_haqqi", data.tehsil_haqqi?.toString() ?? "");
          form.setValue("esd_istifadeci", data.esd_istifadeci ?? false);
        });
      void supabase
        .from("group_members")
        .select("group_id, groups(ad)")
        .eq("user_id", istifadeci.user_id)
        .maybeSingle()
        .then(({ data }) => {
          const qeyd = data as unknown as {
            group_id: string;
            groups: { ad: string } | null;
          } | null;
          if (qeyd) {
            setQrupId(qeyd.group_id);
            setQrupAdi(qeyd.groups?.ad ?? istifadeci.qrup ?? null);
          } else {
            setQrupId(null);
            setQrupAdi(null);
          }
        });
    } else {
      form.reset(BOŞ_DEYERLER);
      setQrupId(null);
      setQrupAdi(null);
    }
  }, [açıq, rejim, istifadeci]); // eslint-disable-line react-hooks/exhaustive-deps

  async function qrupUzvluyunuYenile(userId: string) {
    await supabase.from("group_members").delete().eq("user_id", userId);
    if (qrupId) {
      await supabase.from("group_members").insert({ group_id: qrupId, user_id: userId });
    }
  }

  const mutasiya = useMutation({
    mutationFn: async (deyerler: FormDeyerleri) => {
      const ortaqProfil = {
        ad: deyerler.ad,
        soyad: deyerler.soyad,
        ata_adi: deyerler.ata_adi || null,
        fin_kodu: deyerler.fin_kodu,
        dogum_tarixi: deyerler.dogum_tarixi || null,
        cins: deyerler.cins || null,
        telefon: deyerler.telefon || null,
        e_poct: deyerler.e_poct || null,
        sheher: deyerler.sheher || null,
        istifadeci_adi: deyerler.istifadeci_adi || null,
        ixtisas: deyerler.ixtisas || null,
        fakulte: deyerler.fakulte || null,
        qebul_ili: deyerler.qebul_ili ? Number(deyerler.qebul_ili) : null,
        bitirme_ili: deyerler.bitirme_ili ? Number(deyerler.bitirme_ili) : null,
        sinif: deyerler.sinif || null,
        dim_bali: deyerler.dim_bali ? Number(deyerler.dim_bali) : null,
        tehsil_novu: deyerler.tehsil_novu || null,
        sosial_veziyyet: deyerler.sosial_veziyyet || null,
        tehsil_haqqi: deyerler.tehsil_haqqi ? Number(deyerler.tehsil_haqqi) : null,
        esd_istifadeci: deyerler.esd_istifadeci,
        qrup: qrupAdi,
      };

      if (rejim === "yeni") {
        if (!deyerler.muveqqeti_sifre || deyerler.muveqqeti_sifre.length < 6) {
          throw new Error("Müvəqqəti şifrə ən azı 6 simvol olmalıdır.");
        }
        const netice = await adminCreateUser({
          data: {
            ad: deyerler.ad,
            soyad: deyerler.soyad,
            ata_adi: deyerler.ata_adi || null,
            e_poct: deyerler.e_poct || null,
            muveqqeti_sifre: deyerler.muveqqeti_sifre,
            istifadeci_adi: deyerler.istifadeci_adi || null,
            rollar: deyerler.rollar,
          },
        });
        const { qrup: _qrup, ...qalanProfil } = ortaqProfil;
        void _qrup;
        const { error } = await supabase
          .from("profiles")
          .update(qalanProfil)
          .eq("user_id", netice.user_id);
        if (error) throw new Error(error.message);
        await qrupUzvluyunuYenile(netice.user_id);
      } else {
        if (!istifadeci) throw new Error("İstifadəçi tapılmadı.");
        const { error: profilXetasi } = await supabase
          .from("profiles")
          .update(ortaqProfil)
          .eq("user_id", istifadeci.user_id);
        if (profilXetasi) throw new Error(profilXetasi.message);

        const { error: rolSilXetasi } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", istifadeci.user_id);
        if (rolSilXetasi) throw new Error(rolSilXetasi.message);

        const { error: rolElaveXetasi } = await supabase
          .from("user_roles")
          .insert(deyerler.rollar.map((rol) => ({ user_id: istifadeci.user_id, role: rol })));
        if (rolElaveXetasi) throw new Error(rolElaveXetasi.message);

        await qrupUzvluyunuYenile(istifadeci.user_id);
      }
    },
    onSuccess: () => {
      toast.success(rejim === "yeni" ? "İstifadəçi yaradıldı." : "Dəyişikliklər yadda saxlanıldı.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users", "list"] });
      onOpenChange(false);
    },
    onError: (xeta: Error) => {
      toast.error(xeta.message || "Əməliyyat uğursuz oldu.");
    },
  });

  return (
    <Dialog open={açıq} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {rejim === "yeni" ? "Yeni istifadəçi" : "İstifadəçini Redaktə Et"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3"
          onSubmit={form.handleSubmit((deyerler) => mutasiya.mutate(deyerler))}
        >
          <Sahe label="Soyad *" xeta={form.formState.errors.soyad?.message}>
            <Input placeholder="Soyad" {...form.register("soyad")} />
          </Sahe>
          <Sahe label="Ad *" xeta={form.formState.errors.ad?.message}>
            <Input placeholder="Ad" {...form.register("ad")} />
          </Sahe>
          <Sahe label="Ata adı">
            <Input placeholder="Ata adı" {...form.register("ata_adi")} />
          </Sahe>

          <Sahe label="FİN Kodu *" xeta={form.formState.errors.fin_kodu?.message}>
            <Input placeholder="FİN KODU" {...form.register("fin_kodu")} />
          </Sahe>
          <Sahe label="Doğum tarixi">
            <Input type="date" {...form.register("dogum_tarixi")} />
          </Sahe>
          <Sahe label="Cins">
            <Select
              value={form.watch("cins") ?? ""}
              onValueChange={(deyer) => form.setValue("cins", deyer)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kişi">Kişi</SelectItem>
                <SelectItem value="Qadın">Qadın</SelectItem>
              </SelectContent>
            </Select>
          </Sahe>

          <Sahe label="Telefon">
            <Input placeholder="Telefon" {...form.register("telefon")} />
          </Sahe>
          <Sahe label="E-poçt" xeta={form.formState.errors.e_poct?.message}>
            <Input placeholder="E-poçt (məcburi deyil)" type="email" {...form.register("e_poct")} />
          </Sahe>
          <Sahe label="Şəhər">
            <Input placeholder="Şəhər" {...form.register("sheher")} />
          </Sahe>

          <Sahe label="Rol *" xeta={form.formState.errors.rollar?.message}>
            <RoleMultiSelect
              seçilenler={form.watch("rollar")}
              onDeyisiklik={(deyer) => form.setValue("rollar", deyer, { shouldValidate: true })}
            />
          </Sahe>
          <Sahe label="İstifadəçi adı">
            <Input placeholder="İstifadəçi adı" {...form.register("istifadeci_adi")} />
          </Sahe>
          <div className="hidden sm:block" />

          <Sahe label="İxtisas">
            <Input placeholder="İxtisas" {...form.register("ixtisas")} />
          </Sahe>
          <Sahe label="Fakültə">
            <Select
              value={form.watch("fakulte") ?? ""}
              onValueChange={(deyer) => form.setValue("fakulte", deyer)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Fakültə seçin" />
              </SelectTrigger>
              <SelectContent>
                {(fakulteler ?? []).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Sahe>
          <Sahe label="Qrup">
            <GroupCombobox
              deyer={qrupId}
              onDeyisiklik={(id, ad) => {
                setQrupId(id);
                setQrupAdi(ad);
              }}
            />
          </Sahe>

          <Sahe label="Qəbul ili">
            <Input placeholder="2026" type="number" {...form.register("qebul_ili")} />
          </Sahe>
          <Sahe label="Bitirmə ili">
            <Input placeholder="2030" type="number" {...form.register("bitirme_ili")} />
          </Sahe>
          <Sahe label="Hal-hazırki kurs">
            <Select
              value={form.watch("sinif") ?? ""}
              onValueChange={(deyer) => form.setValue("sinif", deyer)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Kurs seçin" />
              </SelectTrigger>
              <SelectContent>
                {KURS_SEÇENƏKLƏRI.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k} kurs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Sahe>

          <Sahe label="DİM Balı" xeta={form.formState.errors.dim_bali?.message}>
            <Input
              placeholder="0–700"
              type="number"
              min={0}
              max={700}
              step="0.01"
              inputMode="decimal"
              {...form.register("dim_bali")}
            />
          </Sahe>
          <Sahe label="Təhsil statusu">
            <Input placeholder="d/s, ödənişli" {...form.register("tehsil_novu")} />
          </Sahe>
          <Sahe label="Sosial həssaslıq">
            <Input placeholder="Sosial həssaslıq" {...form.register("sosial_veziyyet")} />
          </Sahe>

          <Sahe label="Təhsil haqqı (AZN)">
            <Input placeholder="Təhsil haqqı" type="number" {...form.register("tehsil_haqqi")} />
          </Sahe>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox
              checked={form.watch("esd_istifadeci")}
              onCheckedChange={(deyer) => form.setValue("esd_istifadeci", deyer === true)}
            />
            <span>
              ESD İstifadəçisi
              <span className="block text-xs font-normal text-muted-foreground">
                Rəqəmsal Sənəd Dövriyyəsinə giriş icazəsi
              </span>
            </span>
          </label>
          <div className="hidden sm:block" />

          {rejim === "yeni" ? (
            <Sahe label="Müvəqqəti şifrə *">
              <Input
                placeholder="Müvəqqəti şifrə"
                type="text"
                {...form.register("muveqqeti_sifre")}
              />
            </Sahe>
          ) : null}

          <div className="col-span-1 sm:col-span-3">
            <Button type="submit" className="w-full rounded-xl" disabled={mutasiya.isPending}>
              {mutasiya.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span>{rejim === "yeni" ? "Yarat" : "Yadda saxla"}</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Sahe({
  label,
  xeta,
  children,
}: {
  label: string;
  xeta?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
      {xeta ? <p className="text-xs text-destructive">{xeta}</p> : null}
    </div>
  );
}
