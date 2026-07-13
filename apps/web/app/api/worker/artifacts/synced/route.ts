import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({ artifactId: z.uuid(), sha256: z.string().regex(/^[a-f0-9]{64}$/i), localPath: z.string().min(3).max(2000) });

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid artifact sync result" }, { status: 400 });
  const { data, error } = await getSupabaseAdminClient().from("artifacts").update({ local_path: parsed.data.localPath, status: "active", updated_by: "system" }).eq("id", parsed.data.artifactId).eq("user_id", device.userId).eq("sha256", parsed.data.sha256).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Artifact checksum did not match" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
