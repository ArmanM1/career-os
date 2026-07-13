import { ArrowRight, Cable, Laptop, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { disconnectConnector } from "./actions";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: accounts }, { data: devices }] =
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
    ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private infrastructure, read-only connections, schedules,
          notifications, and data controls.
        </p>
      </header>
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
            {accounts?.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {account.provider.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.status} · {account.scopes.length} scope(s)
                  </p>
                </div>
                {account.status === "connected" ? (
                  <form action={disconnectConnector.bind(null, account.id)}>
                    <Button size="sm" variant="outline">
                      Disconnect
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
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
          <CardContent>
            <p className="font-mono text-sm">
              {profile?.timezone ?? "America/Denver"}
            </p>
          </CardContent>
        </Card>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
