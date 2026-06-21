# Candidate Object Catalog

This file is intentionally broad. The next step is to approve, decline, or defer each object.

## Object Status Labels

- `core_v1`: needed for the first useful version.
- `v1_candidate`: likely useful early, but can be deferred if it slows implementation.
- `later`: useful after core workflows work.
- `question`: needs a design decision.

## Identity and Profile

| Object | Status | Purpose |
| --- | --- | --- |
| `UserProfile` | core_v1 | Durable profile built from onboarding, resumes, check-ins, and activity. |
| `Preference` | core_v1 | Role, company, work style, location, source, and communication preferences. |
| `Constraint` | core_v1 | Time, school, geography, visa, budget, energy, and other constraints. |
| `AcademicContext` | core_v1 | College year, current term, graduation date, school calendar, timezone, and recruiting season. |
| `CalendarConstraint` | core_v1 | Busy windows, exams, travel, class schedule, deadlines, and event conflicts. |
| `ConnectedAccount` | core_v1 | Enabled external accounts such as Gmail, Google Calendar, GitHub, and browser profile access. |
| `Interest` | v1_candidate | Areas the user is curious about but not yet pursuing. |
| `Avoidance` | v1_candidate | Tasks, roles, environments, or workflows the user tends to avoid. |
| `Strength` | v1_candidate | Known advantages, skills, or traits to use in planning and resumes. |
| `Weakness` | v1_candidate | Bottlenecks that should influence task selection. |
| `PersonalNarrative` | later | Higher-level career story for interviews, resumes, and outreach. |

## Goals and Timelines

| Object | Status | Purpose |
| --- | --- | --- |
| `Goal` | core_v1 | Canonical goal object. Supports hierarchy and horizons. |
| `GoalTrack` | core_v1 | Parallel track such as SWE, entrepreneurship, exploration, FDE. |
| `Timeline` | core_v1 | Long-term, 1-year, 90-day, 30-day, weekly planning structure. |
| `Milestone` | core_v1 | Concrete checkpoint within a goal. |
| `Allocation` | core_v1 | Attention split across tracks, manually set or jointly recommended. |
| `CareerHypothesis` | v1_candidate | Testable belief such as "FDE is a strong long-term fit." |
| `Decision` | v1_candidate | Logged career decision with rationale. |
| `OpenQuestion` | v1_candidate | Unresolved question the system should help answer. |
| `GoalAlignmentNote` | later | Object-level assessment of why work does or does not align. |

## Tasks and Planning

| Object | Status | Purpose |
| --- | --- | --- |
| `Task` | core_v1 | Main unit of action. |
| `TaskLabel` | core_v1 | job app, mentor, event, resume, project, skill, research, admin, check-in, source setup, stretch, maintenance. |
| `TaskDependency` | core_v1 | Blocks, prerequisites, and waiting relationships. |
| `TaskRecurrence` | v1_candidate | Repeating maintenance actions. |
| `WeeklyPlan` | core_v1 | Generated plan for a specific week. |
| `DailyPlan` | later | Optional day-level plan if weekly is too coarse. |
| `CheckIn` | core_v1 | Structured reflection and completion data. |
| `PacingModel` | later | Learned pacing based on completion rates and check-ins. |
| `CalendarBlockProposal` | v1_candidate | Proposed time block that may be written to calendar after approval. |

## Applications and Opportunities

| Object | Status | Purpose |
| --- | --- | --- |
| `Opportunity` | core_v1 | Job, internship, event, program, fellowship, competition, or other external opportunity. |
| `Application` | core_v1 | Pipeline record for a specific opportunity. |
| `ApplicationStatus` | core_v1 | found, interested, drafting, ready_to_submit, submitted, OA, interview, rejected, ghosted, offer, withdrawn. |
| `ApplicationStatusCheck` | core_v1 | Scheduled or manual check that updates application status from email, portal, calendar, or user evidence. |
| `Company` | core_v1 | Company profile, rank, relationship state, career relevance. |
| `RoleTarget` | core_v1 | Target role type such as SWE intern, FDE, founder-facing engineer, consulting. |
| `CompanyRanking` | core_v1 | User ranking or system ranking of companies. |
| `ApplicationRequirement` | v1_candidate | Required resume, questions, transcript, cover letter, deadline, referral. |
| `ApplicationAnswerDraft` | v1_candidate | Draft response for application questions. |
| `InterviewProcess` | later | Stages, prep material, expected timeline. |
| `Offer` | later | Offer details and decision support. |

## Resume and Materials

| Object | Status | Purpose |
| --- | --- | --- |
| `ResumeLibrary` | core_v1 | Collection of templates, base resumes, variants, PDFs, and metadata. |
| `ResumeTemplate` | core_v1 | LaTeX template based on the user's existing format. |
| `ResumeVersion` | core_v1 | Named resume baseline or major version. |
| `ResumeVariant` | core_v1 | Role/company-specific generated resume. |
| `ResumeBullet` | core_v1 | Reusable bullet with source experience and target skill tags. |
| `Experience` | core_v1 | Work, project, leadership, education, or other experience. |
| `Project` | core_v1 | Project object used for resumes, portfolio, and goals. |
| `Skill` | core_v1 | Skill with evidence, proficiency, and relevance. |
| `Artifact` | v1_candidate | Files such as resume PDFs, cover letters, portfolios, transcripts. |
| `CoverLetterVariant` | later | Generated cover letter or message. |
| `PortfolioItem` | later | Public-facing project/story asset. |
| `Story` | v1_candidate | Interview/storytelling unit attached to experience. |

## People and Relationships

| Object | Status | Purpose |
| --- | --- | --- |
| `Contact` | core_v1 | Person record for mentors, peers, recruiters, founders, alumni. |
| `MentorRelationship` | core_v1 | Relationship state, cadence, history, and next action. |
| `Interaction` | core_v1 | Meeting, email, DM, call, or event interaction. |
| `FollowUp` | core_v1 | Action needed to maintain or develop a relationship. |
| `OutreachDraft` | core_v1 | Draft message requiring approval before sending. |
| `ReferralLead` | v1_candidate | Potential route to referral or warm intro. |
| `PeerSignal` | v1_candidate | What people at a similar stage are doing. |
| `RelationshipMap` | later | Graph of contacts, companies, and opportunities. |

## Events and External Signals

| Object | Status | Purpose |
| --- | --- | --- |
| `Event` | core_v1 | School event, company event, meetup, hackathon, conference, info session. |
| `EventRecommendation` | core_v1 | Event tied to goals, applications, companies, or mentors. |
| `Signal` | core_v1 | Raw external signal: new job post, social post, repo update, email status, calendar event. |
| `Evidence` | core_v1 | Source-backed reason for a recommendation or mutation. |
| `Source` | core_v1 | Durable information source. |
| `SourceMonitor` | core_v1 | Configured scanner for a source. |
| `SourceRun` | core_v1 | One execution of a monitor. |
| `SourceAdapter` | core_v1 | Script/parser used to turn source data into structured signals. |
| `SocialAccountMonitor` | v1_candidate | Monitor for social accounts where technically and ethically allowed. |
| `EventSourceMonitor` | core_v1 | Monitor for school/company event pages. |

## Agent and Runtime

| Object | Status | Purpose |
| --- | --- | --- |
| `AgentDefinition` | core_v1 | App-level agent registry entry. |
| `AgentSkill` | core_v1 | Link to SKILL.md and any references/scripts. |
| `AgentJob` | core_v1 | Queued work item for the local worker. |
| `AgentRun` | core_v1 | Execution record for a job. |
| `RuntimeThread` | core_v1 | Mapping to Codex thread or future runtime thread. |
| `RuntimeTurn` | core_v1 | Mapping to Codex turn or future runtime step. |
| `AgentEvent` | core_v1 | Streamed event from runtime. |
| `AgentMutation` | core_v1 | Proposed typed change. |
| `ApprovalRequest` | core_v1 | User approval required before sensitive action. |
| `AuditLogEntry` | core_v1 | Immutable record of meaningful changes. |
| `ToolCallLog` | v1_candidate | Record of dynamic tool or MCP calls. |
| `RuntimeAdapter` | later | Registry object for Codex, Claude Code, OpenHands, etc. |

## Calendar, Email, and Activity

| Object | Status | Purpose |
| --- | --- | --- |
| `CalendarEventRef` | v1_candidate | Reference to external calendar event. |
| `AvailabilityWindow` | v1_candidate | Time windows used for planning. |
| `EmailThreadRef` | v1_candidate | Reference to email thread related to application/contact. |
| `ApplicationEmailSignal` | v1_candidate | Parsed status or update from email. |
| `ApplicationPortalRef` | v1_candidate | Link and metadata for a job portal where status can be checked. |
| `AcademicCalendarEvent` | v1_candidate | Exams, breaks, recruiting fairs, and school-specific timeline events. |
| `GitHubActivitySignal` | v1_candidate | Commits, repositories, or contribution activity. |
| `ComputerUseSession` | later | Auditable session where agent operated local GUI/browser. |
| `BrowserSessionArtifact` | later | Screenshot, extracted page, or result from browser use. |

## Mutation Families

Agents should return mutations from approved families:

- `profile.*`
- `goal.*`
- `task.*`
- `application.*`
- `opportunity.*`
- `company.*`
- `resume.*`
- `contact.*`
- `event.*`
- `source.*`
- `approval.*`
- `agent.*`

Initial mutations:

- `goal.create`
- `goal.update`
- `task.create`
- `task.update`
- `task.complete`
- `opportunity.create`
- `application.create`
- `application.update_status`
- `source_monitor.create_proposal`
- `source_monitor.enable`
- `resume_variant.create`
- `outreach_draft.create`
- `approval_request.create`

## UI Rendering Contract

Every object that appears in the UI should expose:

- `id`
- `type`
- `title`
- `status`
- `labels`
- `priority`
- `dueAt`
- `relatedGoalIds`
- `relatedApplicationIds`
- `relatedContactIds`
- `evidenceIds`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

The UI should not infer core meaning from unstructured agent prose.
