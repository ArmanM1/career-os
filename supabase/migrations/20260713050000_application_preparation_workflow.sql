-- The web pipeline exposes one explicit next action while background agents
-- prepare the packet, resume, project bridge, and relationship strategy.
alter table public.applications
  add column if not exists next_action text;

create index if not exists applications_user_opportunity_active_idx
  on public.applications(user_id, opportunity_id, updated_at desc)
  where opportunity_id is not null and archived_at is null;
