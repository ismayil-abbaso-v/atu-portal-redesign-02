create or replace function private.assign_course_topic_sequence()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.sira is null or new.sira <= 0 then
    select coalesce(max(t.sira), 0) + 1
      into new.sira
    from public.course_topics t
    where t.course_id = new.course_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_course_topic_sequence on public.course_topics;
create trigger trg_assign_course_topic_sequence
before insert on public.course_topics
for each row execute function private.assign_course_topic_sequence();
