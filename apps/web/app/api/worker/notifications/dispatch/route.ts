import { NextResponse } from "next/server";
import { CareerNotificationEmail } from "@/emails/career-notification";
import { getServerEnv, requireServerSecret } from "@/lib/env";
import { getResendClient } from "@/lib/resend";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const admin = getSupabaseAdminClient();
  const { data: items, error } = await admin.from("notification_outbox").select("*").eq("user_id", device.userId).eq("status", "pending").lte("scheduled_for", new Date().toISOString()).order("scheduled_for").limit(10);
  if (error) return NextResponse.json({ error: "Unable to read notification outbox" }, { status: 500 });
  const resend = getResendClient();
  const from = requireServerSecret("RESEND_FROM_EMAIL");
  let sent = 0;
  for (const item of items ?? []) {
    if (item.channel !== "email" || !item.recipient) continue;
    await admin.from("notification_outbox").update({ status: "sending", attempt_count: item.attempt_count + 1, updated_by: "system" }).eq("id", item.id).eq("status", "pending");
    const payload = (item.payload ?? {}) as { body?: string; preview?: string; actionUrl?: string; actionLabel?: string };
    const actionUrl = payload.actionUrl?.startsWith("http") ? payload.actionUrl : `${getServerEnv().CAREER_OS_APP_URL}${payload.actionUrl ?? "/dashboard"}`;
    const result = await resend.emails.send({
      from: `Career OS <${from}>`,
      to: item.recipient,
      subject: item.subject,
      react: CareerNotificationEmail({ subject: item.subject, preview: payload.preview ?? item.subject, body: payload.body ?? "Open Career OS to review this update.", actionUrl, actionLabel: payload.actionLabel }),
      headers: { "Idempotency-Key": item.idempotency_key },
    });
    if (result.error) {
      await admin.from("notification_outbox").update({ status: "failed", last_error: result.error.message, updated_by: "system" }).eq("id", item.id);
      continue;
    }
    await admin.from("notification_outbox").update({ status: "sent", updated_by: "system" }).eq("id", item.id);
    await admin.from("notification_deliveries").insert({ user_id: device.userId, outbox_id: item.id, status: "accepted", provider: "resend", provider_message_id: result.data?.id, created_by: "system", updated_by: "system" });
    sent += 1;
  }
  return NextResponse.json({ checked: items?.length ?? 0, sent });
}
