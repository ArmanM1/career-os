create or replace function public.consume_worker_pairing_code(
  p_code_hash text,
  p_device_secret_hash text,
  p_worker_version text default null,
  p_capabilities text[] default '{}'
)
returns table(device_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  pairing public.worker_pairing_codes;
begin
  select * into pairing
  from public.worker_pairing_codes
  where code_hash = p_code_hash
    and status = 'active'
    and expires_at > now()
  for update skip locked;

  if pairing.id is null then
    raise exception 'invalid or expired pairing code';
  end if;

  update public.worker_pairing_codes
  set status = 'used', used_at = now(), updated_by = 'system'
  where id = pairing.id;

  update public.worker_devices as device
  set secret_hash = p_device_secret_hash,
      secret_rotated_at = now(),
      status = 'offline',
      worker_version = p_worker_version,
      capabilities = p_capabilities,
      updated_by = 'system'
  where device.id = pairing.worker_device_id and device.user_id = pairing.user_id;

  return query select pairing.worker_device_id, pairing.user_id;
end;
$$;

revoke all on function public.consume_worker_pairing_code(text, text, text, text[]) from public;
