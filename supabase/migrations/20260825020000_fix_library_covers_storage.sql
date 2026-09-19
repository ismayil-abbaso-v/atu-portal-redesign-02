-- Library book covers must be directly renderable by browsers.
-- The application stores public URLs from the `library-covers` bucket,
-- therefore the bucket must be public and authenticated users need upload/update/delete access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('library-covers', 'library-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "library_covers_public_read" ON storage.objects;
CREATE POLICY "library_covers_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'library-covers');

DROP POLICY IF EXISTS "library_covers_admin_insert" ON storage.objects;
CREATE POLICY "library_covers_admin_insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'library-covers'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "library_covers_admin_update" ON storage.objects;
CREATE POLICY "library_covers_admin_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'library-covers'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'library-covers'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "library_covers_admin_delete" ON storage.objects;
CREATE POLICY "library_covers_admin_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'library-covers'
  AND public.has_role(auth.uid(), 'admin')
);
