import { z } from "zod";
import { ProposedMutation, proposedMutationSchema } from "./schemas";

export const safeAutoApplyMutationTypes = new Set([
  "evidence.create",
  "source_discovery_run.create",
  "source_discovery_run.update",
  "source_candidate.create",
  "signal.create",
  "opportunity_recommendation.create",
  "goal.create",
  "goal.update",
  "task.create",
  "task.update",
  "task.complete",
  "opportunity.create",
  "application.create",
  "application.update_metadata",
  "source_monitor.create_proposal",
  "source_monitor.update_metadata",
  "source_monitor.update_health",
  "agent_job.create",
  "resume_variant.create",
  "application_status_check.schedule",
  "application_status_check.record_result",
]);

export const approvalRequiredMutationTypes = new Set([
  "approval_request.create",
  "application.submit",
  "message.send",
  "connected_account.expand_scope",
  "browser_control.run_authenticated",
  "goal.change_long_term",
  "record.delete",
]);

export type MutationDecision =
  | { action: "auto_apply"; mutation: ProposedMutation }
  | { action: "approval_required"; mutation: ProposedMutation; reason: string }
  | { action: "reject"; mutation: ProposedMutation; reason: string };

export function parseProposedMutation(input: unknown): ProposedMutation {
  return proposedMutationSchema.parse(input);
}

export function decideMutation(input: ProposedMutation): MutationDecision {
  const mutation = proposedMutationSchema.parse(input);

  if (approvalRequiredMutationTypes.has(mutation.mutationType)) {
    return { action: "approval_required", mutation, reason: "Mutation type is externally visible or irreversible." };
  }

  if (mutation.approvalPolicy !== "auto_apply") {
    return { action: "approval_required", mutation, reason: "Agent requested approval." };
  }

  if (!safeAutoApplyMutationTypes.has(mutation.mutationType)) {
    return { action: "approval_required", mutation, reason: "Mutation type is not in the safe auto-apply allowlist." };
  }

  if (mutation.mutationType === "source_monitor.create_proposal" && mutation.payload.status === "active") {
    return { action: "approval_required", mutation, reason: "New source monitors must start as proposed." };
  }

  if (mutation.mutationType === "application.update_status" && mutation.evidenceIds.length === 0) {
    return { action: "approval_required", mutation, reason: "Application status updates require evidence." };
  }

  return { action: "auto_apply", mutation };
}

export const mutationResultSchema = z.object({
  applied: z.array(proposedMutationSchema),
  approvalRequired: z.array(proposedMutationSchema),
  rejected: z.array(z.object({ mutation: proposedMutationSchema, reason: z.string() })),
});

export function classifyMutations(mutations: ProposedMutation[]) {
  const applied: ProposedMutation[] = [];
  const approvalRequired: ProposedMutation[] = [];
  const rejected: Array<{ mutation: ProposedMutation; reason: string }> = [];

  for (const mutation of mutations) {
    const decision = decideMutation(mutation);
    if (decision.action === "auto_apply") applied.push(decision.mutation);
    if (decision.action === "approval_required") approvalRequired.push(decision.mutation);
    if (decision.action === "reject") rejected.push({ mutation: decision.mutation, reason: decision.reason });
  }

  return mutationResultSchema.parse({ applied, approvalRequired, rejected });
}
