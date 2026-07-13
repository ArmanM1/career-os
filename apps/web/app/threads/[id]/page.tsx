import { Archive, Pin } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThreadConversation } from "@/components/thread-conversation";
import { requireUser } from "@/lib/supabase/server";
import { isWorkerOnline } from "@/lib/worker-status";
import { archiveThread, renameThread, setThreadPinned } from "../actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: thread }, { data: messages }, { data: worker }] =
    await Promise.all([
      supabase
        .from("threads")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id,role,content,status,created_at")
        .eq("thread_id", id)
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("worker_devices")
        .select("status,last_heartbeat_at")
        .eq("user_id", user.id)
        .neq("status", "revoked")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (!thread) notFound();
  const workerOnline = isWorkerOnline(worker);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm capitalize text-muted-foreground">
            {thread.thread_type.replaceAll("_", " ")}
          </p>
          <form action={renameThread.bind(null, thread.id)} className="mt-1 flex max-w-xl gap-2"><Input name="title" defaultValue={thread.title} aria-label="Thread title" className="h-9 text-lg font-semibold" /><Button type="submit" size="sm" variant="ghost">Rename</Button></form>
          <p className="mt-1 text-xs text-muted-foreground">
            {workerOnline
              ? "Worker online"
              : "Worker offline · new work will queue"}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={setThreadPinned.bind(null, thread.id, !thread.pinned)}>
            <Button variant="outline" size="icon">
              <Pin className={thread.pinned ? "fill-current" : ""} />
              <span className="sr-only">Toggle pin</span>
            </Button>
          </form>
          <form action={archiveThread.bind(null, thread.id)}>
            <Button variant="outline" size="icon">
              <Archive />
              <span className="sr-only">Archive</span>
            </Button>
          </form>
        </div>
      </header>
      <ThreadConversation
        threadId={thread.id}
        initialMessages={
          (messages ?? []) as Parameters<
            typeof ThreadConversation
          >[0]["initialMessages"]
        }
        workerOnline={Boolean(workerOnline)}
      />
    </div>
  );
}
