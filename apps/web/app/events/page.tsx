import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function EventsPage() {
  const { supabase, user } = await requireUser();
  const { data: events } = await supabase.from("events").select("*,event_recommendations(score,rationale,status),event_attendance(status)").eq("user_id", user.id).gte("starts_at", new Date().toISOString()).order("starts_at");
  return <div className="mx-auto max-w-6xl space-y-6"><header className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">Events</h1><p className="mt-2 text-sm text-muted-foreground">Career fairs, company sessions, networking, interviews, and follow-up context.</p></div><Button asChild><Link href="/threads/new?type=event">Scan for events</Link></Button></header><div className="space-y-4">{events?.map((event) => <Card key={event.id}><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><CardTitle>{event.title}</CardTitle><CardDescription className="mt-2 flex flex-wrap gap-3"><span className="flex items-center gap-1"><CalendarDays className="size-3" />{event.starts_at ? new Date(event.starts_at).toLocaleString() : "Date pending"}</span><span className="flex items-center gap-1"><MapPin className="size-3" />{event.location ?? "Location pending"}</span></CardDescription></div><Badge variant="outline">{event.status}</Badge></div></CardHeader><CardContent>{event.url ? <Button asChild variant="outline" size="sm"><a href={event.url} target="_blank" rel="noreferrer">Open source</a></Button> : null}</CardContent></Card>)}{events?.length === 0 ? <Card><CardContent className="py-16 text-center"><CalendarDays className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">No upcoming events</p><p className="text-sm text-muted-foreground">Connect Calendar and enable school or company event sources.</p></CardContent></Card> : null}</div></div>;
}
