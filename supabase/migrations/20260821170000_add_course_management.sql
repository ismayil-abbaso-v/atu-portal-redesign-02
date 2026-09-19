-- FAZA 9.3: Dərslər (fənn) idarəetməsi — kredit/otaq/sillabus, çox-müəllimli dəstək,
-- mövzular (sillabus jurnalı) və fənn-səviyyəli alt-qrup/kəsilən statusları.

-- 1) courses cədvəlinin genişləndirilməsi
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS kredit integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS otaq text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sillabus_url text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS aktiv_dars_novleri jsonb NOT NULL DEFAULT
  '{"muhazire":true,"seminar":true,"laboratoriya":false,"serbest_is":true,"kollokvium":true,"tecrube":false,"qrup_dersi":false}'::jsonb;

-- 2) course_teachers — çox-müəllimli dəstək (courses.muellim_id "əsas müəllim" kimi saxlanılır)
CREATE TABLE IF NOT EXISTS public.course_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  muellim_id uuid NOT NULL,
  icazeler jsonb NOT NULL DEFAULT
    '{"muhazire":true,"seminar":true,"laboratoriya":false,"serbest_is":true,"kollokvium":true,"tecrube":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, muellim_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_teachers TO authenticated;
GRANT ALL ON public.course_teachers TO service_role;
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_teachers_select" ON public.course_teachers FOR SELECT TO authenticated
  USING (true);
-- Yalnız admin/dekan fənnə müəllim əlavə/redaktə/silə bilər (öz-özünü əlavə etmə yoxdur).
CREATE POLICY "course_teachers_write" ON public.course_teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

-- Mövcud courses.muellim_id-i olan sətirlər üçün backfill (əsas müəllim siyahıda görünsün)
INSERT INTO public.course_teachers (course_id, muellim_id)
SELECT id, muellim_id FROM public.courses WHERE muellim_id IS NOT NULL
ON CONFLICT (course_id, muellim_id) DO NOTHING;

-- 3) course_topics — dərs mövzuları / sillabus jurnalı (notes cədvəli ilə QARIŞDIRILMASIN, fənnə aiddir)
CREATE TABLE IF NOT EXISTS public.course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  dars_novu text NOT NULL CHECK (dars_novu IN
    ('muhazire', 'seminar', 'laboratoriya', 'serbest_is', 'kollokvium', 'tecrube')),
  movzu text NOT NULL,
  aciqlama text,
  tarix date NOT NULL,
  bas_saat time,
  bit_saat time,
  fayl_url text,
  fayl_kateqoriyasi text,
  sira integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_topics TO authenticated;
GRANT ALL ON public.course_topics TO service_role;
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_topics_select" ON public.course_topics FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "course_topics_write" ON public.course_topics FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (
      SELECT 1 FROM public.course_teachers ct
      WHERE ct.course_id = course_topics.course_id AND ct.muellim_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (
      SELECT 1 FROM public.course_teachers ct
      WHERE ct.course_id = course_topics.course_id AND ct.muellim_id = auth.uid()
    )
  );

-- sira sütunu üçün ardıcıl nömrələmə (notes.xeyr trigger-inə bənzər, course_id üzrə)
CREATE OR REPLACE FUNCTION public.populate_course_topics_sira()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.sira := COALESCE(
    (SELECT MAX(sira) FROM public.course_topics WHERE course_id = NEW.course_id), 0
  ) + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_populate_course_topics_sira
BEFORE INSERT ON public.course_topics
FOR EACH ROW
WHEN (NEW.sira IS NULL)
EXECUTE FUNCTION public.populate_course_topics_sira();

-- 4) course_student_status — Alt Qrup / Kəsilən (group_members-dən əlavə, fənn-səviyyəli istisna/əlavələr)
CREATE TABLE IF NOT EXISTS public.course_student_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('elave', 'kesilib')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_student_status TO authenticated;
GRANT ALL ON public.course_student_status TO service_role;
ALTER TABLE public.course_student_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_student_status_select" ON public.course_student_status FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "course_student_status_write" ON public.course_student_status FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (
      SELECT 1 FROM public.course_teachers ct
      WHERE ct.course_id = course_student_status.course_id AND ct.muellim_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (
      SELECT 1 FROM public.course_teachers ct
      WHERE ct.course_id = course_student_status.course_id AND ct.muellim_id = auth.uid()
    )
  );

-- 5) Storage bucket 'course-materials' (sillabus + mövzu faylları)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "course_materials_select" ON storage.objects;
CREATE POLICY "course_materials_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-materials');

DROP POLICY IF EXISTS "course_materials_insert" ON storage.objects;
CREATE POLICY "course_materials_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      EXISTS (
        SELECT 1 FROM public.course_teachers ct
        WHERE ct.muellim_id = auth.uid()
          AND (storage.foldername(name))[1] = ct.course_id::text
      )
    )
  );

DROP POLICY IF EXISTS "course_materials_update" ON storage.objects;
CREATE POLICY "course_materials_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-materials' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      EXISTS (
        SELECT 1 FROM public.course_teachers ct
        WHERE ct.muellim_id = auth.uid()
          AND (storage.foldername(name))[1] = ct.course_id::text
      )
    )
  );

DROP POLICY IF EXISTS "course_materials_delete" ON storage.objects;
CREATE POLICY "course_materials_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-materials' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'dekan') OR
      EXISTS (
        SELECT 1 FROM public.course_teachers ct
        WHERE ct.muellim_id = auth.uid()
          AND (storage.foldername(name))[1] = ct.course_id::text
      )
    )
  );
