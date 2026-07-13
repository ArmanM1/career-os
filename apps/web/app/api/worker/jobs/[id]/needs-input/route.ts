import { NextResponse } from "next/server";
import { authorizeWorkerJob } from "@/lib/worker-job-route";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeWorkerJob(request, id);
  if (!context) return NextResponse.json({ error: "Unauthorized job" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const { error } = await context.admin.from("agent_jobs").update({ status: "needs_user_input", error_message: String(body.reason ?? "User input required").slice(0, 4000), lease_expires_at: null, updated_by: "system" }).eq("id", id).eq("status", "running");
  if (error) return NextResponse.json({ error: "Unable to pause job" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
