-- Prompt 6 follow-up: RLS policies execute this private SECURITY DEFINER helper.
-- The private schema is not exposed through PostgREST, but authenticated needs
-- function EXECUTE permission for PostgreSQL policy evaluation.
grant execute on function private.teacher_can_grade_exam_score(uuid, uuid, uuid) to authenticated;
