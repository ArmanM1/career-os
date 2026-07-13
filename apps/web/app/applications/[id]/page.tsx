import { CheckCircle2, FileText, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { markApplicationSubmitted, prepareApplication, requestApplicationFormPreparation } from "../actions";
import { ApplicationRealtime } from "./application-realtime";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [
    { data: application },
    { data: requirements },
    { data: packets },
    { data: history },
    { data: drafts },
    { data: referralPaths },
    { data: variants },
    { data: projectSpecs },
    { data: preparationJobs },
  ] = await Promise.all([
    supabase.from("applications").select("*,opportunities(id,url,canonical_url)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("application_requirements").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("created_at"),
    supabase.from("application_packets").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("application_status_history").select("*").eq("application_id", id).eq("user_id", user.id).order("effective_at", { ascending: false }),
    supabase.from("outreach_drafts").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null),
    supabase.from("referral_paths").select("*,contacts(full_name,company,role)").eq("application_id", id).eq("user_id", user.id).is("archived_at", null),
    supabase.from("resume_variants").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("project_specs").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("agent_jobs").select("id,title,agent_id,status,error_message,updated_at").eq("user_id", user.id).contains("related_object_ids", [id]).in("status", ["queued", "running", "needs_user_input", "dead_letter"]).order("created_at"),
  ]);
  if (!application) notFound();
  const packet = packets?.[0];
  const variant = variants?.[0];
  const projectSpec = projectSpecs?.[0];
  const opportunity = application.opportunities as { url?: string | null; canonical_url?: string | null } | null;
  const portalDefault = opportunity?.canonical_url ?? opportunity?.url ?? "";
  let resumePdfUrl: string | null = null;
  if (variant?.pdf_path) {
    const { data } = await getSupabaseAdminClient().storage.from("resume-artifacts").createSignedUrl(variant.pdf_path, 300);
    resumePdfUrl = data?.signedUrl ?? null;
  }
  const canMarkSubmitted = ["interested", "drafting", "ready_to_submit"].includes(application.status);

  return (
    <ApplicationRealtime applicationId={id}>
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap gap-2"><Badge>{application.status.replaceAll("_", " ")}</Badge>{application.due_at ? <Badge variant="outline">Due {new Date(application.due_at).toLocaleDateString()}</Badge> : null}</div>
          <h1 className="mt-3 text-3xl font-semibold">{application.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{application.next_action || "No next action has been selected yet."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={prepareApplication.bind(null, id)}><Button type="submit" variant="outline"><LoaderCircle />Prepare / refresh</Button></form>
          <Button asChild><Link href={`/threads/new?type=application&title=${encodeURIComponent(application.title)}`}><MessageSquareText />Application thread</Link></Button>
        </div>
      </header>

      {preparationJobs?.length ? (
        <Card><CardHeader><CardTitle className="text-base">Preparation activity</CardTitle><CardDescription>The web page can be closed while the paired worker continues.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{preparationJobs.map((job) => <div key={job.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{job.title}</p><Badge variant="outline">{job.status.replaceAll("_", " ")}</Badge></div>{job.error_message ? <p className="mt-2 text-xs text-destructive">{job.error_message}</p> : null}</div>)}</CardContent></Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Application packet</CardTitle><CardDescription>Resume, answers, referral plan, event context, project specification, and readiness.</CardDescription></CardHeader>
          <CardContent>{packet ? <div className="space-y-3"><Badge variant={packet.status === "ready" ? "default" : "outline"}>{packet.status.replaceAll("_", " ")}</Badge><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs font-medium text-muted-foreground">Readiness</p><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(packet.readiness, null, 2)}</pre></div><div className="rounded-lg border p-3"><p className="text-xs font-medium text-muted-foreground">Packet contents</p><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(packet.contents, null, 2)}</pre></div></div></div> : <p className="text-sm text-muted-foreground">Packet preparation has not finished its first pass.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Manual final submission</CardTitle><CardDescription>Career OS can fill an approved form but cannot press the final submit button.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{canMarkSubmitted ? <form action={markApplicationSubmitted.bind(null, id)}><Button type="submit" className="w-full"><Send />I submitted it manually</Button></form> : <p className="text-sm text-muted-foreground">{application.status === "submitted" ? "Submission recorded. Status monitoring is active." : "Manual submission is not the current action."}</p>}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4" />Opportunity-specific resume</CardTitle><CardDescription>Composed from verified components; no base resume is required.</CardDescription></CardHeader>
          <CardContent>{variant ? <div className="space-y-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{variant.title}</p><Badge variant="outline">{variant.status.replaceAll("_", " ")}</Badge></div><p className="text-sm text-muted-foreground">{variant.rationale}</p>{resumePdfUrl ? <Button asChild size="sm" variant="outline"><a href={resumePdfUrl} target="_blank" rel="noreferrer">View generated PDF</a></Button> : <p className="text-xs text-muted-foreground">PDF compilation is pending.</p>}</div> : <p className="text-sm text-muted-foreground">Resume composition is queued or needs verified components.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Role bridge project</CardTitle><CardDescription>A buildable project specification, never falsely claimed as completed work.</CardDescription></CardHeader>
          <CardContent>{projectSpec ? <div className="space-y-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{projectSpec.title}</p><Badge variant="outline">{projectSpec.status}</Badge></div><p className="text-sm text-muted-foreground">{projectSpec.rationale}</p><details><summary className="cursor-pointer text-sm font-medium">Open full specification</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{JSON.stringify(projectSpec.specification, null, 2)}</pre></details></div> : <p className="text-sm text-muted-foreground">Project specification is queued.</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Prepare an application form</CardTitle><CardDescription>Career OS first inspects the portal and creates an exact approval payload. Filling happens only after approval and stops before final submission.</CardDescription></CardHeader>
        <CardContent><form action={requestApplicationFormPreparation.bind(null, id)} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="portalUrl">Application portal URL</Label><Input id="portalUrl" name="portalUrl" type="url" defaultValue={portalDefault} placeholder="https://company.example/apply" required /></div><Button type="submit">Create fill approval</Button></form></CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Requirements</CardTitle></CardHeader><CardContent className="divide-y p-0">{requirements?.length ? requirements.map((requirement) => <div key={requirement.id} className="flex items-start gap-3 p-4"><CheckCircle2 className={`mt-0.5 size-4 ${requirement.status === "complete" ? "text-status-success" : "text-muted-foreground"}`} /><div><p className="font-medium">{requirement.title}</p><p className="text-xs text-muted-foreground">{requirement.status}</p></div></div>) : <p className="p-5 text-sm text-muted-foreground">No requirements extracted yet.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Status evidence</CardTitle></CardHeader><CardContent className="divide-y p-0">{history?.length ? history.map((entry) => <div key={entry.id} className="p-4"><p className="font-medium">{entry.previous_status ?? "new"} → {entry.new_status}</p><p className="mt-1 text-xs text-muted-foreground">{entry.rationale || entry.source_type} · {new Date(entry.effective_at).toLocaleString()}</p></div>) : <p className="p-5 text-sm text-muted-foreground">No status changes recorded.</p>}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Warm paths</CardTitle><CardDescription>{referralPaths?.length ?? 0} plausible relationship path(s)</CardDescription></CardHeader><CardContent className="space-y-2">{referralPaths?.map((path) => { const contact = path.contacts as { full_name?: string; company?: string; role?: string } | null; return <div key={path.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{path.title}</p><p className="text-xs text-muted-foreground">{contact?.full_name ?? "Contact"} · {contact?.company ?? contact?.role ?? path.status}</p></div>; })}{!referralPaths?.length ? <p className="text-sm text-muted-foreground">No plausible warm path yet.</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Drafts ready to copy</CardTitle><CardDescription>Career OS never sends these messages.</CardDescription></CardHeader><CardContent className="space-y-3">{drafts?.map((draft) => <div key={draft.id} className="rounded-lg border p-3"><p className="font-medium">{draft.title}</p>{draft.subject ? <p className="mt-2 text-sm font-medium">{draft.subject}</p> : null}<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{draft.body}</p><div className="mt-3"><CopyButton text={[draft.subject, draft.body].filter(Boolean).join("\n\n")} label="Copy draft" /></div></div>)}{!drafts?.length ? <p className="text-sm text-muted-foreground">No drafts prepared yet.</p> : null}</CardContent></Card>
      </div>
    </div>
    </ApplicationRealtime>
  );
}
