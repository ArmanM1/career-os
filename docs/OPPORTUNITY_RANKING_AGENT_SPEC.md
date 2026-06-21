# Opportunity Ranking Agent Spec

## Purpose

The Opportunity Ranking Agent decides which parsed opportunities are worth acting on.

It consumes raw `Signal` records emitted by source monitors and parser scripts, enriches them with Career OS context, ranks them against the user's goals and constraints, and emits rich opportunity recommendations for the Weekly Planner.

```text
SourceMonitor + SourceAdapter
  -> raw Signal records
  -> Opportunity Ranking Agent
  -> OpportunityRecommendation records with role briefs
  -> Weekly Planner
```

The agent answers:

- Is this real, open, relevant, and actionable?
- How valuable is this opportunity for the user right now?
- What would need to happen before applying?
- Should the planner prioritize this today, this week, later, or ignore it?

## Agent Identity

Recommended agent id: `career-opportunity-ranking`

Recommended display name: `Opportunity Ranking`

Thread policy: `global` for ranking policy and calibration, with optional `per_source` or `per_opportunity` threads for high-value opportunities.

Default queue: `opportunities`

Primary output: `OpportunityRecommendation` records, enriched `Opportunity` candidates, suggested `Task` records, and planner context.

## Scope

The agent owns:

- Normalizing raw source signals.
- Deduplicating opportunities across sources.
- Enriching roles with job description, company, deadline, source, and fit data.
- Ranking opportunities against the user's goals, constraints, preferences, resume, projects, skills, contacts, and current recruiting season.
- Producing rich role descriptions so the Weekly Planner can make better scheduling decisions.
- Recommending whether to apply now, prepare first, build a project first, research, save, ignore, or escalate.
- Creating next-action tasks such as "tailor resume," "build quick matching project," "ask for referral," or "research company."

The agent does not own:

- Discovering new durable sources.
- Building source parsers.
- Creating the final week-by-week or day-by-day plan.
- Tailoring the actual resume.
- Sending DMs, emails, posts, comments, or applications.

## Relationship To Other Agents

### Job Sourcing Agent

The Job Sourcing Agent finds where to look. The Opportunity Ranking Agent decides what found items are worth acting on.

```text
Job Sourcing Agent
  -> SourceMonitor records
  -> SourceAdapter parser
  -> raw Signal records
  -> Opportunity Ranking Agent
```

### Resume Tailor Agent

The Opportunity Ranking Agent can create a resume tailoring task or request, but it does not write the final resume variant.

### Mentor Manager Agent

The Opportunity Ranking Agent can identify referral or relationship leverage and create a follow-up task. The Mentor Manager handles outreach strategy and drafts.

### Weekly Planner Agent

The Weekly Planner consumes ranked recommendations and decides when to execute them.

The ranker should provide enough context that the planner can reason without reopening every job posting.

## Inputs

### Source And Signal Data

- Raw `Signal` record.
- Source monitor id.
- Source type and fetch strategy.
- Source trust, freshness, and historical yield.
- Parser confidence.
- Evidence ids, URLs, screenshots, excerpts, and fetch timestamps.
- Duplicate candidates.

### Opportunity Data

- Role title.
- Company.
- Apply URL.
- Job description.
- Location and remote status.
- Internship, new-grad, full-time, fellowship, program, or event type.
- Deadline, date posted, and source timestamp.
- Sponsorship or work authorization notes when available.
- Requirements and nice-to-haves.
- Compensation when available.
- ATS source and application complexity.

### User Career Context

- Target roles and tracks.
- Goal weights across SWE, FDE, entrepreneurship, exploration, or other tracks.
- Target companies and company tiers.
- Preferred locations and remote preferences.
- Academic year, graduation date, current term, recruiting season, and timezone.
- Constraints such as eligibility, location, time, visa, energy, and budget.
- Existing applications and statuses.
- Ignored companies, avoided roles, or known disqualifiers.

### Capability Context

- Resume templates, versions, and variants.
- Experiences.
- Projects.
- Skills.
- Resume bullets and skill tags.
- GitHub/profile artifacts.
- Portfolio artifacts.
- Known gaps and strengths.

### Relationship And Event Context

- Contacts and mentor relationships.
- Referral leads.
- Recent interactions.
- Upcoming company or school events.
- Calendar constraints and available windows.

## User-Modifiable Ranking Settings

Ranking must be user-configurable. The default should be high aggressiveness.

```ts
type OpportunityRankingPreferences = {
  aggressiveness: "conservative" | "balanced" | "high" | "very_high";
  defaultAggressiveness: "high";
  assumeFastProjectBuild: boolean;
  projectBuildWindowDays: number;
  maxRecommendedApplyNowPerWeek?: number;
  minScoreForApplyNow: number;
  minScoreForPrepareThenApply: number;
  riskTolerance: "low" | "medium" | "high";
  preferLearningStretch: boolean;
  preferReferralLeverage: boolean;
  preferFastApplications: boolean;
  preferredTracks: string[];
};
```

Default:

```json
{
  "aggressiveness": "high",
  "defaultAggressiveness": "high",
  "assumeFastProjectBuild": true,
  "projectBuildWindowDays": 3,
  "minScoreForApplyNow": 78,
  "minScoreForPrepareThenApply": 62,
  "riskTolerance": "high",
  "preferLearningStretch": true,
  "preferReferralLeverage": true,
  "preferFastApplications": false
}
```

## Aggressiveness Semantics

### Conservative

- Only recommends roles with strong existing fit.
- Treats skill gaps as meaningful penalties.
- Requires high confidence before apply-now.
- Prefers low-effort, clearly eligible opportunities.

### Balanced

- Recommends strong matches and moderate stretches.
- Allows one or two manageable gaps.
- Uses projects as supporting evidence, but does not assume new work will happen.

### High

- Default mode.
- Assumes the user can quickly build a credible matching project when the opportunity is valuable.
- Treats missing secondary skills as bridgeable if the user has adjacent strengths.
- Prioritizes high-upside opportunities even if resume tailoring or a quick project is needed.
- Creates `build_project_then_apply` or `prepare_then_apply` recommendations when the path is plausible within a few days.

### Very High

- Treats many gaps as bridgeable unless there is a hard eligibility issue.
- Surfaces more stretch opportunities.
- Creates more project-building and research tasks.
- Accepts higher uncertainty and more planner load.

Hard filters stay hard regardless of aggressiveness:

- Posting is closed.
- Deadline has passed.
- Role is clearly not for the user's level or work authorization situation.
- Location is impossible under user constraints.
- The opportunity is an exact duplicate of an existing submitted or rejected application.
- Apply link is unavailable and no recovery path exists.

## Project Bridge Assumption

In high aggressiveness mode, the agent should explicitly evaluate whether a quick project can bridge a gap.

```ts
type ProjectBridgeAssessment = {
  bridgeable: boolean;
  confidence: "low" | "medium" | "high";
  missingSignals: string[];
  suggestedProject?: {
    title: string;
    description: string;
    targetSkills: string[];
    estimatedDays: number;
    minimumViableArtifact: string;
    resumeBulletAngle: string;
  };
  impactOnRecommendation: string;
};
```

Example:

```text
The posting wants LLM evaluation experience. The user has TypeScript, Python, and agent-building context, but no direct eval project. In high aggressiveness mode this gap is bridgeable with a 2-day mini-project that evaluates job matching prompts over a small labeled dataset.
```

The agent should not pretend the user already has the project. It should state:

- what is missing
- why it is bridgeable
- what quick artifact would make the application stronger
- whether the opportunity should wait for that artifact or proceed now

## Ranking Pipeline

### 1. Normalize Signal

Extract:

- title
- company
- location
- opportunity type
- apply URL
- source URL
- deadline
- date posted
- source confidence
- raw requirements

### 2. Deduplicate

Compare against:

- existing signals
- existing opportunities
- existing applications
- same ATS posting across multiple sources
- same company and title with slightly different URLs

### 3. Enrich

Fetch or inspect additional context when needed:

- full job description
- company page
- ATS metadata
- related Career OS contacts
- source history

### 4. Apply Hard Filters

Reject or downgrade only genuinely blocking issues.

High aggressiveness should reduce soft penalties, not bypass hard blockers.

### 5. Score Fit And Value

Recommended scoring dimensions:

| Dimension | Meaning |
| --- | --- |
| `roleFit` | Match with target roles and tracks. |
| `companyFit` | Target company, adjacent company, interesting startup, or low priority. |
| `skillFit` | Current skill/project/resume match. |
| `projectBridgePotential` | Whether a quick project can credibly cover missing signals. |
| `learningValue` | Whether the opportunity advances an important track. |
| `strategicValue` | Scarcity, brand value, network value, or unusual upside. |
| `timing` | Newness, deadline pressure, season relevance. |
| `eligibility` | Graduation year, student status, location, work auth, level. |
| `referralLeverage` | Contacts, mentors, alumni, events, or warm paths. |
| `resumeReadiness` | Whether an existing resume variant is close. |
| `applicationEffort` | Time and complexity required to apply. |
| `sourceConfidence` | Trust and evidence quality. |
| `duplicatePenalty` | Existing application or duplicate source penalty. |
| `uncertaintyPenalty` | Missing facts or weak evidence. |

### 6. Assign Recommendation

Allowed recommendations:

- `apply_now`
- `prepare_then_apply`
- `build_project_then_apply`
- `research`
- `save`
- `ignore`
- `needs_review`

### 7. Emit Planner Context

Every recommendation above `save` should include a rich role brief.

## Rich Role Brief

The Weekly Planner needs more than a score. Each recommended opportunity should include a narrative brief with enough context to schedule useful work.

```ts
type OpportunityRecommendation = {
  id: string;
  opportunityId?: string;
  sourceSignalIds: string[];
  recommendation:
    | "apply_now"
    | "prepare_then_apply"
    | "build_project_then_apply"
    | "research"
    | "save"
    | "ignore"
    | "needs_review";
  score: number;
  confidence: "low" | "medium" | "high";
  aggressivenessUsed: OpportunityRankingPreferences["aggressiveness"];
  roleBrief: RoleBrief;
  scoreBreakdown: Record<string, number>;
  projectBridgeAssessment?: ProjectBridgeAssessment;
  suggestedTasks: SuggestedTask[];
  plannerHints: PlannerHints;
  evidenceIds: string[];
  createdAt: string;
};
```

```ts
type RoleBrief = {
  roleTitle: string;
  companyName?: string;
  opportunityType: string;
  oneLineSummary: string;
  roleDescription: string;
  whyItMatters: string;
  fitSummary: string;
  mainRequirements: string[];
  matchingStrengths: string[];
  gapsOrRisks: string[];
  projectBridge?: string;
  resumeAngle: string;
  outreachAngle?: string;
  applicationComplexity: "low" | "medium" | "high";
  deadlineSummary?: string;
  sourceSummary: string;
};
```

Role briefs should be concise but substantive. They should explain:

- what the role likely involves
- why it is relevant to the user's goals
- what evidence supports the fit
- what gaps exist
- whether a fast project could bridge those gaps
- what the next concrete action should be

## Planner Hints

The Weekly Planner should receive scheduling-specific context.

```ts
type PlannerHints = {
  urgency: "low" | "normal" | "high" | "time_sensitive";
  recommendedWindow: "today" | "this_week" | "next_2_weeks" | "later";
  estimatedEffortHours: number;
  prerequisites: string[];
  suggestedSequence: string[];
  deadlineAt?: string;
  mustDoBeforeApply: string[];
  niceToHaveBeforeApply: string[];
  calendarBlockSuggestion?: {
    title: string;
    durationMinutes: number;
    energy: "low" | "medium" | "high";
  };
};
```

## Output Example

```json
{
  "recommendation": "build_project_then_apply",
  "score": 84,
  "confidence": "medium",
  "aggressivenessUsed": "high",
  "roleBrief": {
    "roleTitle": "Software Engineering Intern, AI Products",
    "companyName": "ExampleCo",
    "opportunityType": "internship",
    "oneLineSummary": "AI product engineering internship focused on building internal LLM tooling.",
    "roleDescription": "The role appears to involve full-stack product work around LLM workflows, including TypeScript interfaces, Python services, and evaluation of model outputs.",
    "whyItMatters": "This supports the user's SWE and FDE tracks because it combines product engineering, AI tooling, and ambiguous customer-facing systems work.",
    "fitSummary": "Strong adjacent fit: the user has agent-building and full-stack context, but needs clearer evidence of LLM evaluation work.",
    "mainRequirements": ["TypeScript", "Python", "LLM workflows", "product judgment"],
    "matchingStrengths": ["Career OS agent work", "full-stack app experience", "rapid prototyping"],
    "gapsOrRisks": ["No explicit LLM eval project listed", "internship may move quickly"],
    "projectBridge": "A 2-day mini eval harness for job-ranking prompts would make the application materially stronger.",
    "resumeAngle": "Emphasize agent workflow, ranking logic, source parsing, and structured evaluation.",
    "applicationComplexity": "medium",
    "deadlineSummary": "No explicit deadline, but newly posted roles should be treated as time-sensitive.",
    "sourceSummary": "Found through active GitHub internship repository and confirmed on company ATS page."
  },
  "scoreBreakdown": {
    "roleFit": 18,
    "skillFit": 14,
    "projectBridgePotential": 12,
    "strategicValue": 13,
    "timing": 10,
    "resumeReadiness": 7,
    "sourceConfidence": 8,
    "uncertaintyPenalty": -3
  },
  "plannerHints": {
    "urgency": "high",
    "recommendedWindow": "this_week",
    "estimatedEffortHours": 5,
    "prerequisites": ["Build quick eval project", "Tailor resume"],
    "suggestedSequence": ["Build project", "Update resume", "Apply"],
    "mustDoBeforeApply": ["Tailor resume"],
    "niceToHaveBeforeApply": ["Quick eval project"]
  }
}
```

## Mutation Behavior

Auto-allowed:

- Create `OpportunityRecommendation`.
- Create or update `Opportunity` candidates.
- Create tasks for resume tailoring, research, referral lookup, quick project building, and application prep.
- Mark low-fit signals as ignored with rationale.
- Link evidence to recommendations.

Not allowed for this agent:

- Submit applications.
- Send messages.
- Post, comment, reply, or DM.
- Mark an application as submitted unless independently verified elsewhere.

## UI Requirements

The ranking UI should expose:

- Ranked opportunities.
- Recommendation category filters.
- Score breakdown.
- Role brief.
- Project bridge assessment.
- Aggressiveness setting.
- "Why this was recommended."
- "Why this was ignored."
- Button to send recommendation to Weekly Planner.
- Button to create application record.
- Button to create project-bridge task.

Aggressiveness control:

- Conservative
- Balanced
- High, default
- Very High

Changing aggressiveness should trigger re-ranking of unresolved recommendations or schedule a ranking refresh.

## Acceptance Criteria

The Opportunity Ranking Agent is working when:

- It consumes raw signals without discovering new sources.
- It dedupes repeated listings across sources.
- It produces ranked recommendations with score breakdowns.
- It includes a rich role brief for each actionable recommendation.
- It uses high aggressiveness by default.
- In high aggressiveness mode, it evaluates fast project bridge potential instead of rejecting stretch roles too early.
- The Weekly Planner can create a useful weekly plan from recommendation records without reopening each job URL.
- The user can change aggressiveness and rerun ranking.
- External actions still require the appropriate separate agent or user approval.
