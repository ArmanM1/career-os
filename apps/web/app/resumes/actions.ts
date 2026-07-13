"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  activeOnboardingSession,
  updateOnboardingWorkItem,
  upsertOnboardingWorkItem,
} from "@/lib/onboarding-work-items";

const allowedTypes = new Map([
  ["application/pdf", "pdf"],
  ["application/x-tex", "tex"],
  ["text/x-tex", "tex"],
  ["text/plain", "txt"],
  ["application/zip", "zip"],
  ["application/x-zip-compressed", "zip"],
]);

export async function uploadResumeSource(formData: FormData) {
  const { user } = await requireUser();
  const file = formData.get("file");
  const requestedTrack = String(formData.get("track") ?? "general").trim().toLowerCase();
  const track = (["swe", "entrepreneurship", "fde", "exploration", "general"] as const).find((value) => value === requestedTrack) ?? "general";
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a resume file to upload.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Resume files must be 25 MB or smaller.");
  const extension = allowedTypes.get(file.type) ?? file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "tex", "txt", "zip"].includes(extension)) throw new Error("Upload a PDF, .tex, text, or ZIP resume source.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const artifactId = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const storagePath = `${user.id}/${artifactId}/${safeName}`;
  const admin = getSupabaseAdminClient();
  const { error: uploadError } = await admin.storage.from("resume-sources").upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) throw new Error("Unable to upload resume source.");
  const { error: artifactError } = await admin.from("artifacts").insert({ id: artifactId, user_id: user.id, title: file.name, artifact_type: `resume_source_${extension}`, bucket: "resume-sources", storage_path: storagePath, mime_type: file.type, size_bytes: file.size, sha256, origin: "user_upload", retention_policy: "canonical", created_by: "user", updated_by: "user" });
  if (artifactError) {
    await admin.storage.from("resume-sources").remove([storagePath]);
    throw new Error("Unable to register resume source.");
  }
  const resumeId = randomUUID();
  const { error: resumeError } = await admin.from("resume_versions").insert({ id: resumeId, user_id: user.id, title: file.name.replace(/\.[^.]+$/, ""), status: extension === "tex" || extension === "zip" ? "active" : "processing", track, latex_path: extension === "tex" ? storagePath : "pending-extraction", metadata: { sourceArtifactId: artifactId, sourceFormat: extension, verified: false }, created_by: "user", updated_by: "user" });
  if (resumeError) throw new Error("Resume uploaded, but the library record could not be created.");
  const onboarding = await activeOnboardingSession(admin, user.id);
  const workItem = onboarding
    ? await upsertOnboardingWorkItem(admin, {
        userId: user.id,
        sessionId: onboarding.id,
        stableKey: `resume:${artifactId}`,
        workType: "resume",
        title: `Extract ${file.name}`,
        status: "queued",
        phase: "extracting_components",
        progress: 10,
        relatedObjectType: "resume_version",
        relatedObjectId: resumeId,
        metadata: { artifactId, resumeVersionId: resumeId, sourceFormat: extension, fileName: file.name },
      })
    : null;
  const { data: job, error: jobError } = await admin.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-resume-tailor", title: `Import ${file.name}`, input_type: "resume.import", input: { schemaVersion: 1, type: "resume.import", resumeVersionId: resumeId, artifactId, sourceFormat: extension, storagePath, onboardingSessionId: onboarding?.id, onboardingWorkItemId: workItem?.id }, related_object_ids: [resumeId, artifactId], required_capabilities: ["read_files", "write_workspace"], priority: 70, dedupe_key: `resume-import:${artifactId}`, metadata: { onboardingSessionId: onboarding?.id, onboardingWorkItemId: workItem?.id }, created_by: "user", updated_by: "user" }).select("id").single();
  if (jobError || !job) throw new Error("Resume uploaded, but extraction could not be queued.");
  if (workItem)
    await updateOnboardingWorkItem(admin, workItem.id, user.id, {
      status: "queued",
      phase: "extracting_components",
      progress: 10,
      latestJobId: job.id,
    });
  revalidatePath("/resumes");
  revalidatePath("/onboarding");
}

export async function saveExperience(experienceId: string | null, formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const endsAt = String(formData.get("endsAt") ?? "").trim();
  if (!title) throw new Error("Experience title is required.");
  const values = { title, organization: organization || null, description: description || null, starts_at: startsAt || null, ends_at: endsAt || null, status: "draft", updated_by: "user" as const };
  const result = experienceId
    ? await supabase.from("experiences").update(values).eq("id", experienceId).eq("user_id", user.id).select("id").maybeSingle()
    : await supabase.from("experiences").insert({ ...values, user_id: user.id, created_by: "user" }).select("id").single();
  if (result.error || !result.data) throw new Error("Unable to save this experience.");
  revalidatePath("/resumes");
}

export async function setExperienceReview(experienceId: string, status: "verified" | "draft") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("experiences").update({ status, updated_by: "user" }).eq("id", experienceId).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) throw new Error("Unable to update the experience review state.");
  await refreshResumeOnboardingReadiness(getSupabaseAdminClient(), user.id);
  revalidatePath("/resumes");
  revalidatePath("/onboarding");
}

export async function setResumeComponentReview(
  componentType: "achievement" | "project" | "skill",
  componentId: string,
  status: "verified" | "draft",
) {
  const { user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const table = componentType === "achievement"
    ? "experience_achievements"
    : componentType === "project"
      ? "projects"
      : "skills";
  const { data, error } = await admin
    .from(table)
    .update({ status, updated_by: "user" })
    .eq("id", componentId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(`Unable to review this ${componentType}.`);
  await refreshResumeOnboardingReadiness(admin, user.id);
  revalidatePath("/resumes");
  revalidatePath("/onboarding");
}

export async function addExperienceAchievement(experienceId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const achievement = String(formData.get("achievement") ?? "").trim();
  if (!achievement) throw new Error("Achievement text is required.");
  const { data: experience } = await supabase.from("experiences").select("id").eq("id", experienceId).eq("user_id", user.id).maybeSingle();
  if (!experience) throw new Error("Experience not found.");
  const { error } = await supabase.from("experience_achievements").insert({ user_id: user.id, experience_id: experienceId, title: achievement.slice(0, 120), achievement, status: "verified", provenance: "user", created_by: "user", updated_by: "user" });
  if (error) throw new Error("Unable to add this achievement.");
  await refreshResumeOnboardingReadiness(getSupabaseAdminClient(), user.id);
  revalidatePath("/resumes");
}

async function refreshResumeOnboardingReadiness(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
) {
  const { data: workItems } = await admin
    .from("onboarding_work_items")
    .select("id,status,related_object_id,metadata")
    .eq("user_id", userId)
    .eq("work_type", "resume")
    .in("status", ["review_required", "ready"]);
  for (const item of workItems ?? []) {
    const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? item.metadata as Record<string, unknown>
      : {};
    const artifactId = typeof metadata.artifactId === "string" ? metadata.artifactId : null;
    if (!artifactId || !item.related_object_id) continue;
    const [{ data: experiences }, { data: achievements }, { data: projects }, { data: skills }] = await Promise.all([
      admin.from("experiences").select("id,status").eq("user_id", userId).contains("metadata", { sourceArtifactIds: [artifactId] }).is("archived_at", null),
      admin.from("experience_achievements").select("id,status").eq("user_id", userId).contains("metadata", { sourceArtifactId: artifactId }).is("archived_at", null),
      admin.from("projects").select("id,status").eq("user_id", userId).contains("metadata", { sourceArtifactIds: [artifactId] }).is("archived_at", null),
      admin.from("skills").select("id,status").eq("user_id", userId).contains("metadata", { sourceArtifactIds: [artifactId] }).is("archived_at", null),
    ]);
    const components = [...(experiences ?? []), ...(achievements ?? []), ...(projects ?? []), ...(skills ?? [])];
    const allVerified = components.length > 0 && components.every((component) => component.status === "verified");
    if (allVerified && item.status !== "ready") {
      await updateOnboardingWorkItem(admin, item.id, userId, {
        status: "ready",
        phase: "component_library_verified",
        progress: 100,
        readinessConfirmedAt: new Date().toISOString(),
      });
      await admin.from("resume_versions").update({ status: "verified", updated_by: "user" }).eq("id", item.related_object_id).eq("user_id", userId);
    } else if (!allVerified && item.status === "ready") {
      await updateOnboardingWorkItem(admin, item.id, userId, {
        status: "review_required",
        phase: "review_components",
        progress: components.length ? 80 : 60,
        blockingReason: components.length ? "Review every extracted component before this resume is ready." : "No reusable components were extracted. Add or correct the missing facts.",
        nextUserAction: { type: "open_resume_library", label: "Review resume components", href: "/resumes" },
      });
      await admin.from("resume_versions").update({ status: "review_required", updated_by: "user" }).eq("id", item.related_object_id).eq("user_id", userId);
    }
  }
}
