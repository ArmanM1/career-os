import { z } from "zod";

export const actorSchema = z.enum(["user", "agent", "system"]);
export const confidenceSchema = z.enum(["low", "medium", "high"]);
export const approvalPolicySchema = z.enum([
  "auto_apply",
  "approval_required",
  "never_auto_apply",
]);

export const objectTypeSchema = z.enum([
  "profile",
  "academic_context",
  "constraint",
  "goal",
  "task",
  "opportunity",
  "opportunity_recommendation",
  "opportunity_ranking_preference",
  "company",
  "role_target",
  "application",
  "application_status_check",
  "contact",
  "mentor_relationship",
  "event",
  "source_candidate",
  "source_discovery_run",
  "source_monitor",
  "source_run",
  "signal",
  "resume_template",
  "resume_version",
  "resume_variant",
  "resume_bullet",
  "experience",
  "project",
  "skill",
  "evidence",
  "connected_account",
  "agent_job",
  "approval_request",
]);

export const sourceTypeSchema = z.enum([
  "github_repo",
  "company_careers_page",
  "greenhouse_board",
  "lever_board",
  "ashby_board",
  "school_event_calendar",
  "newsletter",
  "social_account",
  "community_page",
  "manual_list",
  "email_application_status",
  "application_portal",
  "calendar_events",
]);

export const fetchStrategySchema = z.enum(["http", "git_pull", "browser", "manual", "api"]);
export const sourceDiscoveryModeSchema = z.enum(["onboarding", "scheduled", "manual", "repair"]);
export const sourceDiscoveryStatusSchema = z.enum(["queued", "running", "success", "failed", "partial", "needs_review"]);
export const sourceCandidateRecommendationSchema = z.enum(["activate", "propose", "ignore", "replace_existing"]);
export const signalStatusSchema = z.enum(["new", "queued_for_ranking", "ranked", "ignored", "duplicate"]);
export const signalTypeSchema = z.enum([
  "job_post",
  "internship_post",
  "event",
  "program",
  "fellowship",
  "repo_update",
  "social_post",
  "newsletter_item",
  "application_status",
  "calendar_event",
  "other",
]);

export const careerObjectEnvelopeSchema = z.object({
  id: z.string().uuid(),
  objectType: objectTypeSchema,
  title: z.string(),
  status: z.string(),
  labels: z.array(z.string()).default([]),
  priority: z.number().int().optional(),
  dueAt: z.string().datetime().optional(),
  relatedGoalIds: z.array(z.string().uuid()).default([]),
  relatedApplicationIds: z.array(z.string().uuid()).default([]),
  relatedOpportunityIds: z.array(z.string().uuid()).default([]),
  relatedContactIds: z.array(z.string().uuid()).default([]),
  relatedEventIds: z.array(z.string().uuid()).default([]),
  evidenceIds: z.array(z.string().uuid()).default([]),
  createdBy: actorSchema,
  createdByAgentRunId: z.string().uuid().optional(),
  updatedBy: actorSchema,
  updatedByAgentRunId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const goalSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("goal"),
  horizon: z.enum(["long_term", "1_year", "90_day", "30_day", "week"]),
  track: z.enum(["swe", "entrepreneurship", "fde", "exploration", "general"]),
  parentGoalId: z.string().uuid().optional(),
  targetDate: z.string().optional(),
  allocationPercent: z.number().min(0).max(100).optional(),
  rationale: z.string(),
});

export const academicContextSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("academic_context"),
  institution: z.string().optional(),
  degreeProgram: z.string().optional(),
  currentYear: z.enum(["freshman", "sophomore", "junior", "senior", "masters", "other"]).optional(),
  currentTerm: z.string().optional(),
  expectedGraduationDate: z.string().optional(),
  recruitingSeason: z
    .enum(["off_cycle", "internship_peak", "new_grad_peak", "interview_season", "offer_decision"])
    .optional(),
  termStartDate: z.string().optional(),
  termEndDate: z.string().optional(),
  timezone: z.string(),
});

export const taskSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("task"),
  taskType: z.enum([
    "job_app",
    "mentor",
    "event",
    "resume",
    "project",
    "skill",
    "research",
    "admin",
    "check_in",
    "source_setup",
    "status_check",
  ]),
  effort: z.enum(["small", "medium", "large"]),
  urgency: z.enum(["low", "normal", "high", "time_sensitive"]),
  energy: z.enum(["low", "medium", "high"]),
  source: z.enum(["user", "agent", "monitor", "calendar", "email"]),
  completionNotes: z.string().optional(),
});

export const applicationStatusSchema = z.enum([
  "found",
  "interested",
  "drafting",
  "ready_to_submit",
  "submitted",
  "oa",
  "interview",
  "rejected",
  "ghosted",
  "offer",
  "withdrawn",
]);

export const applicationSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("application"),
  opportunityId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  status: applicationStatusSchema,
  deadlineAt: z.string().datetime().optional(),
  submittedAt: z.string().datetime().optional(),
  resumeVariantId: z.string().uuid().optional(),
  nextActionTaskId: z.string().uuid().optional(),
  statusCheckPolicy: z.enum(["manual", "email", "portal", "calendar", "scheduled_agent"]),
  nextStatusCheckAt: z.string().datetime().optional(),
  lastStatusCheckedAt: z.string().datetime().optional(),
  lastStatusEvidenceId: z.string().uuid().optional(),
});

export const opportunitySchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("opportunity"),
  opportunityType: z.enum(["job", "internship", "event", "program", "fellowship", "competition", "other"]),
  companyId: z.string().uuid().optional(),
  roleTargetId: z.string().uuid().optional(),
  url: z.string().url().optional(),
  sourceMonitorId: z.string().uuid().optional(),
  discoveredAt: z.string().datetime(),
  deadlineAt: z.string().datetime().optional(),
  fitRationale: z.string(),
});

export const opportunityRecommendationSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("opportunity_recommendation"),
  opportunityId: z.string().uuid().optional(),
  sourceSignalIds: z.array(z.string().uuid()).default([]),
  recommendation: z.enum([
    "apply_now",
    "prepare_then_apply",
    "build_project_then_apply",
    "research",
    "save",
    "ignore",
    "needs_review",
  ]),
  score: z.number().min(0).max(100),
  confidence: confidenceSchema,
  aggressivenessUsed: z.enum(["conservative", "balanced", "high", "very_high"]),
  rationale: z.string().default(""),
  roleBrief: z.object({
    roleTitle: z.string(),
    companyName: z.string().optional(),
    opportunityType: z.string(),
    oneLineSummary: z.string(),
    roleDescription: z.string(),
    whyItMatters: z.string(),
    fitSummary: z.string(),
    mainRequirements: z.array(z.string()).default([]),
    matchingStrengths: z.array(z.string()).default([]),
    gapsOrRisks: z.array(z.string()).default([]),
    projectBridge: z.string().optional(),
    resumeAngle: z.string(),
    outreachAngle: z.string().optional(),
    applicationComplexity: z.enum(["low", "medium", "high"]),
    deadlineSummary: z.string().optional(),
    sourceSummary: z.string(),
  }),
  scoreBreakdown: z.record(z.number()).default({}),
  projectBridgeAssessment: z
    .object({
      bridgeable: z.boolean(),
      confidence: confidenceSchema,
      missingSignals: z.array(z.string()).default([]),
      suggestedProject: z
        .object({
          title: z.string(),
          description: z.string(),
          targetSkills: z.array(z.string()).default([]),
          estimatedDays: z.number().min(0),
          minimumViableArtifact: z.string(),
          resumeBulletAngle: z.string(),
        })
        .optional(),
      impactOnRecommendation: z.string(),
    })
    .optional(),
  suggestedTasks: z
    .array(
      z.object({
        title: z.string(),
        taskType: z.enum(["job_app", "mentor", "event", "resume", "project", "skill", "research", "admin"]),
        effort: z.enum(["small", "medium", "large"]),
        urgency: z.enum(["low", "normal", "high", "time_sensitive"]),
        rationale: z.string(),
      }),
    )
    .default([]),
  plannerHints: z.object({
    urgency: z.enum(["low", "normal", "high", "time_sensitive"]),
    recommendedWindow: z.enum(["today", "this_week", "next_2_weeks", "later"]),
    estimatedEffortHours: z.number().min(0),
    prerequisites: z.array(z.string()).default([]),
    suggestedSequence: z.array(z.string()).default([]),
    deadlineAt: z.string().datetime().optional(),
    mustDoBeforeApply: z.array(z.string()).default([]),
    niceToHaveBeforeApply: z.array(z.string()).default([]),
    calendarBlockSuggestion: z
      .object({
        title: z.string(),
        durationMinutes: z.number().int().min(1),
        energy: z.enum(["low", "medium", "high"]),
      })
      .optional(),
  }),
});

export const opportunityRankingPreferenceSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("opportunity_ranking_preference"),
  aggressiveness: z.enum(["conservative", "balanced", "high", "very_high"]).default("high"),
  assumeFastProjectBuild: z.boolean().default(true),
  projectBuildWindowDays: z.number().int().min(0).default(3),
  maxRecommendedApplyNowPerWeek: z.number().int().min(0).optional(),
  minScoreForApplyNow: z.number().min(0).max(100).default(78),
  minScoreForPrepareThenApply: z.number().min(0).max(100).default(62),
  riskTolerance: z.enum(["low", "medium", "high"]).default("high"),
  preferLearningStretch: z.boolean().default(true),
  preferReferralLeverage: z.boolean().default(true),
  preferFastApplications: z.boolean().default(false),
  preferredTracks: z.array(z.string()).default([]),
});

export const sourceDiscoveryRunSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("source_discovery_run"),
  status: sourceDiscoveryStatusSchema,
  mode: sourceDiscoveryModeSchema,
  query: z.string(),
  scope: z.array(z.string()).default([]),
  browserUseAllowed: z.boolean().default(false),
  computerUseAllowed: z.boolean().default(false),
  targetSeason: z.string().optional(),
  targetRoles: z.array(z.string()).default([]),
  targetCompanies: z.array(z.string()).default([]),
  accountHints: z.array(z.string()).default([]),
  maxDurationMinutes: z.number().int().min(1).optional(),
  sourceCandidatesFound: z.number().int().min(0).default(0),
  sourceMonitorsCreated: z.number().int().min(0).default(0),
  sourceMonitorsUpdated: z.number().int().min(0).default(0),
  parserJobsQueued: z.number().int().min(0).default(0),
  logPath: z.string().optional(),
  errorMessage: z.string().optional(),
  nextRecommendedRunAt: z.string().datetime().optional(),
});

export const sourceCandidateSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("source_candidate"),
  sourceDiscoveryRunId: z.string().uuid().optional(),
  agentRunId: z.string().uuid().optional(),
  relatedSourceMonitorId: z.string().uuid().optional(),
  sourceType: sourceTypeSchema,
  url: z.string().url(),
  discoveryMode: sourceDiscoveryModeSchema,
  fetchStrategyGuess: fetchStrategySchema,
  requiresAuth: z.boolean(),
  browserUseEnabled: z.boolean().default(false),
  recommendation: sourceCandidateRecommendationSchema,
  rationale: z.string(),
  scores: z
    .object({
      relevance: z.number().min(0).max(100).optional(),
      freshness: z.number().min(0).max(100).optional(),
      signalDensity: z.number().min(0).max(100).optional(),
      trust: z.number().min(0).max(100).optional(),
      parseability: z.number().min(0).max(100).optional(),
      maintenanceCost: z.number().min(0).max(100).optional(),
      authBurden: z.number().min(0).max(100).optional(),
      strategicValue: z.number().min(0).max(100).optional(),
    })
    .default({}),
  targetSeason: z.string().optional(),
  targetRoles: z.array(z.string()).default([]),
});

export const signalSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("signal"),
  status: signalStatusSchema,
  sourceMonitorId: z.string().uuid().optional(),
  sourceRunId: z.string().uuid().optional(),
  sourceCandidateId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  signalType: signalTypeSchema,
  sourceType: sourceTypeSchema.optional(),
  sourceUrl: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  externalRef: z.string().optional(),
  companyName: z.string().optional(),
  roleTitle: z.string().optional(),
  location: z.string().optional(),
  opportunityType: z.enum(["job", "internship", "event", "program", "fellowship", "competition", "other"]).optional(),
  postedAt: z.string().datetime().optional(),
  deadlineAt: z.string().datetime().optional(),
  rawPayload: z.record(z.unknown()).default({}),
  normalizedPayload: z.record(z.unknown()).default({}),
  parserName: z.string().optional(),
  parserConfidence: confidenceSchema.optional(),
  rationale: z.string().default(""),
});

export const applicationStatusCheckSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("application_status_check"),
  applicationId: z.string().uuid(),
  checkSource: z.enum(["email", "portal", "calendar", "manual", "browser"]),
  scheduledFor: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  resultStatus: z.enum(["no_change", "status_changed", "needs_review", "failed"]).optional(),
  previousApplicationStatus: applicationStatusSchema.optional(),
  detectedApplicationStatus: applicationStatusSchema.optional(),
});

export const sourceMonitorSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("source_monitor"),
  sourceType: sourceTypeSchema,
  url: z.string(),
  fetchStrategy: fetchStrategySchema,
  schedule: z.string(),
  localPath: z.string().optional(),
  parserScriptPath: z.string().optional(),
  requiresAuth: z.boolean(),
  browserUseEnabled: z.boolean().default(false),
  lastRunAt: z.string().datetime().optional(),
  lastSeenCursor: z.string().optional(),
  lastSeenHash: z.string().optional(),
  sourceRationale: z.string().default(""),
  evaluation: z.record(z.unknown()).default({}),
  relatedCompanyIds: z.array(z.string().uuid()).default([]),
});

export const resumeVariantSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("resume_variant"),
  baseVersionId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  roleTargetId: z.string().uuid().optional(),
  latexPath: z.string(),
  pdfPath: z.string().optional(),
  diffPath: z.string().optional(),
  rationale: z.string(),
  status: z.enum(["draft", "ready_for_review", "approved", "used", "archived"]),
});

export const connectedAccountSchema = careerObjectEnvelopeSchema.extend({
  objectType: z.literal("connected_account"),
  provider: z.enum(["google_calendar", "gmail", "github", "supabase", "browser_profile", "other"]),
  status: z.enum(["not_connected", "connected", "needs_reauth", "disabled"]),
  scopes: z.array(z.string()),
  lastSyncedAt: z.string().datetime().optional(),
  approvalRequiredForExpandedScopes: z.boolean(),
});

export const proposedMutationSchema = z.object({
  id: z.string().uuid(),
  mutationType: z.string(),
  targetObjectType: objectTypeSchema,
  targetObjectId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  rationale: z.string(),
  evidenceIds: z.array(z.string().uuid()).default([]),
  confidence: confidenceSchema,
  approvalPolicy: approvalPolicySchema,
});

export const agentOutputSchema = z.object({
  summary: z.string(),
  proposedMutations: z.array(proposedMutationSchema).default([]),
  approvalRequests: z.array(
    z.object({
      actionType: z.string(),
      title: z.string(),
      description: z.string(),
      targetObjectType: objectTypeSchema.optional(),
      targetObjectId: z.string().uuid().optional(),
      rationale: z.string(),
      riskLevel: z.enum(["low", "medium", "high"]),
      payload: z.record(z.unknown()).default({}),
      evidenceIds: z.array(z.string().uuid()).default([]),
    }),
  ).default([]),
  evidence: z.array(
    z.object({
      title: z.string(),
      sourceType: z.string(),
      id: z.string().uuid().optional(),
      sourceUrl: z.string().optional(),
      excerpt: z.string().optional(),
      payload: z.record(z.unknown()).default({}),
    }),
  ).default([]),
  followUpQuestions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type CareerObjectEnvelope = z.infer<typeof careerObjectEnvelopeSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunityRecommendation = z.infer<typeof opportunityRecommendationSchema>;
export type OpportunityRankingPreference = z.infer<typeof opportunityRankingPreferenceSchema>;
export type SourceCandidate = z.infer<typeof sourceCandidateSchema>;
export type SourceDiscoveryRun = z.infer<typeof sourceDiscoveryRunSchema>;
export type SourceMonitor = z.infer<typeof sourceMonitorSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type ResumeVariant = z.infer<typeof resumeVariantSchema>;
export type ConnectedAccount = z.infer<typeof connectedAccountSchema>;
export type ProposedMutation = z.infer<typeof proposedMutationSchema>;
export type AgentOutput = z.infer<typeof agentOutputSchema>;
