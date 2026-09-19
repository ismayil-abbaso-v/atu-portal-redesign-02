grant execute on function private.is_course_teacher(uuid, uuid) to authenticated;
grant execute on function private.ejournal_is_course_teacher(uuid, uuid) to authenticated;
revoke all on function private.is_course_teacher(uuid, uuid) from public, anon;
revoke all on function private.ejournal_is_course_teacher(uuid, uuid) from public, anon;
