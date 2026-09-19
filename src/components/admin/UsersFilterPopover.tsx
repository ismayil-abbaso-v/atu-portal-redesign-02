import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Filter, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";

import { RoleMultiSelect } from "@/components/admin/RoleMultiSelect";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ROL_ETIKETLERI, type AppRole } from "@/lib/admin-users";
import { adminCreateUser } from "@/server-functions/admin-users";

export type IstifadeciSuzgecleri = { rollar: AppRole[]; status: string | null; fakulte: string | null };
type ExcelSetri = Record<string, unknown>;
type Profile = Record<string, unknown> & { user_id: string };

const EXCEL_BASLIQLARI = [
  "Soyad", "Ad", "Ata adı", "FİN Kodu", "Doğum tarixi", "Cins", "Telefon", "E-poçt",
  "Şəhər", "Rol", "İstifadəçi adı", "Şifrə", "İxtisas", "Fakültə", "Qəbul ili", "Bitirmə ili",
  "Kurs", "Qrup", "DİM balı", "Təhsil növü", "Sosial vəziyyət", "Təhsil haqqı", "ESD istifadəçisi",
] as const;

const EXCEL_ENI = [18, 16, 18, 16, 13, 12, 17, 30, 18, 14, 18, 14, 30, 28, 13, 14, 10, 14, 13, 18, 13, 22, 18];
const EXCEL_HEADER_STYLE = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF6A0826" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};
const EXCEL_BODY_STYLE = {
  font: { name: "Calibri", sz: 11, color: { rgb: "FF000000" } },
  alignment: { vertical: "center", wrapText: false },
};

const ROL_ALTERNATIVLERI: Record<string, AppRole> = {
  admin: "admin", dekan: "dekan", tyutor: "tyutor", muellim: "muellim", "müəllim": "muellim",
  telebe: "telebe", "tələbə": "telebe",
};
const TUITION_STATUS = new Set(["odenisli", "dovlet sifarisi", "dovlet sifarisi esasinda"]);

function metn(v: unknown) { return v == null ? "" : String(v).trim(); }
function norm(v: unknown) {
  return metn(v).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[əƏ]/g, "e").replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s").replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u").toLocaleLowerCase().replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}
function key(v: unknown) { return norm(v).replace(/\s+/g, ""); }
function req(v: unknown, field: string) { const x = metn(v); if (!x) throw new Error(`${field} boş ola bilməz.`); return x; }
function roles(v: unknown): AppRole[] {
  return [...new Set(metn(v).split(/[;,|]+/).map(x => ROL_ALTERNATIVLERI[norm(x)]).filter(Boolean))] as AppRole[];
}
function bool(v: unknown, field: string) {
  const x = norm(v); if (!x) return false;
  if (["beli", "true", "1", "yes"].includes(x)) return true;
  if (["xeyr", "false", "0", "no"].includes(x)) return false;
  throw new Error(`${field} yalnız "bəli" və ya "xeyr" ola bilər.`);
}
function number(v: unknown, field: string) {
  const x = metn(v).replace(/\s/g, "").replace(/,/g, ".");
  if (!x) return null;
  const n = Number(x); if (!Number.isFinite(n)) throw new Error(`${field} "${metn(v)}" rəqəm deyil.`); return n;
}
function integer(v: unknown, field: string) {
  const n = number(v, field); if (n == null) return null;
  if (!Number.isInteger(n)) throw new Error(`${field} tam rəqəm olmalıdır.`); return n;
}
function dateValue(v: unknown) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") { const p = XLSX.SSF.parse_date_code(v); if (p) return `${String(p.y).padStart(4,"0")}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`; }
  const x = metn(v); if (!x) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const m = x.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (!m) throw new Error(`Doğum tarixi "${x}" düzgün tarix deyil.`);
  const iso = `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== iso) throw new Error(`Doğum tarixi "${x}" düzgün tarix deyil.`); return iso;
}
function tuition(v: unknown) {
  const raw = metn(v); if (!raw) return { amount: null as number | null, status: null as string | null };
  const n = Number(raw.replace(/\s/g, "").replace(/,/g, "."));
  if (Number.isFinite(n)) return { amount: n, status: null };
  const t = norm(raw);
  if (TUITION_STATUS.has(t)) return { amount: null, status: raw };
  throw new Error(`Təhsil haqqı "${raw}" tanınmır. Rəqəm, "ödənişli" və ya "dövlət sifarişi" olmalıdır.`);
}
function headerKey(v: unknown) { return norm(v).replace(/[^a-z0-9_ ]/g, "").replace(/\s+/g, "_"); }
function normalizeRow(row: ExcelSetri) {
  const aliases: Record<string, string> = {
    soyad: "soyad", ad: "ad", ata_adi: "ata_adi", fin_kodu: "fin_kodu", dogum_tarixi: "dogum_tarixi", cins: "cins",
    telefon: "telefon", e_poct: "e_poct", seher: "sheher", rol: "rol", istifadeci_adi: "istifadeci_adi", sifre: "sifre",
    muveqqeti_sifre: "sifre", ixtisas: "ixtisas", fakulte: "fakulte", qebul_ili: "qebul_ili", bitirme_ili: "bitirme_ili",
    kurs: "sinif", qrup: "qrup", dim_bali: "dim_bali", tehsil_novu: "tehsil_novu", sosial_veziyyet: "sosial_veziyyet",
    tehsil_haqqi: "tehsil_haqqi", esd_istifadecisi: "esd_istifadeci", status: "status", istifadeci_id: "user_id", profil_səkli: "avatar_url",
    profil_sekli: "avatar_url",
  };
  return Object.fromEntries(Object.entries(row).map(([h,v]) => [aliases[headerKey(h)] ?? headerKey(h), v]));
}
function profileFromRow(row: ExcelSetri) {
  const out: Record<string, unknown> = {};
  for (const f of ["ad","soyad","ata_adi","fin_kodu","cins","telefon","e_poct","sheher","istifadeci_adi","ixtisas","fakulte","qrup","sinif","tehsil_novu","sosial_veziyyet"]) {
    const v = metn(row[f]); if (v) out[f] = v;
  }
  const d = dateValue(row.dogum_tarixi); if (d) out.dogum_tarixi = d;
  const q = integer(row.qebul_ili, "Qəbul ili"); if (q != null) out.qebul_ili = q;
  const b = integer(row.bitirme_ili, "Bitirmə ili"); if (b != null) out.bitirme_ili = b;
  const dim = number(row.dim_bali, "DİM balı"); if (dim != null) out.dim_bali = dim;
  const t = tuition(row.tehsil_haqqi); out.tehsil_haqqi = t.amount; out.tehsil_haqqi_statusu = t.status;
  out.esd_istifadeci = bool(row.esd_istifadeci, "ESD istifadəçisi");
  return out;
}
function excelTarix(v: unknown) {
  const x = metn(v); if (!x) return "";
  const m = x.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : x;
}
function stilVer(ws: XLSX.WorkSheet, dataRowCount: number) {
  ws["!cols"] = EXCEL_ENI.map(wch => ({ wch }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  ws["!autofilter"] = { ref: `A1:W${Math.max(1, dataRowCount + 1)}` };
  for (let c = 0; c < EXCEL_BASLIQLARI.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = EXCEL_HEADER_STYLE;
  }
  for (let r = 1; r <= dataRowCount; r++) {
    for (let c = 0; c < EXCEL_BASLIQLARI.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].s = EXCEL_BODY_STYLE;
    }
  }
}

export function UsersFilterPopover({ suzgecler, onDeyisiklik }: { suzgecler: IstifadeciSuzgecleri; onDeyisiklik: (v: IstifadeciSuzgecleri) => void }) {
  const queryClient = useQueryClient(); const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelYuklenir, setExcelYuklenir] = useState(false); const [excelIxracOlunur, setExcelIxracOlunur] = useState(false);
  const { data: fakulteler } = useQuery({ queryKey: ["admin-users","faculties"], queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_distinct_faculties"); if (error) throw error; return (data ?? []).map(f => f.fakulte).filter(Boolean);
  }, staleTime: 60_000 });
  const aktivSay = suzgecler.rollar.length + (suzgecler.status ? 1 : 0) + (suzgecler.fakulte ? 1 : 0);

  async function excelIxracEt() {
    setExcelIxracOlunur(true);
    try {
      const [{ data: profiles, error: pe }, { data: rr, error: re }] = await Promise.all([
        supabase.from("profiles").select("user_id,ad,soyad,ata_adi,fin_kodu,dogum_tarixi,cins,telefon,e_poct,sheher,istifadeci_adi,ixtisas,fakulte,qebul_ili,bitirme_ili,sinif,qrup,dim_bali,tehsil_novu,sosial_veziyyet,tehsil_haqqi,tehsil_haqqi_statusu,esd_istifadeci,status,avatar_url"),
        supabase.from("user_roles").select("user_id,role"),
      ]); if (pe) throw new Error(pe.message); if (re) throw new Error(re.message);
      const roleMap = new Map<string, AppRole[]>(); for (const r of rr ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as AppRole]);
      const rows = (profiles ?? []).map(p => ({
        "Soyad": p.soyad ?? "", "Ad": p.ad ?? "", "Ata adı": p.ata_adi ?? "", "FİN Kodu": p.fin_kodu ?? "", "Doğum tarixi": excelTarix(p.dogum_tarixi),
        "Cins": p.cins ?? "", "Telefon": p.telefon ?? "", "E-poçt": p.e_poct ?? "", "Şəhər": p.sheher ?? "", "Rol": (roleMap.get(p.user_id) ?? []).map(r => ROL_ETIKETLERI[r] ?? r).join(", "),
        "İstifadəçi adı": p.istifadeci_adi ?? "", "Şifrə": "", "İxtisas": p.ixtisas ?? "", "Fakültə": p.fakulte ?? "", "Qəbul ili": p.qebul_ili ?? "", "Bitirmə ili": p.bitirme_ili ?? "",
        "Kurs": p.sinif ?? "", "Qrup": p.qrup ?? "", "DİM balı": p.dim_bali ?? "", "Təhsil növü": p.tehsil_novu ?? "", "Sosial vəziyyət": p.sosial_veziyyet ?? "",
        "Təhsil haqqı": p.tehsil_haqqi_statusu ?? p.tehsil_haqqi ?? "", "ESD istifadəçisi": p.esd_istifadeci ? "bəli" : "xeyr",
      }));
      const ws = XLSX.utils.json_to_sheet(rows, { header: [...EXCEL_BASLIQLARI] });
      stilVer(ws, rows.length);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "İstifadəçilər");
      const secimler = XLSX.utils.aoa_to_sheet([
        ["Cins", "Rol", "Kurs", "Təhsil növü", "Sosial vəziyyət", "Təhsil haqqı", "ESD istifadəçisi"],
        ["qadın", "telebe", "1", "əyani", "ümumi", "ödənişli", "bəli"],
        ["kişi", "muellim", "2", "qiyabi", "", "dövlət sifarişi", "xeyr"],
        ["", "tyutor", "3", "", "", "", ""],
        ["", "dekan", "4", "", "", "", ""],
        ["", "admin", "5", "", "", "", ""],
      ]);
      secimler["!cols"] = [18,13,13,13,19,18,20].map(wch => ({ wch }));
      for (let c = 0; c < 7; c++) if (secimler[XLSX.utils.encode_cell({r:0,c})]) secimler[XLSX.utils.encode_cell({r:0,c})].s = EXCEL_HEADER_STYLE;
      XLSX.utils.book_append_sheet(wb, secimler, "Seçimlər");
      const telimat = XLSX.utils.aoa_to_sheet([
        ["ATU Portal istifadəçi export faylı", ""],
        ["Tələbə sayı", rows.length],
        ["Məlumat", "İstifadəçilər vərəqində bütün məlumatlar admin paneldən olduğu kimi çıxarılır."],
        ["Şifrə", "Təhlükəsizlik səbəbi ilə boş saxlanılır."],
        ["Təhsil haqqı", "Rəqəm məbləğdir; ödənişli/dövlət sifarişi statusdur."],
        ["Tarix", "Doğum tarixi GG.AA.İİİİ formatında göstərilir."],
      ]);
      telimat["!cols"] = [{ wch: 30 }, { wch: 100 }];
      if (telimat.A1) telimat.A1.s = { font: { name: "Calibri", sz: 14, bold: true } };
      XLSX.utils.book_append_sheet(wb, telimat, "Təlimat");
      XLSX.writeFile(wb, `ATU-istifadeciler-${new Date().toISOString().slice(0,10)}.xlsx`); toast.success(`${rows.length} istifadəçi Excel faylına ixrac edildi.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Excel ixracı uğursuz oldu."); } finally { setExcelIxracOlunur(false); }
  }

  async function excelFayliSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setExcelYuklenir(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets["İstifadəçilər"] ?? workbook.Sheets[workbook.SheetNames[0]]; if (!sheet) throw new Error("Excel faylında İstifadəçilər vərəqi tapılmadı.");
      const raw = XLSX.utils.sheet_to_json<ExcelSetri>(sheet, { defval: "" }); const rows = raw.map(normalizeRow).filter(r => Object.values(r).some(v => metn(v) !== "")); if (!rows.length) throw new Error("Excel faylında istifadəçi sətri yoxdur.");
      const first = rows[0]; const required = ["fin_kodu","ad","soyad","rol"]; const missing = required.filter(f => !Object.prototype.hasOwnProperty.call(first,f)); if (missing.length) throw new Error(`Mütləq başlıqlar çatışmır: ${missing.join(", ")}`);
      const { data: profiles, error: pe } = await supabase.from("profiles").select("user_id,ad,soyad,ata_adi,fin_kodu,dogum_tarixi,cins,telefon,e_poct,sheher,istifadeci_adi,ixtisas,fakulte,qrup,sinif,qebul_ili,bitirme_ili,dim_bali,tehsil_novu,sosial_veziyyet,tehsil_haqqi,tehsil_haqqi_statusu,esd_istifadeci"); if (pe) throw new Error(pe.message);
      const existing = (profiles ?? []) as Profile[]; const byFin = new Map(existing.filter(p => key(p.fin_kodu)).map(p => [key(p.fin_kodu), p])); const byUser = new Map(existing.filter(p => key(p.istifadeci_adi)).map(p => [key(p.istifadeci_adi), p]));
      const ids = existing.map(p => p.user_id); const roleMap = new Map<string, AppRole[]>(); if (ids.length) { const { data: rr, error: re } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids); if (re) throw new Error(re.message); for (const r of rr ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as AppRole]); }
      let added=0, updated=0, skipped=0; const errors:string[]=[];
      for (let i=0;i<rows.length;i++) {
        try {
          const row=rows[i], fin=req(row.fin_kodu,"FİN Kodu"), ad=req(row.ad,"Ad"), soyad=req(row.soyad,"Soyad"), selectedRoles=roles(row.rol); if (!selectedRoles.length) throw new Error("Rol düzgün göstərilməyib.");
          const found=byFin.get(key(fin)) ?? (key(row.istifadeci_adi) ? byUser.get(key(row.istifadeci_adi)) : undefined); const profile=profileFromRow(row);
          if (found) {
            const { error } = await supabase.from("profiles").update(profile as never).eq("user_id", found.user_id); if (error) throw new Error(error.message);
            const current=roleMap.get(found.user_id) ?? []; const add=selectedRoles.filter(r=>!current.includes(r)); const remove=current.filter(r=>!selectedRoles.includes(r));
            if (add.length) { const { error }=await supabase.from("user_roles").insert(add.map(role=>({user_id:found.user_id,role}))); if(error) throw new Error(error.message); }
            if (remove.length) { const { error }=await supabase.from("user_roles").delete().eq("user_id",found.user_id).in("role",remove); if(error) throw new Error(error.message); }
            roleMap.set(found.user_id, selectedRoles); Object.assign(found,profile); updated++; continue;
          }
          const password=metn(row.sifre); if(!password || password.length<6) throw new Error("Yeni istifadəçi üçün Şifrə ən azı 6 simvol olmalıdır.");
          const email=metn(row.e_poct); if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-poçt düzgün deyil.");
          const created=await adminCreateUser({data:{ad,soyad,ata_adi:metn(row.ata_adi)||null,e_poct:email||null,muveqqeti_sifre:password,istifadeci_adi:metn(row.istifadeci_adi)||null,rollar:selectedRoles}});
          const {error}=await supabase.from("profiles").update(profile as never).eq("user_id",created.user_id); if(error) throw new Error(error.message); added++;
        } catch(e) { errors.push(`Sətir ${i+2}: ${e instanceof Error ? e.message : "naməlum xəta"}`); }
      }
      void queryClient.invalidateQueries({queryKey:["admin-users","list"]});
      const summary=`${added} əlavə edildi, ${updated} yeniləndi, ${skipped} dəyişikliksiz/təkrar keçildi.`;
      if(errors.length) { toast.error(`${summary} ${errors.length} sətirdə xəta oldu. ${errors.slice(0,3).join(" | ")}`,{duration:9000}); console.error("Excel import xətaları",errors); }
      else toast.success(summary);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Excel faylı emal edilə bilmədi."); } finally { setExcelYuklenir(false); }
  }

  return <div className="flex flex-wrap items-center gap-2">
    <Popover><PopoverTrigger asChild><Button variant="outline" className="gap-2 rounded-xl"><Filter className="size-4" />Süzgəc{aktivSay>0?<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{aktivSay}</span>:null}</Button></PopoverTrigger>
      <PopoverContent className="w-72 rounded-xl" align="end"><div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5"><p className="text-xs font-semibold text-muted-foreground">Rol</p><RoleMultiSelect seçilenler={suzgecler.rollar} onDeyisiklik={rollar=>onDeyisiklik({...suzgecler,rollar})}/></div>
        <div className="flex flex-col gap-1.5"><p className="text-xs font-semibold text-muted-foreground">Status</p><Select value={suzgecler.status??"hamısı"} onValueChange={v=>onDeyisiklik({...suzgecler,status:v==="hamısı"?null:v})}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="hamısı">Hamısı</SelectItem><SelectItem value="AKTİV">Aktiv</SelectItem><SelectItem value="PASSİV">Passiv</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-1.5"><p className="text-xs font-semibold text-muted-foreground">Fakültə</p><Select value={suzgecler.fakulte??"hamısı"} onValueChange={v=>onDeyisiklik({...suzgecler,fakulte:v==="hamısı"?null:v})}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="hamısı">Hamısı</SelectItem>{(fakulteler??[]).map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
        {aktivSay>0?<Button variant="ghost" size="sm" className="rounded-xl" onClick={()=>onDeyisiklik({rollar:[],status:null,fakulte:null})}>Süzgəcləri təmizlə</Button>:null}
      </div></PopoverContent></Popover>
    <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={excelFayliSecildi}/>
    <Button variant="outline" className="gap-2 rounded-xl" disabled={excelYuklenir} onClick={()=>excelInputRef.current?.click()}>{excelYuklenir?<FileSpreadsheet className="size-4 animate-pulse"/>:<Upload className="size-4"/>}{excelYuklenir?"Yüklənir...":"Excel yüklə"}</Button>
    <Button variant="outline" className="gap-2 rounded-xl" disabled={excelIxracOlunur} onClick={()=>void excelIxracEt()}>{excelIxracOlunur?<FileSpreadsheet className="size-4 animate-pulse"/>:<Download className="size-4"/>}{excelIxracOlunur?"Hazırlanır...":"Excel export"}</Button>
  </div>;
}
