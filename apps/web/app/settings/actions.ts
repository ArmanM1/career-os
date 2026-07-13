"use server";

import { revalidatePath } from "next/cache";
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
