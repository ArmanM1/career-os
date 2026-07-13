import { ArrowRight, Compass, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function OpportunitiesPage() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("opportunity_recommendations").select("*,opportunities(*)").eq("user_id", user.id).order("score", { ascending: false });
  if (error) throw new Error(error.message);
  return <div className="mx-auto max-w-7xl space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">Opportunities</h1><p className="mt-2 text-sm text-muted-foreground">Evidence-backed roles, events, programs, and career moves ranked against your current state.</p></header><div className="grid gap-4 lg:grid-cols-2">{data?.map((item) => { const opportunity = item.opportunities as Record<string, unknown> | null; return <Card key={item.id}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-lg">{item.title}</CardTitle><CardDescription className="mt-1 flex items-center gap-1"><MapPin className="size-3" />{String(opportunity?.location ?? "Location not specified")}</CardDescription></div><div className="text-right"><p className="text-2xl font-semibold">{item.score ?? "—"}</p><Badge>{item.recommendation.replaceAll("_", " ")}</Badge></div></div></CardHeader><CardContent><p className="line-clamp-3 text-sm text-muted-foreground">{item.rationale}</p><Button asChild variant="link" className="mt-4 h-auto p-0"><Link href={`/opportunities/${item.opportunity_id}`}>Open role brief <ArrowRight /></Link></Button></CardContent></Card>; })}{data?.length === 0 ? <Card className="lg:col-span-2"><CardContent className="py-16 text-center"><Compass className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">No recommendations yet</p><p className="text-sm text-muted-foreground">Enable a source or start a source thread to discover opportunities.</p></CardContent></Card> : null}</div></div>;
}
