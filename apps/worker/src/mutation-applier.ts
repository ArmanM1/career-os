import { AgentOutput, classifyMutations, ProposedMutation } from "@career-os/core";
import type { WorkerSupabase } from "./supabase";

type RunContext = {
  userId: string;
  agentRunId: string;
};

export async function persistAgentOutput(supabase: WorkerSupabase, context: RunContext, output: AgentOutput) {
  const classified = classifyMutations(output.proposedMutations);

  for (const mutation of output.proposedMutations) {
    await supabase.from("proposed_mutations").insert({
      user_id: context.userId,
      agent_run_id: context.agentRunId,
      mutation_type: mutation.mutationType,
      target_object_type: mutation.targetObjectType,
      target_object_id: mutation.targetObjectId ?? null,
      payload: mutation.payload,
      rationale: mutation.rationale,
      evidence_ids: mutation.evidenceIds,
      confidence: mutation.confidence,
      approval_policy: mutation.approvalPolicy,
      status: classified.applied.some((candidate) => candidate.id === mutation.id) ? "applied" : "pending",
      created_by: "agent",
      updated_by: "agent",
    });
  }

  for (const mutation of classified.approvalRequired) {
    await createApprovalFromMutation(supabase, context, mutation);
  }

  for (const request of output.approvalRequests) {
    await supabase.from("approval_requests").insert({
      user_id: context.userId,
      agent_run_id: context.agentRunId,
      title: request.title,
      status: "pending",
      action_type: request.actionType,
      target_object_type: request.targetObjectType ?? null,
      target_object_id: request.targetObjectId ?? null,
      rationale: request.rationale,
      risk_level: request.riskLevel,
      payload: request.payload,
      evidence_ids: request.evidenceIds,
      created_by: "agent",
      updated_by: "agent",
    });
  }

  for (const mutation of classified.applied) {
    await applySafeMutation(supabase, context, mutation);
  }

  return classified;
}

async function createApprovalFromMutation(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  await supabase.from("approval_requests").insert({
    user_id: context.userId,
    agent_run_id: context.agentRunId,
    title: `Review ${mutation.mutationType}`,
    status: "pending",
    action_type: mutation.mutationType,
    target_object_type: mutation.targetObjectType,
    target_object_id: mutation.targetObjectId ?? null,
    rationale: mutation.rationale,
    risk_level: "medium",
    payload: mutation.payload,
    evidence_ids: mutation.evidenceIds,
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applySafeMutation(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  await supabase.from("audit_log_entries").insert({
    user_id: context.userId,
    agent_run_id: context.agentRunId,
    action_type: mutation.mutationType,
    target_object_type: mutation.targetObjectType,
    target_object_id: mutation.targetObjectId ?? null,
    summary: mutation.rationale,
    payload: mutation.payload,
    evidence_ids: mutation.evidenceIds,
    created_by: "agent",
    updated_by: "agent",
  });

  // Object-specific writes intentionally start conservative. The migration stores
  // proposed mutations and audit logs; direct object writes are expanded after
  // the first live agent output examples are available.
}

