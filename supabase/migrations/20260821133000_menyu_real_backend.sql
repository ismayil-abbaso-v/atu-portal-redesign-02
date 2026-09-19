-- FAZA FINAL: Menyu real backend
-- Profil həssas sahələri, təhlükəsizlik sessiyaları, MFA statusu və transkriptlər.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_aktiv boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.fin_kodu IS DISTINCT FROM OLD.fin_kodu OR NEW.bolme IS DISTINCT FROM OLD.bolme
      OR NEW.fakulte IS DISTINCT FROM OLD.fakulte OR NEW.qrup IS DISTINCT FROM OLD.qrup THEN
      RAISE EXCEPTION 'Bu profil sahələrini yalnız admin dəyişə bilər';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_sensitive_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_sensitive_profile_fields_trigger BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

CREATE TABLE IF NOT EXISTS public.sessions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL, cihaz text NOT NULL, brauzer text, ip text, seher text, olke text,
  son_aktivlik timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS sessions_log_user_id_idx ON public.sessions_log(user_id);
CREATE INDEX IF NOT EXISTS sessions_log_son_aktivlik_idx ON public.sessions_log(son_aktivlik DESC);
ALTER TABLE public.sessions_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_log_select_own ON public.sessions_log;
CREATE POLICY sessions_log_select_own ON public.sessions_log FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS sessions_log_insert_own ON public.sessions_log;
CREATE POLICY sessions_log_insert_own ON public.sessions_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS sessions_log_update_own ON public.sessions_log;
CREATE POLICY sessions_log_update_own ON public.sessions_log FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS sessions_log_delete_own ON public.sessions_log;
CREATE POLICY sessions_log_delete_own ON public.sessions_log FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.transcripts (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, fayl_url text,
  son_yenilenme timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transcripts_select_own_or_admin ON public.transcripts;
CREATE POLICY transcripts_select_own_or_admin ON public.transcripts FOR SELECT TO authenticated USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
);
DROP POLICY IF EXISTS transcripts_write_admin ON public.transcripts;
CREATE POLICY transcripts_write_admin ON public.transcripts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS avatars_select ON storage.objects;
CREATE POLICY avatars_select ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);

INSERT INTO storage.buckets (id, name, public) VALUES ('transcripts', 'transcripts', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS transcripts_storage_select ON storage.objects;
CREATE POLICY transcripts_storage_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'transcripts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
);
DROP POLICY IF EXISTS transcripts_storage_insert ON storage.objects;
CREATE POLICY transcripts_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
);
DROP POLICY IF EXISTS transcripts_storage_update ON storage.objects;
CREATE POLICY transcripts_storage_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
) WITH CHECK (bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));
DROP POLICY IF EXISTS transcripts_storage_delete ON storage.objects;
CREATE POLICY transcripts_storage_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
);
