import { NextResponse } from "next/server";
import { createPairingCode, hashPairingCode } from "@/lib/worker-auth";
import { requireUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  const input = (await request.json().catch(() => ({}))) as { name?: string };
  const name = input.name?.trim().slice(0, 80) || "Career OS computer";
  const code = createPairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { data: device, error: deviceError } = await supabase
    .from("worker_devices")
    .insert({ user_id: user.id, name, status: "pairing", created_by: "user", updated_by: "user" })
    .select("id")
    .single();
  if (deviceError || !device) return NextResponse.json({ error: "Unable to create worker device" }, { status: 500 });

  const { error: codeError } = await supabase.from("worker_pairing_codes").insert({
    user_id: user.id,
    worker_device_id: device.id,
    code_hash: hashPairingCode(code),
    expires_at: expiresAt,
    created_by: "user",
    updated_by: "user",
  });
  if (codeError) {
    await supabase.from("worker_devices").delete().eq("id", device.id).eq("user_id", user.id);
    return NextResponse.json({ error: "Unable to create pairing code" }, { status: 500 });
  }
  return NextResponse.json({ deviceId: device.id, code, expiresAt });
}
