import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv, requireServerSecret } from "@/lib/env";
import { hashOAuthState } from "@/lib/oauth-crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const googleScopes = { gmail: ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"], calendar: ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"] } as const;

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const { user } = await requireUser(); const url = new URL(request.url); const service = url.searchParams.get("service") ?? provider; const state = randomBytes(32).toString("base64url"); let scopes: readonly string[]; let target: URL;
  if (provider === "google" && (service === "gmail" || service === "calendar")) {
    scopes = googleScopes[service]; target = new URL("https://accounts.google.com/o/oauth2/v2/auth"); target.searchParams.set("client_id", requireServerSecret("GOOGLE_OAUTH_CLIENT_ID")); target.searchParams.set("redirect_uri", `${getServerEnv().CAREER_OS_APP_URL}/api/oauth/callback/google`); target.searchParams.set("response_type", "code"); target.searchParams.set("access_type", "offline"); target.searchParams.set("include_granted_scopes", "true"); target.searchParams.set("prompt", "consent select_account"); target.searchParams.set("scope", scopes.join(" ")); target.searchParams.set("state", state);
  } else if (provider === "github") {
    scopes = ["read:user", "user:email"]; target = new URL("https://github.com/login/oauth/authorize"); target.searchParams.set("client_id", requireServerSecret("GITHUB_OAUTH_CLIENT_ID")); target.searchParams.set("redirect_uri", `${getServerEnv().CAREER_OS_APP_URL}/api/oauth/callback/github`); target.searchParams.set("scope", scopes.join(" ")); target.searchParams.set("state", state); target.searchParams.set("allow_signup", "false");
  } else return NextResponse.json({ error: "Unsupported connector" }, { status: 404 });
  const { error } = await getSupabaseAdminClient().from("oauth_states").insert({ user_id: user.id, provider, service, state_hash: hashOAuthState(state), scopes: [...scopes], expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (error) return NextResponse.json({ error: "Unable to start connector authorization" }, { status: 500 });
  return NextResponse.redirect(target);
}
