import { CheckCircle2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: application }, { data: requirements }, { data: packets }, { data: history }, { data: drafts }, { data: referralPaths }] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("application_requirements").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("created_at"),
    supabase.from("application_packets").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("application_status_history").select("*").eq("application_id", id).eq("user_id", user.id).order("occurred_at", { ascending: false }),
    supabase.from("outreach_drafts").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null),
    supabase.from("referral_paths").select("*").eq("application_id", id).eq("user_id", user.id).is("archived_at", null),
  ]);
  if (!application) notFound();
  const packet = packets?.[0];
  return <div className="mx-auto w-full max-w-6xl space-y-6"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex flex-wrap gap-2"><Badge>{application.status.replaceAll("_", " ")}</Badge>{application.due_at ? <Badge variant="outline">Due {new Date(application.due_at).toLocaleDateString()}</Badge> : null}</div><h1 className="mt-3 text-3xl font-semibold">{application.title}</h1><p className="mt-2 text-sm text-muted-foreground">{application.next_action || "No next action has been selected yet."}</p></div><Button asChild><Link href={`/threads/new?type=application&title=${encodeURIComponent(application.title)}`}><MessageSquareText />Open application thread</Link></Button></header>
    <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Application packet</CardTitle><CardDescription>Resume, answers, referral plan, event context, project specification, and readiness.</CardDescription></CardHeader><CardContent>{packet ? <div className="space-y-3"><Badge variant={packet.status === "ready" ? "default" : "outline"}>{packet.status.replaceAll("_", " ")}</Badge><pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{JSON.stringify(packet.readiness, null, 2)}</pre></div> : <p className="text-sm text-muted-foreground">Packet preparation has not started.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Warm path</CardTitle><CardDescription>{referralPaths?.length ?? 0} referral path(s) · {drafts?.length ?? 0} draft(s)</CardDescription></CardHeader><CardContent className="space-y-2">{referralPaths?.map((path) => <div key={path.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{path.title}</p><p className="text-xs text-muted-foreground">{path.status.replaceAll("_", " ")}</p></div>)}{!referralPaths?.length ? <p className="text-sm text-muted-foreground">No plausible warm path yet.</p> : null}</CardContent></Card></div>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Requirements</CardTitle></CardHeader><CardContent className="divide-y p-0">{requirements?.length ? requirements.map((requirement) => <div key={requirement.id} className="flex items-start gap-3 p-4"><CheckCircle2 className={`mt-0.5 size-4 ${requirement.status === "complete" ? "text-status-success" : "text-muted-foreground"}`} /><div><p className="font-medium">{requirement.title}</p><p className="text-xs text-muted-foreground">{requirement.status}</p></div></div>) : <p className="p-5 text-sm text-muted-foreground">No requirements extracted.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Status evidence</CardTitle></CardHeader><CardContent className="divide-y p-0">{history?.length ? history.map((entry) => <div key={entry.id} className="p-4"><p className="font-medium">{entry.from_status ?? "new"} → {entry.to_status}</p><p className="mt-1 text-xs text-muted-foreground">{entry.rationale || entry.source_type} · {new Date(entry.occurred_at).toLocaleString()}</p></div>) : <p className="p-5 text-sm text-muted-foreground">No status changes recorded.</p>}</CardContent></Card></div>
  </div>;
}
