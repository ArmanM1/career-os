import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createDeviceSecret, hashDeviceSecret, hashPairingCode } from "@/lib/worker-auth";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

const inputSchema = z.object({
  code: z.string().min(12).max(64),
  workerVersion: z.string().max(40).optional(),
  capabilities: z.array(z.string().max(80)).max(50).default([]),
});

export async function POST(request: Request) {
  const rate = checkRateLimit(`worker-pair:${requestIp(request)}`, 10, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many pairing attempts" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid pairing request" }, { status: 400 });
  const secret = createDeviceSecret();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_worker_pairing_code", {
    p_code_hash: hashPairingCode(parsed.data.code),
    p_device_secret_hash: hashDeviceSecret(secret),
    p_worker_version: parsed.data.workerVersion ?? null,
    p_capabilities: parsed.data.capabilities,
  });
  const paired = Array.isArray(data) ? data[0] : data;
  if (error || !paired) return NextResponse.json({ error: "Pairing code is invalid or expired" }, { status: 401 });
  return NextResponse.json({ deviceId: paired.device_id, deviceSecret: secret, userId: paired.user_id });
}
