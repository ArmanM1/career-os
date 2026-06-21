# Roadmap

## Phase 0: Architecture and Schema

Deliverables:

- Architecture v1.
- Candidate object catalog.
- Agent and routing design.
- Source monitor design.
- Resume library design.
- Initial database schema draft.
- Initial mutation schema draft.

Exit criteria:

- User approves/declines candidate objects.
- V1 object list is locked.
- V1 workflow list is locked.

## Phase 1: Core App Skeleton

Deliverables:

- Next.js app.
- Supabase project integration.
- Auth.
- Database migrations.
- Main dashboard.
- Application pipeline.
- Goal/timeline view.
- Resume library page.
- Approval inbox.

Exit criteria:

- User can log in from desktop and phone.
- UI renders real database objects.
- Manual CRUD works for core objects.

## Phase 2: Local Worker and Codex Runtime

Deliverables:

- Local worker process.
- Supabase job queue integration.
- Codex App Server runtime adapter.
- Thread and turn persistence.
- Structured output validation.
- Agent event logging.
- Approval request flow.

Exit criteria:

- UI can enqueue an agent job.
- Local worker runs Codex.
- Agent returns structured mutations.
- Safe mutations apply to database.
- Approval-required actions appear in UI.

## Phase 3: Onboarding and Job Search

Deliverables:

- Onboarding agent skill.
- Job Finder agent skill.
- Dynamic onboarding UI.
- Resume import.
- GitHub/source setup prompts.
- Initial source monitor proposals.
- Initial goal hierarchy.
- Initial application strategy.

Exit criteria:

- Onboarding creates usable profile, goals, tasks, and source proposals.
- Job search is part of onboarding.

## Phase 4: Source Monitors

Deliverables:

- SourceMonitor tables.
- SourceRun tables.
- GitHub repo monitor support.
- Company board monitor support.
- Event source monitor support.
- Source Adapter Builder agent.

Exit criteria:

- A GitHub repo can be cloned/pulled on schedule.
- Parser emits opportunities.
- New opportunities update dashboard or approval inbox.

## Phase 5: Resume Library

Deliverables:

- LaTeX resume folder structure.
- Resume metadata schema.
- Resume Tailor agent.
- PDF compile pipeline.
- Diff and rationale view.

Exit criteria:

- User can generate, inspect, approve, and use a role-specific resume variant.

## Phase 6: Weekly Briefing

Deliverables:

- Weekly Planner agent.
- Weekly briefing UI tabs.
- Check-in form.
- Task reprioritization.
- Application/event/mentor summary.

Exit criteria:

- Weekly briefing updates dashboard based on real state.

## Phase 7: Mentors, Events, and Activity

Deliverables:

- Mentor Manager agent.
- Event Scanner agent.
- Calendar integration.
- Email/application status integration.
- GitHub activity signals.

Exit criteria:

- System can connect applications, events, contacts, and goals into concrete tasks.

