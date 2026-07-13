import { AlertCircle, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/supabase/server";
import { isWorkerOnline } from "@/lib/worker-status";
import { advanceOnboarding, retryOnboardingWorkItem, startOnboarding } from "./actions";
import { OnboardingRealtime } from "./onboarding-realtime";

type ReadinessBlocker = {
  code?: string;
  title?: string;
  reason?: string;
  nextUserAction?: { label?: string; href?: string };
};

const steps = [
  "Account & timezone",
  "Pair worker",
  "Personal, academic & work",
  "Career season",
  "Goals",
  "Targets & constraints",
  "Upload resumes",
  "Extract experience",
  "Review experience library",
  "Connect Gmail, Calendar & GitHub",
  "Configure browser profile",
  "Import applications",
  "Import mentors & contacts",
  "Add known sources",
  "Schedules & notifications",
  "Initial source discovery",
  "Initial strategy & weekly plan",
  "Final belief review",
];
const fields: Record<
  number,
  Array<{ name: string; label: string; placeholder?: string; long?: boolean; type?: string }>
> = {
  1: [{ name: "timezone", label: "Timezone", placeholder: "America/Denver" }],
  3: [
    { name: "fullName", label: "Full name" },
    { name: "institution", label: "School" },
    { name: "degreeProgram", label: "Degree program" },
    { name: "graduationDate", label: "Expected graduation date (YYYY-MM-DD)" },
    { name: "currentEmployment", label: "Current job / work", long: true },
  ],
  4: [
    {
      name: "seasonType",
      label: "Current career season",
      placeholder: "internship_peak",
    },
    {
      name: "seasonSummary",
      label: "Where are you in the season?",
      long: true,
    },
  ],
  5: [
    { name: "primaryGoal", label: "Primary goal" },
    { name: "goalRationale", label: "Why now?", long: true },
  ],
  6: [
    { name: "targetRoles", label: "Target roles" },
    { name: "targetCompanies", label: "Target companies" },
    { name: "locations", label: "Locations / constraints" },
  ],
  7: [
    {
      name: "resumeNotes",
      label: "Resume variants to upload",
      placeholder: "List each file and track",
      long: true,
    },
  ],
  8: [
    {
      name: "experienceExtractionNotes",
      label: "Extraction notes or corrections",
      long: true,
    },
  ],
  9: [
    {
      name: "experienceReviewed",
      label: "Type REVIEWED after checking every experience",
    },
  ],
  10: [
    {
      name: "connectorPlan",
      label: "Connections to authorize",
      placeholder: "Gmail, Calendar, GitHub",
    },
  ],
  11: [
    {
      name: "browserAccounts",
      label: "Accounts verified in dedicated Chrome",
      placeholder: "Instagram, Handshake, LinkedIn",
    },
  ],
  12: [
    {
      name: "existingApplications",
      label: "Existing applications to import",
      long: true,
    },
  ],
  13: [
    {
      name: "existingContacts",
      label: "Mentors, contacts, and relationship context",
      long: true,
    },
  ],
  14: [
    {
      name: "knownSources",
      label: "Known sources",
      placeholder: "URLs and social accounts",
      long: true,
    },
  ],
  15: [{ name: "notificationEmail", label: "Urgent notification email", type: "email" }],
  16: [
    { name: "discoveryFocus", label: "Initial discovery focus", long: true },
  ],
  17: [
    {
      name: "strategyFeedback",
      label: "What should the initial strategy optimize for?",
      long: true,
    },
  ],
  18: [
    {
      name: "finalReview",
      label: "Type ACCEPT after reviewing what Career OS believes",
    },
  ],
};

export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const [
    { data: session },
    { data: questions },
    { data: worker },
    { count: experienceCount },
  ] = await Promise.all([
    supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("open_questions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["open", "asked"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("worker_devices")
      .select("status,last_heartbeat_at")
      .eq("user_id", user.id)
      .neq("status", "revoked")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("experiences")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  if (!session)
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Build your active career profile</CardTitle>
            <CardDescription>
              Onboarding is resumable and happens entirely in the web UI. Career
              OS will ask only questions that affect your strategy or current
              state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={startOnboarding}>
              <Button className="w-full">
                Start onboarding <ChevronRight />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  if (session.status === "completed")
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-primary" /> Onboarding is complete
            </CardTitle>
            <CardDescription>
              Your worker, verified resume components, and connected source
              reads passed the server-side readiness checks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/dashboard">Open Career OS dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  const [{ data: workItems }, { data: readinessResult }] = await Promise.all([
    supabase
      .from("onboarding_work_items")
      .select("id,title,work_type,status,phase,progress,blocking_reason,next_user_action,related_object_type,related_object_id,updated_at")
      .eq("user_id", user.id)
      .eq("onboarding_session_id", session.id)
      .neq("status", "archived")
      .order("created_at"),
    supabase.rpc("evaluate_onboarding_readiness", { p_session_id: session.id }),
  ]);
  const readiness = readinessResult && typeof readinessResult === "object" && !Array.isArray(readinessResult)
    ? readinessResult as { ready?: boolean; blockers?: ReadinessBlocker[] }
    : {};
  const step = session.current_step;
  const progress = Math.round((session.completed_steps.length / 18) * 100);
  const answers = session.answers as Record<string, string>;
  const workerOnline = isWorkerOnline(worker);
  const blockers = [
    step >= 2 && !workerOnline
      ? "Pair and start the worker before completing onboarding."
      : null,
    step >= 9 && !experienceCount
      ? "Upload and extract at least one experience before review."
      : null,
  ].filter(Boolean);
  const visibleWorkItems = (workItems ?? []).filter((item) =>
    step === 18 ||
    ([7, 8, 9].includes(step) && item.work_type === "resume") ||
    ([14, 15, 16].includes(step) && item.work_type === "source"),
  );
  return (
    <OnboardingRealtime sessionId={session.id}>
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Step {step} of 18
            </p>
            <h1 className="text-3xl font-semibold">{steps[step - 1]}</h1>
          </div>
          <Badge variant="outline">{session.status.replaceAll("_", " ")}</Badge>
        </div>
        <Progress value={progress} className="mt-4" />
        <p className="mt-2 text-xs text-muted-foreground">
          {progress}% complete · pause anytime
        </p>
      </header>
      {blockers.map((blocker) => (
        <Alert key={blocker}>
          <AlertCircle />
          <AlertTitle>Required before completion</AlertTitle>
          <AlertDescription>{blocker}</AlertDescription>
        </Alert>
      ))}
      {visibleWorkItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup running in the background</CardTitle>
            <CardDescription>
              These cards update live. Career OS attempts each source automatically
              and asks you only when login, MFA, CAPTCHA, consent, or school SSO
              truly requires you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleWorkItems.map((item) => {
              const action = item.next_user_action && typeof item.next_user_action === "object" && !Array.isArray(item.next_user_action)
                ? item.next_user_action as { label?: string; href?: string; instructions?: string }
                : {};
              return (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.phase.replaceAll("_", " ")}</p>
                    </div>
                    <Badge variant={item.status === "ready" ? "default" : "outline"}>{item.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <Progress value={item.progress} className="mt-3" />
                  {item.blocking_reason ? <p className="mt-3 text-sm text-muted-foreground">{item.blocking_reason}</p> : null}
                  {action.instructions ? <p className="mt-2 text-xs text-muted-foreground">{action.instructions}</p> : null}
                  {action.href ? (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      {action.href.startsWith("http")
                        ? <a href={action.href} target="_blank" rel="noreferrer">{action.label ?? "Complete setup"}</a>
                        : <Link href={action.href}>{action.label ?? "Complete setup"}</Link>}
                    </Button>
                  ) : null}
                  {item.status === "waiting_for_user" || item.status === "failed" || item.status === "unsupported" ? (
                    <form action={retryOnboardingWorkItem.bind(null, item.id)} className="mt-3">
                      <Button type="submit" size="sm">Retry now</Button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
      {step === 18 && readiness.blockers?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final readiness checks</CardTitle>
            <CardDescription>Onboarding completes only after every required item below is resolved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.blockers.map((blocker, index) => (
              <div key={`${blocker.code ?? "blocker"}-${index}`} className="rounded-lg border p-3">
                <p className="font-medium">{blocker.title ?? "Setup incomplete"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{blocker.reason}</p>
                {blocker.nextUserAction?.href ? (
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href={blocker.nextUserAction.href}>{blocker.nextUserAction.label ?? "Resolve"}</Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {questions?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Dynamic follow-up questions
            </CardTitle>
            <CardDescription>
              These exist because the answers affect current state or strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="rounded-lg border p-3">
                <p className="font-medium">{question.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.reason}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{steps[step - 1]}</CardTitle>
          <CardDescription>
            {step === 2
              ? "Pair the always-on Windows computer from Settings, then return here."
              : step === 18
                ? "Review profile, state, goals, sources, applications, relationships, and experience library before accepting."
                : "Answers persist immediately when you continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={advanceOnboarding.bind(null, session.id, step)}
            className="space-y-5"
          >
            {(fields[step] ?? []).map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.long ? (
                  <Textarea
                    id={field.name}
                    name={field.name}
                    defaultValue={answers[field.name] ?? (field.name === "knownSources" ? "https://www.instagram.com/zero2sudo/" : field.name === "notificationEmail" ? user.email ?? "" : "")}
                    placeholder={field.placeholder}
                    rows={5}
                  />
                ) : (
                  <Input
                    id={field.name}
                    name={field.name}
                    defaultValue={answers[field.name] ?? (field.name === "knownSources" ? "https://www.instagram.com/zero2sudo/" : field.name === "notificationEmail" ? user.email ?? "" : "")}
                    placeholder={field.placeholder}
                    type={field.type}
                  />
                )}
              </div>
            ))}
            {step === 2 ? (
              <Button asChild variant="outline">
                <Link href="/settings/worker">Open worker setup</Link>
              </Button>
            ) : null}
            {step === 7 || step === 8 || step === 9 ? <Button asChild variant="outline"><Link href="/resumes">Open resume & experience library</Link></Button> : null}
            {step === 10 ? <Button asChild variant="outline"><Link href="/settings">Connect Gmail, Calendar & GitHub</Link></Button> : null}
            {step === 11 ? <Button asChild variant="outline"><Link href="/settings/worker">Review dedicated browser profile health</Link></Button> : null}
            <div className="flex justify-between border-t pt-5">
              <p className="text-xs text-muted-foreground">
                {session.completed_steps.length} steps saved
              </p>
              <Button
                disabled={Boolean(
                  (blockers.length && (step === 2 || step === 9)) ||
                  (step === 18 && !readiness.ready),
                )}
              >
                {step === 18 ? (
                  <>
                    <Check />
                    Complete onboarding
                  </>
                ) : (
                  <>
                    Save and continue <ChevronRight />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </OnboardingRealtime>
  );
}
