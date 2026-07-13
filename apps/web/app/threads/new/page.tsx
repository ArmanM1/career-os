import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createThread } from "../actions";

const types = ["advisor", "onboarding", "source", "opportunity", "application", "mentor_contact", "resume", "planning", "career_positioning", "event"];

export default async function NewThreadPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const defaultType = types.includes(type ?? "") ? type! : "advisor";
  return <div className="mx-auto max-w-xl"><Card><CardHeader><CardTitle>Start a thread</CardTitle><CardDescription>Choose a specialist context. You can link objects after creation.</CardDescription></CardHeader><CardContent><form action={createThread} className="space-y-5"><div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" placeholder="Summer internship strategy" /></div><div className="space-y-2"><Label>Thread type</Label><Select name="threadType" defaultValue={defaultType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{types.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><Button className="w-full">Create thread</Button></form></CardContent></Card></div>;
}
