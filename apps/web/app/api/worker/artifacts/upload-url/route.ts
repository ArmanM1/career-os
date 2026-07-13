import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorker, isAllowedStoragePath, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({ bucket: z.string(), path: z.string().min(3).max(1000) });

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isAllowedStoragePath(device.userId, parsed.data?.bucket ?? "", parsed.data?.path ?? "")) return NextResponse.json({ error: "Invalid storage target" }, { status: 400 });
  const { data, error } = await getSupabaseAdminClient().storage.from(parsed.data.bucket).createSignedUploadUrl(parsed.data.path);
  if (error) return NextResponse.json({ error: "Unable to create upload URL" }, { status: 500 });
  return NextResponse.json(data);
}
