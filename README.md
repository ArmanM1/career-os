# Career OS

Career OS is a local-first, agent-assisted career momentum system. It is being built first for one user, with a durable architecture that can later support other agent runtimes.

The project is not a generic career product. It is a personal operating system for maintaining momentum across goals, applications, mentors, events, resumes, projects, and weekly action items.

## Current Direction

- Hosted web UI for access from desktop and phone.
- Supabase-hosted Postgres/Auth/Realtime as the shared state layer.
- Local home agent worker running on the user's computer.
- Codex App Server as the first agent runtime.
- Agent runtime adapter layer so Claude Code, OpenHands, or other runtimes can be added later.
- Agents write through a Career OS object and mutation contract, not arbitrary database edits.
- Human approval is required for externally visible or irreversible actions, including sending messages and submitting applications.

## Key Docs

- [Architecture v1](docs/ARCHITECTURE.md)
- [Career OS contract](docs/CAREER_OS_CONTRACT.md)
- [Candidate object catalog](docs/OBJECT_CATALOG.md)
- [Agents and routing](docs/AGENTS_AND_ROUTING.md)
- [Source monitors and job search](docs/SOURCE_MONITORS.md)
- [Job Sourcing agent spec](docs/JOB_SOURCING_AGENT_SPEC.md)
- [Resume library](docs/RESUME_LIBRARY.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Roadmap](docs/ROADMAP.md)

## First Build Target

The first useful version should support:

1. Dynamic onboarding that builds the user's profile, goals, source preferences, and initial application strategy.
2. A main action dashboard with tasks grouped by practical labels such as job app, mentor, event, resume, project, skill, research, and admin.
3. Job search and source setup as part of onboarding.
4. Application pipeline tracking.
5. Scheduled application status checks using email, calendar, application portals, and other approved sources.
6. Calendar-aware constraints and event-driven tasks.
7. College journey awareness, including current year, term, recruiting season, graduation timeline, and date/time context.
8. Resume library with LaTeX-backed role-specific variants.
9. Weekly briefing that updates tasks based on goals, applications, events, source monitors, and check-ins.
10. Codex-backed local agent worker that can run jobs, build scripts, and propose structured database mutations.

## Local Development

```bash
npm install
npm run dev
npm run worker
```

The web app runs from `apps/web`. The local worker runs from `apps/worker` and expects Supabase service credentials in `.env.local`.

Useful commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run supabase:push
npm run seed:demo
```

`npm run seed:demo` requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CAREER_OS_SEED_USER_ID`.
