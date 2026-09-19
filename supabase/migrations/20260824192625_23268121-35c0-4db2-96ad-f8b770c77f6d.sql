-- Storage access policies for restored buckets
-- avatars
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- library-books / library-covers
CREATE POLICY "library_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('library-books', 'library-covers'));
CREATE POLICY "library_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('library-books', 'library-covers') AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));
CREATE POLICY "library_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('library-books', 'library-covers') AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')))
WITH CHECK (bucket_id IN ('library-books', 'library-covers') AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));
CREATE POLICY "library_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('library-books', 'library-covers') AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));

-- transcripts
CREATE POLICY "transcripts_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'transcripts' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1])
  )
);
CREATE POLICY "transcripts_write" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')))
WITH CHECK (bucket_id = 'transcripts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')));

-- chat-files (first path segment is the chat group id)
CREATE POLICY "chat_files_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files' AND public.is_chat_member_for_file(name, auth.uid()));
CREATE POLICY "chat_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND public.is_chat_member_for_file(name, auth.uid()));
CREATE POLICY "chat_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-files' AND (public.is_chat_member_for_file(name, auth.uid()) OR public.has_role(auth.uid(), 'admin')));

-- course-materials (first path segment is the course id)
CREATE POLICY "course_materials_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
    OR public.is_course_teacher(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_course_student(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);
CREATE POLICY "course_materials_write" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'course-materials' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_course_teacher(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid, auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'course-materials' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_course_teacher(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_course_tutor(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

-- office-files (first path segment is the owner user id)
CREATE POLICY "office_files_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'office-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
    OR public.is_tutor_of_student(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);
CREATE POLICY "office_files_write" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'office-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'office-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- note-files (first path segment is the student user id)
CREATE POLICY "note_files_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'note-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dekan')
    OR public.has_role(auth.uid(), 'muellim') OR public.has_role(auth.uid(), 'tyutor')
  )
);
CREATE POLICY "note_files_write" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'note-files' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'muellim') OR public.has_role(auth.uid(), 'tyutor')
  )
)
WITH CHECK (
  bucket_id = 'note-files' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'muellim') OR public.has_role(auth.uid(), 'tyutor')
  )
);