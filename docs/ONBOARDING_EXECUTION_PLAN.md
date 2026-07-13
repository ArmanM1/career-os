# Career OS onboarding-first execution plan

## Required outcome

Onboarding is not a questionnaire that merely saves future work. It is the first
real Career OS run. Before the user can complete it, the web UI must have:

- Built a reviewed career profile and active career season.
- Ingested every supplied resume, extracted its factual experience library, and
  resolved the review questions needed to make those components trustworthy.
- Connected or explicitly deferred each selected connector and browser account.
- Inspected every user-supplied source, selected or generated an adapter, tested
  it, performed a first read, and started its recurring schedule.
- Imported the user's current applications, contacts, and relationship context.
- Generated the first opportunity set, strategy, tasks, and weekly plan from the
  data that onboarding just collected.
- Presented a final, inspectable statement of what Career OS believes, what it
  learned from each source/resume, and what still needs user input.

All interaction happens in the Career OS web application. Product threads are
Supabase records. Codex runtime threads, generated source adapters, downloaded
evidence, and LaTeX working files are internal implementation details and never
appear as Codex tasks or folders in this repository.

## Onboarding orchestration model

The `career-onboarding` agent is the coordinator. It owns the interview and
readiness decision, but delegates specialized work:

1. `career-resume-tailor` imports resume artifacts, extracts reusable experience
   components, and later assembles opportunity-specific LaTeX variants from the
   verified library with complete diffs/provenance.
2. `career-source-discovery` inspects each supplied source and discovers related
   sources relevant to the user's goals.
3. `career-source-adapter-builder` chooses, generates, tests, versions, and
   repairs the source adapter.
4. Deterministic source runs create signals and evidence.
5. `career-opportunity-intelligence` normalizes and ranks the initial signals.
6. `career-state-curator`, `career-positioning`, and
   `career-daily-weekly-planner` build the initial state, strategy, and plan only
   after the resume and source prerequisites are ready.

Every delegated job carries the onboarding session ID and a work-item ID. The
onboarding page subscribes to job, run, evidence, artifact, question, and object
updates through Supabase Realtime.

## Durable onboarding work items

Add `onboarding_work_items` as the readiness ledger rather than deriving
completion from free-form answers. Each row is user-scoped and contains:

- `onboarding_session_id`
- `work_type`: `resume`, `source`, `connector`, `browser_account`,
  `application_import`, `contact_import`, `strategy`, or `final_review`
- `related_object_type` and `related_object_id`
- `required` and `explicitly_deferred`
- `status`, progress percentage, and current phase
- `blocking_reason` and structured `next_user_action`
- latest job/run IDs, attempt count, and last error
- readiness evidence IDs and timestamps

The database exposes two RPCs:

- `evaluate_onboarding_readiness(session_id)` returns structured blockers and
  the next available actions.
- `complete_onboarding(session_id, expected_version)` succeeds transactionally
  only when all hard gates pass.

No client-side flag can bypass these gates.

## Resume onboarding pipeline

### Web experience

The resume stage is an embedded workspace, not a link to a separate unfinished
page. It supports drag/drop and mobile file selection for PDF, `.tex`, and ZIP
resume sources. Each upload immediately becomes a card with live state:

`uploading -> stored -> worker syncing -> extracting -> review required -> verified -> generating LaTeX -> compiling -> ready`

The user can upload every variant, identify its track, preview the original,
inspect extracted facts beside their provenance, merge duplicates, correct
facts, and answer focused questions without leaving onboarding. Compiled PDF
previews appear later for opportunity-specific variants assembled from the
verified component library.

### Processing

1. Upload directly to the private `resume-sources` bucket with a signed URL.
2. Create an artifact and resume-import work item in one server-side operation.
3. Synchronize the artifact to the worker by checksum.
4. Parse `.tex` structurally; extract text/layout from PDF; safely unpack ZIP
   only inside the resume workspace with path and size limits.
5. Record source spans for every proposed experience, achievement, skill,
   project, date, technology, and metric.
6. Deduplicate facts across resume variants without silently combining
   contradictory claims.
7. Write proposed facts as draft records and create targeted open questions for
   ambiguity or conflict.
8. Require the user to accept, edit, merge, or reject every draft fact.
9. Mark accepted facts verified and preserve the original artifact provenance.
10. Organize verified facts as reusable experience, achievement, project, and
    skill components with role/industry/skill relevance tags.
11. Preserve uploaded layouts as optional templates without treating any one
    uploaded resume as the canonical or base resume.
12. When an opportunity needs a resume, select the strongest compatible
    components, generate a new LaTeX variant, compile and validate it, and upload
    source/PDF/diff artifacts without overwriting any uploaded source.

### Contract changes

Extend the resume agent contract and mutation registry with typed, transactional
mutations for experience, achievement, project, skill, resume import, resume
version, resume template, review question, and verification state. Every resume
item records the source artifact and source span. CI must reject any resume
output containing a number, date, technology, employer, or outcome absent from
the verified library.

### Resume completion gate

The resume portion is complete only when every non-deferred upload has been
processed, every proposed component has been accepted, corrected, merged, or
rejected, and there are no unresolved blocking fact conflicts. There is no base
resume completion requirement. The durable product is the verified component
library; opportunity-specific resumes are assembled from different components
later. Worker setup separately verifies LaTeX health using a system diagnostic
fixture so onboarding can detect a broken compiler without manufacturing a user
resume.

## Source onboarding pipeline

### Web experience

The source stage accepts URLs, handles, repositories, feeds, school resources,
newsletters, and named services. Each source gets its own live setup card:

`submitted -> inspecting -> strategy selected -> adapter building -> testing -> authentication required -> first read -> active`

The card shows what Career OS will read, cadence, authentication state, adapter
type, latest evidence, first-run result, and any action required. The user can
open the dedicated browser profile, authorize an account, retry, enable a
generated browser-agent skill, or explicitly defer a source through the web UI.

### Inspection and adapter selection

For each submitted source, Source Discovery first classifies access and passes
a typed adapter request to Adapter Builder. Adapter Builder chooses the safest
working strategy in this order:

1. Official/public API.
2. RSS/Atom.
3. Built-in ATS adapter.
4. JSON or GitHub Markdown/CSV.
5. Declarative HTML selector manifest.
6. Declarative dedicated-browser workflow.
7. A generated source-specific `SKILL.md` for a browser-read-only agent when the
   source cannot be reduced to a deterministic adapter.

Declarative manifests are generated, versioned, tested, and activated without
separate approval when they remain read-only and inside configured capability
limits. Custom executable source code is not the non-deterministic fallback.
Instead, Adapter Builder creates a concise source-specific skill at
`%LOCALAPPDATA%\CareerOS\workspace\source-skills\<source-id>\SKILL.md`, never in
this repository.

Each generated skill defines a single-purpose browser agent and contains only
the source knowledge needed to read that source:

- Valid skill frontmatter with a unique lowercase hyphenated name and a precise
  description that triggers only for that source.
- Allowed source domains, starting URLs, and dedicated browser-profile needs.
- Read-only navigation procedure, including pagination/story traversal and
  stopping conditions.
- The structured extraction schema, relevance rules, evidence requirements,
  deduplication keys, and healthy `no_change` behavior.
- Authentication, CAPTCHA, MFA, missing-page, and layout-change handling.
- Explicit prohibitions on posting, messaging, following, liking, commenting,
  registering, purchasing, uploading, or submitting.

The skill folder is versioned by checksum and validated before activation. Its
runtime agent receives only `browser_read` plus the narrow Career OS tools needed
to create evidence and signals. It has no shell, arbitrary filesystem, form-fill,
or external-write capability. The source monitor points to the skill version and
runs it on schedule through an internal managed runtime thread whose working
directory is the per-source runtime workspace, not this code project. A skill
that requests broader capabilities is rejected and returned for review.

For an authenticated source explicitly added during onboarding, adding the
source and completing its login is the one-time enablement. Newly discovered
authenticated sources still require an explicit web-UI enable action. If neither
a deterministic adapter nor the browser-only skill can read the source safely,
the source remains visibly unsupported rather than falling back to executable
scraping code.

### First read and activation

Passing an adapter unit test is not enough. Onboarding performs a real first
read after authentication, records evidence, creates normalized signals, and
runs deduplication. `success` and a genuine `no_change` are both healthy first
reads. Authentication, CAPTCHA, consent, and parser failures remain visible and
actionable; they are never reported as successful.

After a healthy first read, the monitor becomes active and receives its schedule
before onboarding advances. Signals immediately flow into Opportunity
Intelligence so the final onboarding review can show actual initial findings.

### Required built-in browser workflows

- **Instagram / `zero2sudo`:** verify the dedicated profile is logged in; read
  the configured account's active stories every two hours; capture only relevant
  frames; extract visible text and links; hash/deduplicate; retain screenshots
  for 30 days; and treat no current story as a healthy `no_change` read.
- **Handshake:** verify school authentication; read roles and events using a
  versioned declarative navigation workflow; never apply or register.
- **LinkedIn:** perform only targeted people/company/contact lookups connected to
  goals, meetings, or applications; do not bulk scrape or perform social actions.
- **GitHub:** inspect the submitted repository to locate the actual list/feed,
  then use a deterministic Markdown, CSV, release, or API adapter rather than
  assuming the README is always the source.
- **Application portals:** read status and prepare forms only under the separate
  approval and final-submit guard; portal setup is not permission to submit.

### Source completion gate

Every required source must be either:

- active with a tested adapter, healthy authenticated state when needed, a real
  first-run result, evidence, and a next scheduled run; or
- explicitly deferred by the user with a visible consequence.

Simply saving a URL or queueing a future discovery job does not satisfy the
gate.

## Revised web onboarding stages

The existing resumable structure remains, but the data-heavy stages become
interactive subflows with readiness gates:

1. Account, timezone, notification email, and privacy expectations.
2. Pair worker and verify Codex, browser, storage, and LaTeX capabilities.
3. Personal, academic, employment, career-season, goal, target, and constraint
   interview with dynamic follow-ups.
4. Resume ingestion and factual experience review using the full pipeline.
5. Gmail, Calendar, and GitHub authorization with first-sync health.
6. Dedicated browser account setup and web-guided authentication.
7. Known-source setup, per-source adapter construction, testing, first reads,
   and scheduling.
8. Initial related-source discovery with accept/defer controls.
9. Existing application, contact, mentor, meeting, and event import.
10. Schedule and notification confirmation.
11. Initial opportunity intelligence, positioning, and weekly-plan generation.
12. Final belief/readiness review and transactional completion.

Stable form data is submitted through authenticated Server Actions. Large file
uploads, OAuth callbacks, worker calls, and streaming setup use Route Handlers.
Personalized onboarding data is server-rendered fresh and not stored in shared
response caches. Interactive progress and upload controls are small client
components fed by authenticated, user-scoped data.

## Failure and recovery behavior

- Worker offline: keep uploads/configuration, show the precise blocked work, and
  resume automatically after heartbeat recovery.
- Browser logged out: mark only affected source work items `auth_required` and
  provide an Open dedicated browser action.
- Adapter failure: preserve evidence, enqueue bounded repair, show parser/version
  change, and require review only when capabilities expand.
- Resume extraction uncertainty: create a focused question and continue other
  independent files.
- LaTeX failure: preserve logs with redaction, keep verified facts, and allow a
  template retry without repeating extraction.
- Codex unavailable: keep jobs queued; never replace them with a paid model API.
- Page reload/device switch: restore all visible progress from Supabase rather
  than relying on local React or Codex thread memory.

## Implementation sequence

### 1. Readiness ledger and contracts

- Add the work-item table, indexes, RLS, Realtime publication, readiness RPC,
  completion RPC, database types, state-transition rules, and audit entries.
- Add typed resume-import and source-setup input/output contracts and mutation
  registry entries.
- Make all existing onboarding steps idempotent so retrying cannot duplicate
  goals, academic contexts, monitors, jobs, or schedules.

### 2. Resume ingestion vertical slice

- Finish signed multi-file upload and checksum synchronization.
- Implement safe PDF/TeX/ZIP parsing, fact provenance, deduplication, review UI,
  verification mutations, component tagging, template preservation, LaTeX
  health diagnostics, and later opportunity-specific compilation/diff support.
- Prove the complete slice with one PDF-only resume and one TeX-source resume.

### 3. Source adapter factory vertical slice

- Add adapter manifests, fixtures, tests, checksums, versions, activation state,
  generated browser-agent skill validation, and source-scoped runtime policy.
- Connect inspection -> build -> test -> first read -> schedule as a dependency
  chain tied to onboarding work items.
- Prove GitHub, ATS, RSS, generic HTML, and JSON adapters with deterministic
  fixtures before enabling browser-backed sources.

### 4. Authenticated browser source slice

- Implement dedicated-profile health and web-guided login actions.
- Build fixture-tested Instagram story, Handshake role/event, LinkedIn targeted
  lookup, portal status, and approved form-fill workflows.
- Run a real first read of `zero2sudo` after the user completes any necessary
  Instagram authentication.

### 5. Embedded onboarding UI

- Replace text placeholders and external-page detours with resume/source cards,
  progress timelines, evidence previews, dynamic questions, authentication
  actions, retry/defer controls, and final readiness blockers.
- Ensure 375px mobile and desktop behavior, keyboard access, explicit empty/error
  states, and persistence across reloads.

### 6. Downstream initialization

- Run connector first syncs, application/contact imports, related-source
  discovery, initial opportunity ranking, state curation, positioning, and
  weekly planning only when their declared prerequisites pass.
- Render the resulting opportunities and tasks in the final onboarding review.

### 7. Verification and rollout

- Add unit tests for contracts, readiness, transitions, parsing, provenance,
  adapter generation, generated skill validation/capability policy, component
  selection, and compilation.
- Add two-user RLS and transactional database tests.
- Add saved browser fixtures and final-submit blocking tests.
- Add desktop/mobile Playwright coverage for interruption, authentication,
  failure recovery, resume review, source activation, and onboarding completion.
- Run the complete onboarding golden path locally, then staging, then deploy the
  verified artifact and migrate production using the preserved backup strategy.

## Acceptance test

From a clean account, the user can complete onboarding entirely in Career OS:

1. Pair the worker.
2. Answer career questions and set the notification email.
3. Upload all PDF/TeX resume variants.
4. Review every extracted fact and receive a verified, reusable experience
   component library; no base resume is required.
5. Connect Gmail, Calendar, and GitHub.
6. Authenticate the dedicated browser accounts when prompted.
7. Add `https://www.instagram.com/zero2sudo/`, Handshake, and a GitHub source.
8. Watch Career OS inspect them, build/test adapters, perform first reads, show
   evidence, and schedule future monitoring.
9. Import applications and mentors.
10. Review initial discovered opportunities, current state, strategy, and tasks.
11. Complete onboarding only after the readiness RPC reports no hard blockers.
12. Close and reopen the browser and see the same completed state and active
    monitors without opening the Codex app.

This flow is the release gate. Source URLs saved without working adapters, resume
files stored without verified facts, or jobs merely queued for later all count as
onboarding failures.
