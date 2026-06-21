create type public.source_discovery_mode as enum ('onboarding', 'scheduled', 'manual', 'repair');
create type public.source_discovery_status as enum ('queued', 'running', 'success', 'failed', 'partial', 'needs_review');
create type public.source_candidate_recommendation as enum ('activate', 'propose', 'ignore', 'replace_existing');
create type public.signal_status as enum ('new', 'queued_for_ranking', 'ranked', 'ignored', 'duplicate');
create type public.signal_type as enum ('job_post', 'internship_post', 'event', 'program', 'fellowship', 'repo_update', 'social_post', 'newsletter_item', 'application_status', 'calendar_event', 'other');
create type public.opportunity_recommendation_action as enum ('apply_now', 'prepare_then_apply', 'build_project_then_apply', 'research', 'save', 'ignore', 'needs_review');
create type public.ranking_aggressiveness as enum ('conservative', 'balanced', 'high', 'very_high');

alter table public.source_monitors
  add column if not exists browser_use_enabled boolean not null default false,
  add column if not exists created_by_agent_run_id uuid references public.agent_runs(id) on delete set null,
  add column if not exists updated_by_agent_run_id uuid references public.agent_runs(id) on delete set null,
  add column if not exists source_rationale text not null default '',
  add column if not exists evaluation jsonb not null default '{}';

create table public.source_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  title text not null,
  status public.source_discovery_status not null default 'queued',
  labels text[] not null default '{}',
  mode public.source_discovery_mode not null,
  query text not null,
  scope text[] not null default '{}',
  browser_use_allowed boolean not null default false,
  computer_use_allowed boolean not null default false,
  target_season text,
  target_roles text[] not null default '{}',
  target_companies text[] not null default '{}',
  account_hints text[] not null default '{}',
  max_duration_minutes integer,
  source_candidates_found integer not null default 0,
  source_monitors_created integer not null default 0,
  source_monitors_updated integer not null default 0,
  parser_jobs_queued integer not null default 0,
  log_path text,
  error_message text,
  next_recommended_run_at timestamptz,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_discovery_run_id uuid references public.source_discovery_runs(id) on delete set null,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  related_source_monitor_id uuid references public.source_monitors(id) on delete set null,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  source_type public.source_type not null,
  url text not null,
  discovery_mode public.source_discovery_mode not null default 'manual',
  fetch_strategy_guess public.fetch_strategy not null,
  requires_auth boolean not null default false,
  browser_use_enabled boolean not null default false,
  recommendation public.source_candidate_recommendation not null default 'propose',
  rationale text not null default '',
  scores jsonb not null default '{}',
  target_season text,
  target_roles text[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_monitor_id uuid references public.source_monitors(id) on delete set null,
  source_run_id uuid references public.source_runs(id) on delete set null,
  source_candidate_id uuid references public.source_candidates(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  status public.signal_status not null default 'new',
  labels text[] not null default '{}',
  signal_type public.signal_type not null,
  source_type public.source_type,
  source_url text,
  canonical_url text,
  external_ref text,
  company_name text,
  role_title text,
  location text,
  opportunity_type text check (opportunity_type is null or opportunity_type in ('job', 'internship', 'event', 'program', 'fellowship', 'competition', 'other')),
  posted_at timestamptz,
  deadline_at timestamptz,
  raw_payload jsonb not null default '{}',
  normalized_payload jsonb not null default '{}',
  parser_name text,
  parser_confidence text check (parser_confidence is null or parser_confidence in ('low', 'medium', 'high')),
  rationale text not null default '',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  priority integer,
  source_signal_ids uuid[] not null default '{}',
  recommendation public.opportunity_recommendation_action not null,
  score numeric check (score is null or (score >= 0 and score <= 100)),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  aggressiveness_used public.ranking_aggressiveness not null default 'high',
  rationale text not null default '',
  role_brief jsonb not null default '{}',
  score_breakdown jsonb not null default '{}',
  project_bridge_assessment jsonb,
  suggested_tasks jsonb not null default '[]',
  planner_hints jsonb not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists source_candidates_user_url_idx
  on public.source_candidates(user_id, url);

create unique index if not exists signals_user_canonical_url_idx
  on public.signals(user_id, canonical_url)
  where canonical_url is not null;

create unique index if not exists signals_user_source_external_ref_idx
  on public.signals(user_id, source_monitor_id, external_ref)
  where source_monitor_id is not null and external_ref is not null;

create index if not exists source_discovery_runs_user_status_idx on public.source_discovery_runs(user_id, status);
create index if not exists source_candidates_user_recommendation_idx on public.source_candidates(user_id, recommendation);
create index if not exists signals_user_status_idx on public.signals(user_id, status);
create index if not exists signals_source_run_idx on public.signals(source_run_id);
create index if not exists opportunity_recommendations_user_status_idx on public.opportunity_recommendations(user_id, status);

alter table public.source_discovery_runs enable row level security;
alter table public.source_candidates enable row level security;
alter table public.signals enable row level security;
alter table public.opportunity_recommendations enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'source_discovery_runs',
    'source_candidates',
    'signals',
    'opportunity_recommendations'
  ]
  loop
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', table_name || '_delete', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'source_discovery_runs',
    'source_candidates',
    'signals',
    'opportunity_recommendations'
  ]
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', table_name || '_touch_updated_at', table_name);
  end loop;
end $$;
