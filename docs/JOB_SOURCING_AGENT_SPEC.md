# Job Sourcing Agent Spec

## Purpose

The Job Sourcing Agent finds and maintains durable sources of career opportunities.

It is not the final planner and it is not the main opportunity ranker. Its job is to discover sources, evaluate whether they are worth monitoring, configure `SourceMonitor` records, and trigger parser setup when a source is useful enough to keep.

```text
Job Sourcing Agent
  -> discovers source candidates
  -> evaluates source quality
  -> creates or updates SourceMonitor records
  -> requests parser setup or repair
  -> hands source output to Opportunity Ranking
```

## Agent Identity

Recommended agent id: `career-job-sourcing`

Recommended display name: `Job Sourcing`

Thread policy: `global` for general sourcing strategy, plus `per_source` threads for important recurring sources.

Default queue: `sources`

Primary output: `SourceMonitor` proposals, source health updates, parser build requests, and source discovery reports.

## Scope

The agent owns:

- Finding new job, internship, fellowship, event, and program sources.
- Searching GitHub, the web, known company systems, communities, newsletters, and approved social accounts.
- Opening the user's browser or local computer session when a manual run or enabled source permits it.
- Evaluating source quality, freshness, trust, relevance, parseability, and maintenance cost.
- Creating `SourceMonitor` records for durable sources.
- Updating stale or broken source metadata.
- Requesting Source Adapter Builder work for sources that need custom fetch or parse scripts.
- Capturing evidence for why a source was added or ignored.

The agent does not own:

- Ranking individual opportunities against all user goals.
- Building the final day-by-day or week-by-week plan.
- Tailoring resumes.
- Sending DMs, posting, commenting, or publishing anything.
- Submitting applications.
- Becoming the source of truth for source state outside the Career OS database.

## Relationship To Other Agents

### Source Adapter Builder

The Job Sourcing Agent decides a source is worth keeping. The Source Adapter Builder makes the source repeatable.

```text
Sourcing finds "Summer 2027 internships repo"
  -> SourceMonitor created with fetchStrategy = git_pull
  -> Adapter Builder writes parser
  -> monitor emits raw signals
```

### Opportunity Ranking Agent

The Opportunity Ranking Agent consumes structured source output and ranks individual opportunities.

```text
SourceMonitor run emits Signal rows
  -> Opportunity Ranking Agent dedupes and ranks
  -> creates recommended Opportunity records and next-action tasks
```

### Weekly Planner

The Weekly Planner receives recommended opportunities and other signals later. The Job Sourcing Agent should not directly create the user's final plan.

## Run Modes

### Onboarding Discovery

Runs during onboarding after the user provides target roles, target companies, preferred locations, school context, and source preferences.

Expected behavior:

- Run broad discovery across GitHub, web search, company boards, known ATS systems, school resources, and user-specified social/community accounts.
- Produce an initial source portfolio.
- Create high-confidence monitors automatically when the source is public and non-authenticated.
- Create enabled authenticated/browser monitors when the user has explicitly included that source during onboarding.
- Queue parser setup jobs for source types that are not already supported.

Recommended cadence: once during onboarding, then only rerun manually or as a later full refresh.

### Scheduled Discovery Refresh

Runs less frequently than source monitors.

Expected behavior:

- Search for new sources.
- Check whether existing source classes have better alternatives.
- Detect stale GitHub repos or community lists.
- Find new seasonal repos as recruiting cycles change.
- Update source health.
- Avoid redoing expensive browser work unless the monitor or schedule explicitly allows it.

Recommended cadence:

- Weekly during peak recruiting season.
- Biweekly or monthly outside peak season.
- Immediately after multiple active sources stop producing usable signals.

### Manual Deep Search

User-triggered run from the UI.

Expected behavior:

- Use search, browser use, and computer use more aggressively.
- Start from a user prompt such as "find more SWE internship sources" or "go use my browser to check zero2sudo and related accounts."
- Use the existing browser profile when the user triggers browser-backed search.
- Capture relevant screenshots and evidence.
- Create or update sources based on what was found.
- Return a clear report of what it searched, what worked, and what sources were added or rejected.

Manual kickoff is considered permission to use browser/computer use for the requested search scope.

### Source Repair Discovery

Triggered when a source monitor fails repeatedly or returns unexpected output.

Expected behavior:

- Inspect the source.
- Decide whether the source is broken, changed, stale, blocked, or no longer useful.
- Either request parser repair, update source metadata, pause the source, or replace it with a better source.

## Permission Model

For the Job Sourcing Agent, the user policy is:

- Opening pages, searching, inspecting content, taking screenshots, cloning public repos, pulling repos, and creating source records are allowed when the run mode or source configuration permits them.
- Approval is required only for posting or DMing of any kind.
- The agent should not post, comment, reply, DM, or publish content as part of sourcing.
- The agent should not mutate social account state unless that behavior is explicitly added to a future agent spec.

Browser/computer use is allowed in two cases:

- The user manually kicks off a search that asks for browser/computer use.
- A configured source has `fetchStrategy: "browser"` and browser access is enabled for scheduled runs.

The agent must still log browser-backed runs with evidence and artifacts so behavior is inspectable.

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

The Job Sourcing Agent should focus first on durable opportunity sources:

1. GitHub internship and new-grad repositories.
2. ATS-backed company boards.
3. School event and recruiting pages.
4. Niche newsletters and communities.
5. Target company lists.
6. Approved social accounts.

## Source Evaluation

Every source candidate should be scored before it becomes active.

Recommended scoring dimensions:

| Field | Meaning |
| --- | --- |
| `relevanceScore` | How closely the source matches target roles, companies, stage, and timeline. |
| `freshnessScore` | How recently the source has been updated. |
| `signalDensityScore` | How many useful opportunities it produces per run. |
| `trustScore` | Whether the source is official, reputable, maintained, or cross-confirmed. |
| `parseabilityScore` | How reliably a script can extract structured data. |
| `maintenanceCostScore` | How much work it will take to keep the source working. Lower is better. |
| `authBurdenScore` | Whether the source needs login, browser use, or manual handling. Lower is better. |
| `strategicValueScore` | Whether the source covers rare or high-value opportunities. |

Recommended decision thresholds:

- `active`: strong relevance, usable freshness, and repeatable fetch path.
- `proposed`: useful but needs parser work, browser setup, or user preference confirmation.
- `paused`: previously useful but stale, broken, duplicative, or low yield.
- `rejected`: not relevant, too noisy, unsafe, unavailable, or not repeatable.

## Data Model Additions

The existing `SourceMonitor` object is the core durable object. The sourcing workflow also needs a few supporting records.

### SourceCandidate

Temporary or durable record used during discovery before a monitor is created.

```ts
type SourceCandidate = {
  id: string;
  title: string;
  sourceType: SourceMonitor["sourceType"];
  url: string;
  discoveredByAgentRunId: string;
  discoveryMode: "onboarding" | "scheduled" | "manual" | "repair";
  fetchStrategyGuess: SourceMonitor["fetchStrategy"];
  requiresAuth: boolean;
  evidenceIds: string[];
  scores: {
    relevance: number;
    freshness: number;
    signalDensity: number;
    trust: number;
    parseability: number;
    maintenanceCost: number;
    authBurden: number;
    strategicValue: number;
  };
  recommendation: "activate" | "propose" | "ignore" | "replace_existing";
  rationale: string;
  relatedSourceMonitorId?: string;
};
```

### SourceDiscoveryRun

One execution of the sourcing agent.

```ts
type SourceDiscoveryRun = {
  id: string;
  startedAt: string;
  completedAt?: string;
  mode: "onboarding" | "scheduled" | "manual" | "repair";
  status: "success" | "failed" | "partial" | "needs_review";
  query: string;
  scope: string[];
  browserUseAllowed: boolean;
  computerUseAllowed: boolean;
  sourceCandidatesFound: number;
  sourceMonitorsCreated: number;
  sourceMonitorsUpdated: number;
  parserJobsQueued: number;
  logPath?: string;
  error?: string;
};
```

### SourceHealth

Can be stored directly on `SourceMonitor` or as a separate history table.

```ts
type SourceHealth = {
  sourceMonitorId: string;
  checkedAt: string;
  status: "healthy" | "stale" | "broken" | "blocked" | "low_yield" | "unknown";
  lastUsefulSignalAt?: string;
  consecutiveFailures: number;
  averageSignalsPerRun?: number;
  recommendation: "keep" | "repair" | "pause" | "replace";
  rationale: string;
};
```

## SourceMonitor Fields

The existing `SourceMonitor` should support the following fields for this agent:

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
  browserUseEnabled?: boolean;
  relatedGoalIds: string[];
  relatedCompanyIds: string[];
  createdByAgentRunId: string;
};
```

## Job Payloads

### Discover Sources

```json
{
  "type": "job_sourcing.discover",
  "mode": "manual",
  "query": "Find more SWE internship sources for summer 2027, including GitHub repos and social accounts like zero2sudo.",
  "scope": ["github_repo", "company_careers_page", "social_account", "community_page"],
  "browserUseAllowed": true,
  "computerUseAllowed": true,
  "maxDurationMinutes": 45,
  "targetRoles": ["swe_intern", "founder_facing_engineer"],
  "targetSeason": "summer_2027",
  "targetLocations": ["remote", "us"],
  "sourceCountGoal": 20
}
```

### Scheduled Refresh

```json
{
  "type": "job_sourcing.discover",
  "mode": "scheduled",
  "query": "Refresh durable job sources for active goals.",
  "scope": ["github_repo", "company_careers_page", "school_event_calendar", "newsletter"],
  "browserUseAllowed": false,
  "computerUseAllowed": false,
  "maxDurationMinutes": 20
}
```

### Repair Source

```json
{
  "type": "job_sourcing.repair_source",
  "sourceMonitorId": "uuid",
  "mode": "repair",
  "browserUseAllowed": true,
  "computerUseAllowed": true,
  "maxDurationMinutes": 20
}
```

## Agent Output Schema

```json
{
  "summary": "Found 14 candidate sources, created 5 monitors, queued 3 parser jobs.",
  "sourceCandidates": [],
  "sourceMonitorMutations": [],
  "parserJobRequests": [],
  "evidence": [],
  "warnings": [],
  "ignoredSources": [],
  "nextRecommendedRunAt": "2026-06-28T09:00:00-06:00"
}
```

The output should also be expressible through the standard Career OS `agentOutputSchema`:

- `proposedMutations` for source monitor creation or updates.
- `evidence` for screenshots, pages, repo metadata, and excerpts.
- `warnings` for blocked sources, low-confidence sources, or browser limitations.

## Search Strategy

The agent should combine deterministic search patterns with browser exploration.

### GitHub Discovery

Use GitHub API or browser search to find repositories and lists.

Query families:

- `summer 2027 internships`
- `summer 2027 software engineering internships`
- `2027 internship github`
- `new grad 2027 github`
- `software engineering internship list github`
- `quant internship github`
- `startup internship github`
- `fall 2026 internship github`
- `winter 2027 internship github`

Evaluation signals:

- Recent commits.
- Stars and forks.
- Maintainer history.
- Clear data structure.
- Presence of application links.
- Whether old seasons have been archived or updated.
- Whether listings include deadline, role, location, sponsorship, and status.

### Company Board Discovery

Find target companies and their ATS board URLs.

Preferred fetch order:

1. Known ATS API or board endpoint.
2. Public HTTP page.
3. Browser extraction if dynamic rendering is required.

Board types:

- Greenhouse
- Lever
- Ashby
- Workday, with caution because parseability is often worse
- Company-specific careers pages

### Social Account Discovery

Social accounts are valid sources when they repeatedly post useful opportunity signals.

Examples:

- zero2sudo Instagram.
- Other creators who post internship drops, startup programs, hackathons, or fellowships.

Social source rules:

- Prefer public or structured alternatives when available.
- Browser-backed monitoring is allowed when the source is configured or manually requested.
- Store narrow artifacts tied to the opportunity signal, not broad browsing history.
- The agent may screenshot relevant posts or stories for evidence.
- The agent may not post or DM.

Example monitor:

```json
{
  "name": "zero2sudo Instagram",
  "sourceType": "social_account",
  "url": "https://www.instagram.com/zero2sudo/",
  "status": "active",
  "schedule": "manual_or_daily_peak",
  "fetchStrategy": "browser",
  "requiresAuth": true,
  "browserUseEnabled": true
}
```

### Community And Newsletter Discovery

Valid sources include:

- Substack or newsletter archives.
- Discord or Slack announcement pages where access is already available and allowed.
- School club pages.
- Fellowship or startup program announcement pages.
- Community calendars.

The agent should avoid sources that require joining communities, sending messages, or changing account state during sourcing.

## Scheduling

Recommended schedules:

| Job | Cadence | Notes |
| --- | --- | --- |
| Onboarding discovery | Once | Runs after profile and goals are known. |
| Scheduled discovery refresh | Weekly during peak season | Finds new sources, not individual jobs. |
| Scheduled discovery refresh | Biweekly or monthly off season | Lower cost outside recruiting peaks. |
| Source health check | Weekly | Checks whether active monitors are stale or broken. |
| Manual deep search | User-triggered | Can use browser/computer use. |
| Repair discovery | Event-triggered | Runs after repeated monitor failures. |

Schedules should be stored as cron-like strings or simple app-level recurrence policies.

The local worker should enqueue missed scheduled runs when the computer comes back online, but it should collapse duplicate runs so a long offline period does not create a backlog of stale discovery jobs.

## Browser And Computer Use Contract

The Job Sourcing Agent can use browser/computer use for source discovery under explicit run permissions.

Required run metadata:

- Run mode.
- User query or scheduled reason.
- Whether browser use was allowed.
- Whether computer use was allowed.
- Browser profile used.
- Start/end timestamps.
- Screenshots or page snapshots retained as evidence.
- Sources created or updated because of the session.

Allowed browser actions:

- Open pages.
- Search.
- Navigate public or already-authenticated pages.
- Read and inspect content.
- Take screenshots.
- Copy URLs.
- Download public files when needed for source evaluation.

Disallowed for this agent:

- Post.
- Comment.
- Reply.
- DM.
- Submit application forms.
- Change account settings.
- Change follow state.
- Purchase or subscribe.

## Evidence Requirements

Every created or updated source should cite evidence.

Acceptable evidence:

- GitHub repository URL, metadata, and latest commit timestamp.
- Careers board URL and sample matching roles.
- Screenshot path for browser-backed discoveries.
- Page excerpt.
- Search result URL.
- Existing source run logs.
- User-provided source URL.

Evidence should be narrow and relevant. For browser/social sources, store only artifacts needed to explain the source decision.

## Source Creation Rules

Auto-create an active source monitor when:

- The source is public or already enabled by the user.
- The source is clearly relevant.
- The fetch strategy is repeatable.
- The source is likely to produce future signals.
- The agent can identify a parser strategy.

Create a proposed source monitor when:

- The source is promising but parser strategy is uncertain.
- The source needs a one-time setup step.
- The source needs browser access that is not enabled for scheduled runs.
- The source is high value but likely noisy.

Ignore a source when:

- It is stale.
- It duplicates an active source with no added value.
- It is too broad or low signal.
- It requires external account changes.
- It is mostly ads or SEO content.
- It is not aligned with active goals.

## Parser Job Requests

When a source needs a parser, the Job Sourcing Agent should queue a Source Adapter Builder job.

```json
{
  "type": "source_adapter.build_or_update",
  "sourceMonitorId": "uuid",
  "sourceType": "github_repo",
  "fetchStrategy": "git_pull",
  "expectedOutput": "Signal[]",
  "sampleEvidenceIds": ["uuid"],
  "notes": "Repo uses markdown tables with company, role, location, apply link, and date added."
}
```

Parser output should be raw `Signal` records. The Opportunity Ranking Agent decides which signals become recommended `Opportunity` records.

## UI Requirements

The web app should expose a Job Sourcing section with two views.

### Source Discovery View

Shows:

- Active sources.
- Proposed sources.
- Recently discovered sources.
- Stale or broken sources.
- Parser status.
- Last discovery run.
- Next scheduled discovery run.
- Manual deep search button.

Controls:

- `Run source discovery`
- `Run browser-backed search`
- `Search a specific source or account`
- `Pause source`
- `Repair source`
- `Archive source`

### Manual Kickoff Form

Fields:

- Search goal.
- Source types to include.
- Browser/computer use toggle.
- Max duration.
- Target roles.
- Target season.
- Target companies.
- Notes.

Example prompt:

```text
Find more SWE internship and startup fellowship sources for Summer 2027.
Use GitHub, search, and my browser. Check zero2sudo and similar accounts if useful.
```

## Acceptance Criteria

The Job Sourcing Agent is working when:

- Onboarding can create an initial set of source monitors.
- A scheduled refresh can run without user interaction.
- A manual browser-backed discovery run can be kicked off from the UI.
- GitHub repositories can be discovered, evaluated, and converted into `SourceMonitor` records.
- Browser-backed sources can produce screenshot evidence.
- The agent can request parser setup for new source formats.
- The agent can mark sources stale, broken, paused, or active.
- No posting or DMing happens without explicit approval.
- Source decisions are visible in the audit log.

## Implementation Phases

### Phase 1: Public Source Discovery

- GitHub repository search.
- ATS/company board discovery.
- SourceCandidate and SourceDiscoveryRun records.
- SourceMonitor creation.
- Parser job requests.

### Phase 2: Scheduled Runs

- Worker queue support.
- Recurrence policy.
- Source health checks.
- Duplicate run collapse after offline periods.

### Phase 3: Manual Browser Kickoff

- UI kickoff form.
- Browser/computer-use run permissions.
- Screenshot evidence capture.
- Browser-backed source proposals.

### Phase 4: Social Sources

- zero2sudo monitor.
- Similar account discovery.
- Manual or scheduled browser-backed checks.
- Narrow evidence storage.

### Phase 5: Repair And Replacement

- Broken source detection.
- Parser repair requests.
- Source replacement recommendations.
