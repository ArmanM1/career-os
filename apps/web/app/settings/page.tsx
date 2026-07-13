import { ArrowRight, Cable, Laptop, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { disconnectConnector, requestAccountDeletion, requestConnectorSync, requestDataExport, setNotificationPreference, updateTimezone } from "./actions";

export const dynamic = "force-dynamic";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connector?: string; connectorError?: string }> }) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: accounts }, { data: devices }, { data: preferences }, { data: syncRuns }, { data: exports }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("connected_accounts")
        .select("id,provider,status,last_synced_at,scopes")
        .eq("user_id", user.id),
      supabase
        .from("worker_devices")
        .select("status")
        .eq("user_id", user.id)
        .neq("status", "revoked"),
      supabase.from("notification_preferences").select("category,enabled").eq("user_id", user.id).eq("channel", "email"),
      supabase.from("connector_sync_runs").select("connected_account_id,status,completed_at,error_message,records_seen,signals_created").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("artifacts").select("id,title,storage_path,created_at,size_bytes").eq("user_id", user.id).eq("bucket", "exports").eq("artifact_type", "account_export").eq("status", "active").order("created_at", { ascending: false }).limit(5),
    ]);
  const exportDownloads = await Promise.all((exports ?? []).map(async (artifact) => {
    const { data } = await supabase.storage.from("exports").createSignedUrl(artifact.storage_path, 300);
    return { ...artifact, signedUrl: data?.signedUrl ?? null };
  }));
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private infrastructure, read-only connections, schedules,
          notifications, and data controls.
        </p>
      </header>
      {query.connector === "connected" ? <div className="rounded-lg border border-status-success/40 bg-status-success/10 p-3 text-sm">Connection authorized. The paired worker will run the first read-only sync.</div> : null}
      {query.connectorError ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">Connection was not completed: {query.connectorError.replaceAll("_", " ")}.</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="size-5" />
              Local worker
            </CardTitle>
            <CardDescription>
              {devices?.length ?? 0} paired device(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/settings/worker">
                Manage worker <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cable className="size-5" />
              Connections
            </CardTitle>
            <CardDescription>
              Separate, read-only Gmail, Calendar, and GitHub grants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts?.map((account) => {
              const latestRun = syncRuns?.find((run) => run.connected_account_id === account.id);
              const reconnectHref = account.provider === "github" ? "/api/oauth/start/github" : `/api/oauth/start/google?service=${account.provider === "gmail" ? "gmail" : "calendar"}`;
              return (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {account.provider.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.status} &middot; {account.scopes.length} scope(s)
                  </p>
                  <p className="text-xs text-muted-foreground">{latestRun ? `${latestRun.status} · ${latestRun.signals_created} new signal(s)` : account.last_synced_at ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}` : "First sync pending"}</p>
                  {latestRun?.error_message ? <p className="mt-1 max-w-sm text-xs text-destructive">{latestRun.error_message}</p> : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {account.status === "connected" ? <form action={requestConnectorSync.bind(null, account.id)}><Button size="sm" variant="outline">Sync now</Button></form> : <Button asChild size="sm" variant="outline"><Link href={reconnectHref}>Reauthorize</Link></Button>}
                  {account.status === "connected" ? <form action={disconnectConnector.bind(null, account.id)}><Button size="sm" variant="outline">Disconnect</Button></form> : null}
                </div>
              </div>
            );})}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                  <Link href="/api/oauth/start/google?service=gmail">
                    Connect Gmail
                  </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                  <Link href="/api/oauth/start/google?service=calendar">
                    Connect Calendar
                  </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                  <Link href="/api/oauth/start/github">Connect GitHub</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>
              Schedules run in your local timezone.
            </CardDescription>
          </CardHeader>
          <CardContent><form action={updateTimezone} className="flex gap-2"><Input name="timezone" defaultValue={profile?.timezone ?? "America/Denver"} aria-label="Timezone" /><Button type="submit" variant="outline">Save</Button></form></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Email notifications</CardTitle><CardDescription>Urgent operational alerts and high-value career actions. The full morning brief stays in the dashboard.</CardDescription></CardHeader><CardContent className="space-y-2">{["high_value_opportunity", "approval", "connector_failure", "source_failure", "worker_failure"].map((category) => { const preference = preferences?.find((item) => item.category === category); const enabled = preference?.enabled ?? true; return <div key={category} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{category.replaceAll("_", " ")}</span><form action={setNotificationPreference.bind(null, category, !enabled)}><Button type="submit" size="sm" variant={enabled ? "outline" : "ghost"}>{enabled ? "Enabled" : "Disabled"}</Button></form></div>; })}</CardContent></Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Trust & data
            </CardTitle>
            <CardDescription>
              Private storage, audit history, export, and deletion approvals.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/activity">Open audit log</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/system-health">System health</Link>
            </Button>
            <form action={requestDataExport}><Button type="submit" variant="outline">Request data export</Button></form>
            <Button asChild variant="outline"><Link href="/approvals">Review approvals</Link></Button>
            {exportDownloads.map((artifact) => artifact.signedUrl ? <Button key={artifact.id} asChild variant="outline"><a href={artifact.signedUrl}>Download {artifact.title}</a></Button> : null)}
            <form action={requestAccountDeletion} className="mt-3 flex w-full flex-col gap-2 rounded-lg border border-destructive/30 p-3">
              <p className="text-sm font-medium text-destructive">Permanent deletion</p>
              <p className="text-xs text-muted-foreground">Type DELETE MY CAREER OS DATA. A separate high-risk approval is still required.</p>
              <div className="flex flex-col gap-2 sm:flex-row"><Input name="confirmation" aria-label="Deletion confirmation" placeholder="DELETE MY CAREER OS DATA" required /><Button type="submit" variant="destructive">Request deletion</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
