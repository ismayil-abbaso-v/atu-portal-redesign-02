-- Fakültə idarəetməsi və qrupların fakültə ilə əlaqələndirilməsi
CREATE TABLE IF NOT EXISTS public.faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  kod text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faculties_ad_unique UNIQUE (ad)
);

CREATE INDEX IF NOT EXISTS faculties_ad_idx ON public.faculties (lower(ad));

ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculties TO authenticated;
GRANT ALL ON public.faculties TO service_role;

DROP POLICY IF EXISTS "faculties_select_admin_dekan" ON public.faculties;
CREATE POLICY "faculties_select_admin_dekan" ON public.faculties
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

DROP POLICY IF EXISTS "faculties_write_admin" ON public.faculties;
CREATE POLICY "faculties_write_admin" ON public.faculties
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS groups_faculty_id_idx ON public.groups (faculty_id);

-- Mövcud qruplar üçün mümkün olduqda ilk üzvün profilindəki fakültəyə əsasən uyğunlaşdır.
UPDATE public.groups g
SET faculty_id = f.id
FROM public.group_members gm
JOIN public.profiles p ON p.user_id = gm.user_id
JOIN public.faculties f ON lower(trim(f.ad)) = lower(trim(p.fakulte))
WHERE gm.group_id = g.id
  AND g.faculty_id IS NULL
  AND p.fakulte IS NOT NULL
  AND trim(p.fakulte) <> '';

CREATE OR REPLACE FUNCTION public.update_faculties_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faculties_updated_at ON public.faculties;
CREATE TRIGGER faculties_updated_at
BEFORE UPDATE ON public.faculties
FOR EACH ROW EXECUTE FUNCTION public.update_faculties_updated_at();
