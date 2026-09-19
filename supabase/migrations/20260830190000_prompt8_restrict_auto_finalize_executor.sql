revoke all on function private.auto_confirm_overdue_lesson_sessions() from public;
revoke all on function private.auto_confirm_overdue_lesson_sessions() from anon;
revoke all on function private.auto_confirm_overdue_lesson_sessions() from authenticated;
grant execute on function private.auto_confirm_overdue_lesson_sessions() to postgres, service_role;