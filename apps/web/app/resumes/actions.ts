"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  await admin.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-resume-tailor", title: `Import ${file.name}`, input_type: "resume.import", input: { schemaVersion: 1, type: "resume.import", resumeVersionId: resumeId, artifactId, sourceFormat: extension, storagePath }, related_object_ids: [resumeId, artifactId], required_capabilities: ["read_files", "write_workspace"], priority: 70, dedupe_key: `resume-import:${artifactId}`, created_by: "user", updated_by: "user" });
  revalidatePath("/resumes");
  revalidatePath("/onboarding");
}
