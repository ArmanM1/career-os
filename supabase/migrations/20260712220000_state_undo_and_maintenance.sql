create or replace function public.undo_state_item(p_state_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.state_items%rowtype;
  v_latest public.state_item_revisions%rowtype;
  v_previous public.state_item_revisions%rowtype;
  v_revision integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  select * into v_item from public.state_items where id = p_state_item_id and user_id = v_user_id for update;
  if not found then raise exception 'state item not found'; end if;
  select * into v_latest from public.state_item_revisions where state_item_id = p_state_item_id and user_id = v_user_id order by revision desc limit 1;
  select * into v_previous from public.state_item_revisions where state_item_id = p_state_item_id and user_id = v_user_id and revision < v_latest.revision order by revision desc limit 1;
  if v_previous.id is null then raise exception 'no previous revision to restore'; end if;
  v_revision := v_latest.revision + 1;
  update public.state_item_revisions set status = 'superseded', updated_by = 'user' where id = v_latest.id;
  insert into public.state_item_revisions (user_id,state_item_id,status,revision,value,human_value,confidence,salience,effective_at,expires_at,source_type,source_id,user_stated,rationale,supersedes_revision_id,undo_of_revision_id,created_by,updated_by)
  values (v_user_id,p_state_item_id,'applied',v_revision,v_previous.value,v_previous.human_value,v_previous.confidence,v_previous.salience,now(),v_previous.expires_at,'user_action',null,true,'Restored the previous value from visible history.',v_latest.id,v_latest.id,'user','user');
  update public.state_items set current_value=v_previous.value,human_value=v_previous.human_value,confidence=v_previous.confidence,salience=v_previous.salience,effective_at=now(),expires_at=v_previous.expires_at,status='active',updated_by='user' where id=p_state_item_id;
  perform public.bump_state_version(v_user_id);
  insert into public.audit_log_entries (user_id,action,object_type,object_id,summary,rationale,actor_type,metadata)
  values (v_user_id,'state_item.undo','state_item',p_state_item_id,'Restored previous state value','User selected undo from the state history.','user',jsonb_build_object('undo_of_revision_id',v_latest.id,'restored_revision_id',v_previous.id));
  return jsonb_build_object('state_item_id',p_state_item_id,'revision',v_revision);
end;
$$;

grant execute on function public.undo_state_item(uuid) to authenticated;

create or replace function public.expire_stale_state_items()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  with expired as (
    update public.state_items
    set status='expired',updated_by='system'
    where status='active' and expires_at is not null and expires_at <= now()
    returning user_id,id
  )
  select count(*) into v_count from expired;
  update public.state_item_revisions r set status='expired',updated_by='system'
  from public.state_items i where r.state_item_id=i.id and i.status='expired' and r.status='applied';
  return v_count;
end;
$$;

revoke all on function public.expire_stale_state_items() from public, anon, authenticated;
grant execute on function public.expire_stale_state_items() to service_role;
