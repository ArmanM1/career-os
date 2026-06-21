create extension if not exists "pgcrypto";

create type public.actor_type as enum ('user', 'agent', 'system');
create type public.goal_horizon as enum ('long_term', '1_year', '90_day', '30_day', 'week');
create type public.goal_track as enum ('swe', 'entrepreneurship', 'fde', 'exploration', 'general');
create type public.task_type as enum ('job_app', 'mentor', 'event', 'resume', 'project', 'skill', 'research', 'admin', 'check_in', 'source_setup', 'status_check');
create type public.task_effort as enum ('small', 'medium', 'large');
create type public.task_urgency as enum ('low', 'normal', 'high', 'time_sensitive');
create type public.energy_level as enum ('low', 'medium', 'high');
create type public.application_status as enum ('found', 'interested', 'drafting', 'ready_to_submit', 'submitted', 'oa', 'interview', 'rejected', 'ghosted', 'offer', 'withdrawn');
create type public.status_check_policy as enum ('manual', 'email', 'portal', 'calendar', 'scheduled_agent');
create type public.status_check_source as enum ('email', 'portal', 'calendar', 'manual', 'browser');
create type public.status_check_result as enum ('no_change', 'status_changed', 'needs_review', 'failed');
create type public.source_type as enum ('github_repo', 'company_careers_page', 'greenhouse_board', 'lever_board', 'ashby_board', 'school_event_calendar', 'newsletter', 'social_account', 'community_page', 'manual_list', 'email_application_status', 'application_portal', 'calendar_events');
create type public.fetch_strategy as enum ('http', 'git_pull', 'browser', 'manual', 'api');
create type public.monitor_status as enum ('proposed', 'active', 'paused', 'broken', 'archived');
create type public.source_run_status as enum ('success', 'failed', 'no_change', 'needs_review');
create type public.resume_variant_status as enum ('draft', 'ready_for_review', 'approved', 'used', 'archived');
create type public.connected_account_provider as enum ('google_calendar', 'gmail', 'github', 'supabase', 'browser_profile', 'other');
create type public.connected_account_status as enum ('not_connected', 'connected', 'needs_reauth', 'disabled');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.agent_job_status as enum ('queued', 'running', 'completed', 'failed', 'needs_user_input', 'cancelled');
create type public.agent_run_status as enum ('queued', 'running', 'completed', 'failed', 'needs_user_input', 'cancelled');
create type public.mutation_status as enum ('pending', 'applied', 'approval_required', 'rejected');
create type public.runtime_provider as enum ('codex_app_server', 'codex_exec', 'claude_code', 'openhands', 'mock', 'codex-app-server');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  title text not null default 'Profile',
  status text not null default 'active',
  labels text[] not null default '{}',
  full_name text,
  headline text,
  timezone text not null default 'America/Denver',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Academic Context',
  status text not null default 'active',
  labels text[] not null default '{}',
  institution text,
  degree_program text,
  current_year text check (current_year in ('freshman', 'sophomore', 'junior', 'senior', 'masters', 'other')),
  current_term text,
  expected_graduation_date date,
  recruiting_season text check (recruiting_season in ('off_cycle', 'internship_peak', 'new_grad_peak', 'interview_season', 'offer_decision')),
  term_start_date date,
  term_end_date date,
  timezone text not null default 'America/Denver',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  constraint_type text not null check (constraint_type in ('calendar', 'academic', 'deadline', 'location', 'eligibility', 'visa', 'budget', 'energy', 'time', 'preference')),
  severity text not null check (severity in ('soft', 'hard')),
  starts_at timestamptz,
  ends_at timestamptz,
  source text not null check (source in ('user', 'calendar', 'email', 'agent', 'system')),
  details text not null default '',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  priority integer,
  due_at timestamptz,
  horizon public.goal_horizon not null,
  track public.goal_track not null default 'general',
  parent_goal_id uuid references public.goals(id) on delete set null,
  target_date date,
  allocation_percent integer check (allocation_percent is null or allocation_percent between 0 and 100),
  rationale text not null default '',
  related_goal_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  website_url text,
  ranking integer,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  track public.goal_track not null default 'general',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status public.monitor_status not null default 'proposed',
  labels text[] not null default '{}',
  priority integer,
  source_type public.source_type not null,
  url text not null,
  fetch_strategy public.fetch_strategy not null,
  schedule text not null,
  local_path text,
  parser_script_path text,
  requires_auth boolean not null default false,
  approval_required boolean not null default false,
  last_run_at timestamptz,
  last_seen_cursor text,
  last_seen_hash text,
  related_goal_ids uuid[] not null default '{}',
  related_company_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  priority integer,
  due_at timestamptz,
  opportunity_type text not null check (opportunity_type in ('job', 'internship', 'event', 'program', 'fellowship', 'competition', 'other')),
  company_id uuid references public.companies(id) on delete set null,
  role_target_id uuid references public.role_targets(id) on delete set null,
  url text,
  source_monitor_id uuid references public.source_monitors(id) on delete set null,
  discovered_at timestamptz not null default now(),
  deadline_at timestamptz,
  fit_rationale text not null default '',
  related_goal_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  labels text[] not null default '{}',
  priority integer,
  due_at timestamptz,
  task_type public.task_type not null,
  effort public.task_effort not null default 'small',
  urgency public.task_urgency not null default 'normal',
  energy public.energy_level not null default 'medium',
  source text not null check (source in ('user', 'agent', 'monitor', 'calendar', 'email')),
  completion_notes text,
  related_goal_ids uuid[] not null default '{}',
  related_application_ids uuid[] not null default '{}',
  related_opportunity_ids uuid[] not null default '{}',
  related_contact_ids uuid[] not null default '{}',
  related_event_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status public.application_status not null default 'found',
  labels text[] not null default '{}',
  priority integer,
  due_at timestamptz,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  deadline_at timestamptz,
  submitted_at timestamptz,
  resume_variant_id uuid,
  next_action_task_id uuid references public.tasks(id) on delete set null,
  status_check_policy public.status_check_policy not null default 'manual',
  next_status_check_at timestamptz,
  last_status_checked_at timestamptz,
  last_status_evidence_id uuid,
  related_goal_ids uuid[] not null default '{}',
  related_opportunity_ids uuid[] not null default '{}',
  related_contact_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_status_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Application status check',
  status text not null default 'scheduled',
  labels text[] not null default '{}',
  application_id uuid not null references public.applications(id) on delete cascade,
  check_source public.status_check_source not null,
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  result_status public.status_check_result,
  previous_application_status public.application_status,
  detected_application_status public.application_status,
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  email text,
  company_id uuid references public.companies(id) on delete set null,
  role_title text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mentor_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  cadence text,
  last_interaction_at timestamptz,
  next_follow_up_at timestamptz,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  url text,
  location text,
  related_goal_ids uuid[] not null default '{}',
  related_application_ids uuid[] not null default '{}',
  related_company_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_monitor_id uuid references public.source_monitors(id) on delete cascade,
  title text not null,
  status public.source_run_status not null,
  labels text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  new_signal_count integer not null default 0,
  new_opportunity_count integer not null default 0,
  log_path text,
  error_message text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  latex_path text not null,
  is_default boolean not null default false,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  track public.goal_track not null default 'general',
  latex_path text not null,
  pdf_path text,
  template_id uuid references public.resume_templates(id) on delete set null,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status public.resume_variant_status not null default 'draft',
  labels text[] not null default '{}',
  base_version_id uuid references public.resume_versions(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  role_target_id uuid references public.role_targets(id) on delete set null,
  latex_path text not null,
  pdf_path text,
  diff_path text,
  rationale text not null default '',
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications
  add constraint applications_resume_variant_id_fkey foreign key (resume_variant_id) references public.resume_variants(id) on delete set null;

create table public.resume_bullets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  text text not null,
  metrics text[] not null default '{}',
  target_roles text[] not null default '{}',
  experience_id uuid,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  organization text,
  starts_at date,
  ends_at date,
  description text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resume_bullets
  add constraint resume_bullets_experience_id_fkey foreign key (experience_id) references public.experiences(id) on delete set null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  url text,
  repository_url text,
  description text,
  related_goal_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  proficiency text,
  evidence_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  source_type text not null,
  source_url text,
  external_ref text,
  excerpt text,
  payload jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status public.connected_account_status not null default 'not_connected',
  labels text[] not null default '{}',
  provider public.connected_account_provider not null,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  approval_required_for_expanded_scopes boolean not null default true,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null,
  title text not null,
  status text not null default 'active',
  labels text[] not null default '{}',
  skill_path text not null,
  thread_policy text not null,
  default_queue text not null,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, agent_id)
);

create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null,
  title text not null,
  status public.agent_job_status not null default 'queued',
  labels text[] not null default '{}',
  queue text not null default 'default',
  prompt text,
  input jsonb not null default '{}',
  priority integer not null default 0,
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_job_id uuid references public.agent_jobs(id) on delete set null,
  agent_id text not null,
  title text not null,
  status public.agent_run_status not null default 'queued',
  input jsonb not null default '{}',
  output jsonb,
  error_message text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.runtime_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  provider public.runtime_provider not null,
  runtime_thread_id text not null,
  thread_type text not null,
  related_object_id uuid,
  title text not null,
  status text not null default 'active',
  summary text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.runtime_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  runtime_thread_id uuid references public.runtime_threads(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  runtime_turn_id text,
  title text not null default 'Turn',
  status text not null default 'running',
  input jsonb not null default '{}',
  output jsonb,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  event_type text not null,
  message text not null default '',
  payload jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposed_mutations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  mutation_type text not null,
  target_object_type text not null,
  target_object_id uuid,
  payload jsonb not null default '{}',
  rationale text not null default '',
  evidence_ids uuid[] not null default '{}',
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  approval_policy text not null check (approval_policy in ('auto_apply', 'approval_required', 'never_auto_apply')),
  status public.mutation_status not null default 'pending',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  title text not null,
  status public.approval_status not null default 'pending',
  labels text[] not null default '{}',
  action_type text not null,
  target_object_type text,
  target_object_id uuid,
  rationale text not null default '',
  risk_level public.risk_level not null default 'medium',
  payload jsonb not null default '{}',
  evidence_ids uuid[] not null default '{}',
  decided_at timestamptz,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  action_type text not null,
  target_object_type text,
  target_object_id uuid,
  summary text not null default '',
  payload jsonb not null default '{}',
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals(user_id);
create index tasks_user_id_status_idx on public.tasks(user_id, status);
create index applications_user_id_status_idx on public.applications(user_id, status);
create index source_monitors_user_id_status_idx on public.source_monitors(user_id, status);
create index agent_jobs_queue_idx on public.agent_jobs(status, scheduled_for, priority desc);
create index agent_runs_user_id_idx on public.agent_runs(user_id, created_at desc);
create index approval_requests_user_id_status_idx on public.approval_requests(user_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'academic_contexts',
    'constraints',
    'goals',
    'companies',
    'role_targets',
    'source_monitors',
    'opportunities',
    'tasks',
    'applications',
    'application_status_checks',
    'contacts',
    'mentor_relationships',
    'events',
    'source_runs',
    'resume_templates',
    'resume_versions',
    'resume_variants',
    'resume_bullets',
    'experiences',
    'projects',
    'skills',
    'evidence',
    'connected_accounts',
    'agent_definitions',
    'agent_jobs',
    'agent_runs',
    'runtime_threads',
    'runtime_turns',
    'agent_events',
    'proposed_mutations',
    'approval_requests',
    'audit_log_entries'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_select on public.%I for select using (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_update on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete using (auth.uid() = user_id)', table_name, table_name);
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end;
$$;

