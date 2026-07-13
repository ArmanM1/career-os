-- Onboarding is an execution workflow, not a completion flag. This ledger makes
-- every resume, source, connector, and user action independently observable and
-- prevents completion until the server-side readiness contract passes.

alter table public.onboarding_sessions
  add constraint onboarding_sessions_id_user_unique unique (id, user_id);

create table public.onboarding_work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  onboarding_session_id uuid not null,
  stable_key text not null check (length(btrim(stable_key)) > 0),
  work_type text not null check (work_type in (
    'worker', 'resume', 'source', 'connector', 'browser_account',
    'application_import', 'contact_import', 'strategy', 'final_review'
  )),
  title text not null,
  status text not null default 'pending' check (status in (
    'pending', 'queued', 'running', 'waiting_for_user', 'review_required',
    'ready', 'deferred', 'failed', 'unsupported', 'archived'
  )),
  phase text not null default 'pending',
  progress integer not null default 0 check (progress between 0 and 100),
  required boolean not null default true,
  explicitly_deferred boolean not null default false,
  related_object_type text,
  related_object_id uuid,
  blocking_reason text,
  next_user_action jsonb not null default '{}' check (jsonb_typeof(next_user_action) = 'object'),
  latest_job_id uuid references public.agent_jobs(id) on delete set null,
  latest_run_id uuid references public.agent_runs(id) on delete set null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  evidence_ids uuid[] not null default '{}',
  readiness_confirmed_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (onboarding_session_id, stable_key),
  constraint onboarding_work_items_session_user_fk
    foreign key (onboarding_session_id, user_id)
    references public.onboarding_sessions(id, user_id) on delete cascade
);

create index onboarding_work_items_user_status_idx
  on public.onboarding_work_items(user_id, status, work_type);
create index onboarding_work_items_session_idx
  on public.onboarding_work_items(onboarding_session_id, required, status);
create index onboarding_work_items_related_idx
  on public.onboarding_work_items(user_id, related_object_type, related_object_id)
  where related_object_id is not null;

create or replace function public.validate_onboarding_work_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  transition text;
begin
  if new.status = 'deferred' and not new.explicitly_deferred then
    raise exception 'deferred onboarding work must be explicitly deferred';
  end if;
  if new.explicitly_deferred and new.status <> 'deferred' then
    raise exception 'explicitly deferred onboarding work must use deferred status';
  end if;
  if new.status = 'waiting_for_user' and new.next_user_action = '{}'::jsonb then
    raise exception 'waiting_for_user onboarding work requires a next_user_action';
  end if;

  if tg_op = 'UPDATE' and new.status <> old.status then
    transition := old.status || '>' || new.status;
    if new.status <> 'archived' and transition <> all (array[
      'pending>queued', 'pending>running', 'pending>waiting_for_user',
      'pending>review_required', 'pending>ready', 'pending>deferred',
      'pending>failed', 'pending>unsupported',
      'queued>running', 'queued>waiting_for_user', 'queued>review_required',
      'queued>ready', 'queued>deferred', 'queued>failed', 'queued>unsupported',
      'running>queued', 'running>waiting_for_user', 'running>review_required',
      'running>ready', 'running>deferred', 'running>failed',
      'running>unsupported',
      'waiting_for_user>queued', 'waiting_for_user>running',
      'waiting_for_user>review_required', 'waiting_for_user>ready',
      'waiting_for_user>deferred', 'waiting_for_user>failed',
      'waiting_for_user>unsupported',
      'review_required>queued', 'review_required>running',
      'review_required>ready', 'review_required>deferred',
      'review_required>failed', 'review_required>unsupported',
      'failed>queued', 'failed>running', 'failed>waiting_for_user',
      'failed>deferred', 'failed>unsupported',
      'unsupported>queued', 'unsupported>waiting_for_user',
      'unsupported>deferred',
      'ready>queued', 'ready>running', 'ready>review_required',
      'deferred>pending', 'deferred>queued'
    ]) then
      raise exception 'invalid onboarding work transition: %', transition;
    end if;
  end if;

  if new.status in ('ready', 'deferred') then
    new.progress := 100;
    new.blocking_reason := null;
    new.next_user_action := '{}'::jsonb;
  end if;
  if new.status = 'ready' then
    new.readiness_confirmed_at := coalesce(new.readiness_confirmed_at, now());
  elsif new.status <> 'archived' then
    new.readiness_confirmed_at := null;
  end if;
  return new;
end;
$$;

create trigger onboarding_work_items_validate
  before insert or update on public.onboarding_work_items
  for each row execute function public.validate_onboarding_work_item();
create trigger onboarding_work_items_touch_version
  before update on public.onboarding_work_items
  for each row execute function public.touch_versioned_updated_at();

alter table public.onboarding_work_items enable row level security;
create policy onboarding_work_items_select on public.onboarding_work_items
  for select to authenticated using (auth.uid() = user_id);
create policy onboarding_work_items_insert on public.onboarding_work_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy onboarding_work_items_update on public.onboarding_work_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy onboarding_work_items_delete on public.onboarding_work_items
  for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.onboarding_work_items to authenticated;

-- Browser-only skills are the supported non-deterministic fallback. The legacy
-- custom_isolated value remains readable for archived data but no new product
-- path creates it.
alter table public.source_adapters
  drop constraint if exists source_adapters_adapter_type_check;
alter table public.source_adapters
  add constraint source_adapters_adapter_type_check check (adapter_type in (
    'rss', 'github_markdown', 'csv', 'greenhouse', 'lever', 'ashby', 'json',
    'html_selector', 'browser_workflow', 'browser_skill', 'custom_isolated'
  ));

create or replace function public.evaluate_onboarding_readiness(p_session_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  session_row public.onboarding_sessions;
  blockers jsonb := '[]'::jsonb;
  work_blockers jsonb := '[]'::jsonb;
  work_summary jsonb := '{}'::jsonb;
begin
  select * into session_row
  from public.onboarding_sessions
  where id = p_session_id;

  if session_row.id is null then
    raise exception 'onboarding session not found';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = session_row.user_id and status = 'active'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'profile_required',
      'title', 'Complete your profile',
      'reason', 'A current profile is required before onboarding can finish.',
      'nextUserAction', jsonb_build_object('type', 'open_onboarding_step', 'step', 3)
    ));
  end if;

  if not exists (
    select 1 from public.career_seasons
    where user_id = session_row.user_id and status = 'active'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'career_season_required',
      'title', 'Define your current career season',
      'reason', 'Planning and source relevance depend on your current career season.',
      'nextUserAction', jsonb_build_object('type', 'open_onboarding_step', 'step', 4)
    ));
  end if;

  if not exists (
    select 1 from public.goals
    where user_id = session_row.user_id and status = 'active'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'active_goal_required',
      'title', 'Add an active goal',
      'reason', 'Career OS needs at least one active goal to rank opportunities.',
      'nextUserAction', jsonb_build_object('type', 'open_onboarding_step', 'step', 5)
    ));
  end if;

  if not exists (
    select 1 from public.worker_devices
    where user_id = session_row.user_id
      and status = 'online'
      and last_heartbeat_at >= now() - interval '2 minutes'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'worker_required',
      'title', 'Start the paired Career OS worker',
      'reason', 'Resume extraction and authenticated browser sources run on the paired computer.',
      'nextUserAction', jsonb_build_object('type', 'open_worker_setup', 'href', '/settings/worker')
    ));
  end if;

  if not exists (
    select 1 from public.onboarding_work_items
    where onboarding_session_id = session_row.id
      and work_type = 'resume'
      and status <> 'archived'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'resume_library_required',
      'title', 'Upload and review your resumes',
      'reason', 'Onboarding must create a verified experience-component library.',
      'nextUserAction', jsonb_build_object('type', 'open_onboarding_step', 'step', 7)
    ));
  end if;

  if not exists (
    select 1 from public.onboarding_work_items
    where onboarding_session_id = session_row.id
      and work_type = 'source'
      and status <> 'archived'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object(
      'code', 'source_required',
      'title', 'Connect at least one opportunity source',
      'reason', 'A source must be tested and started during onboarding.',
      'nextUserAction', jsonb_build_object('type', 'open_onboarding_step', 'step', 14)
    ));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', 'work_item_incomplete',
    'workItemId', id,
    'workType', work_type,
    'title', title,
    'status', status,
    'phase', phase,
    'reason', coalesce(blocking_reason, 'This onboarding work has not finished.'),
    'nextUserAction', next_user_action
  ) order by created_at), '[]'::jsonb)
  into work_blockers
  from public.onboarding_work_items
  where onboarding_session_id = session_row.id
    and required
    and not explicitly_deferred
    and status not in ('ready', 'archived');

  blockers := blockers || work_blockers;

  select coalesce(jsonb_object_agg(work_type, item_count), '{}'::jsonb)
  into work_summary
  from (
    select work_type, jsonb_build_object(
      'total', count(*),
      'ready', count(*) filter (where status = 'ready'),
      'waitingForUser', count(*) filter (where status = 'waiting_for_user'),
      'failed', count(*) filter (where status in ('failed', 'unsupported')),
      'deferred', count(*) filter (where status = 'deferred')
    ) as item_count
    from public.onboarding_work_items
    where onboarding_session_id = session_row.id and status <> 'archived'
    group by work_type
  ) summary;

  return jsonb_build_object(
    'ready', jsonb_array_length(blockers) = 0,
    'sessionId', session_row.id,
    'sessionVersion', session_row.version,
    'evaluatedAt', now(),
    'blockers', blockers,
    'workSummary', work_summary
  );
end;
$$;

create or replace function public.complete_onboarding(
  p_session_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  session_row public.onboarding_sessions;
  readiness jsonb;
begin
  select * into session_row
  from public.onboarding_sessions
  where id = p_session_id
  for update;

  if session_row.id is null then
    raise exception 'onboarding session not found';
  end if;
  if session_row.version <> p_expected_version then
    raise exception 'onboarding version conflict';
  end if;

  readiness := public.evaluate_onboarding_readiness(p_session_id);
  if not coalesce((readiness->>'ready')::boolean, false) then
    raise exception using
      message = 'onboarding_not_ready',
      detail = readiness::text;
  end if;

  update public.onboarding_sessions
  set status = 'completed',
      current_step = 18,
      completed_at = now(),
      blockers = '[]'::jsonb,
      updated_by = 'user'
  where id = session_row.id;

  insert into public.audit_log_entries(
    user_id, action_type, target_object_type, target_object_id,
    summary, payload, created_by, updated_by
  ) values (
    session_row.user_id, 'onboarding.completed', 'onboarding_session', session_row.id,
    'Onboarding completed after all readiness gates passed.', readiness, 'user', 'user'
  );

  return readiness || jsonb_build_object('completedAt', now());
end;
$$;

revoke all on function public.evaluate_onboarding_readiness(uuid) from public;
revoke all on function public.complete_onboarding(uuid, integer) from public;
grant execute on function public.evaluate_onboarding_readiness(uuid) to authenticated, service_role;
grant execute on function public.complete_onboarding(uuid, integer) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'onboarding_work_items'
  ) then
    alter publication supabase_realtime add table public.onboarding_work_items;
  end if;
end $$;
