create or replace function public.complete_agent_job(
  p_device_id uuid,
  p_job_id uuid,
  p_output jsonb,
  p_runtime jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.agent_jobs;
  run_id uuid := gen_random_uuid();
  evidence_item jsonb;
  mutation_item jsonb;
  approval_item jsonb;
  message_part jsonb;
  thread_id uuid;
  message_id uuid;
  part_position integer := 0;
  runtime_id text;
begin
  select * into job from public.agent_jobs
  where id = p_job_id and claimed_by_device_id = p_device_id and status = 'running'
  for update;
  if job.id is null then raise exception 'running claimed job not found'; end if;

  insert into public.agent_runs(id, user_id, agent_job_id, agent_id, title, status, input, output, created_by, updated_by)
  values (run_id, job.user_id, job.id, job.agent_id, job.title, 'completed', job.input, p_output, 'system', 'system');

  runtime_id := p_runtime->>'runtimeThreadId';
  if runtime_id is not null then
    insert into public.runtime_threads(user_id, agent_run_id, provider, runtime_thread_id, thread_type, title, status, summary, metadata, created_by, updated_by)
    values (job.user_id, run_id, coalesce((p_runtime->>'provider')::public.runtime_provider, 'codex-app-server'), runtime_id, job.agent_id, coalesce(p_runtime->>'title', job.title), 'active', p_output->>'summary', p_runtime, 'system', 'system');
  end if;

  for evidence_item in select * from jsonb_array_elements(coalesce(p_output->'evidence', '[]'::jsonb)) loop
    insert into public.evidence(id, user_id, title, status, source_type, source_url, excerpt, payload, created_by, updated_by)
    values (coalesce((evidence_item->>'id')::uuid, gen_random_uuid()), job.user_id, evidence_item->>'title', 'active', evidence_item->>'sourceType', evidence_item->>'sourceUrl', evidence_item->>'excerpt', coalesce(evidence_item->'payload', '{}'::jsonb), 'agent', 'agent')
    on conflict (id) do nothing;
  end loop;

  for mutation_item in select * from jsonb_array_elements(coalesce(p_output->'proposedMutations', '[]'::jsonb)) loop
    insert into public.proposed_mutations(id, user_id, agent_run_id, mutation_type, target_object_type, target_object_id, payload, rationale, evidence_ids, confidence, approval_policy, status, idempotency_key, expected_object_version, created_by, updated_by)
    values (
      (mutation_item->>'id')::uuid,
      job.user_id,
      run_id,
      mutation_item->>'mutationType',
      mutation_item->>'targetObjectType',
      nullif(mutation_item->>'targetObjectId', '')::uuid,
      coalesce(mutation_item->'payload', '{}'::jsonb),
      coalesce(mutation_item->>'rationale', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(mutation_item->'evidenceIds', '[]'::jsonb)))::uuid[], '{}'),
      coalesce(mutation_item->>'confidence', 'medium'),
      coalesce(mutation_item->>'approvalPolicy', 'approval_required'),
      case when mutation_item->>'approvalPolicy' = 'approval_required' then 'approval_required'::public.mutation_status else 'pending'::public.mutation_status end,
      mutation_item->>'idempotencyKey',
      nullif(mutation_item->>'expectedObjectVersion', '')::integer,
      'agent',
      'agent'
    ) on conflict (id) do nothing;
  end loop;

  for approval_item in select * from jsonb_array_elements(coalesce(p_output->'approvalRequests', '[]'::jsonb)) loop
    insert into public.approval_requests(user_id, agent_run_id, title, status, action_type, target_object_type, target_object_id, rationale, risk_level, payload, evidence_ids, created_by, updated_by)
    values (
      job.user_id, run_id, approval_item->>'title', 'pending', approval_item->>'actionType',
      approval_item->>'targetObjectType', nullif(approval_item->>'targetObjectId', '')::uuid,
      coalesce(approval_item->>'rationale', ''), coalesce((approval_item->>'riskLevel')::public.risk_level, 'medium'),
      coalesce(approval_item->'payload', '{}'::jsonb),
      coalesce(array(select jsonb_array_elements_text(coalesce(approval_item->'evidenceIds', '[]'::jsonb)))::uuid[], '{}'),
      'agent', 'agent'
    );
  end loop;

  thread_id := nullif(job.metadata->>'threadId', '')::uuid;
  if thread_id is not null and exists (select 1 from public.threads where id = thread_id and user_id = job.user_id) then
    message_id := gen_random_uuid();
    insert into public.messages(id, user_id, thread_id, status, role, content, state_version, created_by, updated_by)
    values (message_id, job.user_id, thread_id, 'complete', 'assistant', coalesce(p_output->>'summary', ''), nullif(p_runtime->>'stateVersion', '')::bigint, 'agent', 'agent');

    if jsonb_array_length(coalesce(p_output->'messageParts', '[]'::jsonb)) = 0 then
      insert into public.message_parts(user_id, message_id, status, part_type, position, payload, created_by, updated_by)
      values (job.user_id, message_id, 'complete', 'text', 0, jsonb_build_object('text', coalesce(p_output->>'summary', '')), 'agent', 'agent');
    else
      for message_part in select * from jsonb_array_elements(p_output->'messageParts') loop
        insert into public.message_parts(user_id, message_id, status, part_type, position, payload, created_by, updated_by)
        values (job.user_id, message_id, 'complete', coalesce(message_part->>'type', 'text'), part_position, coalesce(message_part->'payload', '{}'::jsonb), 'agent', 'agent');
        part_position := part_position + 1;
      end loop;
    end if;
    update public.threads set last_message_at = now(), updated_by = 'agent' where id = thread_id;
  end if;

  update public.agent_jobs
  set status = 'completed', completed_at = now(), lease_expires_at = null, heartbeat_at = now(), metadata = metadata || jsonb_build_object('runtime', p_runtime), updated_by = 'system'
  where id = job.id;

  insert into public.audit_log_entries(user_id, agent_run_id, action_type, target_object_type, target_object_id, summary, payload, created_by, updated_by)
  values (job.user_id, run_id, 'agent_job.completed', 'agent_job', job.id, coalesce(p_output->>'summary', 'Agent job completed'), jsonb_build_object('agentId', job.agent_id), 'system', 'system');

  return run_id;
end;
$$;

revoke all on function public.complete_agent_job(uuid, uuid, jsonb, jsonb) from public;
