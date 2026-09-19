import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const auth=req.headers.get("Authorization"); if(!auth?.startsWith("Bearer "))return json({error:"Unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)return json({error:"Server misconfigured"},500);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:claims,error:claimsError}=await admin.auth.getClaims(auth.slice(7)); const adminId=claims?.claims?.sub; if(claimsError||!adminId)return json({error:"Unauthorized"},401);
 let role=null,roleErr=null;
 for(let i=0;i<3;i++){const r=await admin.from("user_roles").select("role").eq("user_id",adminId).eq("role","admin").maybeSingle();role=r.data;roleErr=r.error;if(role||!roleErr)break;await new Promise((res)=>setTimeout(res,300*(i+1)));}
 if(roleErr)return json({error:`Rol yoxlanılarkən xəta baş verdi: ${roleErr.message}`},503);
 if(!role)return json({error:"İcazə yoxdur: yalnız admin bu əməliyyatı yerinə yetirə bilər."},403);
 let body:{ad?:string;soyad?:string;ata_adi?:string|null;e_poct?:string|null;muveqqeti_sifre?:string;istifadeci_adi?:string|null;rollar?:string[]}; try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400)}
 const email=body.e_poct?.trim()??"",username=body.istifadeci_adi?.trim()||null,roles=[...new Set(body.rollar??[])];
 if(!body.ad?.trim()||!body.soyad?.trim()||!body.muveqqeti_sifre||!roles.length)return json({error:"Ad, soyad, müvəqqəti şifrə və rol məcburidir."},400);
 if(username){const {data:p,error:e}=await admin.from("profiles").select("user_id").eq("istifadeci_adi",username).maybeSingle(); if(e)return json({error:`İstifadəçi adı yoxlanılarkən xəta baş verdi: ${e.message}`},500); if(p)return json({error:`"${username}" istifadəçi adı artıq mövcuddur. Başqa istifadəçi adı seçin.`},409);}
 const createPayload: {password:string; email_confirm:boolean; user_metadata:Record<string,unknown>; email?:string} = {password:body.muveqqeti_sifre,email_confirm:true,user_metadata:{ad:body.ad.trim(),soyad:body.soyad.trim(),ata_adi:body.ata_adi??null,istifadeci_adi:username}};
 // Supabase Auth requires an email or phone. Users imported without e-mail get an internal placeholder address.
 const placeholder=`${crypto.randomUUID()}@no-email.atu.internal`;
 createPayload.email=email||placeholder;
 const {data:created,error:createError}=await admin.auth.admin.createUser(createPayload);
 if(createError||!created.user){const m=createError?.message??"İstifadəçi yaradıla bilmədi.";if(/already.*registered|already exists|email.*exists/i.test(m))return json({error:"Bu e-poçt ünvanı ilə istifadəçi artıq mövcuddur."},409);return json({error:m},400);}
 const uid=created.user.id;
 const {error:profileError}=await admin.from("profiles").update({istifadeci_adi:username}).eq("user_id",uid);
 if(profileError){await admin.auth.admin.deleteUser(uid);if(profileError.code==="23505"||/profiles_istifadeci_adi_key/i.test(profileError.message))return json({error:`"${username??""}" istifadəçi adı artıq mövcuddur. Başqa istifadəçi adı seçin.`},409);return json({error:profileError.message},500);}
 // handle_new_user creates a default telebe role. Replace it with exactly what the admin selected.
 const {error:deleteRolesError}=await admin.from("user_roles").delete().eq("user_id",uid); if(deleteRolesError){await admin.auth.admin.deleteUser(uid);return json({error:deleteRolesError.message},500);}
 const {error:roleInsertError}=await admin.from("user_roles").insert(roles.map(r=>({user_id:uid,role:r})));
 if(roleInsertError){await admin.auth.admin.deleteUser(uid);return json({error:roleInsertError.code==="23505"?"Seçilmiş rollardan biri artıq istifadəçidə mövcuddur.":roleInsertError.message},409);}
 return json({user_id:uid});
});
