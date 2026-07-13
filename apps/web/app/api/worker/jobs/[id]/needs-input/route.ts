import { NextResponse } from "next/server";
import { authorizeWorkerJob } from "@/lib/worker-job-route";
import { onboardingWorkItemIdFromJob, updateOnboardingWorkItem } from "@/lib/onboarding-work-items";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeWorkerJob(request, id);
  if (!context) return NextResponse.json({ error: "Unauthorized job" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { reason?: string; approvalRequest?: unknown; nextUserAction?: { type: string; label: string; provider?: string; href?: string; instructions?: string } };
  const { error } = await context.admin.from("agent_jobs").update({ status: "needs_user_input", error_message: String(body.reason ?? "User input required").slice(0, 4000), lease_expires_at: null, updated_by: "system" }).eq("id", id).eq("status", "running");
  if (error) return NextResponse.json({ error: "Unable to pause job" }, { status: 500 });
  await updateOnboardingWorkItem(context.admin, onboardingWorkItemIdFromJob(context.job), context.device.userId, {
    status: "waiting_for_user",
    phase: "needs_user_input",
    progress: 45,
    latestJobId: id,
    blockingReason: String(body.reason ?? "User input required").slice(0, 4000),
    nextUserAction: body.nextUserAction ?? {
      type: "open_onboarding",
      label: "Complete required setup",
      href: "/onboarding",
      instructions: String(body.reason ?? "Career OS needs a setup step before it can continue.").slice(0, 1000),
    },
  });
  return NextResponse.json({ ok: true });
}
