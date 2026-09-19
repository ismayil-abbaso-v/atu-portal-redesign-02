-- Fix Storage RLS evaluation for authenticated uploads.
-- Existing storage policies reference is_chat_member_for_file().
-- PostgREST/Supabase Storage evaluates those policies even for unrelated
-- buckets, so a missing EXECUTE grant can cause every upload to fail with
-- "permission denied for function is_chat_member_for_file".
-- The function itself remains protected by its SECURITY DEFINER/RLS logic;
-- granting EXECUTE only allows the authenticated role to invoke that policy
-- helper.

GRANT EXECUTE ON FUNCTION public.is_chat_member_for_file(uuid, text) TO authenticated;
