# Career OS Contract

## Purpose

The Career OS contract is the boundary between agents and the application.

Agents should not decide how database tables work. Agents should read typed context and propose typed mutations. The backend validates those mutations, applies safe changes, creates approval requests when needed, and records audit logs.

This keeps the UI reliable because the UI renders canonical objects, not free-form agent text.

## Contract Layers

```text
Object schema
  -> Mutation schema
  -> Tool schema
  -> Validation policy
  -> UI rendering contract
  -> Audit log
```

## Object Envelope

Every major object should share a common envelope:

```ts
type CareerObjectEnvelope = {
  id: string;
  objectType: string;
  title: string;
  status: string;
  labels: string[];
  priority?: number;
  dueAt?: string;
  relatedGoalIds: string[];
  relatedApplicationIds: string[];
  relatedOpportunityIds: string[];
  relatedContactIds: string[];
  relatedEventIds: string[];
  evidenceIds: string[];
  createdBy: "user" | "agent" | "system";
  createdByAgentRunId?: string;
  updatedBy: "user" | "agent" | "system";
  updatedByAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
};
```

The UI can use this envelope for universal lists, search, filtering, labels, and timeline views.

## Mutation Envelope

Agents should return proposed mutations in a standard format:

```ts
type ProposedMutation = {
  id: string;
  mutationType: string;
  targetObjectType: string;
  targetObjectId?: string;
  payload: unknown;
  rationale: string;
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
  approvalPolicy: "auto_apply" | "approval_required" | "never_auto_apply";
};
```

The backend decides whether `auto_apply` is actually allowed.

## Initial Core Objects

### Goal

```ts
type Goal = CareerObjectEnvelope & {
  objectType: "goal";
  horizon: "long_term" | "1_year" | "90_day" | "30_day" | "week";
  track: "swe" | "entrepreneurship" | "fde" | "exploration" | "general";
  parentGoalId?: string;
  targetDate?: string;
  allocationPercent?: number;
  rationale: string;
};
```

### Task

```ts
type Task = CareerObjectEnvelope & {
  objectType: "task";
  taskType:
    | "job_app"
    | "mentor"
    | "event"
    | "resume"
    | "project"
    | "skill"
    | "research"
    | "admin"
    | "check_in"
    | "source_setup";
  effort: "small" | "medium" | "large";
  urgency: "low" | "normal" | "high" | "time_sensitive";
  energy: "low" | "medium" | "high";
  source: "user" | "agent" | "monitor" | "calendar" | "email";
  completionNotes?: string;
};
```

### Opportunity

```ts
type Opportunity = CareerObjectEnvelope & {
  objectType: "opportunity";
  opportunityType: "job" | "internship" | "event" | "program" | "fellowship" | "competition" | "other";
  companyId?: string;
  roleTargetId?: string;
  url?: string;
  sourceMonitorId?: string;
  discoveredAt: string;
  deadlineAt?: string;
  fitRationale: string;
};
```

### Application

```ts
type Application = CareerObjectEnvelope & {
  objectType: "application";
  opportunityId: string;
  companyId?: string;
  status:
    | "found"
    | "interested"
    | "drafting"
    | "ready_to_submit"
    | "submitted"
    | "oa"
    | "interview"
    | "rejected"
    | "ghosted"
    | "offer"
    | "withdrawn";
  deadlineAt?: string;
  submittedAt?: string;
  resumeVariantId?: string;
  nextActionTaskId?: string;
};
```

### SourceMonitor

```ts
type SourceMonitor = CareerObjectEnvelope & {
  objectType: "source_monitor";
  sourceType:
    | "github_repo"
    | "company_careers_page"
    | "greenhouse_board"
    | "lever_board"
    | "ashby_board"
    | "school_event_calendar"
    | "newsletter"
    | "social_account"
    | "community_page"
    | "manual_list";
  url: string;
  fetchStrategy: "http" | "git_pull" | "browser" | "manual" | "api";
  schedule: string;
  localPath?: string;
  parserScriptPath?: string;
  requiresAuth: boolean;
  lastRunAt?: string;
};
```

### ResumeVariant

```ts
type ResumeVariant = CareerObjectEnvelope & {
  objectType: "resume_variant";
  baseVersionId: string;
  applicationId?: string;
  companyId?: string;
  roleTargetId?: string;
  latexPath: string;
  pdfPath?: string;
  diffPath?: string;
  rationale: string;
  status: "draft" | "ready_for_review" | "approved" | "used" | "archived";
};
```

## Initial Tool Names

Read tools:

- `career.profile.read`
- `career.goals.list`
- `career.tasks.list`
- `career.applications.list`
- `career.opportunities.list`
- `career.contacts.list`
- `career.events.list`
- `career.resume.library_read`
- `career.sources.list`
- `career.audit.list`

Write/proposal tools:

- `career.mutations.propose`
- `career.approvals.create`
- `career.resume_variant.create`
- `career.source_monitor.propose`
- `career.source_adapter.write`

Direct mutation should happen only inside the backend mutation applier, not inside agent prompts.

## Mutation Validation

Backend validation should check:

- object exists if updating
- required fields present
- status transitions valid
- target ids valid
- approval policy correct
- irreversible actions blocked
- duplicate opportunity/application detection
- evidence attached for recommendations
- UI envelope can be rendered

## UI Rendering

The UI should render from object fields:

- task board from `Task`
- applications pipeline from `Application`
- weekly briefing from `WeeklyPlan`, `Task`, `Opportunity`, `Event`, `Contact`
- resume library from `ResumeVersion` and `ResumeVariant`
- approval inbox from `ApprovalRequest`
- audit log from `AuditLogEntry`

Agent summaries are useful, but they are not the UI source of truth.

