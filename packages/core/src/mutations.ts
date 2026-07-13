import { z } from "zod";
import { getMutationRegistryEntry } from "./mutation-registry";
import { type ProposedMutation, proposedMutationSchema } from "./schemas";

export type MutationDecision =
  | { action: "auto_apply"; mutation: ProposedMutation }
  | { action: "approval_required"; mutation: ProposedMutation; reason: string }
  | { action: "reject"; mutation: ProposedMutation; reason: string };

export function parseProposedMutation(input: unknown): ProposedMutation { return proposedMutationSchema.parse(input); }

export function decideMutation(input: ProposedMutation): MutationDecision {
  const mutation = proposedMutationSchema.parse(input);
  const entry = getMutationRegistryEntry(mutation.mutationType);
  if (!entry) return { action: "reject", mutation, reason: "Mutation type is not registered." };
  const payload = entry.payloadSchema.safeParse(mutation.payload);
  if (!payload.success) return { action: "reject", mutation, reason: `Mutation payload is invalid: ${payload.error.message}` };
  const parsedPayload = payload.data as Record<string, unknown>;
  if (entry.idempotency === "required" && !mutation.idempotencyKey) return { action: "reject", mutation, reason: "Mutation requires an idempotency key." };
  const normalized = { ...mutation, payload: parsedPayload };
  if (entry.idempotency === "target_version" && !mutation.expectedObjectVersion) return { action: "approval_required", mutation: { ...normalized, approvalPolicy: "approval_required" }, reason: "Target version is required before this mutation can apply." };
  if (mutation.mutationType === "application_status.record" && parsedPayload.confidence !== "high") return { action: "approval_required", mutation: { ...normalized, approvalPolicy: "approval_required" }, reason: "Only explicit high-confidence application status evidence may auto-apply." };
  if (entry.approvalPolicy === "approval_required" || mutation.approvalPolicy !== "auto_apply") return { action: "approval_required", mutation: { ...normalized, approvalPolicy: "approval_required" }, reason: "This mutation requires explicit approval." };
  return { action: "auto_apply", mutation: { ...normalized, approvalPolicy: "auto_apply" } };
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
    else if (decision.action === "approval_required") approvalRequired.push(decision.mutation);
    else rejected.push({ mutation: decision.mutation, reason: decision.reason });
  }
  return mutationResultSchema.parse({ applied, approvalRequired, rejected });
}
