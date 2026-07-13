import { MessageSquarePlus, Pin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ThreadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, user } = await requireUser();
  let query = supabase
    .from("threads")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (q.trim()) query = query.ilike("title", `%${q.trim().replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data: threads, error } = await query
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Threads</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Persistent advisor and object-specific conversations, always
            rehydrated with current state.
          </p>
        </div>
        <Button asChild>
          <Link href="/threads/new">
            <MessageSquarePlus />
            New thread
          </Link>
        </Button>
      </header>
      <form className="flex max-w-lg gap-2"><Input name="q" defaultValue={q} placeholder="Search thread titles" aria-label="Search threads" /><Button type="submit" variant="outline">Search</Button></form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {threads?.map((thread) => (
          <Link key={thread.id} href={`/threads/${thread.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{thread.title}</CardTitle>
                  {thread.pinned ? (
                    <Pin className="size-4 text-primary" />
                  ) : null}
                </div>
                <CardDescription>
                  {thread.thread_type.replaceAll("_", " ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="outline">{thread.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {thread.last_message_at
                    ? new Date(thread.last_message_at).toLocaleDateString()
                    : "No messages"}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {threads?.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardContent className="py-16 text-center">
              <MessageSquarePlus className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">
                Start your first advisor thread
              </p>
              <p className="text-sm text-muted-foreground">
                It will know your current goals, state, tasks, and applications.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
