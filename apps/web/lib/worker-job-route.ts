import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateWorker } from "@/lib/worker-auth";

export async function authorizeWorkerJob(request: Request, jobId: string) {
  const device = await authenticateWorker(request);
  if (!device) return null;
  const admin = getSupabaseAdminClient();
  const { data: job } = await admin.from("agent_jobs").select("*").eq("id", jobId).eq("user_id", device.userId).maybeSingle();
  if (!job || (job.claimed_by_device_id && job.claimed_by_device_id !== device.id)) return null;
  return { admin, device, job };
}
