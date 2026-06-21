# Source Monitors and Job Search

## Principle

AI should discover, evaluate, and maintain sources. Deterministic scripts should do repetitive scanning whenever possible.

```text
Discover source
  -> evaluate fit
  -> create SourceMonitor proposal
  -> build fetch/parse script
  -> test script
  -> enable monitor after approval if needed
  -> run on schedule
  -> emit signals
  -> invoke AI only when judgment is needed
```

## Source Types

Initial source types:

- `github_repo`
- `company_careers_page`
- `greenhouse_board`
- `lever_board`
- `ashby_board`
- `school_event_calendar`
- `newsletter`
- `social_account`
- `community_page`
- `manual_list`
- `email_application_status`
- `application_portal`
- `calendar_events`

## Source Monitor Object

```ts
type SourceMonitor = {
  id: string;
  name: string;
  sourceType: string;
  url: string;
  status: "proposed" | "active" | "paused" | "broken" | "archived";
  schedule: string;
  fetchStrategy: "http" | "git_pull" | "browser" | "manual" | "api";
  parserScriptPath?: string;
  localPath?: string;
  lastSeenCursor?: string;
  lastSeenHash?: string;
  requiresAuth: boolean;
  approvalRequired: boolean;
  relatedGoalIds: string[];
  relatedCompanyIds: string[];
  createdByAgentRunId: string;
};
```

## GitHub Repo Monitor

Example:

```text
Source: Summer 2027 internship GitHub repo
Fetch: git clone once, git pull on schedule
Parse: parse markdown tables/lists into OpportunityCandidate rows
AI: dedupe, rank, map to target roles, create application tasks
```

The local worker should own cloning and pulling.

## Social Account Monitor

Social monitoring needs special handling.

Examples:

- zero2sudo Instagram posts.
- Relevant Twitter/X accounts.
- Startup/fellowship announcement accounts.

Rules:

- Prefer official feeds, RSS, emails, or public pages when available.
- Use browser/computer use only when no structured path exists.
- Authenticated browser monitoring requires approval and clear audit logs.
- The system should store extracted signals, not broad browsing history.

## Event Scanner

Event scanning should connect events to goals and applications.

Example:

```text
Apple application opens
School Apple event appears
System links both
System raises event and application tasks in priority
```

Event recommendations should include:

- related goals
- related companies
- related applications
- relevant contacts
- concrete next action
- deadline/date

## Application Status Checks

Application status checks are scheduled monitors tied to active applications.

Preferred check order:

1. Gmail/email signal from the company or ATS.
2. Calendar signal for OA, interview, deadline, or event.
3. Application portal page.
4. User manual status.
5. Browser/computer use with approval.

Status checks should update the `Application` only when there is evidence. Otherwise they should create a task or approval request.

Examples:

- email says rejected -> update application to `rejected` with evidence
- email says interview invite -> update to `interview`, create scheduling/prep tasks
- portal changed but confidence is low -> create approval request
- no change after scheduled check -> record `no_change`, schedule next check

## Monitor Runs

Every run should create a `SourceRun`:

```ts
type SourceRun = {
  id: string;
  sourceMonitorId: string;
  startedAt: string;
  completedAt?: string;
  status: "success" | "failed" | "no_change" | "needs_review";
  newSignalCount: number;
  newOpportunityCount: number;
  logPath?: string;
  error?: string;
};
```

## When AI Should Run

Run AI when:

- a new source is discovered
- a parser needs to be written or repaired
- new opportunities need ranking
- duplicates are ambiguous
- an opportunity may change the weekly plan
- a source requires browser/computer use
- a monitor produces unexpected output
- an application status change needs interpretation

Do not run AI just to poll a repository or fetch a known page.
