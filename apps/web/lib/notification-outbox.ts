import type { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof getSupabaseAdminClient>;

export async function enqueueSystemEmail(admin: Admin, input: { userId: string; category: string; severity: "info" | "important" | "urgent"; idempotencyKey: string; subject: string; body: string; actionUrl: string; actionLabel?: string }) {
  const { data: preference } = await admin.from("notification_preferences").select("enabled,minimum_severity").eq("user_id", input.userId).eq("category", input.category).eq("channel", "email").maybeSingle();
  if (preference && !preference.enabled) return false;
  const severityRank = { info: 0, important: 1, urgent: 2 } as const;
  const minimumSeverity = preference?.minimum_severity as keyof typeof severityRank | null;
  if (minimumSeverity && severityRank[input.severity] < severityRank[minimumSeverity]) return false;
  const { data } = await admin.auth.admin.getUserById(input.userId);
  if (!data.user?.email) return false;
  const { error } = await admin.from("notification_outbox").insert({ user_id: input.userId, channel: "email", category: input.category, severity: input.severity, idempotency_key: input.idempotencyKey, recipient: data.user.email, subject: input.subject, payload: { body: input.body, preview: input.subject, actionUrl: input.actionUrl, actionLabel: input.actionLabel ?? "Open Career OS" }, created_by: "system", updated_by: "system" });
  return !error || error.code === "23505";
}
