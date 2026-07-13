# Agent Contracts

Career OS agents are independent runtime units. The pipeline can orchestrate them later, but each agent must be runnable by itself with a clear contract.

The executable contract registry lives in `packages/core/src/agent-contracts.ts`. This document is the reviewable version of the same boundary.

## Contract Rules

- Supabase canonical objects are the source of truth.
- Agents return structured `agentOutput` only: proposed mutations, approval requests, evidence, follow-up questions, and warnings.
- Safe mutations go through the mutation applier.
- External or irreversible actions require approval.
- Missing `input.type` is allowed with a warning for backward compatibility.
- Invalid `input.type` fails before the runtime starts.
- Out-of-contract mutations are ignored and logged as `contract_warning` events.

## Agent I/O

| Agent | Inputs | Primary dependencies | Primary outputs |
|---|---|---|---|
| `career-advisor` | `advisor.chat`, `advisor.route_request` | profile, goals, tasks, applications, approvals, source monitors, recent runs | answers, follow-up questions, `agent_job.create`, light goal/task proposals |
| `career-onboarding` | `onboarding.start`, `onboarding.answer`, `onboarding.resume_ingest` | interview answers, current date/time, resume baseline, connected account state | profile, academic context, constraints, goals, companies, role targets, experiences, projects, skills, baseline resume metadata, source setup |
| `career-positioning` | `positioning.review`, `positioning.season_update`, `positioning.goal_change` | profile, academic context, goals, completion history, date/time | goal/season updates, allocation recommendations, downstream sourcing/planning jobs |
| `career-job-sourcing` | `job_sourcing.discover`, `job_sourcing.inspect_source`, `job_sourcing.repair_source` | profile, role targets, target season, companies, source preferences, account hints | source discovery runs, source candidates, proposed source monitors, source signals, adapter-builder jobs |
| `career-source-adapter-builder` | `source_adapter.build`, `source_adapter.repair`, `source_adapter.test` | source candidate/monitor, parser conventions, local script paths | monitor metadata/health updates, deterministic signal output, ranking jobs |
| `career-job-finder` | `job_finder.search`, `job_finder.from_source`, `job_finder.company_scan` | active monitors, role targets, companies, applications, resume baseline | opportunities, draft applications, status checks, tasks, ranking/resume/planner jobs |
| `career-opportunity-ranking` | `opportunity_ranking.rank_batch`, `opportunity_ranking.dedupe` | opportunities, signals, goals, constraints, applications, role targets | opportunity recommendations, rationale, planner hints, downstream jobs |
| `career-weekly-planner` | `weekly_planner.plan_week`, `weekly_planner.replan`, `weekly_planner.check_in` | goals, tasks, applications, recommendations, calendar constraints, completion history | dashboard tasks, task updates, application metadata updates |
| `career-resume-tailor` | `resume_tailor.create_variant`, `resume_tailor.review_variant` | resume templates/versions, experiences, projects, skills, target application/opportunity | resume variants, resume bullets, file creation tasks, linked application metadata |
| `career-event-scanner` | `event_scanner.search`, `event_scanner.company_context` | goals, companies, applications, calendar constraints | events, event opportunities, event tasks, event source monitors |
| `career-mentor-manager` | `mentor_manager.review`, `mentor_manager.find_targets`, `mentor_manager.follow_up_plan` | contacts, mentor relationships, goals, applications, calendar constraints | contacts, mentor relationship updates, follow-up tasks, outreach approval drafts |

## Current Boundary

This phase does not add automatic multi-agent orchestration. Agents may propose downstream `agent_job.create` records, but a later pipeline will decide when to chain them automatically.
