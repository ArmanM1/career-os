create or replace function public.apply_career_mutation(p_mutation_id uuid)
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
  state_item public.state_items;
  next_revision integer;
  result jsonb;
begin
  select * into mutation from public.proposed_mutations where id = p_mutation_id for update;
  if mutation.id is null then raise exception 'mutation not found'; end if;
  if mutation.status = 'applied' then return coalesce(mutation.result, '{}'::jsonb); end if;
  if mutation.status <> 'pending' then raise exception 'mutation is not pending'; end if;
  if mutation.approval_policy <> 'auto_apply' then raise exception 'mutation requires approval'; end if;
  payload := mutation.payload;
  object_id := coalesce(mutation.target_object_id, gen_random_uuid());

  if mutation.mutation_type = 'state_item.revise' then
    select * into state_item from public.state_items where user_id = mutation.user_id and stable_key = payload->>'stableKey' and status = 'active' for update;
    if state_item.id is null then
      insert into public.state_items(id,user_id,title,status,item_type,stable_key,current_value,human_value,confidence,salience,effective_at,expires_at,source_type,source_id,user_stated,created_by,updated_by)
      values(object_id,mutation.user_id,coalesce(payload->>'humanValue',payload->>'stableKey'),'active',payload->>'itemType',payload->>'stableKey',payload->'value',payload->>'humanValue',case payload->>'confidence' when 'high' then 0.95 when 'medium' then 0.7 else 0.4 end,coalesce((payload->>'salience')::integer,50),coalesce((payload->>'effectiveAt')::timestamptz,now()),nullif(payload->>'expiresAt','')::timestamptz,coalesce(payload->>'sourceType','agent_run'),mutation.agent_run_id,coalesce((payload->>'userStated')::boolean,false),'agent','agent') returning * into state_item;
      next_revision := 1;
    else
      if state_item.user_stated and not coalesce((payload->>'userStated')::boolean,false) then raise exception 'agent inference cannot replace user-stated state'; end if;
      select coalesce(max(revision),0)+1 into next_revision from public.state_item_revisions where state_item_id = state_item.id;
      update public.state_items set current_value=payload->'value',human_value=payload->>'humanValue',confidence=case payload->>'confidence' when 'high' then 0.95 when 'medium' then 0.7 else 0.4 end,salience=coalesce((payload->>'salience')::integer,salience),effective_at=coalesce((payload->>'effectiveAt')::timestamptz,now()),expires_at=nullif(payload->>'expiresAt','')::timestamptz,source_type=coalesce(payload->>'sourceType','agent_run'),source_id=mutation.agent_run_id,user_stated=coalesce((payload->>'userStated')::boolean,false),updated_by='agent' where id=state_item.id returning * into state_item;
    end if;
    insert into public.state_item_revisions(user_id,state_item_id,status,revision,value,human_value,confidence,salience,effective_at,expires_at,source_type,source_id,user_stated,rationale,created_by,updated_by)
    values(mutation.user_id,state_item.id,'applied',next_revision,state_item.current_value,state_item.human_value,state_item.confidence,state_item.salience,state_item.effective_at,state_item.expires_at,state_item.source_type,state_item.source_id,state_item.user_stated,mutation.rationale,'agent','agent');
    perform public.bump_state_version(mutation.user_id, 'Living state revised: ' || (payload->>'stableKey'));
    object_id := state_item.id;

  elsif mutation.mutation_type = 'task.create' then
    insert into public.tasks(id,user_id,title,status,task_type,priority,effort,urgency,energy,source,due_at,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','todo'),(payload->>'taskType')::public.task_type,nullif(payload->>'priority','')::integer,coalesce((payload->>'effort')::public.task_effort,'small'),coalesce((payload->>'urgency')::public.task_urgency,'normal'),coalesce((payload->>'energy')::public.energy_level,'medium'),coalesce(payload->>'source','agent'),nullif(payload->>'dueAt','')::timestamptz,coalesce(payload->'metadata','{}'::jsonb),'agent','agent');
    perform public.bump_state_version(mutation.user_id, 'Task created');

  elsif mutation.mutation_type = 'task.update' then
    select version into current_version from public.tasks where id=(payload->>'id')::uuid and user_id=mutation.user_id for update;
    if mutation.expected_object_version is not null and current_version <> mutation.expected_object_version then raise exception 'version conflict'; end if;
    update public.tasks set title=coalesce(payload->>'title',title),status=coalesce(payload->>'status',status),priority=coalesce((payload->>'priority')::integer,priority),due_at=coalesce((payload->>'dueAt')::timestamptz,due_at),updated_by='agent' where id=(payload->>'id')::uuid and user_id=mutation.user_id returning id into object_id;
    perform public.bump_state_version(mutation.user_id, 'Task updated');

  elsif mutation.mutation_type = 'goal.upsert' then
    insert into public.goals(id,user_id,title,status,horizon,track,rationale,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','active'),coalesce((payload->>'horizon')::public.goal_horizon,'1_year'),coalesce((payload->>'track')::public.goal_track,'general'),coalesce(payload->>'rationale',''),coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set title=excluded.title,status=excluded.status,rationale=excluded.rationale,updated_by='agent';
    perform public.bump_state_version(mutation.user_id, 'Goal updated');

  elsif mutation.mutation_type = 'daily_plan.upsert' then
    insert into public.daily_plans(id,user_id,title,status,plan_date,timezone,state_version,rationale,created_by,updated_by)
    values(object_id,mutation.user_id,coalesce(payload->>'title','Morning brief'),'active',(payload->>'planDate')::date,coalesce(payload->>'timezone','America/Denver'),(payload->>'stateVersion')::bigint,payload->>'rationale','agent','agent')
    on conflict(user_id,plan_date,status) do update set state_version=excluded.state_version,rationale=excluded.rationale,generated_at=now(),updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'weekly_plan.upsert' then
    insert into public.weekly_plans(id,user_id,title,status,week_start,timezone,state_version,rationale,created_by,updated_by)
    values(object_id,mutation.user_id,coalesce(payload->>'title','Weekly plan'),'active',(payload->>'weekStart')::date,coalesce(payload->>'timezone','America/Denver'),(payload->>'stateVersion')::bigint,payload->>'rationale','agent','agent')
    on conflict(user_id,week_start,status) do update set state_version=excluded.state_version,rationale=excluded.rationale,generated_at=now(),updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'opportunity.upsert' then
    insert into public.opportunities(id,user_id,title,status,opportunity_type,url,canonical_url,location,deadline_at,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','active'),payload->>'opportunityType',payload->>'canonicalUrl',payload->>'canonicalUrl',payload->>'location',nullif(payload->>'deadlineAt','')::timestamptz,coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set title=excluded.title,status=excluded.status,deadline_at=excluded.deadline_at,updated_by='agent';

  elsif mutation.mutation_type = 'opportunity_recommendation.upsert' then
    insert into public.opportunity_recommendations(id,user_id,opportunity_id,title,status,recommendation,score,confidence,rationale,role_brief,score_breakdown,project_bridge_assessment,evidence_ids,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'opportunityId')::uuid,coalesce(payload->>'title','Opportunity recommendation'),'active',(payload->>'recommendation')::public.opportunity_recommendation_action,(payload->>'score')::numeric,coalesce(payload->>'confidence','high'),payload->>'rationale',coalesce(payload->'roleBrief','{}'::jsonb),coalesce(payload->'scoreBreakdown','{}'::jsonb),payload->'projectBridgeAssessment',mutation.evidence_ids,'agent','agent')
    on conflict(id) do update set recommendation=excluded.recommendation,score=excluded.score,rationale=excluded.rationale,role_brief=excluded.role_brief,updated_by='agent';

  elsif mutation.mutation_type = 'application.upsert' then
    insert into public.applications(id,user_id,title,status,opportunity_id,deadline_at,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',(payload->>'status')::public.application_status,nullif(payload->>'opportunityId','')::uuid,nullif(payload->>'deadlineAt','')::timestamptz,coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set status=excluded.status,deadline_at=excluded.deadline_at,metadata=excluded.metadata,updated_by='agent';
    perform public.bump_state_version(mutation.user_id, 'Application updated');

  elsif mutation.mutation_type = 'project_spec.create' then
    insert into public.project_specs(id,user_id,opportunity_id,application_id,title,status,specification,estimated_hours,state_version,rationale,evidence_ids,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'opportunityId')::uuid,nullif(payload->>'applicationId','')::uuid,payload->>'title','ready',payload->'specification',nullif(payload->>'estimatedHours','')::numeric,nullif(payload->>'stateVersion','')::bigint,coalesce(payload->>'rationale',''),mutation.evidence_ids,'agent','agent');

  elsif mutation.mutation_type = 'artifact.create' then
    insert into public.artifacts(id,user_id,title,status,artifact_type,bucket,storage_path,local_path,mime_type,size_bytes,sha256,origin,retention_policy,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','active',payload->>'artifactType',payload->>'bucket',payload->>'storagePath',payload->>'localPath',payload->>'mimeType',nullif(payload->>'sizeBytes','')::bigint,payload->>'sha256',coalesce(payload->>'origin','agent'),coalesce(payload->>'retentionPolicy','canonical'),coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(user_id,bucket,storage_path) do update set sha256=excluded.sha256,size_bytes=excluded.size_bytes,updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'resume_variant.create' then
    insert into public.resume_variants(id,user_id,title,status,resume_template_id,target_role,target_company,application_id,latex_path,pdf_path,diff_path,rationale,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','ready_for_review',(payload->>'templateId')::uuid,payload->>'targetRole',payload->>'targetCompany',nullif(payload->>'applicationId','')::uuid,coalesce(payload->>'sourcePath',payload->>'latexPath'),payload->>'pdfPath',payload->>'diffPath',coalesce(payload->>'rationale',''),coalesce(payload->'metadata','{}'::jsonb),'agent','agent');

  elsif mutation.mutation_type = 'contact.upsert' then
    insert into public.contacts(id,user_id,title,status,full_name,email,linkedin_url,company,role,notes,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','active',payload->>'fullName',payload->>'email',payload->>'linkedinUrl',payload->>'company',payload->>'role',payload->>'notes',coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set full_name=excluded.full_name,company=excluded.company,role=excluded.role,updated_by='agent';

  elsif mutation.mutation_type = 'relationship.upsert' then
    insert into public.relationships(id,user_id,contact_id,title,status,relationship_type,strength,context,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'contactId')::uuid,payload->>'title',payload->>'status',coalesce(payload->>'relationshipType','connection'),coalesce((payload->>'strength')::integer,25),coalesce(payload->>'context',''),'agent','agent')
    on conflict(user_id,contact_id) do update set status=excluded.status,strength=excluded.strength,context=excluded.context,updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'outreach_draft.create' then
    insert into public.outreach_drafts(id,user_id,contact_id,application_id,title,status,draft_type,channel,subject,body,created_by,updated_by)
    values(object_id,mutation.user_id,nullif(payload->>'contactId','')::uuid,nullif(payload->>'applicationId','')::uuid,payload->>'title','ready',payload->>'draftType',payload->>'channel',payload->>'subject',payload->>'body','agent','agent');

  elsif mutation.mutation_type = 'event.upsert' then
    insert into public.events(id,user_id,title,status,starts_at,ends_at,url,location,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','active'),nullif(payload->>'startsAt','')::timestamptz,nullif(payload->>'endsAt','')::timestamptz,payload->>'url',payload->>'location',coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set title=excluded.title,starts_at=excluded.starts_at,url=excluded.url,updated_by='agent';

  else
    update public.proposed_mutations set status='rejected',result=jsonb_build_object('error','No database applier registered for ' || mutation.mutation_type),updated_by='system' where id=mutation.id;
    raise exception 'no database applier for %', mutation.mutation_type;
  end if;

  result := jsonb_build_object('objectId', object_id, 'mutationType', mutation.mutation_type, 'appliedAt', now());
  update public.proposed_mutations set status='applied',target_object_id=object_id,applied_at=now(),result=result,updated_by='system' where id=mutation.id;
  insert into public.audit_log_entries(user_id,agent_run_id,action_type,target_object_type,target_object_id,summary,payload,evidence_ids,created_by,updated_by)
  values(mutation.user_id,mutation.agent_run_id,'mutation.applied',mutation.target_object_type,object_id,mutation.mutation_type || ' applied',jsonb_build_object('mutationId',mutation.id,'rationale',mutation.rationale),mutation.evidence_ids,'agent','agent');
  return result;
end;
$$;
revoke all on function public.apply_career_mutation(uuid) from public;
