import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Mail,
  MonitorCog,
  Radio,
  Unplug,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { isWorkerOnline } from "@/lib/worker-status";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const { supabase, user } = await requireUser();
  const [
    { data: devices },
    { data: jobs },
    { data: sources },
    { data: connectors },
    { data: notifications },
    { data: runs },
  ] = await Promise.all([
    supabase
      .from("worker_devices")
      .select(
        "id,name,status,last_heartbeat_at,last_error,health,worker_version",
      )
      .eq("user_id", user.id)
      .neq("status", "revoked")
      .order("updated_at", { ascending: false }),
    supabase
      .from("agent_jobs")
      .select("id,title,status,error_message,scheduled_for,attempt_count")
      .eq("user_id", user.id)
      .in("status", [
        "queued",
        "running",
        "needs_user_input",
        "failed",
        "dead_letter",
      ])
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("source_monitors")
      .select("id,title,status,consecutive_failures,last_error,last_run_at")
      .eq("user_id", user.id)
      .in("status", ["broken", "auth_required", "stale"])
      .limit(30),
    supabase
      .from("connected_accounts")
      .select("id,provider,status,last_error,last_synced_at")
      .eq("user_id", user.id)
      .neq("status", "connected"),
    supabase
      .from("notification_outbox")
      .select("id,subject,status,last_error,attempt_count")
      .eq("user_id", user.id)
      .in("status", ["failed", "pending", "sending"])
      .limit(30),
    supabase
      .from("agent_runs")
      .select("id,title,status,error_message,started_at,completed_at")
      .eq("user_id", user.id)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);
  const worker = devices?.[0];
  const healthyWorker = isWorkerOnline(worker);
  const failures =
    (jobs?.filter((job) => ["failed", "dead_letter"].includes(job.status))
      .length ?? 0) +
    (sources?.length ?? 0) +
    (connectors?.length ?? 0) +
    (notifications?.filter((item) => item.status === "failed").length ?? 0);
  const sections = [
    {
      title: "Job queue",
      icon: Radio,
      items: (jobs ?? []).map((item) => ({ id: item.id, label: item.title, status: item.status, error: item.error_message })),
      empty: "No queued or failed jobs.",
    },
    {
      title: "Sources",
      icon: Database,
      items: (sources ?? []).map((item) => ({ id: item.id, label: item.title, status: item.status, error: item.last_error })),
      empty: "No broken, stale, or authentication-required sources.",
    },
    {
      title: "Connectors",
      icon: Unplug,
      items: (connectors ?? []).map((item) => ({ id: item.id, label: item.provider, status: item.status, error: item.last_error })),
      empty: "All configured connectors are healthy.",
    },
    {
      title: "Notifications",
      icon: Mail,
      items: (notifications ?? []).map((item) => ({ id: item.id, label: item.subject, status: item.status, error: item.last_error })),
      empty: "No pending or failed notification deliveries.",
    },
    {
      title: "Recent failed runs",
      icon: HardDrive,
      items: (runs ?? []).map((item) => ({ id: item.id, label: item.title, status: item.status, error: item.error_message })),
      empty: "No recent failed agent runs.",
    },
  ];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Private operations</p>
          <h1 className="text-3xl font-semibold">System health</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Worker, queues, sources, connectors, notifications, and recoverable
            errors.
          </p>
        </div>
        <Badge variant={failures || !healthyWorker ? "destructive" : "default"}>
          {failures || !healthyWorker ? "Attention needed" : "Healthy"}
        </Badge>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorCog className="size-5" />
            Windows worker
          </CardTitle>
          <CardDescription>
            {worker
              ? `${worker.name} · ${worker.worker_version ?? "version pending"}`
              : "No device paired"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthyWorker ? (
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 text-status-success" />
              Online and reporting health.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-5" />
              {worker?.last_error ??
                "Worker is offline or has not reported within two minutes."}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(({ title, icon: Icon, items, empty }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="size-5" />
                {title}
              </CardTitle>
              <CardDescription>
                {items.length} item(s) requiring inspection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length ? (
                items.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.status}
                      {item.error ? ` · ${item.error}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{empty}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
