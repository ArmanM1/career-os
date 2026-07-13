create or replace function public.expire_pending_approval_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.approval_requests
  set status = 'expired',
      decided_at = coalesce(decided_at, now()),
      updated_at = now(),
      updated_by = 'system'
  where status = 'pending'
    and expires_at is not null
    and expires_at <= now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.expire_pending_approval_requests() from public, anon, authenticated;
grant execute on function public.expire_pending_approval_requests() to service_role;
