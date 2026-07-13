import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSecret } from "@/lib/env";
import { decryptOAuthToken, encryptOAuthToken } from "@/lib/oauth-crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";

const inputSchema = z.object({ connectedAccountId: z.uuid() });
type Admin = ReturnType<typeof getSupabaseAdminClient>;

async function accessToken(admin: Admin, account: Record<string, unknown>, credential: Record<string, unknown>) {
  const encrypted = String(credential.encrypted_access_token ?? "");
  const expiresAt = credential.expires_at ? new Date(String(credential.expires_at)).getTime() : Number.POSITIVE_INFINITY;
  if ((account.provider === "gmail" || account.provider === "google_calendar") && expiresAt < Date.now() + 60_000) {
    if (!credential.encrypted_refresh_token) throw new Error("Google connector needs reauthorization");
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: requireServerSecret("GOOGLE_OAUTH_CLIENT_ID"), client_secret: requireServerSecret("GOOGLE_OAUTH_CLIENT_SECRET"), refresh_token: decryptOAuthToken(String(credential.encrypted_refresh_token)), grant_type: "refresh_token" }) });
    const body = await response.json() as { access_token?: string; expires_in?: number }; if (!response.ok || !body.access_token) throw new Error("Google token refresh failed");
    await admin.from("oauth_credentials").update({ encrypted_access_token: encryptOAuthToken(body.access_token), expires_at: new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString(), rotated_at: new Date().toISOString(), updated_by: "system" }).eq("id", credential.id);
    return body.access_token;
  }
  return decryptOAuthToken(encrypted);
}

async function createSignalOnce(admin: Admin, userId: string, provider: string, externalType: string, externalId: string, signal: Record<string, unknown>) {
  const { error } = await admin.from("external_refs").insert({ user_id: userId, status: "active", provider, external_type: externalType, external_id: externalId, payload: signal, last_seen_at: new Date().toISOString(), created_by: "system", updated_by: "system" });
  if (error?.code === "23505") { await admin.from("external_refs").update({ payload: signal, last_seen_at: new Date().toISOString(), updated_by: "system" }).eq("user_id", userId).eq("provider", provider).eq("external_type", externalType).eq("external_id", externalId); return false; }
  if (error) throw new Error(error.message);
  await admin.from("signals").insert({ user_id: userId, title: String(signal.title ?? externalType), status: "new", signal_type: signal.signalType ?? "other", source_type: signal.sourceType ?? null, source_url: signal.url ?? null, external_ref: externalId, posted_at: signal.postedAt ?? null, raw_payload: signal.rawPayload ?? {}, normalized_payload: signal, parser_name: `${provider}-connector`, parser_confidence: "high", rationale: "Read-only connector signal", created_by: "system", updated_by: "system" });
  return true;
}

async function syncGmail(admin: Admin, userId: string, token: string) {
  const query = encodeURIComponent("newer_than:45d (application OR interview OR assessment OR recruiter OR internship OR referral OR career fair)");
  const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=40`, { headers: { authorization: `Bearer ${token}` } });
  if (!list.ok) throw new Error(`Gmail sync failed (${list.status})`); const body = await list.json() as { messages?: Array<{ id: string; threadId: string }> }; let created = 0;
  for (const item of body.messages ?? []) {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { authorization: `Bearer ${token}` } }); if (!response.ok) continue;
    const message = await response.json() as { id: string; threadId: string; snippet?: string; internalDate?: string; payload?: { headers?: Array<{ name: string; value: string }> } }; const headers = Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]));
    if (await createSignalOnce(admin, userId, "gmail", "message", message.id, { title: headers.subject ?? "Career-related email", signalType: "application_status", sourceType: "email_application_status", postedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null, rawPayload: { threadId: message.threadId, from: headers.from, subject: headers.subject, date: headers.date, snippet: message.snippet?.slice(0, 500) } })) created += 1;
  }
  return { seen: body.messages?.length ?? 0, created };
}

async function syncCalendar(admin: Admin, userId: string, token: string) {
  const timeMin = new Date(Date.now() - 30 * 86400_000).toISOString(); const timeMax = new Date(Date.now() + 120 * 86400_000).toISOString();
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Calendar sync failed (${response.status})`); const body = await response.json() as { items?: Array<Record<string, unknown>> }; let created = 0;
  for (const event of body.items ?? []) { const id = String(event.id); const start = event.start as { dateTime?: string; date?: string } | undefined; if (await createSignalOnce(admin, userId, "google_calendar", "event", id, { title: String(event.summary ?? "Calendar event"), signalType: "calendar_event", sourceType: "calendar_events", url: event.htmlLink, postedAt: start?.dateTime ?? (start?.date ? `${start.date}T00:00:00Z` : null), rawPayload: { summary: event.summary, description: String(event.description ?? "").slice(0, 1000), location: event.location, start: event.start, end: event.end, attendees: event.attendees } })) created += 1; }
  return { seen: body.items?.length ?? 0, created };
}

async function syncGitHub(admin: Admin, userId: string, token: string) {
  const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member", { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" } });
  if (!response.ok) throw new Error(`GitHub sync failed (${response.status})`); const repos = await response.json() as Array<Record<string, unknown>>; let created = 0;
  for (const repo of repos) { const id = String(repo.id); if (await createSignalOnce(admin, userId, "github", "repository", id, { title: String(repo.full_name), signalType: "repo_update", sourceType: "github_repo", url: repo.html_url, postedAt: repo.pushed_at, rawPayload: { name: repo.full_name, description: repo.description, language: repo.language, topics: repo.topics, pushedAt: repo.pushed_at, private: repo.private } })) created += 1; }
  return { seen: repos.length, created };
}

export async function POST(request: Request) {
  const device = await authenticateWorker(request); if (!device) return workerUnauthorized(); const parsed = inputSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid connector sync request" }, { status: 400 });
  const admin = getSupabaseAdminClient(); const { data: account } = await admin.from("connected_accounts").select("*").eq("id", parsed.data.connectedAccountId).eq("user_id", device.userId).eq("status", "connected").maybeSingle(); if (!account) return NextResponse.json({ error: "Connected account not found" }, { status: 404 }); const { data: credential } = await admin.from("oauth_credentials").select("*").eq("connected_account_id", account.id).eq("user_id", device.userId).eq("status", "active").maybeSingle(); if (!credential) return NextResponse.json({ error: "Connector needs reauthorization" }, { status: 409 });
  const { data: run, error: runError } = await admin.from("connector_sync_runs").insert({ user_id: device.userId, connected_account_id: account.id, status: "running", sync_type: "incremental", started_at: new Date().toISOString(), created_by: "system", updated_by: "system" }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: "Unable to start connector sync" }, { status: 500 });
  try { const token = await accessToken(admin, account, credential); const result = account.provider === "gmail" ? await syncGmail(admin, device.userId, token) : account.provider === "google_calendar" ? await syncCalendar(admin, device.userId, token) : await syncGitHub(admin, device.userId, token); await admin.from("connector_sync_runs").update({ status: "success", completed_at: new Date().toISOString(), records_seen: result.seen, signals_created: result.created, updated_by: "system" }).eq("id", run.id); await admin.from("connected_accounts").update({ last_synced_at: new Date().toISOString(), updated_by: "system" }).eq("id", account.id); return NextResponse.json(result); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); await admin.from("connector_sync_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message, updated_by: "system" }).eq("id", run.id); if (/reauthorization|token refresh/i.test(message)) await admin.from("connected_accounts").update({ status: "needs_reauth", updated_by: "system" }).eq("id", account.id); return NextResponse.json({ error: message }, { status: 502 }); }
}
