# Architecture v1

## Purpose

Career OS is a personal career momentum system. It should reduce time spent searching, organizing, and deciding what to do next, while increasing the quality and consistency of actual action.

The system is built for one user first. It should still be modular enough that future users can plug in different agent harnesses, databases, source monitors, or UI clients.

## Non-Goals

- Do not build a broad consumer career product first.
- Do not rely on paid model API usage for core AI execution.
- Do not let agents directly submit applications or send messages.
- Do not use Codex threads as the source of truth for career state.
- Do not make every recurring scan an AI call if a deterministic script can handle it.

## System Overview

```text
Phone/Desktop Browser
  -> Web App
  -> Supabase Auth/Postgres/Realtime
  -> Agent Job Queue
  -> Local Home Agent Worker
  -> Codex App Server
  -> Local tools, scripts, browser/computer use, files
```

The hosted database is the durable state layer. The local worker is the execution layer. Codex App Server is the first agent runtime.

## Deployment Shape

### Web App

Recommended: Next.js.

Responsibilities:

- Dashboard.
- Chat/advisor UI.
- Weekly briefing UI.
- Applications pipeline.
- Goals and timeline view.
- Resume library.
- Source monitor management.
- Approval inbox.
- Audit log viewer.

The web app reads and writes Supabase. It does not talk directly to Codex App Server.

### Database

Recommended: Supabase Postgres from the start.

Reasons:

- Phone access works naturally.
- Auth and Realtime are available.
- State survives even if the home computer is asleep.
- Local worker can queue work and resume later.
- Schema can be developed locally with Supabase CLI if desired.

### Local Home Agent Worker

Runs on the user's computer.

Responsibilities:

- Poll or subscribe to pending agent jobs.
- Start/resume Codex App Server threads.
- Invoke skills.
- Provide Career OS tools to agents.
- Run deterministic source monitor scripts.
- Clone and pull source repositories.
- Generate or update parser scripts.
- Manage local resume LaTeX files.
- Use browser/computer use only when structured access is insufficient.
- Write structured results back to Supabase.

If the computer is offline, jobs remain queued.

### Codex App Server

Used as the first agent runtime.

Responsibilities:

- Persistent Codex threads.
- Turn execution.
- Streaming agent events.
- Approvals.
- Tool calls.
- Skill invocation.
- Structured output schemas.
- Local filesystem and shell access through controlled policies.

Codex App Server should be hidden behind an adapter:

```ts
interface AgentRuntime {
  startThread(input: StartThreadInput): Promise<RuntimeThread>;
  resumeThread(threadId: string): Promise<RuntimeThread>;
  runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
}
```

Future adapters:

- `CodexAppServerRuntime`
- `CodexExecRuntime`
- `ClaudeCodeRuntime`
- `OpenHandsRuntime`

## Source of Truth

Career OS database is the source of truth.

Codex threads are execution logs and context containers. They are not the canonical store for:

- goals
- tasks
- applications
- opportunities
- mentors
- events
- resumes
- source monitors
- approvals
- check-ins

## Career OS Contract

Agents must interact through a stable object and mutation contract.

```text
Agent reads context
  -> agent proposes typed mutations
  -> backend validates mutations
  -> safe mutations auto-apply
  -> sensitive mutations become approval requests
  -> audit log records what happened
```

Agents should not write arbitrary SQL.

Example mutation:

```json
{
  "type": "goal.upsert",
  "payload": {
    "title": "Secure a SWE internship for summer 2027",
    "horizon": "1_year",
    "track": "swe",
    "status": "active",
    "rationale": "Internship season is heating up and SWE is the active hedge toward FDE.",
    "evidenceIds": []
  }
}
```

## Approval Model

Agents can do almost everything except irreversible or externally visible actions.

Auto-allowed candidates:

- Create tasks.
- Update task priorities.
- Add opportunities.
- Update application metadata.
- Generate resume variants.
- Draft outreach.
- Build source monitor scripts.
- Clone public repositories into configured monitor directories.
- Pull configured repositories.
- Create calendar block proposals.

Approval-required candidates:

- Send email or direct message.
- Submit an application.
- Mark an application as submitted if not verifiable.
- Delete canonical records.
- Change long-term goals.
- Enable a new monitor that requires credentials.
- Use full computer/browser control for authenticated websites.
- Publish files outside configured folders.

Every approval request should include:

- action
- target
- rationale
- source/evidence
- reversibility
- expected side effects
- agent/thread/turn ids

## Agent Thread Strategy

Thread records are stored in the database and mapped to Codex thread IDs.

Recommended thread types:

- `advisor/global`
- `onboarding/profile`
- `weekly/YYYY-WW`
- `job_scan/source/<source_id>`
- `application/<application_id>`
- `mentor/<contact_id>`
- `event/<event_id>`
- `resume/<resume_variant_id>`
- `source_adapter/<source_id>`

Thread policy:

- Use long-lived threads where context should accumulate.
- Use short-lived threads for one-off generation tasks.
- Archive threads when the associated object is complete or inactive.
- Store compact summaries in the database so future runtimes are not tied to Codex thread history.

## First-Class Workflows

### Onboarding

Onboarding is a dynamic interview and ingestion process.

Inputs:

- resumes
- GitHub profile
- calendar availability
- email/application status access
- existing projects
- target roles
- target companies
- constraints
- current timelines
- entrepreneurial goals
- preferred opportunity sources

Outputs:

- profile
- goal hierarchy
- active tracks
- initial task dashboard
- application strategy
- source monitors to configure
- resume library baseline
- check-in cadence

Job search setup is part of onboarding.

### Job Search

Job search should find durable sources first:

- GitHub internship repositories.
- Company career pages.
- Greenhouse/Lever/Ashby boards.
- School event calendars.
- Niche newsletters.
- Social accounts.
- Discord/Slack/community feeds where allowed.
- Target company lists.

Agents should create source monitors when they find repeatable sources.

### Weekly Briefing

Weekly briefing produces a dynamic plan.

Inputs:

- active goals
- timelines
- check-in data
- task completion
- applications
- new opportunities
- mentor/contact state
- events
- calendar availability
- source monitor signals

Outputs:

- updated tasks
- reprioritization rationale
- time-sensitive opportunities
- application actions
- mentor follow-ups
- event recommendations
- resume/materials work

### Resume Library

Resumes should be generated and managed as LaTeX projects.

Every generated resume variant should track:

- source template
- target role/company
- included experiences
- modified bullets
- compile artifact
- application linkage
- diff from base
- approval status

## UI Principles

No score-first dashboard.

The point is action. The main dashboard should show what to do and why.

Primary dashboard sections:

- Needs Approval
- Do Today
- Time Sensitive
- Job Apps
- Resume / Materials
- Mentors & Follow-Ups
- Events
- Projects & Skills
- Waiting On
- Recently Changed

Labels should be functional:

- job app
- mentor
- event
- resume
- project
- skill
- research
- admin
- check-in
- source setup
- stretch
- maintenance

## Trust Requirements

The system must make agent behavior inspectable.

For every meaningful change:

- who/what changed it
- when
- source evidence
- rationale
- affected objects
- thread/turn ids
- whether it was auto-applied or approved

Every object should have a change history.

## Cost Strategy

The system should avoid AI calls when deterministic automation is sufficient.

Pattern:

```text
AI discovers source
  -> AI builds script or parser
  -> deterministic monitor runs on schedule
  -> AI only re-enters for ranking, ambiguity, parser repair, or strategic judgment
```

Codex App Server uses the user's local Codex/ChatGPT access. Hosted services should be limited to web UI and state.

