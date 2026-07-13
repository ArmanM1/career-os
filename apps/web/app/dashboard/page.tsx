import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  Compass,
  Network,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { isWorkerOnline } from "@/lib/worker-status";
import { updateTaskStatus } from "./actions";

export const dynamic = "force-dynamic";
type Row = Record<string, unknown> & {
  id: string;
  title: string;
  status?: string;
  priority?: number;
  urgency?: string;
  task_type?: string;
  due_at?: string;
  labels?: string[];
};

function TaskRow({ task }: { task: Row }) {
  return (
    <div className="flex items-start gap-3 border-b py-4 last:border-0">
      <form
        action={updateTaskStatus.bind(
          null,
          task.id,
          Number(task.version ?? 1),
          "completed",
        )}
      >
        <Button
          size="icon-sm"
          variant="outline"
          className="mt-0.5 rounded-full"
        >
          <Check />
          <span className="sr-only">Complete {task.title}</span>
        </Button>
      </form>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium leading-6">{task.title}</p>
          {task.urgency === "time_sensitive" ? (
            <Badge variant="destructive">Urgent</Badge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{String(task.task_type ?? "task").replaceAll("_", " ")}</span>
          {task.due_at ? (
            <span>Due {new Date(task.due_at).toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>
      <form
        action={updateTaskStatus.bind(
          null,
          task.id,
          Number(task.version ?? 1),
          "blocked",
        )}
      >
        <Button size="sm" variant="ghost">
          Block
        </Button>
      </form>
    </div>
  );
}

export default async function DashboardPage() {
  const [{ supabase, user }, data] = await Promise.all([
    requireUser(),
    getDashboardData(),
  ]);
  const [{ data: profile }, { data: worker }, { data: plan }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,timezone,state_version")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("worker_devices")
        .select("status,last_heartbeat_at,last_error")
        .eq("user_id", user.id)
        .neq("status", "revoked")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_plans")
        .select("id,generated_at,rationale,state_version")
        .eq("user_id", user.id)
        .eq("plan_date", new Date().toISOString().slice(0, 10))
        .eq("status", "active")
        .maybeSingle(),
    ]);
  const tasks = data.tasks as Row[];
  const active = tasks.filter(
    (task) =>
      !["completed", "done", "skipped", "archived"].includes(task.status ?? ""),
  );
  const today = active
    .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))
    .slice(0, 8);
  const urgent = active.filter(
    (task) => task.urgency === "time_sensitive" || task.urgency === "high",
  );
  const apps = data.applications as Row[];
  const approvals = (data.approvals as Row[]).filter(
    (item) => item.status === "pending",
  );
  const recommendations = (data.opportunityRecommendations as Row[]).filter(
    (item) => item.status === "active",
  );
  const completed = tasks.filter((task) =>
    ["completed", "done"].includes(task.status ?? ""),
  ).length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const workerOnline = isWorkerOnline(worker);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: profile?.timezone ?? "America/Denver",
            }).format(new Date())}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Good morning
            {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {plan?.rationale ??
              "Career OS is assembling the highest-leverage next steps from your current state."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/check-ins">Quick check-in</Link>
          </Button>
          <Button asChild>
            <Link href="/threads/new?type=advisor">
              <Sparkles />
              Ask advisor
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today</CardDescription>
            <CardTitle className="text-3xl">{today.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} />
            <p className="mt-2 text-xs text-muted-foreground">
              {progress}% of tracked work completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Urgent</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <AlertCircle className="size-5 text-urgency-critical" />
              {urgent.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Deadlines and time-sensitive actions
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Applications</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <BriefcaseBusiness className="size-5" />
              {apps.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/applications">
                Open pipeline <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Worker</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className={`size-2 rounded-full ${workerOnline ? "bg-status-success" : "bg-status-warning"}`}
              />
              {workerOnline ? "Online" : "Needs attention"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link
              href="/settings/worker"
              className="underline underline-offset-4"
            >
              View system health
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Do today</CardTitle>
                <CardDescription>
                  Ordered by urgency, leverage, and current capacity.
                </CardDescription>
              </div>
              <Badge variant="outline">
                State v
                {String(plan?.state_version ?? profile?.state_version ?? 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {today.length ? (
              today.map((task) => <TaskRow key={task.id} task={task} />)
            ) : (
              <div className="py-12 text-center">
                <Check className="mx-auto size-8 text-status-success" />
                <p className="mt-3 font-medium">Nothing is queued for today</p>
                <p className="text-sm text-muted-foreground">
                  Run the morning planner or ask your advisor for next steps.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleDot className="size-4" />
                Needs approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{approvals.length}</p>
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link href="/approvals">
                  Review exact actions <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="size-4" />
                New opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{recommendations.length}</p>
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link href="/opportunities">
                  See ranked roles <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="size-4" />
                Morning brief
              </CardTitle>
              <CardDescription>
                {plan
                  ? `Generated ${new Date(plan.generated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "Waiting for the 6:00 AM planner"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <UsersRound className="mt-0.5 size-4 shrink-0" />
                Relationship and referral actions are integrated into today.
              </p>
              <p className="flex gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0" />
                Calendar constraints are respected.
              </p>
              <p className="flex gap-2">
                <Clock3 className="mt-0.5 size-4 shrink-0" />
                Material changes can replan the day.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
