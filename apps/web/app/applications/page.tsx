import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const statuses = ["found", "interested", "drafting", "ready_to_submit", "submitted", "oa", "interview", "rejected", "ghosted", "offer", "withdrawn"];

export default async function ApplicationsPage() {
  const { supabase, user } = await requireUser();
  const { data: applications, error } = await supabase.from("applications").select("id,title,status,priority,due_at,company_id,opportunity_id,next_action,updated_at").eq("user_id", user.id).is("archived_at", null).order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return <div className="mx-auto w-full max-w-[1600px] space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">Applications</h1><p className="mt-2 text-sm text-muted-foreground">Canonical pipeline with requirements, materials, referral context, status evidence, and one next action.</p></header><div className="flex snap-x gap-4 overflow-x-auto pb-4">{statuses.map((status) => { const scoped = applications?.filter((application) => application.status === status) ?? []; return <section key={status} className="w-[19rem] shrink-0 snap-start"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold capitalize">{status.replaceAll("_", " ")}</h2><Badge variant="outline">{scoped.length}</Badge></div><div className="space-y-3">{scoped.map((application) => <Link key={application.id} href={`/applications/${application.id}`}><Card className="mb-3 transition-colors hover:bg-muted/40"><CardHeader className="pb-3"><CardTitle className="text-base">{application.title}</CardTitle><CardDescription>{application.due_at ? `Due ${new Date(application.due_at).toLocaleDateString()}` : "No deadline recorded"}</CardDescription></CardHeader><CardContent><p className="line-clamp-2 text-sm">{application.next_action || "Open the packet to choose the next action."}</p><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Priority {application.priority}</span><ArrowRight className="size-4" /></div></CardContent></Card></Link>)}{scoped.length === 0 ? <Card className="border-dashed"><CardContent className="py-10 text-center text-xs text-muted-foreground"><BriefcaseBusiness className="mx-auto mb-2 size-5" />Empty</CardContent></Card> : null}</div></section>; })}</div></div>;
}
