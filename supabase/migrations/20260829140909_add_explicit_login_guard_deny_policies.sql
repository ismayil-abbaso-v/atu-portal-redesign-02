create policy login_attempts_deny_client_access
on private.login_attempts
for all
to anon, authenticated
using (false)
with check (false);

create policy login_attempt_reservations_deny_client_access
on private.login_attempt_reservations
for all
to anon, authenticated
using (false)
with check (false);
