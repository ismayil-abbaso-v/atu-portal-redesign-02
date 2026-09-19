-- Faza 9: Ofis (Şəxsi Fayl Anbarı) modulu
-- office_files cədvəli + RLS + 'office-files' storage bucket

CREATE TABLE public.office_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  sahib_id uuid NOT NULL,
  fayl_url text NOT NULL,
  olcusu bigint NOT NULL,
  fayl_novu text,
  tarix timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS office_files_sahib_id_idx ON public.office_files (sahib_id);
CREATE INDEX IF NOT EXISTS office_files_tarix_idx ON public.office_files (tarix DESC);
CREATE INDEX IF NOT EXISTS office_files_ad_idx ON public.office_files (lower(ad));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_files TO authenticated;
GRANT ALL ON public.office_files TO service_role;
ALTER TABLE public.office_files ENABLE ROW LEVEL SECURITY;

-- SELECT: sahibi, admin/dekan (hamısı) və tyutor (yalnız öz qrupunun tələbələrinin faylları)
DROP POLICY IF EXISTS "office_files_select" ON public.office_files;
CREATE POLICY "office_files_select" ON public.office_files FOR SELECT TO authenticated
  USING (
    sahib_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dekan')
    OR EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.user_id = office_files.sahib_id
        AND g.tyutor_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: yalnız sahibinin özü
DROP POLICY IF EXISTS "office_files_insert" ON public.office_files;
CREATE POLICY "office_files_insert" ON public.office_files FOR INSERT TO authenticated
  WITH CHECK (sahib_id = auth.uid());

DROP POLICY IF EXISTS "office_files_update" ON public.office_files;
CREATE POLICY "office_files_update" ON public.office_files FOR UPDATE TO authenticated
  USING (sahib_id = auth.uid())
  WITH CHECK (sahib_id = auth.uid());

DROP POLICY IF EXISTS "office_files_delete" ON public.office_files;
CREATE POLICY "office_files_delete" ON public.office_files FOR DELETE TO authenticated
  USING (sahib_id = auth.uid());

-- Storage bucket 'office-files' — məxfi, hər istifadəçi öz qovluğuna yükləyir
-- (path konvensiyası: "<auth.uid()>/<uuid>.<uzantı>")
INSERT INTO storage.buckets (id, name, public)
VALUES ('office-files', 'office-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "office_files_storage_select" ON storage.objects;
CREATE POLICY "office_files_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'office-files' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'dekan')
      OR EXISTS (
        SELECT 1
        FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        WHERE gm.user_id::text = (storage.foldername(name))[1]
          AND g.tyutor_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "office_files_storage_insert" ON storage.objects;
CREATE POLICY "office_files_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'office-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "office_files_storage_update" ON storage.objects;
CREATE POLICY "office_files_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'office-files' AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'office-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "office_files_storage_delete" ON storage.objects;
CREATE POLICY "office_files_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'office-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );
