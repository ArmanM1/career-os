-- Preserve the established mutation applier and place new onboarding/resume
-- mutations behind a small dispatcher. This keeps old behavior stable while
-- making the new contracts transactional and auditable.

alter function public.apply_career_mutation(uuid)
  rename to apply_career_mutation_legacy;

create or replace function public.apply_onboarding_mutation(p_mutation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation public.proposed_mutations;
  payload jsonb;
  object_id uuid;
  existing_id uuid;
  current_version integer;
  v_result jsonb;
  source_artifact_id uuid;
begin
  select * into mutation
  from public.proposed_mutations
  where id = p_mutation_id
  for update;

  if mutation.id is null then raise exception 'mutation not found'; end if;
  if mutation.status = 'applied' then return coalesce(mutation.result, '{}'::jsonb); end if;
  if mutation.status <> 'pending' then raise exception 'mutation is not pending'; end if;
  if mutation.approval_policy <> 'auto_apply' then raise exception 'mutation requires approval'; end if;

  payload := mutation.payload;
  object_id := coalesce(mutation.target_object_id, gen_random_uuid());
  source_artifact_id := nullif(payload->>'sourceArtifactId', '')::uuid;

  if mutation.mutation_type = 'experience.upsert' then
    if not exists (select 1 from public.artifacts where id=source_artifact_id and user_id=mutation.user_id) then
      raise exception 'resume source artifact not found';
    end if;
    select id into existing_id
    from public.experiences
    where user_id=mutation.user_id
      and lower(title)=lower(payload->>'title')
      and lower(coalesce(organization,''))=lower(coalesce(payload->>'organization',''))
      and starts_at is not distinct from nullif(payload->>'startsAt','')::date
      and ends_at is not distinct from nullif(payload->>'endsAt','')::date
      and archived_at is null
    order by created_at
    limit 1
    for update;
    if existing_id is null then
      insert into public.experiences(
        id,user_id,title,status,labels,organization,starts_at,ends_at,description,
        metadata,created_by,updated_by
      ) values (
        object_id,mutation.user_id,payload->>'title','draft',
        coalesce(array(select jsonb_array_elements_text(coalesce(payload->'labels','[]'::jsonb))),'{}'),
        payload->>'organization',nullif(payload->>'startsAt','')::date,
        nullif(payload->>'endsAt','')::date,payload->>'description',
        coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'componentType',payload->>'componentType',
          'sourceArtifactIds',jsonb_build_array(source_artifact_id),
          'sourceSpans',jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),'agent','agent'
      );
    else
      object_id := existing_id;
      update public.experiences set
        description=coalesce(description,payload->>'description'),
        labels=array(select distinct unnest(labels || coalesce(array(select jsonb_array_elements_text(coalesce(payload->'labels','[]'::jsonb))),'{}'))),
        metadata=metadata || coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'sourceArtifactIds',coalesce(metadata->'sourceArtifactIds','[]'::jsonb) || jsonb_build_array(source_artifact_id),
          'sourceSpans',coalesce(metadata->'sourceSpans','[]'::jsonb) || jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),
        status=case when status='verified' then status else 'draft' end,
        updated_by='agent'
      where id=object_id;
    end if;

  elsif mutation.mutation_type = 'experience_achievement.upsert' then
    if not exists (select 1 from public.experiences where id=(payload->>'experienceId')::uuid and user_id=mutation.user_id) then
      raise exception 'experience component not found';
    end if;
    if not exists (select 1 from public.artifacts where id=source_artifact_id and user_id=mutation.user_id) then
      raise exception 'resume source artifact not found';
    end if;
    select id into existing_id
    from public.experience_achievements
    where user_id=mutation.user_id
      and experience_id=(payload->>'experienceId')::uuid
      and lower(achievement)=lower(payload->>'achievement')
      and archived_at is null
    limit 1;
    if existing_id is null then
      insert into public.experience_achievements(
        id,user_id,experience_id,title,status,achievement,metrics,evidence_ids,
        provenance,metadata,created_by,updated_by
      ) values (
        object_id,mutation.user_id,(payload->>'experienceId')::uuid,
        left(payload->>'achievement',120),'draft',payload->>'achievement',
        coalesce(payload->'metrics','{}'::jsonb),mutation.evidence_ids,
        'resume_import',jsonb_build_object(
          'skillNames',coalesce(payload->'skillNames','[]'::jsonb),
          'sourceArtifactId',source_artifact_id,
          'sourceSpan',coalesce(payload->'sourceSpan','{}'::jsonb)
        ),'agent','agent'
      );
    else object_id := existing_id;
    end if;

  elsif mutation.mutation_type = 'project.upsert' then
    if not exists (select 1 from public.artifacts where id=source_artifact_id and user_id=mutation.user_id) then
      raise exception 'resume source artifact not found';
    end if;
    select id into existing_id from public.projects
    where user_id=mutation.user_id and lower(title)=lower(payload->>'title') and archived_at is null
    limit 1 for update;
    if existing_id is null then
      insert into public.projects(id,user_id,title,status,url,repository_url,description,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','draft',payload->>'url',payload->>'repositoryUrl',payload->>'description',
        coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'skillNames',coalesce(payload->'skillNames','[]'::jsonb),
          'sourceArtifactIds',jsonb_build_array(source_artifact_id),
          'sourceSpans',jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),'agent','agent');
    else
      object_id := existing_id;
      update public.projects set
        description=coalesce(description,payload->>'description'),
        url=coalesce(url,payload->>'url'),
        repository_url=coalesce(repository_url,payload->>'repositoryUrl'),
        metadata=metadata || coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'sourceArtifactIds',coalesce(metadata->'sourceArtifactIds','[]'::jsonb) || jsonb_build_array(source_artifact_id),
          'sourceSpans',coalesce(metadata->'sourceSpans','[]'::jsonb) || jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),
        status=case when status='verified' then status else 'draft' end,
        updated_by='agent'
      where id=object_id;
    end if;

  elsif mutation.mutation_type = 'skill.upsert' then
    if not exists (select 1 from public.artifacts where id=source_artifact_id and user_id=mutation.user_id) then
      raise exception 'resume source artifact not found';
    end if;
    select id into existing_id from public.skills
    where user_id=mutation.user_id and lower(title)=lower(payload->>'title') and archived_at is null
    limit 1 for update;
    if existing_id is null then
      insert into public.skills(id,user_id,title,status,proficiency,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','draft',payload->>'proficiency',
        coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'sourceArtifactIds',jsonb_build_array(source_artifact_id),
          'sourceSpans',jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),'agent','agent');
    else
      object_id := existing_id;
      update public.skills set
        proficiency=coalesce(proficiency,payload->>'proficiency'),
        metadata=metadata || coalesce(payload->'metadata','{}'::jsonb) || jsonb_build_object(
          'sourceArtifactIds',coalesce(metadata->'sourceArtifactIds','[]'::jsonb) || jsonb_build_array(source_artifact_id),
          'sourceSpans',coalesce(metadata->'sourceSpans','[]'::jsonb) || jsonb_build_array(coalesce(payload->'sourceSpan','{}'::jsonb))
        ),
        status=case when status='verified' then status else 'draft' end,
        updated_by='agent'
      where id=object_id;
    end if;

  elsif mutation.mutation_type = 'resume_version.update' then
    object_id := (payload->>'id')::uuid;
    select version into current_version from public.resume_versions
    where id=object_id and user_id=mutation.user_id for update;
    if current_version is null then raise exception 'resume import not found'; end if;
    if mutation.expected_object_version is not null and current_version <> mutation.expected_object_version then
      raise exception 'version conflict';
    end if;
    update public.resume_versions set
      status=payload->>'status',
      metadata=metadata || coalesce(payload->'metadata','{}'::jsonb),
      updated_by='agent'
    where id=object_id and user_id=mutation.user_id;

  elsif mutation.mutation_type = 'source_adapter.upsert' then
    if not exists (select 1 from public.source_monitors where id=(payload->>'sourceMonitorId')::uuid and user_id=mutation.user_id) then
      raise exception 'source monitor not found';
    end if;
    insert into public.source_adapters(
      id,user_id,source_monitor_id,title,status,adapter_type,definition,
      domain_allowlist,checksum,test_result,created_by,updated_by
    ) values (
      object_id,mutation.user_id,(payload->>'sourceMonitorId')::uuid,payload->>'title',
      'testing',payload->>'adapterType',payload->'definition',
      coalesce(array(select jsonb_array_elements_text(coalesce(payload->'domainAllowlist','[]'::jsonb))),'{}'),
      payload->>'checksum',coalesce(payload->'testResult','{}'::jsonb),'agent','agent'
    ) on conflict(user_id,checksum) do update set
      source_monitor_id=excluded.source_monitor_id,
      title=excluded.title,
      status='testing',
      adapter_type=excluded.adapter_type,
      definition=excluded.definition,
      domain_allowlist=excluded.domain_allowlist,
      test_result=excluded.test_result,
      version_number=public.source_adapters.version_number+1,
      updated_by='agent'
    returning id into object_id;
    update public.source_monitors set
      fetch_strategy=case when payload->>'adapterType' in ('browser_skill','browser_workflow') then 'browser'::public.fetch_strategy else fetch_strategy end,
      metadata=metadata || jsonb_build_object('activeAdapterId',object_id,'adapterType',payload->>'adapterType'),
      updated_by='agent'
    where id=(payload->>'sourceMonitorId')::uuid and user_id=mutation.user_id;

  elsif mutation.mutation_type = 'signal.create' then
    select id into existing_id from public.signals
    where user_id=mutation.user_id and (
      (payload->>'canonicalUrl' is not null and canonical_url=payload->>'canonicalUrl') or
      (payload->>'externalRef' is not null and external_ref=payload->>'externalRef')
    ) and archived_at is null
    limit 1;
    if existing_id is null then
      insert into public.signals(
        id,user_id,source_monitor_id,source_run_id,title,status,signal_type,
        source_type,source_url,canonical_url,external_ref,company_name,role_title,
        location,opportunity_type,posted_at,deadline_at,raw_payload,
        normalized_payload,parser_name,parser_confidence,rationale,evidence_ids,
        metadata,created_by,updated_by
      ) values (
        object_id,mutation.user_id,nullif(payload->>'sourceMonitorId','')::uuid,
        nullif(payload->>'sourceRunId','')::uuid,payload->>'title','new',
        (payload->>'signalType')::public.signal_type,
        nullif(payload->>'sourceType','')::public.source_type,payload->>'sourceUrl',
        payload->>'canonicalUrl',payload->>'externalRef',payload->>'companyName',
        payload->>'roleTitle',payload->>'location',payload->>'opportunityType',
        nullif(payload->>'postedAt','')::timestamptz,nullif(payload->>'deadlineAt','')::timestamptz,
        coalesce(payload->'payload','{}'::jsonb),coalesce(payload->'payload','{}'::jsonb),
        coalesce(payload->>'parserName','browser_skill'),coalesce(payload->>'confidence','medium'),
        coalesce(payload->>'rationale',''),mutation.evidence_ids,
        coalesce(payload->'metadata','{}'::jsonb),'agent','agent'
      );
    else object_id := existing_id;
    end if;

  else
    raise exception 'unsupported onboarding mutation: %', mutation.mutation_type;
  end if;

  v_result := jsonb_build_object('objectId',object_id,'mutationType',mutation.mutation_type,'appliedAt',now());
  update public.proposed_mutations set
    status='applied',target_object_id=object_id,applied_at=now(),result=v_result,updated_by='system'
  where id=mutation.id;
  insert into public.audit_log_entries(
    user_id,agent_run_id,action_type,target_object_type,target_object_id,
    summary,payload,evidence_ids,created_by,updated_by
  ) values (
    mutation.user_id,mutation.agent_run_id,'mutation.applied',mutation.target_object_type,
    object_id,mutation.mutation_type || ' applied',
    jsonb_build_object('mutationId',mutation.id,'rationale',mutation.rationale),
    mutation.evidence_ids,'agent','agent'
  );
  return v_result;
end;
$$;

create or replace function public.apply_career_mutation(p_mutation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation_type text;
begin
  select proposed_mutations.mutation_type into mutation_type
  from public.proposed_mutations
  where id=p_mutation_id;
  if mutation_type in (
    'experience.upsert','experience_achievement.upsert','project.upsert',
    'skill.upsert','resume_version.update','source_adapter.upsert','signal.create'
  ) then
    return public.apply_onboarding_mutation(p_mutation_id);
  end if;
  return public.apply_career_mutation_legacy(p_mutation_id);
end;
$$;

revoke all on function public.apply_onboarding_mutation(uuid) from public, anon, authenticated;
revoke all on function public.apply_career_mutation_legacy(uuid) from public, anon, authenticated;
revoke all on function public.apply_career_mutation(uuid) from public, anon, authenticated;
grant execute on function public.apply_career_mutation(uuid) to service_role;
