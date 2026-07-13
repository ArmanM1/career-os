import { NextResponse } from "next/server";
import { requireServerSecret } from "@/lib/env";
import { getResendClient } from "@/lib/resend";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  let event;
  try {
    event = getResendClient().webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: requireServerSecret("RESEND_WEBHOOK_SECRET") });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  if (!("email_id" in event.data)) return NextResponse.json({ received: true });
  const status = event.type.replace("email.", "");
  const admin = getSupabaseAdminClient();
  const { data: delivery } = await admin.from("notification_deliveries").select("id,user_id,outbox_id").eq("provider_message_id", event.data.email_id).maybeSingle();
  if (!delivery) return NextResponse.json({ received: true, matched: false });
  await admin.from("notification_deliveries").update({ status, metadata: { eventType: event.type, eventCreatedAt: event.created_at }, updated_by: "system" }).eq("id", delivery.id);
  if (["bounced", "failed", "complained", "suppressed"].includes(status)) await admin.from("notification_outbox").update({ status: "failed", last_error: `Resend reported ${status}`, updated_by: "system" }).eq("id", delivery.outbox_id);
  return NextResponse.json({ received: true, matched: true });
}
