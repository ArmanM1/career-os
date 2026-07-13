-- Server Route Handlers use the Supabase service role for worker-gateway,
-- OAuth-token, signed-storage, notification, and maintenance operations.
-- BYPASSRLS does not itself grant table privileges, so make that boundary
-- explicit for existing and future public objects.
grant usage on schema public to service_role;
grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete, truncate, references, trigger on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

-- OAuth credentials and OAuth state remain inaccessible to browser roles.
revoke all on public.oauth_credentials from anon, authenticated;
revoke all on public.oauth_states from anon, authenticated;
