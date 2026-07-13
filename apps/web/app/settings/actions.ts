"use server";

import { revalidatePath } from "next/cache";
import { Cron } from "croner";
import { getServerEnv, requireServerSecret } from "@/lib/env";
import { decryptOAuthToken } from "@/lib/oauth-crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export async function disconnectConnector(accountId: string) {
  const { supabase, user } = await requireUser(); const { data: account } = await supabase.from("connected_accounts").select("id,provider").eq("id", accountId).eq("user_id", user.id).maybeSingle(); if (!account) throw new Error("Connector not found");
  const admin = getSupabaseAdminClient(); const { data: credential } = await admin.from("oauth_credentials").select("encrypted_access_token").eq("connected_account_id", account.id).maybeSingle();
  if (credential?.encrypted_access_token) {
    const token = decryptOAuthToken(credential.encrypted_access_token);
    if (account.provider === "gmail" || account.provider === "google_calendar") await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
    if (account.provider === "github") {
      const basic = Buffer.from(`${requireServerSecret("GITHUB_OAUTH_CLIENT_ID")}:${requireServerSecret("GITHUB_OAUTH_CLIENT_SECRET")}`).toString("base64");
      await fetch(`https://api.github.com/applications/${getServerEnv().GITHUB_OAUTH_CLIENT_ID}/token`, { method: "DELETE", headers: { accept: "application/vnd.github+json", authorization: `Basic ${basic}`, "content-type": "application/json", "x-github-api-version": "2022-11-28" }, body: JSON.stringify({ access_token: token }) });
    }
  }
  await admin.from("oauth_credentials").delete().eq("connected_account_id", account.id).eq("user_id", user.id);
  await supabase.from("connected_accounts").update({ status: "disabled", scopes: [], updated_by: "user" }).eq("id", account.id).eq("user_id", user.id);
  await supabase.from("audit_log_entries").insert({ user_id: user.id, action_type: "connector.disconnected", target_object_type: "connected_account", target_object_id: account.id, summary: `${account.provider} disconnected`, created_by: "user", updated_by: "user" });
  revalidatePath("/settings");
}

export async function requestConnectorSync(accountId: string) {
  const { supabase, user } = await requireUser();
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("id,provider,status")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account || account.status !== "connected") throw new Error("Connected account is not available for sync");
  await supabase
    .from("connected_accounts")
    .update({ last_synced_at: null, updated_by: "user" })
    .eq("id", account.id)
    .eq("user_id", user.id);
  await supabase.from("audit_log_entries").insert({
    user_id: user.id,
    action_type: "connector.sync_requested",
    target_object_type: "connected_account",
    target_object_id: account.id,
    summary: `${account.provider} sync requested`,
    created_by: "user",
    updated_by: "user",
  });
  revalidatePath("/settings");
}

export async function setNotificationPreference(category: string, enabled: boolean) {
  const { supabase, user } = await requireUser();
  await supabase.from("notification_preferences").upsert({ user_id: user.id, category, channel: "email", enabled, minimum_severity: "important", status: "active", created_by: "user", updated_by: "user" }, { onConflict: "user_id,category,channel" });
  revalidatePath("/settings");
}

export async function updateTimezone(formData: FormData) {
  const timezone = String(formData.get("timezone") ?? "").trim();
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); } catch { throw new Error("Enter a valid IANA timezone such as America/Denver."); }
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ timezone, updated_by: "user" }).eq("user_id", user.id);
  const { data: schedules } = await supabase.from("schedules").select("id,cron_expression").eq("user_id", user.id).eq("status", "active");
  for (const schedule of schedules ?? []) await supabase.from("schedules").update({ timezone, next_run_at: schedule.cron_expression ? new Cron(schedule.cron_expression, { timezone }).nextRun()?.toISOString() ?? null : null, updated_by: "user" }).eq("id", schedule.id).eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
