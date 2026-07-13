# Production implementation status

This document tracks the accepted first-user production build. It is not a speculative candidate roadmap.

## Implemented locally

- Recoverable Git baseline and verified DPAPI-encrypted production database snapshot outside the repository.
- Node 24.13.1, Next.js 16.2.10, React 19.2.7, TypeScript 5.9, Tailwind v4, shadcn/ui, selected AI Elements, Vitest, and Playwright foundations.
- Supabase v2 domains, private buckets, RLS, grants, indexes, Realtime scope, atomic job/source claims, leases/retries, pairing, approvals, mutation application, state versioning, onboarding, OAuth state, and completion RPCs.
- Password auth, no public signup, authenticated layouts/actions/routes, no fixed user IDs, no browser service role, and no demo fallback.
- Paired Windows worker, DPAPI secret, gateway-only access, heartbeat, scheduler, queue recovery, deterministic source adapters, and Task Scheduler installer.
- Thirteen versioned agent contracts and skills, complete mutation registry, per-agent output schema, persistent runtime threads, and local Career OS MCP read/proposal tools.
- Living state extraction pipeline, fresh context assembly, visible state/history/expiry, evidence rationale, and transactional undo.
- Responsive dashboard, threads, opportunities, relationships, events, check-ins, approvals, activity, settings, worker setup, and resumable onboarding surfaces.
- Read-only Google Gmail/Calendar and GitHub OAuth/sync foundations with encrypted server-side tokens.
- Resend idempotent outbox delivery, signed webhook updates, and daily retention/state-expiry maintenance cron.
- Private artifact upload/download URLs, checksum-verified local synchronization, and workspace-confined agent artifact uploads.
- Web-based experience library review with factual corrections, user-verified achievements, and explicit draft/verified state.
- Scheduled connector dispatch with downstream review jobs, source-signal opportunity jobs, operational notification producers, and user notification/timezone controls.
- Registry-owned approval enforcement at the worker completion boundary, including review-only ambiguous application status changes and transactional approval creation.
- CI definitions for typecheck, lint, unit, audit, build, local migrations/RLS, and desktop/mobile Playwright checks.

## Remaining before production acceptance

1. Complete production-grade resume extraction, `latexmk` compilation, generated diffs, and the mobile PDF workflow.
2. Complete dedicated Chrome-profile workflows for Instagram stories, Handshake, LinkedIn targeted contact lookup, portal status checks, and approved form preparation using saved CI fixtures.
3. Finish connector cursors, manual resync/health UI, and production OAuth configuration.
4. Finish source health sections, source discovery UI, authenticated-source enablement, and adapter repair/review workflow.
5. Finish application packet/status UI and execute the complete opportunity → resume → project spec → referral → approved form-fill → manual submit path.
6. Finish relationship/contact imports, interaction stages, event attendance/notes, and opportunity-triggered relationship reprioritization.
7. Add thread rename/search/attachments/stop/retry/branch/context inspector and richer message-part rendering.
8. Add export/deletion flows, deeper system-health metrics, backup/restore automation, and runbooks.
9. Expand database/runtime/source/browser/golden-path tests to the full acceptance matrix.
10. Provision staging Vercel/Supabase/OAuth/Resend, apply migrations to staging, run the golden path, then migrate production using the verified backup and archive strategy.

No production database migration or external deployment occurs until the local and staging gates pass. Legacy production data remains preserved until explicit deletion approval.
