-- RLS policies invoke these private SECURITY DEFINER predicates as authenticated.
-- Grant EXECUTE only on the predicates that policies call directly. The private
-- schema is not exposed as a REST RPC surface.

grant execute on function private.exam_material_teacher_can_manage(uuid, uuid, text, smallint, uuid) to authenticated;
grant execute on function private.exam_material_can_read(uuid, uuid, text, smallint, uuid) to authenticated;
