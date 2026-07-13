import { NextResponse } from "next/server";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const cadenceMs: Record<string, number> = { gmail: 15 * 60_000, google_calendar: 60 * 60_000, github: 6 * 60 * 60_000 };

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const { data, error } = await getSupabaseAdminClient().from("connected_accounts").select("id,provider,last_synced_at,status").eq("user_id", device.userId).eq("status", "connected");
  if (error) return NextResponse.json({ error: "Unable to read connectors" }, { status: 500 });
  const now = Date.now();
  const accounts = (data ?? []).filter((account) => !account.last_synced_at || now - new Date(account.last_synced_at).getTime() >= (cadenceMs[account.provider] ?? 24 * 60 * 60_000));
  return NextResponse.json({ accounts });
}
