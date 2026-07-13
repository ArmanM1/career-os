create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'completed', 'archived')),
  current_step integer not null default 1 check (current_step between 1 and 18),
  completed_steps integer[] not null default '{}',
  answers jsonb not null default '{}',
  blockers jsonb not null default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  created_by public.actor_type not null default 'user',
  updated_by public.actor_type not null default 'user',
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.onboarding_sessions enable row level security;
create policy onboarding_sessions_select on public.onboarding_sessions for select to authenticated using (auth.uid() = user_id);
create policy onboarding_sessions_insert on public.onboarding_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy onboarding_sessions_update on public.onboarding_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger onboarding_sessions_touch_version before update on public.onboarding_sessions for each row execute function public.touch_versioned_updated_at();
grant select, insert, update, delete on public.onboarding_sessions to authenticated;
