alter type public.monitor_status add value if not exists 'auth_required';
alter type public.monitor_status add value if not exists 'stale';

create or replace function public.claim_source_monitors(p_device_id uuid, p_limit integer default 2)
returns setof public.source_monitors
language plpgsql
security definer
set search_path = public
as $$
declare device_user_id uuid;
begin
  select user_id into device_user_id from public.worker_devices where id = p_device_id and status in ('online', 'offline');
  if device_user_id is null then raise exception 'device is not active'; end if;
  return query
  with candidates as (
    select id from public.source_monitors
    where user_id = device_user_id and status = 'active'
      and coalesce(next_run_at, now()) <= now()
      and (lease_expires_at is null or lease_expires_at < now())
    order by priority desc nulls last, next_run_at, created_at
    for update skip locked limit greatest(1, least(p_limit, 10))
  )
  update public.source_monitors m set claimed_by_device_id = p_device_id, lease_expires_at = now() + interval '10 minutes', updated_by = 'system'
  from candidates c where m.id = c.id returning m.*;
end;
$$;
revoke all on function public.claim_source_monitors(uuid, integer) from public;
