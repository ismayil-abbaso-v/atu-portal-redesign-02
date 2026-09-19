-- TRUNCATE bypasses row-level policies and is never required by portal users.
-- Keep authenticated users (including teachers/admin UI sessions) on row-level
-- DML paths only; service-role/server maintenance remains unaffected.
revoke truncate on table public.exam_scores from authenticated;
