import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/server";
import { completeCheckIn } from "./actions";

export const dynamic = "force-dynamic";
export default async function CheckInsPage() {
  const { supabase, user } = await requireUser(); const { data: checkIns } = await supabase.from("check_ins").select("*,check_in_questions(*)").eq("user_id", user.id).in("status", ["scheduled", "open"]).order("scheduled_for");
  return <div className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-3xl font-semibold">Check-ins</h1><p className="mt-2 text-sm text-muted-foreground">Fast daily updates and deeper dynamic weekly reflection.</p></header>{checkIns?.map((checkIn) => <Card key={checkIn.id}><CardHeader><CardTitle>{checkIn.title}</CardTitle><CardDescription>{checkIn.check_in_type} · {checkIn.scheduled_for ? new Date(checkIn.scheduled_for).toLocaleString() : "Ready now"}</CardDescription></CardHeader><CardContent><form action={completeCheckIn.bind(null, checkIn.id)} className="space-y-6">{(checkIn.check_in_questions ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position).map((question: { id: string; question: string; question_type: string; options: unknown }) => <fieldset key={question.id} className="space-y-3"><legend className="font-medium">{question.question}</legend>{question.question_type === "multi_select" && Array.isArray(question.options) ? question.options.map((option) => <Label key={String(option)} className="flex items-center gap-3 rounded-lg border p-3"><Checkbox name={question.id} value={String(option)} />{String(option)}</Label>) : <Input name={question.id} />}</fieldset>)}<Button className="w-full">Complete check-in</Button></form></CardContent></Card>)}{checkIns?.length === 0 ? <Card><CardContent className="py-16 text-center"><BadgeCheck className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">No check-in is due</p><p className="text-sm text-muted-foreground">Daily check-in: 7:00 PM. Weekly review: Sunday at 6:00 PM.</p></CardContent></Card> : null}</div>;
}
