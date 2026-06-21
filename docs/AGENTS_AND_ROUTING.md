# Agents and Routing

## Model

An agent in Career OS is an app-level worker definition. It may use a Codex skill, Codex custom agent, dynamic tools, deterministic scripts, or future runtimes.

```text
Career OS Agent
  -> AgentDefinition in database/code
  -> SKILL.md for Codex-specific behavior
  -> allowed Career OS tools
  -> output schema
  -> thread policy
  -> approval rules
```

Do not make the system depend on Codex-only concepts at the domain layer.

## Initial Agents

### Advisor Agent

Purpose:

- Main conversational interface.
- Answer questions using full Career OS context.
- Route work to specialized agents.
- Explain current plan, goals, tasks, and tradeoffs.

Thread policy:

- Long-lived global thread.

### Onboarding Agent

Purpose:

- Run dynamic interviews.
- Ingest resumes, projects, GitHub, calendar/email permissions, target roles, preferences, and constraints.
- Determine academic context: college year, current term, expected graduation date, school calendar, timezone, and recruiting season.
- Build the initial profile, goals, applications strategy, resume library baseline, and source monitor proposals.

Thread policy:

- Long-lived onboarding thread.

### Job Sourcing Agent

Purpose:

- Find and maintain durable opportunity sources.
- Set up source monitors during onboarding and scheduled discovery refreshes.
- Prefer GitHub repos, company boards, school/event sources, niche lists, and relevant social/resource accounts over broad job boards.
- Create source monitor proposals.
- Trigger Source Adapter Builder jobs for sources that need parsers.
- Support manual browser/computer-use discovery runs when the user kicks off a search.

Thread policy:

- One global strategy thread.
- One thread per source for recurring source context.

Spec:

- See [Job Sourcing Agent Spec](JOB_SOURCING_AGENT_SPEC.md).

### Opportunity Ranking Agent

Purpose:

- Consume raw signals from source monitors.
- Dedupe opportunities.
- Rank opportunities against target roles, goals, constraints, and source quality.
- Produce rich role briefs and planner hints for every actionable recommendation.
- Create opportunity records, application candidates, and next-action tasks.
- Configure scheduled application status checks when an application is created.

Thread policy:

- One global ranking thread.
- Optional one thread per high-value source or opportunity cluster.

Spec:

- See [Opportunity Ranking Agent Spec](OPPORTUNITY_RANKING_AGENT_SPEC.md).

### Source Adapter Builder Agent

Purpose:

- Build deterministic scripts for repeatable sources.
- Clone/pull configured repositories.
- Parse source data into structured signals.
- Repair parsers when source formats change.

Thread policy:

- One thread per source.

### Weekly Planner Agent

Purpose:

- Convert goals, timelines, applications, events, mentors, calendar availability, and recent activity into action items.
- Reprioritize tasks when important opportunities appear.
- Reflect completion rates and check-ins into pacing.
- Account for academic calendar constraints, recruiting season, application deadlines, and scheduled status checks.

Thread policy:

- One thread per week.

### Resume Tailor Agent

Purpose:

- Generate role-specific LaTeX resume variants.
- Modify bullets against the user's existing format.
- Produce PDF artifacts.
- Link variants to applications.

Thread policy:

- One thread per resume variant or application.

### Mentor Manager Agent

Purpose:

- Track mentor relationships.
- Draft follow-ups.
- Recommend new mentor targets.
- Detect stale relationships.

Thread policy:

- One global relationship thread.
- Optional one thread per important contact.

### Event Scanner Agent

Purpose:

- Find relevant events.
- Tie events to goals, companies, applications, or mentors.
- Recommend event tasks and follow-up actions.
- Use calendar and email context when enabled to avoid conflicts and detect relevant school/company events.

Thread policy:

- One global events thread.
- Optional per source/event thread.

## Routing Modes

### Direct UI Routing

Buttons and pages should route deterministically:

| UI Surface | Agent |
| --- | --- |
| Chat | Advisor |
| Onboarding | Onboarding |
| Weekly Briefing | Weekly Planner |
| Find Sources | Job Sourcing |
| Rank Opportunities | Opportunity Ranking |
| Application Status Check | Application status workflow |
| Source Monitor Setup | Job Sourcing or Source Adapter Builder |
| Resume Library | Resume Tailor |
| Application Detail | Resume Tailor or Job Finder |
| Mentors | Mentor Manager |
| Events | Event Scanner |
| Approval Inbox | No agent by default, user action first |

### Advisor Routing

The Advisor can route free-form requests:

```text
User asks Advisor
  -> Advisor classifies intent
  -> backend creates AgentJob for specialized agent
  -> specialized agent runs
  -> result mutations are validated
  -> Advisor summarizes outcome
```

The backend should execute the route. The model can recommend routing, but the app should own routing rules.

## Skill Layout

Recommended repository layout:

```text
.agents/skills/
  career-advisor/
    SKILL.md
  career-onboarding/
    SKILL.md
  career-job-sourcing/
    SKILL.md
  career-opportunity-ranking/
    SKILL.md
  career-source-adapter-builder/
    SKILL.md
  career-weekly-planner/
    SKILL.md
  career-resume-tailor/
    SKILL.md
  career-mentor-manager/
    SKILL.md
  career-event-scanner/
    SKILL.md
```

Every skill should reference the same Career OS contract:

- object catalog
- mutation rules
- approval rules
- output schema
- UI rendering requirements

## Tool Contract

Agents should access state through tools, not raw SQL.

Initial read tools:

- `career.profile.read`
- `career.goals.list`
- `career.tasks.list`
- `career.applications.list`
- `career.opportunities.list`
- `career.contacts.list`
- `career.events.list`
- `career.resume.library_read`
- `career.sources.list`
- `career.academic_context.read`
- `career.constraints.list`
- `career.connected_accounts.list`

Initial mutation tools:

- `career.mutations.propose`
- `career.approvals.create`
- `career.source_monitor.propose`
- `career.resume_variant.create`
- `career.application_status_check.schedule`
- `career.application_status_check.record_result`

The backend decides which mutations auto-apply.

## Output Schema Pattern

Every agent turn should return structured output:

```json
{
  "summary": "What the agent did.",
  "proposedMutations": [],
  "approvalRequests": [],
  "evidence": [],
  "followUpQuestions": [],
  "warnings": []
}
```

This lets the UI update from structured state.

## Subagents

Codex subagents are useful for fan-out, but should not be the primary app routing mechanism.

Good use cases:

- Job Finder asks multiple researchers to inspect different source types.
- Resume Tailor asks one agent to inspect role requirements and another to inspect resume bullets.
- Weekly Planner asks one agent to inspect applications and another to inspect events.

The parent agent should merge results and return one structured output.
