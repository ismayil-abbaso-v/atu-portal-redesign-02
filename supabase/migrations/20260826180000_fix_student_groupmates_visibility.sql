-- Allow a student to see all members of groups they belong to.
-- This is required by the StudentDashboard group-member/avatar queries.
create policy "group_members_select_same_group"
on public.group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members mine
    where mine.group_id = group_members.group_id
      and mine.user_id = auth.uid()
  )
);

-- Allow a student to read profiles of other students in their own group.
-- Existing self/admin/dean/tutor policies remain unchanged.
create policy "profiles_select_same_group"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members target_gm
    join public.group_members mine on mine.group_id = target_gm.group_id
    where target_gm.user_id = profiles.user_id
      and mine.user_id = auth.uid()
  )
);
