import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser } from "@/server-functions/admin-users";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type DbClient = typeof supabase;

const EXCEL_HEADERS = [
  "Soyad", "Ad", "Ata adı", "FİN Kodu", "Doğum tarixi", "Cins", "Telefon", "E-poçt",
  "Şəhər", "Rol", "İstifadəçi adı", "Şifrə", "İxtisas", "Fakültə", "Qəbul ili",
  "Bitirmə ili", "Kurs", "Qrup", "DİM balı", "Təhsil növü", "Sosial vəziyyət",
  "Təhsil haqqı", "ESD istifadəçisi",
] as const;

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "admin", dekan: "dekan", tyutor: "tyutor", muellim: "muellim", "müəllim": "muellim",
  telebe: "telebe", "tələbə": "telebe",
};
const TUITION_STATUS = new Set(["odenisli", "dovlet sifarisi", "dovlet sifarisi esasinda"]);

function text(v: unknown) {
  return v == null ? "" : String(v).trim();
}
function token(v: unknown) {
  return text(v).normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/[əƏ]/g, "e").replace(/[ıİ]/g, "i").replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u").toLocaleLowerCase().replace(/[\u200B\uFEFF]/g, "")
    .replace(/\s+/g, " ").trim();
}
function idKey(v: unknown) { return token(v).replace(/\s+/g, ""); }
function parseRole(v: unknown): AppRole[] {
  return text(v).split(/[;,|]/).map((x) => ROLE_ALIASES[token(x)]).filter(Boolean) as AppRole[];
}
function parseBool(v: unknown, field: string) {
  const x = token(v);
  if (!x) return undefined;
  if (["true", "1", "beli", "yes"].includes(x)) return true;
  if (["false", "0", "xeyr", "no"].includes(x)) return false;
  throw new Error(`${field} yalnız "bəli" və ya "xeyr" ola bilər.`);
}
function parseNumber(v: unknown, field: string) {
  const s = text(v).replace(/\s/g, "").replace(/,/g, ".");
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${field} "${text(v)}" rəqəm deyil.`);
  return n;
}
function parseInteger(v: unknown, field: string) {
  const n = parseNumber(v, field);
  if (n === undefined) return undefined;
  if (!Number.isInteger(n)) throw new Error(`${field} tam rəqəm olmalıdır.`);
  return n;
}
function excelDateToIso(v: number) {
  const p = XLSX.SSF.parse_date_code(v);
  if (!p) return "";
  const iso = `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Doğum tarixi "${v}" düzgün tarix deyil.`);
  return iso;
}
function dateValue(v: unknown) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return excelDateToIso(v);
  const s = text(v);
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) throw new Error(`Doğum tarixi "${s}" düzgün tarix formatında deyil.`);
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error(`Doğum tarixi "${s}" düzgün tarix deyil.`);
  return iso;
}
function passwordValue(v: unknown) {
  const s = text(v);
  if (!s) return "";
  if (/^\d+$/.test(s) && s.length < 6) return s.padStart(6, "0");
  return s;
}

const HEADER_ALIASES: Record<string, string> = {
  "soyad": "soyad", "ad": "ad", "ata adi": "ata_adi", "fin kodu": "fin_kodu",
  "dogum tarixi": "dogum_tarixi", "cins": "cins", "telefon": "telefon", "e-poct": "e_poct",
  "seher": "sheher", "rol": "rollar", "istifadeci adi": "istifadeci_adi", "sifre": "muveqqeti_sifre",
  "ixtisas": "ixtisas", "fakulte": "fakulte", "qebul ili": "qebul_ili", "bitirme ili": "bitirme_ili",
  "kurs": "sinif", "qrup": "qrup", "dim bali": "dim_bali", "tehsil novu": "tehsil_novu",
  "sosial veziyyet": "sosial_veziyyet", "tehsil haqqi": "tehsil_haqqi", "esd istifadecisi": "esd_istifadeci",
};
function normalizeHeader(v: unknown) {
  const t = token(v);
  return HEADER_ALIASES[t] ?? t.replace(/\s+/g, "_");
}
function normalizeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([h, v]) => [normalizeHeader(h), v])));
}

type ImportRow = Record<string, unknown>;
type Profile = Record<string, unknown> & { user_id: string };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(400 * (i + 1)); }
  }
  throw last instanceof Error ? last : new Error("Əməliyyat uğursuz oldu.");
}

function buildProfile(row: ImportRow) {
  const out: Record<string, unknown> = {};
  for (const f of ["ad", "soyad", "ata_adi", "fin_kodu", "cins", "telefon", "e_poct", "sheher", "istifadeci_adi", "ixtisas", "fakulte", "qrup", "sinif", "tehsil_novu", "sosial_veziyyet"]) {
    const v = text(row[f]);
    if (v) out[f] = v;
  }
  const d = dateValue(row.dogum_tarixi);
  if (d) out.dogum_tarixi = d;
  const qebul = parseInteger(row.qebul_ili, "Qəbul ili");
  const bitirme = parseInteger(row.bitirme_ili, "Bitirmə ili");
  const dim = parseNumber(row.dim_bali, "DİM balı");
  if (qebul !== undefined) out.qebul_ili = qebul;
  if (bitirme !== undefined) out.bitirme_ili = bitirme;
  if (dim !== undefined) out.dim_bali = dim;

  const tuition = text(row.tehsil_haqqi);
  if (tuition) {
    const numeric = Number(tuition.replace(/\s/g, "").replace(/,/g, "."));
    if (Number.isFinite(numeric)) {
      out.tehsil_haqqi = numeric;
      out.tehsil_haqqi_statusu = null;
    } else {
      const status = token(tuition);
      if (!TUITION_STATUS.has(status)) throw new Error(`Təhsil haqqı "${tuition}" tanınmır. Rəqəm, "ödənişli" və ya "dövlət sifarişi" olmalıdır.`);
      out.tehsil_haqqi = null;
      out.tehsil_haqqi_statusu = tuition;
    }
  }
  const esd = parseBool(row.esd_istifadeci, "ESD istifadəçisi");
  if (esd !== undefined) out.esd_istifadeci = esd;
  return out;
}

function comparable(v: unknown, field: string) {
  if (v == null) return "";
  if (field === "dogum_tarixi") return dateValue(v) ?? "";
  if (field === "esd_istifadeci") return parseBool(v, "ESD istifadəçisi") ? "true" : "false";
  if (["qebul_ili", "bitirme_ili", "dim_bali", "tehsil_haqqi"].includes(field)) {
    const n = Number(text(v).replace(/,/g, "."));
    return Number.isFinite(n) ? String(n) : text(v);
  }
  return text(v).toLocaleLowerCase();
}
function changed(existing: Profile, incoming: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const field of Object.keys(incoming)) {
    if (comparable(existing[field], field) !== comparable(incoming[field], field)) patch[field] = incoming[field];
  }
  return patch;
}
function sameRoles(a: unknown[], b: AppRole[]) {
  const x = [...new Set(a.map(token))].sort();
  const y = [...new Set(b.map(token))].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

const SELECTIONS = {
  "Cins": ["qadın", "kişi"],
  "Rol": ["telebe", "muellim", "tyutor", "dekan", "admin"],
  "Kurs": ["1", "2", "3", "4"],
  "Təhsil növü": ["əyani", "qiyabi"],
  "Sosial vəziyyət": ["ümumi"],
  "Təhsil haqqı": ["ödənişli", "dövlət sifarişi"],
  "ESD istifadəçisi": ["bəli", "xeyr"],
};

export function AdminUsersExcelTools() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function exportUsers() {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_sort_sutun: "created_at", p_sort_istiqamet: "desc", p_limit: 10000, p_offset: 0,
      });
      if (error) throw error;
      const users = (data ?? []) as unknown as Record<string, unknown>[];
      const rows = users.map((u) => ({
        "Soyad": u.soyad ?? "", "Ad": u.ad ?? "", "Ata adı": u.ata_adi ?? "", "FİN Kodu": u.fin_kodu ?? "",
        "Doğum tarixi": u.dogum_tarixi ?? "", "Cins": u.cins ?? "", "Telefon": u.telefon ?? "", "E-poçt": u.e_poct ?? "",
        "Şəhər": u.sheher ?? "", "Rol": Array.isArray(u.rollar) ? u.rollar.join(", ") : "", "İstifadəçi adı": u.istifadeci_adi ?? "",
        "Şifrə": "", "İxtisas": u.ixtisas ?? "", "Fakültə": u.fakulte ?? "", "Qəbul ili": u.qebul_ili ?? "",
        "Bitirmə ili": u.bitirme_ili ?? "", "Kurs": u.sinif ?? "", "Qrup": u.qrup ?? "", "DİM balı": u.dim_bali ?? "",
        "Təhsil növü": u.tehsil_novu ?? "", "Sosial vəziyyət": u.sosial_veziyyet ?? "",
        "Təhsil haqqı": u.tehsil_haqqi_statusu ?? u.tehsil_haqqi ?? "", "ESD istifadəçisi": u.esd_istifadeci ? "bəli" : "xeyr",
      }));
      const ws = XLSX.utils.json_to_sheet(rows, { header: [...EXCEL_HEADERS] });
      const selectionRows = Object.entries(SELECTIONS).reduce<Record<string, unknown>[]>((acc, [key, values]) => {
        values.forEach((value, index) => { acc[index] = { ...(acc[index] ?? {}), [key]: value }; });
        return acc;
      }, []);
      const selections = XLSX.utils.json_to_sheet(selectionRows);
      const instructions = XLSX.utils.aoa_to_sheet([
        ["ATU Portal istifadəçi import faylı"],
        ["Başlıqlar", EXCEL_HEADERS.join(" | ")],
        ["Qeyd", "İstifadəçi adı və FİN Kodu üzrə mövcud istifadəçi tapılır; mövcuddursa profil yenilənir."],
        ["Şifrə", "Yalnız yeni istifadəçi yaradılarkən istifadə olunur. Mövcud istifadəçinin şifrəsi Excel importu ilə dəyişdirilmir."],
        ["Təhsil haqqı", "Rəqəmdirsə məbləğ kimi, ödənişli/dövlət sifarişi kimi mətn isə status kimi saxlanılır."],
      ]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, ws, "İstifadəçilər");
      XLSX.utils.book_append_sheet(book, selections, "Seçimlər");
      XLSX.utils.book_append_sheet(book, instructions, "Təlimat");
      XLSX.writeFile(book, `ATU-istifadeciler-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} istifadəçi Excel faylına çıxarıldı.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Excel faylı hazırlana bilmədi.");
    } finally { setIsExporting(false); }
  }

  async function importUsers(file: File) {
    setIsImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.find((name) => token(name) === token("İstifadəçilər")) ?? workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error("Excel faylında " + "İstifadəçilər" + " vərəqi tapılmadı.");
      const raw = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
      const rows = normalizeRows(raw).filter((row) => Object.values(row).some((v) => text(v) !== ""));
      if (!rows.length) throw new Error("Excel faylında istifadəçi sətri yoxdur.");
      const required = ["fin_kodu", "ad", "soyad", "rollar"];
      const present = new Set(Object.keys(rows[0]));
      const missing = required.filter((h) => !present.has(h));
      if (missing.length) throw new Error(`Mütləq başlıqlar çatışmır: ${missing.join(", ")}`);

      const db = supabase as unknown as DbClient & { from: DbClient["from"] };
      const { data: existing, error: existingError } = await (db as any).from("profiles").select(
        "user_id,ad,soyad,ata_adi,fin_kodu,dogum_tarixi,cins,telefon,e_poct,sheher,istifadeci_adi,ixtisas,fakulte,qrup,sinif,qebul_ili,bitirme_ili,dim_bali,tehsil_novu,sosial_veziyyet,tehsil_haqqi,tehsil_haqqi_statusu,esd_istifadeci"
      );
      if (existingError) throw existingError;
      const profiles = (existing ?? []) as Profile[];
      const currentUserId = (await supabase.auth.getUser()).data.user?.id ?? "";
      const roleByUser = new Map<string, string[]>();
      const ids = profiles.map((p) => p.user_id).filter(Boolean);
      if (ids.length) {
        const { data: rr, error: re } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
        if (re) throw re;
        for (const r of rr ?? []) roleByUser.set(r.user_id, [...(roleByUser.get(r.user_id) ?? []), String(r.role)]);
      }
      const byFin = new Map<string, Profile>(), byUsername = new Map<string, Profile>();
      for (const p of profiles) { if (idKey(p.fin_kodu)) byFin.set(idKey(p.fin_kodu), p); if (idKey(p.istifadeci_adi)) byUsername.set(idKey(p.istifadeci_adi), p); }

      const seen = new Set<string>();
      let added = 0, updated = 0, skipped = 0;
      const errors: string[] = [];
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const line = index + 2;
        try {
          const fin = idKey(row.fin_kodu), username = idKey(row.istifadeci_adi);
          const ad = text(row.ad), soyad = text(row.soyad), selectedRoles = parseRole(row.rollar);
          if (!fin || !ad || !soyad || !selectedRoles.length) throw new Error("FİN Kodu, Ad, Soyad və ən azı bir Rol mütləqdir.");
          if (seen.has(fin)) { skipped++; continue; }
          seen.add(fin);

          const profile = buildProfile(row);
          const found = byFin.get(fin) ?? (username ? byUsername.get(username) : undefined);
          if (found && found.user_id === currentUserId) { skipped++; continue; }
          if (found) {
            const patch = changed(found, profile);
            const roleChanged = !sameRoles(roleByUser.get(found.user_id) ?? [], selectedRoles);
            if (Object.keys(patch).length) {
              const { error } = await withRetry<any>(() => (db as any).from("profiles").update(patch).eq("user_id", found.user_id));
              if (error) throw error;
              Object.assign(found, patch);
            }
            if (roleChanged && found.user_id !== currentUserId) {
              const current = roleByUser.get(found.user_id) ?? [];
              const toAdd = selectedRoles.filter((r) => !current.includes(r));
              const toRemove = current.filter((r) => !selectedRoles.includes(r as AppRole));
              if (toAdd.length) { const { error } = await supabase.from("user_roles").insert(toAdd.map((role) => ({ user_id: found.user_id, role }))); if (error) throw error; }
              if (toRemove.length) { const { error } = await supabase.from("user_roles").delete().eq("user_id", found.user_id).in("role", toRemove as AppRole[]); if (error) throw error; }
              roleByUser.set(found.user_id, selectedRoles);
            }
            if (!Object.keys(patch).length && !roleChanged) skipped++; else updated++;
            continue;
          }

          const password = passwordValue(row.muveqqeti_sifre);
          if (!password || password.length < 6) throw new Error("Yeni istifadəçi üçün Şifrə ən azı 6 simvol olmalıdır.");
          const created = await withRetry(() => adminCreateUser({ data: {
            ad, soyad, ata_adi: text(row.ata_adi) || null, e_poct: text(row.e_poct) || null,
            muveqqeti_sifre: password, istifadeci_adi: text(row.istifadeci_adi) || null,
            rollar: selectedRoles,
          }}));
          const { error: profileError } = await withRetry<any>(() => (db as any).from("profiles").update(profile).eq("user_id", created.user_id));
          if (profileError) throw profileError;
          const createdProfile: Profile = { ...profile, user_id: created.user_id, fin_kodu: fin };
          byFin.set(fin, createdProfile); if (username) byUsername.set(username, createdProfile);
          roleByUser.set(created.user_id, selectedRoles); added++;
        } catch (e) {
          errors.push(`Sətir ${line}: ${e instanceof Error ? e.message : "əməliyyat uğursuz oldu"}`);
        }
      }
      const summary = `${added} əlavə edildi, ${updated} yeniləndi, ${skipped} dəyişikliksiz/təkrar keçildi.`;
      if (errors.length) {
        toast.error(`${summary} ${errors.length} sətirdə xəta oldu. ${errors.slice(0, 3).join(" | ")}`);
        console.error("Excel import xətaları", errors);
      } else toast.success(summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Excel faylı idxal edilə bilmədi.");
    } finally {
      setIsImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="flex items-center gap-2">
    <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importUsers(f); }} />
    <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl whitespace-nowrap" disabled={isImporting || isExporting} onClick={() => inputRef.current?.click()}>
      {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Excel yüklə
    </Button>
    <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl whitespace-nowrap" disabled={isImporting || isExporting} onClick={() => void exportUsers()}>
      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Excel export
    </Button>
    <span className="sr-only"><FileSpreadsheet /> ATU XLSX istifadəçi importu</span>
  </div>;
}
