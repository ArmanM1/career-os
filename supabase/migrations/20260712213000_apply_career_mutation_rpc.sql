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
  v_result jsonb;
  recipient_email text;
  variant_item jsonb;
  existing_id uuid;
  previous_application_status text;
begin
  select * into mutation from public.proposed_mutations where id = p_mutation_id for update;
  if mutation.id is null then raise exception 'mutation not found'; end if;
  if mutation.status = 'applied' then return coalesce(mutation.result, '{}'::jsonb); end if;
  if mutation.status <> 'pending' then raise exception 'mutation is not pending'; end if;
  if mutation.approval_policy <> 'auto_apply' then raise exception 'mutation requires approval'; end if;
  payload := mutation.payload;
  object_id := coalesce(mutation.target_object_id, gen_random_uuid());

  if mutation.mutation_type = 'agent_job.enqueue' then
    insert into public.agent_jobs(id,user_id,agent_id,title,status,input_type,input,prompt,priority,scheduled_for,dedupe_key,required_capabilities,related_object_ids,created_state_version,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'agentId',payload->>'title','queued',payload->>'inputType',coalesce(payload->'input','{}'::jsonb),payload->>'prompt',coalesce((payload->>'priority')::integer,50),coalesce(nullif(payload->>'scheduledFor','')::timestamptz,now()),mutation.idempotency_key,coalesce(array(select jsonb_array_elements_text(coalesce(payload->'requiredCapabilities','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(payload->'relatedObjectIds','[]'::jsonb)))::uuid[],'{}'),coalesce((select state_version from public.profiles where user_id=mutation.user_id),0),'agent','agent')
    on conflict(user_id,dedupe_key) where dedupe_key is not null and status in ('queued','running','needs_user_input') do nothing;

  elsif mutation.mutation_type = 'profile.upsert' then
    insert into public.profiles(id,user_id,title,status,full_name,headline,timezone,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,coalesce(payload->>'title','Profile'),coalesce(payload->>'status','active'),payload->>'fullName',payload->>'headline',coalesce(payload->>'timezone','America/Denver'),coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(user_id) do update set title=excluded.title,full_name=coalesce(excluded.full_name,public.profiles.full_name),headline=coalesce(excluded.headline,public.profiles.headline),timezone=coalesce(excluded.timezone,public.profiles.timezone),metadata=public.profiles.metadata || excluded.metadata,updated_by='agent' returning id into object_id;
    perform public.bump_state_version(mutation.user_id,'Profile updated');

  elsif mutation.mutation_type = 'academic_context.upsert' then
    select id into existing_id from public.academic_contexts where user_id=mutation.user_id and status='active' and archived_at is null order by updated_at desc limit 1 for update;
    if existing_id is null then
      insert into public.academic_contexts(id,user_id,title,status,institution,degree_program,current_year,current_term,expected_graduation_date,recruiting_season,timezone,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,coalesce(payload->>'title','Academic context'),'active',payload->>'institution',payload->>'degreeProgram',payload->>'currentYear',payload->>'currentTerm',nullif(payload->>'expectedGraduationDate','')::date,payload->>'recruitingSeason',coalesce(payload->>'timezone','America/Denver'),coalesce(payload->'metadata','{}'::jsonb),'agent','agent');
    else object_id:=existing_id; update public.academic_contexts set title=coalesce(payload->>'title',title),institution=coalesce(payload->>'institution',institution),degree_program=coalesce(payload->>'degreeProgram',degree_program),current_year=coalesce(payload->>'currentYear',current_year),current_term=coalesce(payload->>'currentTerm',current_term),expected_graduation_date=coalesce(nullif(payload->>'expectedGraduationDate','')::date,expected_graduation_date),recruiting_season=coalesce(payload->>'recruitingSeason',recruiting_season),metadata=metadata || coalesce(payload->'metadata','{}'::jsonb),updated_by='agent' where id=object_id; end if;
    perform public.bump_state_version(mutation.user_id,'Academic context updated');

  elsif mutation.mutation_type = 'career_season.upsert' then
    select id into existing_id from public.career_seasons where user_id=mutation.user_id and status='active' and archived_at is null order by updated_at desc limit 1 for update;
    if existing_id is null then
      insert into public.career_seasons(id,user_id,title,status,season_type,summary,starts_on,ends_on,intensity,objectives,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','active',payload->>'seasonType',coalesce(payload->>'summary',''),nullif(payload->>'startsOn','')::date,nullif(payload->>'endsOn','')::date,coalesce((payload->>'intensity')::integer,50),coalesce(array(select jsonb_array_elements_text(coalesce(payload->'objectives','[]'::jsonb))),'{}'),coalesce(payload->'metadata','{}'::jsonb),'agent','agent');
    else object_id:=existing_id; update public.career_seasons set title=coalesce(payload->>'title',title),season_type=payload->>'seasonType',summary=coalesce(payload->>'summary',summary),starts_on=coalesce(nullif(payload->>'startsOn','')::date,starts_on),ends_on=coalesce(nullif(payload->>'endsOn','')::date,ends_on),updated_by='agent' where id=object_id; end if;
    perform public.bump_state_version(mutation.user_id,'Career season updated');

  elsif mutation.mutation_type = 'state_item.revise' then
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

  elsif mutation.mutation_type = 'state_item.undo' then
    select state_item_id into existing_id from public.state_item_revisions where id=(payload->>'revisionId')::uuid and user_id=mutation.user_id;
    if existing_id is null then raise exception 'state revision not found'; end if;
    select coalesce(max(revision),0)+1 into next_revision from public.state_item_revisions where state_item_id=existing_id;
    insert into public.state_item_revisions(user_id,state_item_id,status,revision,value,human_value,confidence,salience,effective_at,expires_at,source_type,user_stated,rationale,undo_of_revision_id,created_by,updated_by)
    select mutation.user_id,existing_id,'applied',next_revision,r.value,r.human_value,r.confidence,r.salience,now(),r.expires_at,'agent_undo',false,'Restored an earlier state revision.',r.id,'agent','agent' from public.state_item_revisions r where r.id=(payload->>'revisionId')::uuid;
    update public.state_items i set current_value=r.value,human_value=r.human_value,confidence=r.confidence,salience=r.salience,effective_at=now(),expires_at=r.expires_at,status='active',updated_by='agent' from public.state_item_revisions r where i.id=existing_id and r.id=(payload->>'revisionId')::uuid;
    object_id := existing_id;
    perform public.bump_state_version(mutation.user_id,'Living state undo');

  elsif mutation.mutation_type = 'open_question.upsert' then
    select id into existing_id from public.open_questions where user_id=mutation.user_id and question=payload->>'question' and status='open' and archived_at is null limit 1 for update;
    if existing_id is null then
      insert into public.open_questions(id,user_id,title,status,question,reason,affected_fields,created_by,updated_by)
      values(object_id,mutation.user_id,coalesce(payload->>'title',payload->>'question'),'open',payload->>'question',payload->>'reason',coalesce(array(select jsonb_array_elements_text(payload->'affectedFields')),'{}'),'agent','agent');
    else object_id:=existing_id; update public.open_questions set reason=payload->>'reason',affected_fields=coalesce(array(select jsonb_array_elements_text(payload->'affectedFields')),'{}'),updated_by='agent' where id=object_id; end if;

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

  elsif mutation.mutation_type = 'check_in.create' then
    insert into public.check_ins(id,user_id,title,status,check_in_type,scheduled_for,state_version_before,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','open',payload->>'checkInType',coalesce(nullif(payload->>'scheduledFor','')::timestamptz,now()),coalesce((select state_version from public.profiles where user_id=mutation.user_id),0),'agent','agent');
    for variant_item in select * from jsonb_array_elements(coalesce(payload->'questions','[]'::jsonb)) loop
      insert into public.check_in_questions(user_id,check_in_id,status,question,question_type,options,reason,affected_state_fields,position,required,created_by,updated_by)
      values(mutation.user_id,object_id,'active',variant_item->>'question',coalesce(variant_item->>'questionType','text'),coalesce(variant_item->'options','[]'::jsonb),coalesce(variant_item->>'reason',''),coalesce(array(select jsonb_array_elements_text(coalesce(variant_item->'affectedStateFields','[]'::jsonb))),'{}'),coalesce((variant_item->>'position')::integer,0),coalesce((variant_item->>'required')::boolean,false),'agent','agent');
    end loop;

  elsif mutation.mutation_type = 'source_candidate.create' then
    select id into existing_id from public.source_candidates where user_id=mutation.user_id and url=payload->>'url' and archived_at is null limit 1 for update;
    if existing_id is null then insert into public.source_candidates(id,user_id,title,status,url,source_type,recommendation,rationale,requires_auth,browser_use_enabled,fetch_strategy_guess,target_season,target_roles,scores,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','proposed',payload->>'url',payload->>'sourceType',coalesce(payload->>'recommendation','propose'),coalesce(payload->>'rationale',''),coalesce((payload->>'requiresAuth')::boolean,false),coalesce((payload->>'browserUseEnabled')::boolean,false),payload->>'fetchStrategy',payload->>'targetSeason',coalesce(array(select jsonb_array_elements_text(coalesce(payload->'targetRoles','[]'::jsonb))),'{}'),coalesce(payload->'scores','{}'::jsonb),coalesce(payload->'metadata','{}'::jsonb),'agent','agent'); else object_id:=existing_id; update public.source_candidates set rationale=coalesce(payload->>'rationale',rationale),recommendation=coalesce(payload->>'recommendation',recommendation),updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'source_monitor.propose' then
    select id into existing_id from public.source_monitors where user_id=mutation.user_id and url=payload->>'url' and archived_at is null limit 1 for update;
    if existing_id is null then insert into public.source_monitors(id,user_id,title,status,source_type,url,fetch_strategy,schedule,requires_auth,browser_use_enabled,source_rationale,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','proposed',payload->>'sourceType',payload->>'url',coalesce(payload->>'fetchStrategy','http_fetch'),coalesce(payload->>'schedule','every_6_hours'),coalesce((payload->>'requiresAuth')::boolean,false),coalesce((payload->>'browserUseEnabled')::boolean,false),coalesce(payload->>'rationale',''),coalesce(payload->'metadata','{}'::jsonb),'agent','agent'); else object_id:=existing_id; update public.source_monitors set source_rationale=coalesce(payload->>'rationale',source_rationale),updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'source_monitor.update' then
    object_id := (payload->>'id')::uuid;
    update public.source_monitors set status=coalesce(payload->>'status',status),schedule=coalesce(payload->>'schedule',schedule),fetch_strategy=coalesce(payload->>'fetchStrategy',fetch_strategy),source_rationale=coalesce(payload->>'rationale',source_rationale),metadata=metadata || coalesce(payload->'metadata','{}'::jsonb),updated_by='agent' where id=object_id and user_id=mutation.user_id;
    if not found then raise exception 'source monitor not found'; end if;

  elsif mutation.mutation_type = 'source_adapter.upsert' then
    select id into existing_id from public.source_adapters where user_id=mutation.user_id and checksum=payload->>'checksum' and archived_at is null limit 1;
    if existing_id is null then insert into public.source_adapters(id,user_id,title,status,adapter_type,definition,checksum,domain_allowlist,test_result,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','proposed',payload->>'adapterType',payload->'definition',payload->>'checksum',coalesce(array(select jsonb_array_elements_text(coalesce(payload->'domainAllowlist','[]'::jsonb))),'{}'),coalesce(payload->'testResult','{}'::jsonb),'agent','agent'); else object_id:=existing_id; end if;

  elsif mutation.mutation_type = 'signal.create' then
    select id into existing_id from public.signals where user_id=mutation.user_id and ((payload->>'canonicalUrl' is not null and canonical_url=payload->>'canonicalUrl') or (payload->>'externalRef' is not null and external_ref=payload->>'externalRef')) and archived_at is null limit 1;
    if existing_id is null then insert into public.signals(id,user_id,title,status,signal_type,source_type,source_url,canonical_url,external_ref,company_name,role_title,location,opportunity_type,posted_at,deadline_at,raw_payload,normalized_payload,parser_name,parser_confidence,rationale,evidence_ids,metadata,created_by,updated_by)
      values(object_id,mutation.user_id,payload->>'title','new',payload->>'signalType',payload->>'sourceType',payload->>'sourceUrl',payload->>'canonicalUrl',payload->>'externalRef',payload->>'companyName',payload->>'roleTitle',payload->>'location',payload->>'opportunityType',nullif(payload->>'postedAt','')::timestamptz,nullif(payload->>'deadlineAt','')::timestamptz,coalesce(payload->'payload','{}'::jsonb),coalesce(payload->'payload','{}'::jsonb),coalesce(payload->>'parserName','agent'),coalesce(payload->>'confidence','medium'),coalesce(payload->>'rationale',''),mutation.evidence_ids,coalesce(payload->'metadata','{}'::jsonb),'agent','agent'); else object_id:=existing_id; end if;

  elsif mutation.mutation_type = 'opportunity.upsert' then
    insert into public.opportunities(id,user_id,title,status,opportunity_type,url,canonical_url,location,deadline_at,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','active'),payload->>'opportunityType',payload->>'canonicalUrl',payload->>'canonicalUrl',payload->>'location',nullif(payload->>'deadlineAt','')::timestamptz,coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set title=excluded.title,status=excluded.status,deadline_at=excluded.deadline_at,updated_by='agent';

  elsif mutation.mutation_type = 'opportunity_recommendation.upsert' then
    insert into public.opportunity_recommendations(id,user_id,opportunity_id,title,status,recommendation,score,confidence,rationale,role_brief,score_breakdown,project_bridge_assessment,evidence_ids,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'opportunityId')::uuid,coalesce(payload->>'title','Opportunity recommendation'),'active',(payload->>'recommendation')::public.opportunity_recommendation_action,(payload->>'score')::numeric,coalesce(payload->>'confidence','high'),payload->>'rationale',coalesce(payload->'roleBrief','{}'::jsonb),coalesce(payload->'scoreBreakdown','{}'::jsonb),payload->'projectBridgeAssessment',mutation.evidence_ids,'agent','agent')
    on conflict(id) do update set recommendation=excluded.recommendation,score=excluded.score,rationale=excluded.rationale,role_brief=excluded.role_brief,updated_by='agent';
    if coalesce((payload->>'score')::numeric,0) >= 78 and not exists (
      select 1 from public.notification_preferences where user_id=mutation.user_id and category='high_value_opportunity' and channel='email' and enabled=false
    ) then
      select email into recipient_email from auth.users where id=mutation.user_id;
      if recipient_email is not null then
        insert into public.notification_outbox(user_id,channel,category,severity,idempotency_key,recipient,subject,payload,created_by,updated_by)
        values(mutation.user_id,'email','high_value_opportunity','important','opportunity-recommendation:' || object_id::text,recipient_email,'Career OS found a high-value opportunity',jsonb_build_object('body',payload->>'rationale','preview',coalesce(payload->>'title','High-value opportunity'),'actionUrl','/opportunities/' || (payload->>'opportunityId'),'actionLabel','Review opportunity'),'system','system')
        on conflict(user_id,idempotency_key) do nothing;
      end if;
    end if;

  elsif mutation.mutation_type = 'application.upsert' then
    insert into public.applications(id,user_id,title,status,opportunity_id,deadline_at,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',(payload->>'status')::public.application_status,nullif(payload->>'opportunityId','')::uuid,nullif(payload->>'deadlineAt','')::timestamptz,coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set status=excluded.status,deadline_at=excluded.deadline_at,metadata=excluded.metadata,updated_by='agent';
    perform public.bump_state_version(mutation.user_id, 'Application updated');

  elsif mutation.mutation_type = 'application_requirement.upsert' then
    select id into existing_id from public.application_requirements where user_id=mutation.user_id and application_id=(payload->>'applicationId')::uuid and requirement_type=payload->>'requirementType' and title=payload->>'title' limit 1 for update;
    if existing_id is null then insert into public.application_requirements(id,user_id,application_id,title,status,requirement_type,required,value,artifact_id,created_by,updated_by)
      values(object_id,mutation.user_id,(payload->>'applicationId')::uuid,payload->>'title',coalesce(payload->>'status','pending'),payload->>'requirementType',coalesce((payload->>'required')::boolean,true),payload->>'value',nullif(payload->>'artifactId','')::uuid,'agent','agent'); else object_id:=existing_id; update public.application_requirements set status=coalesce(payload->>'status',status),value=coalesce(payload->>'value',value),artifact_id=coalesce(nullif(payload->>'artifactId','')::uuid,artifact_id),updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'application_packet.upsert' then
    select id into existing_id from public.application_packets where user_id=mutation.user_id and application_id=(payload->>'applicationId')::uuid and archived_at is null order by updated_at desc limit 1 for update;
    if existing_id is null then insert into public.application_packets(id,user_id,application_id,title,status,resume_variant_id,project_spec_id,contents,readiness,state_version,created_by,updated_by)
      values(object_id,mutation.user_id,(payload->>'applicationId')::uuid,payload->>'title',coalesce(payload->>'status','draft'),nullif(payload->>'resumeVariantId','')::uuid,nullif(payload->>'projectSpecId','')::uuid,coalesce(payload->'contents','{}'::jsonb),coalesce(payload->'readiness','{}'::jsonb),coalesce((select state_version from public.profiles where user_id=mutation.user_id),0),'agent','agent'); else object_id:=existing_id; update public.application_packets set title=coalesce(payload->>'title',title),status=coalesce(payload->>'status',status),resume_variant_id=coalesce(nullif(payload->>'resumeVariantId','')::uuid,resume_variant_id),project_spec_id=coalesce(nullif(payload->>'projectSpecId','')::uuid,project_spec_id),contents=coalesce(payload->'contents',contents),readiness=coalesce(payload->'readiness',readiness),updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'application_status.record' then
    select status::text into previous_application_status from public.applications where id=(mutation.payload->>'applicationId')::uuid and user_id=mutation.user_id for update;
    insert into public.application_status_history(id,user_id,application_id,status,previous_status,new_status,confidence,evidence_ids,rationale,source_type,source_id,effective_at,created_by,updated_by)
    values(object_id,mutation.user_id,(mutation.payload->>'applicationId')::uuid,'recorded',previous_application_status,mutation.payload->>'newStatus',mutation.payload->>'confidence',coalesce(array(select jsonb_array_elements_text(coalesce(mutation.payload->'evidenceIds','[]'::jsonb)))::uuid[],'{}'),coalesce(mutation.payload->>'rationale',mutation.rationale),coalesce(mutation.payload->>'sourceType','agent'),mutation.agent_run_id,now(),'agent','agent');
    update public.applications set status=(mutation.payload->>'newStatus')::public.application_status,updated_by='agent' where id=(mutation.payload->>'applicationId')::uuid and user_id=mutation.user_id;
    perform public.bump_state_version(mutation.user_id,'Application status changed');

  elsif mutation.mutation_type = 'project_spec.create' then
    insert into public.project_specs(id,user_id,opportunity_id,application_id,title,status,specification,estimated_hours,state_version,rationale,evidence_ids,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'opportunityId')::uuid,nullif(payload->>'applicationId','')::uuid,payload->>'title','ready',payload->'specification',nullif(payload->>'estimatedHours','')::numeric,nullif(payload->>'stateVersion','')::bigint,coalesce(payload->>'rationale',''),mutation.evidence_ids,'agent','agent');

  elsif mutation.mutation_type = 'artifact.create' then
    insert into public.artifacts(id,user_id,title,status,artifact_type,bucket,storage_path,local_path,mime_type,size_bytes,sha256,origin,retention_policy,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','active',payload->>'artifactType',payload->>'bucket',payload->>'storagePath',payload->>'localPath',payload->>'mimeType',nullif(payload->>'sizeBytes','')::bigint,payload->>'sha256',coalesce(payload->>'origin','agent'),coalesce(payload->>'retentionPolicy','canonical'),coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(user_id,bucket,storage_path) do update set sha256=excluded.sha256,size_bytes=excluded.size_bytes,updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'resume_variant.create' then
    insert into public.resume_variants(id,user_id,title,status,resume_template_id,base_version_id,target_role,target_company,application_id,latex_path,pdf_path,diff_path,rationale,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','ready_for_review',nullif(payload->>'templateId','')::uuid,nullif(payload->>'baseVersionId','')::uuid,payload->>'targetRole',payload->>'targetCompany',nullif(payload->>'applicationId','')::uuid,payload->>'latexPath',payload->>'pdfPath',payload->>'diffPath',coalesce(payload->>'rationale',''),coalesce(payload->'metadata','{}'::jsonb),'agent','agent');
    for variant_item in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
      insert into public.resume_variant_items(user_id,resume_variant_id,item_type,source_object_id,source_text,rendered_text,rationale,position,created_by,updated_by)
      values(mutation.user_id,object_id,variant_item->>'itemType',nullif(variant_item->>'sourceObjectId','')::uuid,variant_item->>'sourceText',variant_item->>'renderedText',coalesce(variant_item->>'rationale',''),coalesce((variant_item->>'position')::integer,0),'agent','agent');
    end loop;

  elsif mutation.mutation_type = 'contact.upsert' then
    insert into public.contacts(id,user_id,title,status,full_name,email,linkedin_url,company,role,notes,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','active',payload->>'fullName',payload->>'email',payload->>'linkedinUrl',payload->>'company',payload->>'role',payload->>'notes',coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set full_name=excluded.full_name,company=excluded.company,role=excluded.role,updated_by='agent';

  elsif mutation.mutation_type = 'relationship.upsert' then
    insert into public.relationships(id,user_id,contact_id,title,status,relationship_type,strength,context,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'contactId')::uuid,payload->>'title',payload->>'status',coalesce(payload->>'relationshipType','connection'),coalesce((payload->>'strength')::integer,25),coalesce(payload->>'context',''),'agent','agent')
    on conflict(user_id,contact_id) do update set status=excluded.status,strength=excluded.strength,context=excluded.context,updated_by='agent' returning id into object_id;

  elsif mutation.mutation_type = 'interaction.create' then
    insert into public.interactions(id,user_id,contact_id,relationship_id,title,status,interaction_type,direction,occurred_at,summary,follow_up_at,evidence_ids,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,(payload->>'contactId')::uuid,nullif(payload->>'relationshipId','')::uuid,payload->>'title','recorded',payload->>'interactionType',coalesce(payload->>'direction','mutual'),(payload->>'occurredAt')::timestamptz,coalesce(payload->>'summary',''),nullif(payload->>'followUpAt','')::timestamptz,mutation.evidence_ids,coalesce(payload->'metadata','{}'::jsonb),'agent','agent');

  elsif mutation.mutation_type = 'referral_path.upsert' then
    select id into existing_id from public.referral_paths where user_id=mutation.user_id and contact_id=(payload->>'contactId')::uuid and opportunity_id is not distinct from nullif(payload->>'opportunityId','')::uuid and application_id is not distinct from nullif(payload->>'applicationId','')::uuid and archived_at is null limit 1 for update;
    if existing_id is null then insert into public.referral_paths(id,user_id,contact_id,opportunity_id,application_id,title,status,connection_reason,appropriateness,next_action,evidence_ids,created_by,updated_by)
      values(object_id,mutation.user_id,(payload->>'contactId')::uuid,nullif(payload->>'opportunityId','')::uuid,nullif(payload->>'applicationId','')::uuid,payload->>'title',coalesce(payload->>'status','potential'),payload->>'connectionReason',coalesce((payload->>'appropriateness')::integer,50),payload->>'nextAction',mutation.evidence_ids,'agent','agent'); else object_id:=existing_id; update public.referral_paths set status=coalesce(payload->>'status',status),connection_reason=payload->>'connectionReason',appropriateness=coalesce((payload->>'appropriateness')::integer,appropriateness),next_action=coalesce(payload->>'nextAction',next_action),updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'outreach_draft.create' then
    insert into public.outreach_drafts(id,user_id,contact_id,application_id,title,status,draft_type,channel,subject,body,created_by,updated_by)
    values(object_id,mutation.user_id,nullif(payload->>'contactId','')::uuid,nullif(payload->>'applicationId','')::uuid,payload->>'title','ready',payload->>'draftType',payload->>'channel',payload->>'subject',payload->>'body','agent','agent');

  elsif mutation.mutation_type = 'event.upsert' then
    insert into public.events(id,user_id,title,status,starts_at,ends_at,url,location,metadata,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title',coalesce(payload->>'status','active'),nullif(payload->>'startsAt','')::timestamptz,nullif(payload->>'endsAt','')::timestamptz,payload->>'url',payload->>'location',coalesce(payload->'metadata','{}'::jsonb),'agent','agent')
    on conflict(id) do update set title=excluded.title,starts_at=excluded.starts_at,url=excluded.url,updated_by='agent';

  elsif mutation.mutation_type = 'event_recommendation.upsert' then
    select id into existing_id from public.event_recommendations where user_id=mutation.user_id and event_id=(payload->>'eventId')::uuid limit 1 for update;
    if existing_id is null then insert into public.event_recommendations(id,user_id,event_id,status,score,rationale,related_goal_ids,related_opportunity_ids,related_contact_ids,evidence_ids,created_by,updated_by)
      values(object_id,mutation.user_id,(payload->>'eventId')::uuid,'active',(payload->>'score')::numeric,payload->>'rationale',coalesce(array(select jsonb_array_elements_text(coalesce(payload->'relatedGoalIds','[]'::jsonb)))::uuid[],'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(payload->'relatedOpportunityIds','[]'::jsonb)))::uuid[],'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(payload->'relatedContactIds','[]'::jsonb)))::uuid[],'{}'),mutation.evidence_ids,'agent','agent'); else object_id:=existing_id; update public.event_recommendations set score=(payload->>'score')::numeric,rationale=payload->>'rationale',updated_by='agent' where id=object_id; end if;

  elsif mutation.mutation_type = 'evidence.create' then
    insert into public.evidence(id,user_id,title,status,source_type,source_url,excerpt,payload,retention_policy,expires_at,created_by,updated_by)
    values(object_id,mutation.user_id,payload->>'title','active',payload->>'sourceType',payload->>'sourceUrl',payload->>'excerpt',coalesce(payload->'payload','{}'::jsonb),coalesce(payload->>'retentionPolicy','facts_persist_raw_30_days'),nullif(payload->>'expiresAt','')::timestamptz,'agent','agent');

  else
    update public.proposed_mutations set status='rejected',result=jsonb_build_object('error','No database applier registered for ' || mutation.mutation_type),updated_by='system' where id=mutation.id;
    raise exception 'no database applier for %', mutation.mutation_type;
  end if;

  v_result := jsonb_build_object('objectId', object_id, 'mutationType', mutation.mutation_type, 'appliedAt', now());
  update public.proposed_mutations set status='applied',target_object_id=object_id,applied_at=now(),result=v_result,updated_by='system' where id=mutation.id;
  insert into public.audit_log_entries(user_id,agent_run_id,action_type,target_object_type,target_object_id,summary,payload,evidence_ids,created_by,updated_by)
  values(mutation.user_id,mutation.agent_run_id,'mutation.applied',mutation.target_object_type,object_id,mutation.mutation_type || ' applied',jsonb_build_object('mutationId',mutation.id,'rationale',mutation.rationale),mutation.evidence_ids,'agent','agent');
  return v_result;
end;
$$;
revoke all on function public.apply_career_mutation(uuid) from public;
