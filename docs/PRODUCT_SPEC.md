# Career OS product specification

## Outcome

Career OS helps its first user progress through recruiting and the broader career journey. It should increase application volume and quality by coordinating opportunity discovery, prioritization, resume tailoring, targeted project planning, mentors and referrals, events, execution, status tracking, reflection, and continuous replanning.

The product always maintains a current state rather than relying on chat memory. Career-relevant statements, check-ins, completed or blocked tasks, application changes, and relationship changes create sourced revisions. Temporary feelings and workload expire; explicit user statements override inference; every belief is visible with history, rationale, correction, and undo.

## Daily experience

- At 6:00 AM in the user's timezone, the dashboard presents a persisted morning view over canonical tasks, opportunities, applications, contacts, and events.
- The Today section emphasizes the smallest set of high-leverage actions, including application, resume, referral, event, project, and waiting-on work.
- At 7:00 PM, a fast check-in captures completed, skipped, blocked, energy, workload, and optional context, then replans.
- Sunday at 6:00 PM, a dynamic review reassesses goals, career interests, recruiting season, feelings, constraints, and the next week.
- Advisor, onboarding, source, opportunity, application, mentor/contact, resume, planning, positioning, and event threads persist in the web UI and always receive fresh state.

## Major capabilities

1. Dynamic, resumable onboarding through the web UI: profile, academics, work, career season, goals, constraints, resumes, experience review, connectors, dedicated browser profile, applications, mentors, sources, schedules, and initial strategy.
2. Opportunity intelligence across public feeds, GitHub lists, ATS boards, Handshake, school/event pages, configured social accounts, Gmail, Calendar, and GitHub.
3. Explainable high-aggressiveness ranking with fit, eligibility, strategic value, evidence, gaps, timing, relationship leverage, resume readiness, source confidence, and project-bridge potential.
4. Application packets with requirements, answers, selected resume, referral plan, event context, project specification, readiness, and evidence-backed status checks.
5. A verified experience library that can generate role-specific LaTeX sources and PDFs without inventing dates, technologies, responsibilities, outcomes, or metrics.
6. Contact and mentor profiles, relationship stages, warm paths, conversation obligations, drafts, and mobile/desktop copy actions.
7. Event discovery, attendance context, notes, follow-up, and application/outreach reuse.
8. Persistent source discovery, deterministic adapters, health/yield tracking, authenticated read workflows, evidence retention, and repair proposals.
9. Inspectable approvals, activity, notifications, worker health, connector health, source health, state version, run context, and audit history.

## Architecture and trust boundary

- Next.js 16 on Vercel; responsive React 19 UI with Tailwind, shadcn/ui, and selected AI Elements.
- Supabase password Auth, Postgres, RLS, Realtime, and private Storage. Public signup is disabled.
- A paired Windows worker stores a revocable device secret with DPAPI and communicates only through authenticated Vercel gateway routes.
- Codex App Server runs locally and receives a per-agent versioned Zod contract, fresh `CurrentStateBundle`, scoped capabilities, and the Career OS stdio MCP server.
- The MCP server exposes typed reads and proposal tools only. It has no database credentials and cannot run raw SQL.
- Google and GitHub tokens are AES-256-GCM encrypted with a Vercel-only key and never reach the browser or worker.
- Dedicated Chrome remote debugging binds to localhost. Browser reads may navigate, screenshot, and extract; external mutations require approval and final submission is structurally blocked.
- Resend sends urgent notification emails through an idempotent outbox. The morning brief remains in the UI.

## Release definition

The first-user release is complete only when the full golden path—from web login and worker pairing through onboarding, source monitoring, ranked opportunity, resume/project/referral preparation, approved form filling with final-submit stop, manual submission/status monitoring, check-ins, persistent state, and the next morning dashboard—works without opening the Codex app and is inspectable in the web UI.

Out of scope: native mobile apps, SMS, automatic sending/posting, automatic final application submission, automatic event registration, automatic project construction, and multi-user commercialization.
