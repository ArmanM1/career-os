alter type public.approval_status add value if not exists 'executed';
alter type public.approval_status add value if not exists 'expired';

alter table public.approval_requests
  add column if not exists expires_at timestamptz,
  add column if not exists executed_at timestamptz,
  add column if not exists error_message text;

create or replace function public.export_career_os_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_record record;
  table_rows jsonb;
  result jsonb := jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', clock_timestamp(),
    'userId', p_user_id,
    'data', '{}'::jsonb
  );
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'Not authorized to export this user';
  end if;

  for table_record in
    select distinct columns.table_name
    from information_schema.columns
    where columns.table_schema = 'public'
      and columns.column_name = 'user_id'
      and columns.table_name not in ('oauth_credentials', 'oauth_states', 'worker_devices', 'worker_pairing_codes')
    order by columns.table_name
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(value)), ''[]''::jsonb) from public.%I value where value.user_id = $1',
      table_record.table_name
    ) into table_rows using p_user_id;
    result := jsonb_set(result, array['data', table_record.table_name], table_rows, true);
  end loop;

  return result;
end;
$$;

revoke all on function public.export_career_os_data(uuid) from public;
grant execute on function public.export_career_os_data(uuid) to authenticated, service_role;

create index if not exists approval_requests_pending_expiry_idx
  on public.approval_requests(expires_at)
  where status = 'pending';
