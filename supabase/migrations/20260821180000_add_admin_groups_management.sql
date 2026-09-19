-- FAZA 9.4: Qruplar (admin) idarəetməsi — qrup grid-i, qrup dərinlik səhifəsi
-- (kurs üzrə fənlər, qrup rəhbəri, tələbə siyahısı), arxivləşdirmə.

-- 1) courses.kurs — fənnin hansı kursda (I/II/III/IV və s.) tədris olunduğunu göstərir.
--    Qeyd: course_groups vasitəsilə bir fənn bir neçə qrupa bağlı ola bilsə də, "kurs" fənnin
--    öz atributudur (qrup-spesifik deyil).
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS kurs integer CHECK (kurs BETWEEN 1 AND 6);

-- 2) groups.arxivlenib — qrup grid-ində "Arxivə bax" görünüşü üçün.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS arxivlenib boolean NOT NULL DEFAULT false;

-- 3) RLS: admin/dekan bütün groups/group_members/course_groups sətirlərini tam idarə edə bilsin.
--    Tyutorun ÖZ qrupuna aid mövcud icazələri (FAZA 2-3-dən) qorunur, üstünə dekan əlavə olunur.

DROP POLICY IF EXISTS "groups_write_admin" ON public.groups;
CREATE POLICY "groups_write_admin" ON public.groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    tyutor_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    tyutor_id = auth.uid()
  );

DROP POLICY IF EXISTS "group_members_write" ON public.group_members;
CREATE POLICY "group_members_write" ON public.group_members FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.tyutor_id = auth.uid())
  );

DROP POLICY IF EXISTS "course_groups_write" ON public.course_groups;
CREATE POLICY "course_groups_write" ON public.course_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dekan') OR
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.muellim_id = auth.uid())
  );
