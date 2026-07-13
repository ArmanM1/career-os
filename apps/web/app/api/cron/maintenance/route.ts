import { NextResponse } from "next/server";
import { requireServerSecret } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${requireServerSecret("CRON_SECRET")}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: expiredCount, error: stateError } = await admin.rpc("expire_stale_state_items");
  if (stateError) return NextResponse.json({ error: "State expiry failed" }, { status: 500 });
  const { data: evidence, error: evidenceError } = await admin.from("evidence").select("id,artifact_id,user_id").is("expired_at", null).lte("expires_at", now).limit(500);
  if (evidenceError) return NextResponse.json({ error: "Evidence retention scan failed" }, { status: 500 });
  const artifactIds = [...new Set((evidence ?? []).flatMap((item) => item.artifact_id ? [item.artifact_id] : []))];
  let removedArtifacts = 0;
  for (const artifactId of artifactIds) {
    const { data: artifact } = await admin.from("artifacts").select("id,bucket,storage_path").eq("id", artifactId).maybeSingle();
    if (!artifact) continue;
    const { error } = await admin.storage.from(artifact.bucket).remove([artifact.storage_path]);
    if (!error) {
      removedArtifacts += 1;
      await admin.from("artifacts").update({ status: "expired", archived_at: now, updated_by: "system" }).eq("id", artifact.id);
    }
  }
  if (evidence?.length) await admin.from("evidence").update({ status: "expired", expired_at: now, updated_by: "system" }).in("id", evidence.map((item) => item.id));
  await admin.rpc("recover_stale_agent_jobs");
  return NextResponse.json({ expiredStateItems: expiredCount ?? 0, expiredEvidence: evidence?.length ?? 0, removedArtifacts, checkedAt: now });
}
