// Admin server functions: privileged operations run inside Supabase Edge Functions.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Ctx = { supabase: SupabaseClient<Database>; userId: string };
const URL = "https://tdxrpbrcgricqqfdytyg.supabase.co";
const KEY = "sb_publishable_DxVw_ue2_Z4J15wUqh2CEA_azeOdzYc";
async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) { const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(); if (error || !data) throw new Error("İcazə yoxdur: yalnız admin bu əməliyyatı yerinə yetirə bilər."); }
async function edge(path: string, body: unknown) { const auth = getRequest()?.headers.get("authorization"); if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized"); const r = await fetch(`${URL}/functions/v1/${path}`, { method:"POST", headers:{Authorization:auth, apikey:KEY, "Content-Type":"application/json"}, body:JSON.stringify(body)}); const x = await r.json().catch(()=>({})) as {ugurlu?:boolean;user_id?:string;e_poct?:string|null;error?:string}; if(!r.ok) throw new Error(x.error ?? "Əməliyyat uğursuz oldu."); return x; }
type NewUser={ad:string;soyad:string;ata_adi?:string|null;e_poct?:string|null;muveqqeti_sifre:string;istifadeci_adi?:string|null;rollar:AppRole[]};
export const adminCreateUser=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((d:NewUser)=>d).handler(async({data,context})=>{const {supabase,userId}=context as Ctx;await assertAdmin(supabase,userId);const x=await edge("admin-create-user",data);if(!x.user_id)throw new Error(x.error??"İstifadəçi yaradıla bilmədi.");return{user_id:x.user_id,e_poct:(x as {e_poct?:string|null}).e_poct??null};});
export const adminDeleteUser=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((d:{user_id:string})=>d).handler(async({data,context})=>{const {supabase,userId}=context as Ctx;await assertAdmin(supabase,userId);const x=await edge("admin-delete-user",data);if(!x.ugurlu)throw new Error(x.error??"İstifadəçi silinə bilmədi.");return{ugurlu:true};});
export const adminResetPassword=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((d:{user_id:string;yeni_sifre:string})=>d).handler(async({data,context})=>{const {supabase,userId}=context as Ctx;await assertAdmin(supabase,userId);const x=await edge("admin-reset-password",data);if(!x.ugurlu)throw new Error(x.error??"Şifrə dəyişdirilə bilmədi.");return{ugurlu:true};});