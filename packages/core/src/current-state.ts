import { z } from "zod";

const summarySchema = z.record(z.string(), z.unknown());

export const currentStateBundleSchema = z.object({
  asOf: z.iso.datetime(),
  stateVersion: z.number().int().nonnegative(),
  profile: summarySchema,
  academicContext: summarySchema,
  careerSeason: summarySchema,
  activeGoals: z.array(summarySchema),
  currentStateItems: z.array(summarySchema),
  recentDecisions: z.array(summarySchema),
  openQuestions: z.array(summarySchema),
  activeTasks: z.array(summarySchema),
  recentlyCompletedTasks: z.array(summarySchema),
  blockedOrSkippedTasks: z.array(summarySchema),
  applications: z.array(summarySchema),
  topOpportunities: z.array(summarySchema),
  upcomingEvents: z.array(summarySchema),
  relationshipObligations: z.array(summarySchema),
  calendarConstraints: z.array(summarySchema),
  recentCheckIns: z.array(summarySchema),
  relevantThreadSummaries: z.array(summarySchema),
});

export type CurrentStateBundle = z.infer<typeof currentStateBundleSchema>;
