import { MessageSquarePlus, UsersRound } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function RelationshipsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: relationships }, { data: drafts }] = await Promise.all([
    supabase.from("relationships").select("*,contacts(*)").eq("user_id", user.id).neq("status", "archived").order("next_action_at", { ascending: true, nullsFirst: false }),
    supabase.from("outreach_drafts").select("*,contacts(*)").eq("user_id", user.id).in("status", ["draft", "ready"]).order("created_at", { ascending: false }).limit(10),
  ]);
  return <div className="mx-auto max-w-7xl space-y-6"><header className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">Relationships</h1><p className="mt-2 text-sm text-muted-foreground">Mentors, connections, conversation stages, warm paths, and manual outreach drafts.</p></div><Button asChild><Link href="/threads/new?type=mentor_contact"><MessageSquarePlus />Relationship thread</Link></Button></header><div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><Card><CardHeader><CardTitle>People</CardTitle><CardDescription>Ordered by the next relationship action.</CardDescription></CardHeader><CardContent className="divide-y">{relationships?.map((relationship) => { const contact = relationship.contacts as Record<string, unknown> | null; return <div key={relationship.id} className="py-4"><div className="flex justify-between gap-4"><div><p className="font-medium">{String(contact?.title ?? relationship.title)}</p><p className="text-sm text-muted-foreground">{String(contact?.company ?? relationship.context ?? "")}</p></div><Badge variant="outline">{relationship.status.replaceAll("_", " ")}</Badge></div></div>; })}{relationships?.length === 0 ? <div className="py-12 text-center"><UsersRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">No relationships imported</p><p className="text-sm text-muted-foreground">Add mentors during onboarding or report a meeting in a relationship thread.</p></div> : null}</CardContent></Card><Card><CardHeader><CardTitle>Drafts ready to copy</CardTitle><CardDescription>Career OS never sends these.</CardDescription></CardHeader><CardContent className="space-y-4">{drafts?.map((draft) => <div key={draft.id} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium">{draft.title}</p><Badge>{draft.channel}</Badge></div>{draft.subject ? <p className="mt-2 text-sm font-medium">{draft.subject}</p> : null}<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{draft.body}</p><div className="mt-4"><CopyButton text={[draft.subject, draft.body].filter(Boolean).join("\n\n")} /></div></div>)}{drafts?.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No drafts are waiting.</p> : null}</CardContent></Card></div></div>;
}
