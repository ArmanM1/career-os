import { ArrowRight, BriefcaseBusiness, CalendarDays, FileText, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { prepareOpportunityApplication } from "../actions";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user } = await requireUser();
  const [{ data: opportunity }, { data: recommendation }, { data: paths }, { data: events }, { data: existingApplication }] = await Promise.all([
    supabase.from("opportunities").select("*,companies(*)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("opportunity_recommendations").select("*").eq("opportunity_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("referral_paths").select("*,contacts(*)").eq("opportunity_id", id).eq("user_id", user.id),
    supabase.from("event_recommendations").select("*,events(*)").eq("user_id", user.id).contains("related_opportunity_ids", [id]).limit(10),
    supabase.from("applications").select("id,status").eq("opportunity_id", id).eq("user_id", user.id).is("archived_at", null).order("created_at").limit(1).maybeSingle(),
  ]); if (!opportunity) notFound();
  const brief = recommendation?.role_brief as Record<string, unknown> | null;
  return <div className="mx-auto max-w-6xl space-y-6"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex gap-2"><Badge>{opportunity.opportunity_type}</Badge>{recommendation ? <Badge variant="outline">Score {recommendation.score}</Badge> : null}</div><h1 className="text-3xl font-semibold">{opportunity.title}</h1><p className="mt-2 text-muted-foreground">{String((opportunity.companies as Record<string, unknown> | null)?.title ?? opportunity.location ?? "")}</p></div><div className="flex flex-wrap gap-2">{existingApplication ? <Button asChild><Link href={`/applications/${existingApplication.id}`}>Open application</Link></Button> : <form action={prepareOpportunityApplication.bind(null, id)}><Button type="submit"><BriefcaseBusiness />Prepare full application</Button></form>}<Button asChild variant="outline"><Link href={`/threads/new?type=opportunity`}>Discuss</Link></Button></div></header><div className="grid gap-6 lg:grid-cols-[1.5fr_0.75fr]"><Card><CardHeader><CardTitle>Role brief</CardTitle></CardHeader><CardContent>{recommendation ? <MessageResponse>{`${recommendation.rationale}\n\n${Object.entries(brief ?? {}).map(([key, value]) => `## ${key.replaceAll("_", " ")}\n${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`).join("\n\n")}`}</MessageResponse> : <p className="text-muted-foreground">This opportunity has not been ranked yet.</p>}</CardContent></Card><div className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4" />Warm paths</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{paths?.length ?? 0}</p><p className="text-sm text-muted-foreground">Plausible contacts connected to this role.</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4" />Related events</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{events?.length ?? 0}</p></CardContent></Card><Card><CardContent className="grid gap-2 pt-6"><Button asChild variant="outline"><Link href="/resumes"><FileText />Review component library</Link></Button><Button asChild variant="outline"><Link href="/applications"><BriefcaseBusiness />Open applications</Link></Button><Button asChild variant="link"><Link href="/threads/new?type=application">Start application thread <ArrowRight /></Link></Button></CardContent></Card></div></div></div>;
}
