-- Faza: Kitabxana modulu
-- library_books cədvəli + RLS + Storage bucket-ləri (library-books, library-covers)

CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  muellif text NOT NULL,
  kateqoriya text NOT NULL,
  tesvir text,
  uz_qabigi_url text,
  fayl_url text NOT NULL,
  format text NOT NULL CHECK (format IN ('pdf', 'epub')),
  elave_eden_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  elave_olunma_tarixi timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_books_kateqoriya_idx ON public.library_books (kateqoriya);
CREATE INDEX IF NOT EXISTS library_books_elave_olunma_tarixi_idx
  ON public.library_books (elave_olunma_tarixi DESC);
CREATE INDEX IF NOT EXISTS library_books_ad_idx ON public.library_books (lower(ad));
CREATE INDEX IF NOT EXISTS library_books_muellif_idx ON public.library_books (lower(muellif));

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

-- SELECT: bütün authenticated istifadəçilər kitabxananı görə bilər
DROP POLICY IF EXISTS "library_books_select" ON public.library_books;
CREATE POLICY "library_books_select" ON public.library_books FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: yalnız admin/dekan
DROP POLICY IF EXISTS "library_books_insert" ON public.library_books;
CREATE POLICY "library_books_insert" ON public.library_books FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

DROP POLICY IF EXISTS "library_books_update" ON public.library_books;
CREATE POLICY "library_books_update" ON public.library_books FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

DROP POLICY IF EXISTS "library_books_delete" ON public.library_books;
CREATE POLICY "library_books_delete" ON public.library_books FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'));

-- Storage bucket 'library-books' (PDF/EPUB faylları) — məxfi, endirmə signed URL ilə
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-books', 'library-books', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket 'library-covers' (üz qabığı şəkilləri) — public, birbaşa <img> ilə göstərilir
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-covers', 'library-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'library-books'
DROP POLICY IF EXISTS "library_books_files_select" ON storage.objects;
CREATE POLICY "library_books_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'library-books');

DROP POLICY IF EXISTS "library_books_files_insert" ON storage.objects;
CREATE POLICY "library_books_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'library-books' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );

DROP POLICY IF EXISTS "library_books_files_update" ON storage.objects;
CREATE POLICY "library_books_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'library-books' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  )
  WITH CHECK (
    bucket_id = 'library-books' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );

DROP POLICY IF EXISTS "library_books_files_delete" ON storage.objects;
CREATE POLICY "library_books_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'library-books' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );

-- Storage policies for 'library-covers'
DROP POLICY IF EXISTS "library_covers_select" ON storage.objects;
CREATE POLICY "library_covers_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'library-covers');

DROP POLICY IF EXISTS "library_covers_insert" ON storage.objects;
CREATE POLICY "library_covers_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'library-covers' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );

DROP POLICY IF EXISTS "library_covers_update" ON storage.objects;
CREATE POLICY "library_covers_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'library-covers' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  )
  WITH CHECK (
    bucket_id = 'library-covers' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );

DROP POLICY IF EXISTS "library_covers_delete" ON storage.objects;
CREATE POLICY "library_covers_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'library-covers' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan'))
  );
