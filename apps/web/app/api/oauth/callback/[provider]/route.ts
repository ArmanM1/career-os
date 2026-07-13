import { NextResponse } from "next/server";
import { getServerEnv, requireServerSecret } from "@/lib/env";
import { encryptOAuthToken, hashOAuthState } from "@/lib/oauth-crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); if (!code || !state) return NextResponse.redirect(new URL("/settings?connectorError=missing_code", url.origin));
  const admin = getSupabaseAdminClient(); const { data: oauthState } = await admin.from("oauth_states").select("*").eq("state_hash", hashOAuthState(state)).eq("provider", provider).eq("status", "active").gt("expires_at", new Date().toISOString()).maybeSingle(); if (!oauthState) return NextResponse.redirect(new URL("/settings?connectorError=invalid_state", url.origin));
  await admin.from("oauth_states").update({ status: "used", used_at: new Date().toISOString() }).eq("id", oauthState.id).eq("status", "active");
  let token: TokenResponse; let externalId: string; let label: string; let providerName: "gmail" | "google_calendar" | "github"; let grantedScopes: string[];
  if (provider === "google") {
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: requireServerSecret("GOOGLE_OAUTH_CLIENT_ID"), client_secret: requireServerSecret("GOOGLE_OAUTH_CLIENT_SECRET"), redirect_uri: `${getServerEnv().CAREER_OS_APP_URL}/api/oauth/callback/google`, grant_type: "authorization_code" }) }); token = await response.json() as TokenResponse; if (!response.ok || !token.access_token) return NextResponse.redirect(new URL("/settings?connectorError=token_exchange", url.origin));
    const identityResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } }); const identity = await identityResponse.json() as { sub: string; email?: string }; externalId = identity.sub; label = identity.email ?? `Google ${oauthState.service}`; providerName = oauthState.service === "gmail" ? "gmail" : "google_calendar"; grantedScopes = (token.scope ?? oauthState.scopes.join(" ")).split(" ").filter(Boolean);
  } else if (provider === "github") {
    const response = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ client_id: requireServerSecret("GITHUB_OAUTH_CLIENT_ID"), client_secret: requireServerSecret("GITHUB_OAUTH_CLIENT_SECRET"), code, redirect_uri: `${getServerEnv().CAREER_OS_APP_URL}/api/oauth/callback/github` }) }); token = await response.json() as TokenResponse; if (!response.ok || !token.access_token) return NextResponse.redirect(new URL("/settings?connectorError=token_exchange", url.origin));
    const identityResponse = await fetch("https://api.github.com/user", { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token.access_token}`, "x-github-api-version": "2022-11-28" } }); const identity = await identityResponse.json() as { id: number; login: string }; externalId = String(identity.id); label = identity.login; providerName = "github"; grantedScopes = (token.scope ?? "read:user user:email").split(/[ ,]+/).filter(Boolean);
  } else return NextResponse.redirect(new URL("/settings?connectorError=unsupported", url.origin));
  const { data: account, error: accountError } = await admin.from("connected_accounts").upsert({ user_id: oauthState.user_id, title: label, provider: providerName, status: "connected", external_account_id: externalId, scopes: grantedScopes, last_synced_at: null, created_by: "user", updated_by: "user" }, { onConflict: "user_id,provider" }).select("id").single();
  if (accountError || !account) return NextResponse.redirect(new URL("/settings?connectorError=account_store", url.origin));
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
  await admin.from("oauth_credentials").upsert({ user_id: oauthState.user_id, connected_account_id: account.id, status: "active", encrypted_access_token: encryptOAuthToken(token.access_token), encrypted_refresh_token: token.refresh_token ? encryptOAuthToken(token.refresh_token) : null, token_nonce: "embedded-v1", scopes: grantedScopes, expires_at: expiresAt, rotated_at: new Date().toISOString(), created_by: "system", updated_by: "system" }, { onConflict: "connected_account_id" });
  return NextResponse.redirect(new URL("/settings?connector=connected", url.origin));
}
