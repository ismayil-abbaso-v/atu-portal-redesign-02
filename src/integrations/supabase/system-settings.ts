import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SystemSettingsRow = {
  id: string;
  singleton: boolean;
  universitet_adi: string;
  elaqe_epoctu: string;
  cari_tedris_ili: string;
  cari_semestr: "Payız" | "Yaz";
  birinci_hefte_novu: "ust" | "alt" | null;
  hefte_rotasiya_baslama_tarixi: string | null;
  tedris_hefte_sayi: number;
  created_at: string;
  updated_at: string;
};

type SystemSettingsInsert = {
  id?: string;
  singleton?: boolean;
  universitet_adi?: string;
  elaqe_epoctu?: string;
  cari_tedris_ili?: string;
  cari_semestr?: "Payız" | "Yaz";
  birinci_hefte_novu?: "ust" | "alt" | null;
  hefte_rotasiya_baslama_tarixi?: string | null;
  tedris_hefte_sayi?: number;
  created_at?: string;
  updated_at?: string;
};

type SystemSettingsTable = {
  Row: SystemSettingsRow;
  Insert: SystemSettingsInsert;
  Update: SystemSettingsInsert;
  Relationships: [];
};

type GenişDatabase = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      system_settings: SystemSettingsTable;
    };
  };
};

export const systemSettingsSupabase = supabase as unknown as SupabaseClient<GenişDatabase>;
