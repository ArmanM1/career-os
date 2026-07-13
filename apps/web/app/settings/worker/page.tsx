import {
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Pause,
  RotateCcw,
  ShieldX,
} from "lucide-react";
import { WorkerPairingPanel } from "@/components/worker-pairing-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerEnv } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";
import { isWorkerOnline } from "@/lib/worker-status";
import { setWorkerStatus } from "./actions";

export const dynamic = "force-dynamic";
export default async function WorkerSettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: devices } = await supabase
    .from("worker_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Paired worker</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The Windows computer runs Codex, browser reads, source monitors, file
          sync, and LaTeX without exposing database credentials.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Pair a computer</CardTitle>
          <CardDescription>
            Run one installer command on the always-on Windows account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkerPairingPanel appUrl={getServerEnv().CAREER_OS_APP_URL} />
        </CardContent>
      </Card>
      <div className="space-y-4">
        {devices?.map((device) => {
          const online = isWorkerOnline(device);
          return (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Laptop className="size-5" />
                      {device.name}
                    </CardTitle>
                    <CardDescription>
                      {device.worker_version ?? "Version pending"} · last
                      heartbeat{" "}
                      {device.last_heartbeat_at
                        ? new Date(device.last_heartbeat_at).toLocaleString()
                        : "never"}
                    </CardDescription>
                  </div>
                  <Badge variant={online ? "default" : "outline"}>
                    {online ? "online" : device.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {device.last_error ? (
                  <p className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    {device.last_error}
                  </p>
                ) : (
                  <p className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-status-success" />
                    No reported worker error
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {device.status !== "paused" && device.status !== "revoked" ? (
                    <form
                      action={setWorkerStatus.bind(null, device.id, "paused")}
                    >
                      <Button variant="outline" size="sm">
                        <Pause />
                        Pause
                      </Button>
                    </form>
                  ) : null}
                  {device.status === "paused" ? (
                    <form
                      action={setWorkerStatus.bind(null, device.id, "offline")}
                    >
                      <Button variant="outline" size="sm">
                        <RotateCcw />
                        Resume
                      </Button>
                    </form>
                  ) : null}
                  {device.status !== "revoked" ? (
                    <form
                      action={setWorkerStatus.bind(null, device.id, "revoked")}
                    >
                      <Button variant="destructive" size="sm">
                        <ShieldX />
                        Revoke
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
