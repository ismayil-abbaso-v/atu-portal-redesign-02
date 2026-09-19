-- 1. Fix broken RLS correlations
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dekan'::app_role)
  OR yaradan_id = auth.uid()
  OR group_id IS NULL
  OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = calendar_events.group_id AND gm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM groups g WHERE g.id = calendar_events.group_id AND g.tyutor_id = auth.uid())
  OR (has_role(auth.uid(),'muellim'::app_role) AND EXISTS (SELECT 1 FROM courses c WHERE c.id = calendar_events.course_id AND c.muellim_id = auth.uid()))
);

DROP POLICY IF EXISTS chat_groups_select ON public.chat_groups;
CREATE POLICY chat_groups_select ON public.chat_groups FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dekan'::app_role)
  OR EXISTS (SELECT 1 FROM chat_group_members cgm WHERE cgm.chat_group_id = chat_groups.id AND cgm.user_id = auth.uid())
);

DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dekan'::app_role)
  OR EXISTS (SELECT 1 FROM chat_group_members cgm WHERE cgm.chat_group_id = chat_messages.chat_group_id AND cgm.user_id = auth.uid())
);

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  gonderen_id = auth.uid()
  AND EXISTS (SELECT 1 FROM chat_group_members cgm WHERE cgm.chat_group_id = chat_messages.chat_group_id AND cgm.user_id = auth.uid())
);

-- 2. Views run with the querying user's permissions
ALTER VIEW public.group_stats SET (security_invoker = true);
ALTER VIEW public.faculty_stats SET (security_invoker = true);
ALTER VIEW public.chat_group_last_message SET (security_invoker = true);
ALTER VIEW public.faculty_attendance_trend_view SET (security_invoker = true);
ALTER VIEW public.group_performance_view SET (security_invoker = true);
ALTER VIEW public.tutor_performance_view SET (security_invoker = true);

-- 3. Fixed search_path on remaining functions
ALTER FUNCTION public.create_chat_group_for_course() SET search_path = public;
ALTER FUNCTION public.is_chat_member_for_file(text, uuid) SET search_path = public;
ALTER FUNCTION public.populate_course_topics_sira() SET search_path = public;
ALTER FUNCTION public.populate_notes_xeyr() SET search_path = public;
ALTER FUNCTION public.sync_course_group_members_to_chat() SET search_path = public;
ALTER FUNCTION public.sync_new_group_member_to_chats() SET search_path = public;

-- 4. Revoke direct EXECUTE on SECURITY DEFINER functions from API roles.
-- Trigger functions never need direct EXECUTE.
REVOKE ALL ON FUNCTION public.create_chat_group_for_course() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.populate_course_topics_sira() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.populate_notes_xeyr() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_course_group_members_to_chat() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_new_group_member_to_chats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_calendar_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_chat_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_exam_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restrict_dekan_profile_update() FROM PUBLIC, anon, authenticated;
-- Storage helper: used inside policies only.
REVOKE ALL ON FUNCTION public.is_chat_member_for_file(text, uuid) FROM PUBLIC, anon, authenticated;
-- Admin RPC: keep for signed-in users (it checks admin role internally), block anonymous.
REVOKE ALL ON FUNCTION public.broadcast_notification(text, text, text, app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, app_role, uuid) TO authenticated;
