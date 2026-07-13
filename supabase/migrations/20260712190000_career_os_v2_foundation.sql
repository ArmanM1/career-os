-- Career OS v2 foundation. This migration is additive so the restored first-user
-- dataset remains available while the application is migrated domain by domain.

create schema if not exists career_os_archive;
revoke all on schema career_os_archive from anon, authenticated;

create table public.worker_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'offline' check (status in ('pairing', 'online', 'offline', 'paused', 'revoked', 'error')),
  secret_hash text,
  secret_rotated_at timestamptz,
  last_heartbeat_at timestamptz,
  last_seen_ip inet,
  worker_version text,
  capabilities text[] not null default '{}',
  health jsonb not null default '{}',
  last_error text,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_device_id uuid references public.worker_devices(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'cancelled')),
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.career_seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  season_type text not null,
  starts_on date,
  ends_on date,
  intensity text not null default 'high' check (intensity in ('low', 'medium', 'high', 'peak')),
  summary text not null default '',
  objectives jsonb not null default '[]',
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  preference_type text not null,
  value jsonb not null,
  strength integer check (strength is null or strength between 0 and 100),
  source text not null default 'user' check (source in ('user', 'agent', 'check_in', 'behavior')),
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  title text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'missed', 'archived')),
  target_at timestamptz,
  completed_at timestamptz,
  outcome text,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('proposed', 'active', 'reconsidering', 'superseded', 'archived')),
  decision text not null,
  rationale text not null default '',
  decided_at timestamptz not null default now(),
  superseded_by uuid references public.decisions(id) on delete set null,
  source_message_id uuid,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.open_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'asked', 'answered', 'deferred', 'archived')),
  question text not null,
  reason text not null default '',
  affected_fields text[] not null default '{}',
  answer text,
  answered_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.state_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('suggested', 'active', 'superseded', 'retracted', 'expired', 'archived')),
  item_type text not null check (item_type in ('thought', 'feeling', 'energy', 'stress', 'confidence', 'priority', 'concern', 'preference', 'interest', 'career_hypothesis', 'decision', 'intended_next_step')),
  stable_key text not null,
  current_value jsonb not null,
  human_value text not null,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  salience integer not null default 50 check (salience between 0 and 100),
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  source_type text not null check (source_type in ('message', 'check_in', 'user_action', 'evidence', 'agent_run', 'manual')),
  source_id uuid,
  user_stated boolean not null default false,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stable_key, status) deferrable initially deferred
);

create table public.state_item_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_item_id uuid not null references public.state_items(id) on delete cascade,
  status text not null default 'applied' check (status in ('proposed', 'applied', 'superseded', 'retracted', 'expired')),
  revision integer not null,
  value jsonb not null,
  human_value text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  salience integer not null check (salience between 0 and 100),
  effective_at timestamptz not null,
  expires_at timestamptz,
  source_type text not null,
  source_id uuid,
  user_stated boolean not null default false,
  rationale text not null default '',
  supersedes_revision_id uuid references public.state_item_revisions(id) on delete set null,
  undo_of_revision_id uuid references public.state_item_revisions(id) on delete set null,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_item_id, revision)
);

create table public.state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'current' check (status in ('current', 'superseded', 'archived')),
  state_version bigint not null,
  as_of timestamptz not null default now(),
  bundle jsonb not null,
  reason text not null default '',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, state_version)
);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  status text not null default 'active',
  dependency_type text not null default 'blocks' check (dependency_type in ('blocks', 'informs', 'recommended_before')),
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'superseded', 'archived')),
  plan_date date not null,
  timezone text not null default 'America/Denver',
  state_version bigint not null,
  generated_at timestamptz not null default now(),
  rationale text not null default '',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date, status)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'superseded', 'archived')),
  week_start date not null,
  timezone text not null default 'America/Denver',
  state_version bigint not null,
  generated_at timestamptz not null default now(),
  rationale text not null default '',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start, status)
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_plan_id uuid references public.daily_plans(id) on delete cascade,
  weekly_plan_id uuid references public.weekly_plans(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped', 'blocked', 'removed')),
  section text not null,
  position integer not null default 0,
  rationale text not null default '',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(daily_plan_id, weekly_plan_id) = 1)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('scheduled', 'open', 'completed', 'skipped', 'expired')),
  check_in_type text not null check (check_in_type in ('daily', 'weekly', 'onboarding', 'ad_hoc')),
  scheduled_for timestamptz,
  completed_at timestamptz,
  state_version_before bigint,
  state_version_after bigint,
  summary text,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.check_in_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  status text not null default 'active',
  question text not null,
  question_type text not null check (question_type in ('single_select', 'multi_select', 'scale', 'text', 'boolean', 'task_status')),
  options jsonb not null default '[]',
  reason text not null default '',
  affected_state_fields text[] not null default '{}',
  required boolean not null default false,
  position integer not null default 0,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.check_in_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  question_id uuid not null references public.check_in_questions(id) on delete cascade,
  status text not null default 'submitted',
  answer jsonb not null,
  answered_at timestamptz not null default now(),
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived', 'error')),
  schedule_type text not null,
  cron_expression text,
  timezone text not null default 'America/Denver',
  next_run_at timestamptz,
  last_run_at timestamptz,
  catch_up boolean not null default true,
  job_template jsonb not null,
  dedupe_prefix text not null,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'selected', 'archived')),
  specification jsonb not null,
  estimated_hours numeric(7,2),
  state_version bigint,
  rationale text not null default '',
  evidence_ids uuid[] not null default '{}',
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  title text not null,
  status text not null default 'missing' check (status in ('missing', 'draft', 'ready', 'not_applicable', 'submitted')),
  requirement_type text not null,
  required boolean not null default true,
  value jsonb,
  artifact_id uuid,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status text not null default 'recorded',
  previous_status public.application_status,
  new_status public.application_status not null,
  effective_at timestamptz not null default now(),
  confidence text not null default 'high' check (confidence in ('low', 'medium', 'high')),
  source_type text not null,
  source_id uuid,
  evidence_ids uuid[] not null default '{}',
  rationale text not null default '',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'preparing', 'ready', 'ready_for_user_submission', 'submitted', 'archived')),
  resume_variant_id uuid references public.resume_variants(id) on delete set null,
  project_spec_id uuid references public.project_specs(id) on delete set null,
  contents jsonb not null default '{}',
  readiness jsonb not null default '{}',
  state_version bigint,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experience_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  title text not null,
  status text not null default 'verified' check (status in ('draft', 'verified', 'disputed', 'archived')),
  achievement text not null,
  metrics jsonb not null default '{}',
  skill_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  provenance text not null default 'user',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('uploading', 'active', 'processing', 'failed', 'expired', 'archived')),
  artifact_type text not null,
  bucket text not null,
  storage_path text not null,
  local_path text,
  mime_type text,
  size_bytes bigint,
  sha256 text not null,
  origin text not null,
  retention_policy text not null default 'canonical',
  expires_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bucket, storage_path),
  unique (user_id, sha256, artifact_type)
);

alter table public.application_requirements
  add constraint application_requirements_artifact_fk foreign key (artifact_id) references public.artifacts(id) on delete set null;

create table public.resume_variant_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_variant_id uuid not null references public.resume_variants(id) on delete cascade,
  status text not null default 'included' check (status in ('included', 'excluded', 'modified')),
  item_type text not null check (item_type in ('experience', 'achievement', 'project', 'skill', 'education', 'custom')),
  source_object_id uuid,
  source_text text not null,
  rendered_text text not null,
  rationale text not null default '',
  position integer not null default 0,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null,
  status text not null default 'known' check (status in ('discovered', 'known', 'met', 'active', 'warm', 'stale', 'referral_appropriate', 'referral_requested', 'waiting', 'archived')),
  relationship_type text not null default 'connection',
  strength integer not null default 25 check (strength between 0 and 100),
  last_interaction_at timestamptz,
  next_action_at timestamptz,
  context text not null default '',
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contact_id)
);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  relationship_id uuid references public.relationships(id) on delete set null,
  title text not null,
  status text not null default 'completed' check (status in ('planned', 'completed', 'cancelled', 'waiting')),
  interaction_type text not null,
  occurred_at timestamptz not null,
  direction text check (direction in ('inbound', 'outbound', 'mutual')),
  summary text not null default '',
  follow_up_at timestamptz,
  evidence_ids uuid[] not null default '{}',
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'accepted', 'ignored', 'expired')),
  signal_type text not null,
  payload jsonb not null,
  source_type text not null,
  source_id uuid,
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.referral_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null,
  status text not null default 'candidate' check (status in ('candidate', 'relationship_building', 'appropriate', 'requested', 'waiting', 'successful', 'declined', 'archived')),
  connection_reason text not null,
  appropriateness integer not null default 0 check (appropriateness between 0 and 100),
  next_action text,
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  referral_path_id uuid references public.referral_paths(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'copied', 'sent_manually', 'response_received', 'archived')),
  draft_type text not null,
  channel text not null,
  subject text,
  body text not null,
  copied_at timestamptz,
  sent_manually_at timestamptz,
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'registered', 'attended', 'missed', 'cancelled')),
  registered_at timestamptz,
  attended_at timestamptz,
  notes text,
  contact_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table public.event_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'recommended' check (status in ('recommended', 'accepted', 'dismissed', 'expired')),
  score integer not null check (score between 0 and 100),
  rationale text not null,
  related_goal_ids uuid[] not null default '{}',
  related_opportunity_ids uuid[] not null default '{}',
  related_contact_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_adapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_monitor_id uuid references public.source_monitors(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'testing', 'active', 'broken', 'needs_review', 'archived')),
  adapter_type text not null check (adapter_type in ('rss', 'github_markdown', 'csv', 'greenhouse', 'lever', 'ashby', 'json', 'html_selector', 'browser_workflow', 'custom_isolated')),
  version_number integer not null default 1,
  definition jsonb not null,
  domain_allowlist text[] not null default '{}',
  checksum text not null,
  test_result jsonb,
  approved_at timestamptz,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checksum)
);

create table public.oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_nonce text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  rotated_at timestamptz,
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id)
);

revoke all on public.oauth_credentials from anon, authenticated;

create table public.connector_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'success', 'partial', 'failed')),
  sync_type text not null,
  cursor_before text,
  cursor_after text,
  started_at timestamptz,
  completed_at timestamptz,
  records_seen integer not null default 0,
  signals_created integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.external_refs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  status text not null default 'active',
  provider text not null,
  external_type text not null,
  external_id text not null,
  canonical_object_type text,
  canonical_object_id uuid,
  url text,
  payload jsonb not null default '{}',
  last_seen_at timestamptz not null default now(),
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_type, external_id)
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  thread_type text not null check (thread_type in ('advisor', 'onboarding', 'source', 'opportunity', 'application', 'mentor_contact', 'resume', 'planning', 'career_positioning', 'event')),
  pinned boolean not null default false,
  last_message_at timestamptz,
  active_runtime_thread_id uuid references public.runtime_threads(id) on delete set null,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  status text not null default 'complete' check (status in ('queued', 'streaming', 'complete', 'failed', 'cancelled')),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  client_message_id text,
  runtime_turn_id uuid references public.runtime_turns(id) on delete set null,
  state_version bigint,
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, client_message_id)
);

create table public.message_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  status text not null default 'complete' check (status in ('pending', 'streaming', 'complete', 'failed')),
  part_type text not null check (part_type in ('text', 'source', 'tool', 'approval', 'warning', 'affected_object', 'suggestion', 'attachment')),
  position integer not null default 0,
  payload jsonb not null,
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, position)
);

create table public.thread_object_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  status text not null default 'active',
  object_type text not null,
  object_id uuid not null,
  relationship text not null default 'related',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, object_type, object_id)
);

create table public.thread_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  status text not null default 'current' check (status in ('current', 'superseded', 'archived')),
  from_message_id uuid references public.messages(id) on delete set null,
  through_message_id uuid references public.messages(id) on delete set null,
  message_count integer not null,
  summary text not null,
  state_version bigint,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mutation_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'applying', 'applied', 'partial', 'failed', 'needs_review')),
  state_version_before bigint,
  state_version_after bigint,
  error_message text,
  created_by public.actor_type not null default 'agent',
  updated_by public.actor_type not null default 'agent',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposed_mutations
  add column if not exists mutation_batch_id uuid references public.mutation_batches(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists expected_object_version integer,
  add column if not exists applied_at timestamptz,
  add column if not exists result jsonb;

create unique index if not exists proposed_mutations_user_id_idempotency_idx
  on public.proposed_mutations(user_id, idempotency_key) where idempotency_key is not null;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  category text not null,
  channel text not null default 'email' check (channel in ('email', 'in_app')),
  enabled boolean not null default true,
  minimum_severity text not null default 'important' check (minimum_severity in ('info', 'important', 'urgent')),
  quiet_hours jsonb not null default '{}',
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, channel)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  channel text not null check (channel in ('email', 'in_app')),
  category text not null,
  severity text not null check (severity in ('info', 'important', 'urgent')),
  idempotency_key text not null,
  recipient text,
  subject text not null,
  payload jsonb not null,
  scheduled_for timestamptz not null default now(),
  attempt_count integer not null default 0,
  last_error text,
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
  status text not null check (status in ('accepted', 'delivered', 'bounced', 'complained', 'suppressed', 'failed')),
  provider text not null,
  provider_message_id text,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}',
  created_by public.actor_type not null default 'system',
  updated_by public.actor_type not null default 'system',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade every legacy canonical record with optimistic concurrency and archival
-- metadata without changing existing values or enum-backed status columns.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','academic_contexts','constraints','goals','companies','role_targets','source_monitors',
    'opportunities','tasks','applications','application_status_checks','contacts','mentor_relationships',
    'events','source_runs','resume_templates','resume_versions','resume_variants','resume_bullets',
    'experiences','projects','skills','evidence','connected_accounts','agent_definitions','agent_jobs',
    'agent_runs','runtime_threads','runtime_turns','agent_events','proposed_mutations','approval_requests',
    'audit_log_entries','source_discovery_runs','source_candidates','signals','opportunity_recommendations'
  ] loop
    execute format('alter table public.%I add column if not exists version integer not null default 1', table_name);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', table_name);
  end loop;
end $$;

alter table public.profiles add column if not exists state_version bigint not null default 0;
alter table public.connected_accounts add column if not exists external_account_id text;
create unique index if not exists connected_accounts_user_provider_idx on public.connected_accounts(user_id, provider);
alter table public.opportunities
  add column if not exists canonical_url text,
  add column if not exists location text,
  add column if not exists description text,
  add column if not exists posted_at timestamptz,
  add column if not exists eligibility jsonb not null default '{}';
alter table public.contacts
  add column if not exists full_name text,
  add column if not exists linkedin_url text,
  add column if not exists company text,
  add column if not exists role text,
  add column if not exists notes text;
alter table public.resume_variants
  add column if not exists resume_template_id uuid references public.resume_templates(id) on delete set null,
  add column if not exists target_role text,
  add column if not exists target_company text;
alter table public.source_monitors
  add column if not exists next_run_at timestamptz,
  add column if not exists claimed_by_device_id uuid references public.worker_devices(id) on delete set null,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists useful_signal_count integer not null default 0,
  add column if not exists parser_version text,
  add column if not exists last_useful_signal_at timestamptz,
  add column if not exists last_error text;
create index if not exists source_monitors_due_idx on public.source_monitors(next_run_at) where status = 'active';
alter table public.evidence
  add column if not exists artifact_id uuid references public.artifacts(id) on delete set null,
  add column if not exists retention_policy text not null default 'canonical',
  add column if not exists expires_at timestamptz,
  add column if not exists expired_at timestamptz;

alter table public.agent_jobs
  add column if not exists schema_version integer not null default 1,
  add column if not exists input_type text not null default 'legacy',
  add column if not exists related_object_ids uuid[] not null default '{}',
  add column if not exists dedupe_key text,
  add column if not exists required_capabilities text[] not null default '{}',
  add column if not exists created_state_version bigint not null default 0,
  add column if not exists claimed_by_device_id uuid references public.worker_devices(id) on delete set null,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists retry_after timestamptz,
  add column if not exists cancelled_at timestamptz;

create unique index if not exists agent_jobs_user_dedupe_active_idx
  on public.agent_jobs(user_id, dedupe_key)
  where dedupe_key is not null and status in ('queued', 'running', 'needs_user_input');
create index if not exists agent_jobs_claim_idx
  on public.agent_jobs(status, scheduled_for, priority desc, created_at)
  where status = 'queued';
create index if not exists agent_jobs_lease_idx
  on public.agent_jobs(lease_expires_at) where status = 'running';
create index if not exists schedules_due_idx
  on public.schedules(next_run_at) where status = 'active';
create unique index if not exists schedules_user_dedupe_idx
  on public.schedules(user_id, dedupe_prefix);
create index if not exists state_items_current_idx
  on public.state_items(user_id, item_type, expires_at) where status = 'active';
create index if not exists messages_thread_created_idx on public.messages(thread_id, created_at);
create index if not exists threads_user_recent_idx on public.threads(user_id, pinned desc, last_message_at desc);
create index if not exists notification_outbox_due_idx on public.notification_outbox(status, scheduled_for);
create index if not exists worker_devices_heartbeat_idx on public.worker_devices(user_id, last_heartbeat_at desc);
create index if not exists contacts_search_idx on public.contacts using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists opportunities_search_idx on public.opportunities using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists experiences_search_idx on public.experiences using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists messages_search_idx on public.messages using gin (to_tsvector('simple', coalesce(content, '')));

create or replace function public.touch_versioned_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if row(new.*) is distinct from row(old.*) then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'worker_devices','worker_pairing_codes','career_seasons','preferences','milestones','decisions','open_questions',
    'state_items','state_item_revisions','state_snapshots','task_dependencies','daily_plans','weekly_plans','plan_items',
    'check_ins','check_in_questions','check_in_answers','schedules','project_specs','application_requirements',
    'application_status_history','application_packets','experience_achievements','artifacts','resume_variant_items',
    'relationships','interactions','contact_signals','referral_paths','outreach_drafts','event_attendance',
    'event_recommendations','source_adapters','connector_sync_runs','external_refs','threads','messages','message_parts',
    'thread_object_links','thread_summaries','mutation_batches','notification_preferences','notification_outbox',
    'notification_deliveries'
  ] loop
    execute format('drop trigger if exists %I_touch_version on public.%I', table_name, table_name);
    execute format('create trigger %I_touch_version before update on public.%I for each row execute function public.touch_versioned_updated_at()', table_name, table_name);
  end loop;
end $$;

-- User RLS is explicit on all browser-visible v2 tables. oauth_credentials is
-- intentionally service-only and excluded from this list.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'worker_devices','worker_pairing_codes','career_seasons','preferences','milestones','decisions','open_questions',
    'state_items','state_item_revisions','state_snapshots','task_dependencies','daily_plans','weekly_plans','plan_items',
    'check_ins','check_in_questions','check_in_answers','schedules','project_specs','application_requirements',
    'application_status_history','application_packets','experience_achievements','artifacts','resume_variant_items',
    'relationships','interactions','contact_signals','referral_paths','outreach_drafts','event_attendance',
    'event_recommendations','source_adapters','connector_sync_runs','external_refs','threads','messages','message_parts',
    'thread_object_links','thread_summaries','mutation_batches','notification_preferences','notification_outbox',
    'notification_deliveries'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)', table_name || '_v2_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name || '_v2_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_v2_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name || '_v2_delete', table_name);
  end loop;
end $$;

alter table public.oauth_credentials enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','academic_contexts','constraints','goals','companies','role_targets','source_monitors','opportunities','tasks','applications','application_status_checks','contacts','mentor_relationships','events','source_runs','resume_templates','resume_versions','resume_variants','resume_bullets','experiences','projects','skills','evidence','connected_accounts','agent_definitions','agent_jobs','agent_runs','runtime_threads','runtime_turns','agent_events','proposed_mutations','approval_requests','audit_log_entries','source_discovery_runs','source_candidates','signals','opportunity_recommendations',
    'worker_devices','worker_pairing_codes','career_seasons','preferences','milestones','decisions','open_questions','state_items','state_item_revisions','state_snapshots','task_dependencies','daily_plans','weekly_plans','plan_items','check_ins','check_in_questions','check_in_answers','schedules','project_specs','application_requirements','application_status_history','application_packets','experience_achievements','artifacts','resume_variant_items','relationships','interactions','contact_signals','referral_paths','outreach_drafts','event_attendance','event_recommendations','source_adapters','connector_sync_runs','external_refs','threads','messages','message_parts','thread_object_links','thread_summaries','mutation_batches','notification_preferences','notification_outbox','notification_deliveries'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;
revoke all on public.oauth_credentials from authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('resume-sources', 'resume-sources', false, 52428800),
  ('resume-artifacts', 'resume-artifacts', false, 52428800),
  ('thread-attachments', 'thread-attachments', false, 52428800),
  ('evidence', 'evidence', false, 52428800),
  ('exports', 'exports', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "career_os_private_objects_select" on storage.objects
for select to authenticated
using (bucket_id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "career_os_private_objects_insert" on storage.objects
for insert to authenticated
with check (bucket_id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "career_os_private_objects_update" on storage.objects
for update to authenticated
using (bucket_id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "career_os_private_objects_delete" on storage.objects
for delete to authenticated
using (bucket_id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.bump_state_version(p_user_id uuid, p_reason text default '')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version bigint;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'cannot change another user state version';
  end if;
  update public.profiles
  set state_version = state_version + 1,
      updated_by = 'system'
  where user_id = p_user_id
  returning state_version into next_version;
  if next_version is null then
    raise exception 'profile not found for user';
  end if;
  insert into public.audit_log_entries(user_id, action_type, summary, payload, created_by, updated_by)
  values (p_user_id, 'state.version.incremented', p_reason, jsonb_build_object('stateVersion', next_version), 'system', 'system');
  return next_version;
end;
$$;

create or replace function public.claim_agent_jobs(
  p_device_id uuid,
  p_limit integer default 1,
  p_lease_seconds integer default 300
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  device_user_id uuid;
begin
  select user_id into device_user_id
  from public.worker_devices
  where id = p_device_id and status in ('online', 'offline');
  if device_user_id is null then
    raise exception 'device is not active';
  end if;
  return query
  with candidates as (
    select j.id
    from public.agent_jobs j
    where j.user_id = device_user_id
      and j.status = 'queued'
      and j.scheduled_for <= now()
      and coalesce(j.retry_after, '-infinity'::timestamptz) <= now()
    order by j.priority desc, j.scheduled_for, j.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 10))
  )
  update public.agent_jobs j
  set status = 'running',
      claimed_by_device_id = p_device_id,
      locked_at = now(),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(30, p_lease_seconds)),
      attempt_count = attempt_count + 1,
      updated_by = 'system'
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

create or replace function public.recover_stale_agent_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recovered integer;
begin
  with recovered_jobs as (
    update public.agent_jobs
    set status = case when attempt_count >= max_attempts then 'failed'::public.agent_job_status else 'queued'::public.agent_job_status end,
        claimed_by_device_id = null,
        locked_at = null,
        lease_expires_at = null,
        retry_after = case when attempt_count >= max_attempts then null else now() + make_interval(secs => least(3600, 30 * power(2, attempt_count)::integer)) end,
        error_message = case when attempt_count >= max_attempts then coalesce(error_message, 'Lease expired after retry limit') else error_message end,
        updated_by = 'system'
    where status = 'running' and lease_expires_at < now()
    returning 1
  ) select count(*) into recovered from recovered_jobs;
  return recovered;
end;
$$;

create or replace function public.decide_approval(
  p_approval_id uuid,
  p_user_id uuid,
  p_decision text
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.approval_requests;
begin
  if p_decision not in ('approved', 'rejected', 'cancelled') then
    raise exception 'invalid approval decision';
  end if;
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'cannot decide another user approval';
  end if;
  update public.approval_requests
  set status = p_decision::public.approval_status,
      decided_at = now(),
      updated_by = 'user'
  where id = p_approval_id and user_id = p_user_id and status = 'pending'
  returning * into result;
  if result.id is null then
    raise exception 'pending approval not found';
  end if;
  insert into public.audit_log_entries(user_id, action_type, target_object_type, target_object_id, summary, payload, created_by, updated_by)
  values (p_user_id, 'approval.' || p_decision, 'approval_request', p_approval_id, 'Approval decision recorded', jsonb_build_object('decision', p_decision), 'user', 'user');
  return result;
end;
$$;

revoke all on function public.bump_state_version(uuid, text) from public;
revoke all on function public.claim_agent_jobs(uuid, integer, integer) from public;
revoke all on function public.recover_stale_agent_jobs() from public;
revoke all on function public.decide_approval(uuid, uuid, text) from public;
grant execute on function public.decide_approval(uuid, uuid, text) to authenticated;
grant execute on function public.bump_state_version(uuid, text) to authenticated;

-- Realtime is intentionally limited to interactive product surfaces.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['tasks','applications','opportunities','approval_requests','agent_jobs','messages','message_parts','notification_outbox','worker_devices'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
