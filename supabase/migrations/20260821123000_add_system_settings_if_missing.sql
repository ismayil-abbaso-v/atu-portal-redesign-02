-- FAZA 9: Sistem tənzimləmələri.
-- FAZA 9.0-da yaradılıbsa, bu migrasiya mövcud sxemi pozmadan yalnız çatışmayan hissələri tamamlayır.

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  universitet_adi text NOT NULL DEFAULT 'Azərbaycan Texnologiya Universiteti',
  elaqe_epoctu text NOT NULL DEFAULT '',
  cari_tedris_ili text NOT NULL DEFAULT '',
  cari_semestr text NOT NULL DEFAULT 'Payız' CHECK (cari_semestr IN ('Payız', 'Yaz')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS singleton boolean NOT NULL DEFAULT true;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS universitet_adi text NOT NULL DEFAULT 'Azərbaycan Texnologiya Universiteti';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS elaqe_epoctu text NOT NULL DEFAULT '';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS cari_tedris_ili text NOT NULL DEFAULT '';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS cari_semestr text NOT NULL DEFAULT 'Payız';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS system_settings_singleton_idx ON public.system_settings (singleton);

INSERT INTO public.system_settings (singleton)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_admin_dekan" ON public.system_settings;
CREATE POLICY "system_settings_select_admin_dekan" ON public.system_settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan')
  );

DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
CREATE POLICY "system_settings_update_admin" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "system_settings_insert_admin" ON public.system_settings;
CREATE POLICY "system_settings_insert_admin" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "system_settings_delete_admin" ON public.system_settings;
CREATE POLICY "system_settings_delete_admin" ON public.system_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
