"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const threadRoutes = {
  advisor: { agentId: "career-advisor", inputType: "advisor.chat", capabilities: [] },
  onboarding: { agentId: "career-onboarding", inputType: "onboarding.answer", capabilities: ["read_files"] },
  source: { agentId: "career-source-discovery", inputType: "source.inspect", capabilities: ["browser_read"] },
  opportunity: { agentId: "career-opportunity-intelligence", inputType: "opportunity.feedback", capabilities: [] },
  application: { agentId: "career-application-manager", inputType: "application.prepare", capabilities: ["browser_read"] },
  mentor_contact: { agentId: "career-relationship-manager", inputType: "relationship.review", capabilities: ["browser_read"] },
  resume: { agentId: "career-resume-tailor", inputType: "resume.review", capabilities: ["read_files", "write_workspace", "latex_compile"] },
  planning: { agentId: "career-daily-weekly-planner", inputType: "planner.replan", capabilities: [] },
  career_positioning: { agentId: "career-positioning", inputType: "positioning.review", capabilities: [] },
  event: { agentId: "career-event-scanner", inputType: "event.follow_up", capabilities: ["browser_read"] },
} as const;

export async function createThread(formData: FormData) {
  const { supabase, user } = await requireUser();
  const requestedType = String(formData.get("threadType") ?? "advisor") as keyof typeof threadRoutes;
  const threadType = requestedType in threadRoutes ? requestedType : "advisor";
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || `${threadType.replaceAll("_", " ")} thread`;
  const { data, error } = await supabase.from("threads").insert({ user_id: user.id, title, thread_type: threadType, status: "active", created_by: "user", updated_by: "user" }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/threads/${data.id}`);
}

export async function sendThreadMessage(threadId: string, text: string) {
  const content = text.trim();
  if (!content) return;
  const { supabase, user } = await requireUser();
  const { data: thread } = await supabase.from("threads").select("id,thread_type,title").eq("id", threadId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!thread) throw new Error("Thread not found");
  const route = threadRoutes[thread.thread_type as keyof typeof threadRoutes] ?? threadRoutes.advisor;
  const messageId = randomUUID();
  const now = new Date().toISOString();
  const { data: profile } = await supabase.from("profiles").select("state_version").eq("user_id", user.id).maybeSingle();
  const stateVersion = Number(profile?.state_version ?? 0);
  const { error: messageError } = await supabase.from("messages").insert({ id: messageId, user_id: user.id, thread_id: thread.id, role: "user", status: "complete", content, client_message_id: randomUUID(), state_version: stateVersion, created_by: "user", updated_by: "user" });
  if (messageError) throw new Error(messageError.message);
  await supabase.from("threads").update({ last_message_at: now, updated_by: "user" }).eq("id", thread.id).eq("user_id", user.id);

  const primaryJobId = randomUUID();
  const { error: jobError } = await supabase.from("agent_jobs").insert({
    id: primaryJobId, user_id: user.id, agent_id: route.agentId, title: thread.title, status: "queued", queue: "conversation",
    input_type: route.inputType, input: { schemaVersion: 1, type: route.inputType, messageId, text: content, threadId: thread.id },
    prompt: content, priority: 90, scheduled_for: now, dedupe_key: `thread:${thread.id}:message:${messageId}:primary`, created_state_version: stateVersion,
    metadata: { threadId: thread.id, messageId }, required_capabilities: route.capabilities, created_by: "user", updated_by: "user",
  });
  if (jobError) throw new Error(jobError.message);

  await supabase.from("agent_jobs").insert({
    user_id: user.id, agent_id: "career-state-curator", title: `Curate state from ${thread.title}`, status: "queued", queue: "state",
    input_type: "state.curate", input: { schemaVersion: 1, type: "state.curate", messageId, text: content, threadId: thread.id },
    prompt: `Extract only career-relevant living state from this user message:\n\n${content}`,
    priority: 80, scheduled_for: now, dedupe_key: `thread:${thread.id}:message:${messageId}:state`, required_capabilities: [], created_state_version: stateVersion,
    related_object_ids: [thread.id, messageId], metadata: { sourceThreadId: thread.id, sourceMessageId: messageId }, created_by: "system", updated_by: "system",
  });
  revalidatePath(`/threads/${thread.id}`);
}

export async function setThreadPinned(threadId: string, pinned: boolean) {
  const { supabase, user } = await requireUser();
  await supabase.from("threads").update({ pinned, updated_by: "user" }).eq("id", threadId).eq("user_id", user.id);
  revalidatePath("/threads");
}

export async function renameThread(threadId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return;
  const { supabase, user } = await requireUser();
  await supabase.from("threads").update({ title, updated_by: "user" }).eq("id", threadId).eq("user_id", user.id);
  revalidatePath("/threads");
  revalidatePath(`/threads/${threadId}`);
}

export async function archiveThread(threadId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("threads").update({ status: "archived", archived_at: new Date().toISOString(), updated_by: "user" }).eq("id", threadId).eq("user_id", user.id);
  redirect("/threads");
}
