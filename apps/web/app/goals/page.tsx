import { History, RotateCcw, Target } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { undoStateItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: goals }, { data: stateItems }, { data: revisions }, { data: profile }] = await Promise.all([
    supabase.from("goals").select("id,title,status,horizon,priority,rationale,updated_at").eq("user_id", user.id).is("archived_at", null).order("priority", { ascending: false }),
    supabase.from("state_items").select("id,title,item_type,human_value,status,confidence,salience,expires_at,updated_at").eq("user_id", user.id).is("archived_at", null).order("salience", { ascending: false }),
    supabase.from("state_item_revisions").select("id,state_item_id,human_value,source_type,user_stated,rationale,effective_at,status,revision,undo_of_revision_id").eq("user_id", user.id).order("effective_at", { ascending: false }).limit(40),
    supabase.from("profiles").select("state_version").eq("user_id", user.id).maybeSingle(),
  ]);
  const revisionCounts = new Map<string, number>();
  for (const revision of revisions ?? []) revisionCounts.set(revision.state_item_id, (revisionCounts.get(revision.state_item_id) ?? 0) + 1);

  return <div className="mx-auto w-full max-w-7xl space-y-8">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">State version {profile?.state_version ?? 0}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Goals & what Career OS knows</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Current goals and career-relevant beliefs are visible, sourced, temporary when appropriate, and reversible.</p></div><Button asChild><Link href="/threads/new?type=career_positioning"><Target />Review direction</Link></Button></header>

    <section><h2 className="mb-3 text-xl font-semibold">Active goals</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{goals?.length ? goals.map((goal) => <Card key={goal.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{goal.title}</CardTitle><Badge variant="outline">{goal.horizon.replaceAll("_", " ")}</Badge></div><CardDescription>{goal.rationale || "No rationale recorded yet."}</CardDescription></CardHeader><CardContent className="flex items-center justify-between text-xs text-muted-foreground"><span>{goal.status}</span><span>Priority {goal.priority}</span></CardContent></Card>) : <Card><CardHeader><CardTitle>No active goals yet</CardTitle><CardDescription>Complete onboarding or open a positioning thread to establish them.</CardDescription></CardHeader></Card>}</div></section>

    <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Current state</h2><p className="text-sm text-muted-foreground">Agent inference is labeled; your explicit statements take precedence.</p></div></div><div className="grid gap-3 md:grid-cols-2">{stateItems?.filter((item) => item.status === "active" || item.status === "suggested").map((item) => <Card key={item.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><Badge variant={item.status === "suggested" ? "secondary" : "outline"}>{item.item_type.replaceAll("_", " ")}</Badge><CardTitle className="mt-2 text-base">{item.title}</CardTitle></div><span className="font-mono text-xs text-muted-foreground">{Math.round(Number(item.confidence) * 100)}%</span></div><CardDescription className="text-sm text-foreground">{item.human_value}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground"><span>{item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleString()}` : "No automatic expiry"} · {revisionCounts.get(item.id) ?? 0} recent revision(s)</span>{(revisionCounts.get(item.id) ?? 0) > 1 ? <form action={undoStateItem.bind(null, item.id)}><Button size="sm" variant="ghost"><RotateCcw />Undo latest</Button></form> : null}</CardContent></Card>)}</div></section>

    <section><h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><History className="size-5" />State history</h2><Card><CardContent className="divide-y p-0">{revisions?.length ? revisions.map((revision) => <div key={revision.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div><p className="font-medium">{revision.human_value}</p><p className="mt-1 text-xs text-muted-foreground">{revision.rationale || "No rationale recorded."}</p></div><div className="text-left text-xs text-muted-foreground sm:text-right"><p>{revision.user_stated ? "User stated" : `Inferred from ${revision.source_type.replaceAll("_", " ")}`}</p><p>{new Date(revision.effective_at).toLocaleString()} · revision {revision.revision}{revision.undo_of_revision_id ? " · undo" : ""}</p></div></div>) : <p className="p-6 text-sm text-muted-foreground">No state revisions yet.</p>}</CardContent></Card></section>
  </div>;
}
