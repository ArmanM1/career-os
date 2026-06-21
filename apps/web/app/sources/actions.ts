"use server";

import { revalidatePath } from "next/cache";
import { createCareerServerClient } from "@/lib/server-supabase";

function splitList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formText(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export async function queueSourceDiscovery(formData: FormData) {
  const server = createCareerServerClient();
  if (!server) return;

  const sourceTypes = formData
    .getAll("sourceTypes")
    .filter((value): value is string => typeof value === "string");
  const scope = sourceTypes.length > 0 ? sourceTypes : ["github_repo", "company_careers_page", "social_account"];
  const targetSeason = formText(formData, "targetSeason", "summer_2027");
  const targetRoles = splitList(formData.get("targetRoles"));
  const accountHints = splitList(formData.get("accountHints"));
  const browserUseAllowed = formData.get("browserUseAllowed") === "on";
  const query = formText(
    formData,
    "query",
    "Find durable Summer 2027 SWE internship sources, starting with GitHub for testing.",
  );

  await server.supabase.from("agent_jobs").insert({
    user_id: server.userId,
    agent_id: "career-job-sourcing",
    title: `Source discovery: ${targetSeason}`,
    status: "queued",
    labels: ["source-discovery", targetSeason],
    queue: "sources",
    prompt: [
      query,
      "Create proposed SourceMonitor records only.",
      "Discovery is agent-owned; deterministic scripts only parse already-created sources.",
      "When browser/computer use is allowed, you may search X and Instagram, including provided account hints.",
      "Do not post, comment, DM, follow, submit forms, or mutate external account state.",
    ].join("\n"),
    input: {
      type: "job_sourcing.discover",
      mode: "manual",
      query,
      scope,
      browserUseAllowed,
      computerUseAllowed: browserUseAllowed,
      maxDurationMinutes: Number(formData.get("maxDurationMinutes") ?? 30),
      targetSeason,
      targetRoles,
      targetCompanies: splitList(formData.get("targetCompanies")),
      accountHints,
      sourcePolicy: {
        newSourceMonitorStatus: "proposed",
        socialDiscoveryAllowed: true,
        deterministicIngestionOnlyAfterSourceCreated: true,
      },
    },
    priority: 60,
    scheduled_for: new Date().toISOString(),
    created_by: "user",
    updated_by: "user",
  });

  revalidatePath("/sources");
  revalidatePath("/agent-runs");
}

export async function addKnownGitHubSource(formData: FormData) {
  const server = createCareerServerClient();
  if (!server) return;

  const url = formText(formData, "url");
  if (!url) return;

  const title = formText(formData, "title", "GitHub opportunity source");
  const targetSeason = formText(formData, "targetSeason", "summer_2027");
  const targetRoles = splitList(formData.get("targetRoles"));

  await server.supabase.from("source_monitors").insert({
    user_id: server.userId,
    title,
    status: "proposed",
    labels: ["github", "manual-source", targetSeason],
    source_type: "github_repo",
    url,
    fetch_strategy: "git_pull",
    schedule: formText(formData, "schedule", "daily"),
    requires_auth: false,
    browser_use_enabled: false,
    source_rationale: formText(
      formData,
      "rationale",
      "User-provided GitHub source for deterministic parsing once activated.",
    ),
    metadata: {
      targetSeason,
      targetRoles,
      sourceOrigin: "user_provided",
    },
    created_by: "user",
    updated_by: "user",
  });

  revalidatePath("/sources");
}

export async function updateSourceMonitorStatus(formData: FormData) {
  const server = createCareerServerClient();
  if (!server) return;

  const id = formText(formData, "id");
  const status = formText(formData, "status");
  if (!id || !["active", "paused", "archived"].includes(status)) return;

  await server.supabase
    .from("source_monitors")
    .update({ status, updated_by: "user" })
    .eq("user_id", server.userId)
    .eq("id", id);

  revalidatePath("/sources");
}
