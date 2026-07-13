-- Extend the trusted mutation dispatcher with the application fields needed by
-- the preparation pipeline without destabilizing the established appliers.
alter function public.apply_career_mutation(uuid)
  rename to apply_career_mutation_pre_application;

create or replace function public.apply_application_workflow_mutation(p_mutation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation public.proposed_mutations;
  payload jsonb;
  object_id uuid;
  current_version integer;
  v_result jsonb;
begin
  select * into mutation from public.proposed_mutations where id=p_mutation_id for update;
  if mutation.id is null then raise exception 'mutation not found'; end if;
  if mutation.status='applied' then return coalesce(mutation.result,'{}'::jsonb); end if;
  if mutation.status<>'pending' or mutation.approval_policy<>'auto_apply' then raise exception 'mutation is not auto-applicable'; end if;
  payload := mutation.payload;

  object_id := coalesce(mutation.target_object_id, nullif(payload->>'id','')::uuid);
  if object_id is null and nullif(payload->>'opportunityId','') is not null then
    select id into object_id from public.applications
    where user_id=mutation.user_id and opportunity_id=(payload->>'opportunityId')::uuid and archived_at is null
    order by created_at limit 1 for update;
  end if;
  object_id := coalesce(object_id, gen_random_uuid());
  select version into current_version from public.applications where id=object_id and user_id=mutation.user_id for update;
  if mutation.expected_object_version is not null and current_version is not null and current_version<>mutation.expected_object_version then
    raise exception 'version conflict';
  end if;

  insert into public.applications(
    id,user_id,title,status,opportunity_id,company_id,deadline_at,due_at,
    resume_variant_id,status_check_policy,next_status_check_at,next_action,
    metadata,created_by,updated_by
  ) values (
    object_id,mutation.user_id,payload->>'title',(payload->>'status')::public.application_status,
    nullif(payload->>'opportunityId','')::uuid,nullif(payload->>'companyId','')::uuid,
    nullif(payload->>'deadlineAt','')::timestamptz,nullif(payload->>'deadlineAt','')::timestamptz,
    nullif(payload->>'resumeVariantId','')::uuid,
    coalesce(nullif(payload->>'statusCheckPolicy','')::public.status_check_policy,'manual'),
    nullif(payload->>'nextStatusCheckAt','')::timestamptz,payload->>'nextAction',
    coalesce(payload->'metadata','{}'::jsonb),'agent','agent'
  ) on conflict(id) do update set
    title=coalesce(excluded.title,public.applications.title),
    status=excluded.status,
    opportunity_id=coalesce(excluded.opportunity_id,public.applications.opportunity_id),
    company_id=coalesce(excluded.company_id,public.applications.company_id),
    deadline_at=coalesce(excluded.deadline_at,public.applications.deadline_at),
    due_at=coalesce(excluded.due_at,public.applications.due_at),
    resume_variant_id=coalesce(excluded.resume_variant_id,public.applications.resume_variant_id),
    status_check_policy=coalesce(excluded.status_check_policy,public.applications.status_check_policy),
    next_status_check_at=coalesce(excluded.next_status_check_at,public.applications.next_status_check_at),
    next_action=coalesce(excluded.next_action,public.applications.next_action),
    metadata=public.applications.metadata || excluded.metadata,
    updated_by='agent';

  perform public.bump_state_version(mutation.user_id,'Application updated');
  v_result := jsonb_build_object('objectId',object_id,'mutationType',mutation.mutation_type,'appliedAt',now());
  update public.proposed_mutations set status='applied',target_object_id=object_id,applied_at=now(),result=v_result,updated_by='system' where id=mutation.id;
  insert into public.audit_log_entries(user_id,agent_run_id,action_type,target_object_type,target_object_id,summary,payload,evidence_ids,created_by,updated_by)
  values(mutation.user_id,mutation.agent_run_id,'mutation.applied','application',object_id,'application.upsert applied',jsonb_build_object('mutationId',mutation.id,'rationale',mutation.rationale),mutation.evidence_ids,'agent','agent');
  return v_result;
end;
$$;

create or replace function public.apply_career_mutation(p_mutation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare mutation_type text;
begin
  select proposed_mutations.mutation_type into mutation_type from public.proposed_mutations where id=p_mutation_id;
  if mutation_type='application.upsert' then
    return public.apply_application_workflow_mutation(p_mutation_id);
  end if;
  return public.apply_career_mutation_pre_application(p_mutation_id);
end;
$$;

create or replace function public.link_resume_variant_to_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.application_id is not null and new.status in ('ready_for_review','approved','used') then
    update public.applications
    set resume_variant_id=new.id,
        next_action=case when next_action is null or next_action like 'Career OS is preparing%'
          then 'Review the generated resume, project specification, referral plan, and remaining requirements.'
          else next_action end,
        updated_by='agent'
    where id=new.application_id and user_id=new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists resume_variants_link_application on public.resume_variants;
create trigger resume_variants_link_application
  after insert or update of status,pdf_path on public.resume_variants
  for each row execute function public.link_resume_variant_to_application();

revoke all on function public.apply_application_workflow_mutation(uuid) from public,anon,authenticated;
revoke all on function public.apply_career_mutation_pre_application(uuid) from public,anon,authenticated;
revoke all on function public.apply_career_mutation(uuid) from public,anon,authenticated;
grant execute on function public.apply_career_mutation(uuid) to service_role;
