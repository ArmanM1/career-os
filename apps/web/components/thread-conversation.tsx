"use client";

import { Copy, Send, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendThreadMessage } from "@/app/threads/actions";

type ThreadMessage = { id: string; role: "user" | "assistant" | "system"; content: string; status: string; created_at: string };

export function ThreadConversation({ threadId, initialMessages, workerOnline }: { threadId: string; initialMessages: ThreadMessage[]; workerOnline: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`thread:${threadId}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, () => router.refresh()).on("postgres_changes", { event: "*", schema: "public", table: "message_parts" }, () => router.refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router, threadId]);

  return <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border bg-card"><Conversation className="min-h-0 flex-1"><ConversationContent className="mx-auto w-full max-w-3xl gap-6 p-4 sm:p-6">{initialMessages.length === 0 ? <ConversationEmptyState title="Start the conversation" description="Career OS will use your latest state and persist everything here." /> : initialMessages.map((message) => <Message key={message.id} from={message.role === "assistant" ? "assistant" : "user"}><MessageContent>{message.role === "assistant" ? <MessageResponse>{message.content}</MessageResponse> : message.content}</MessageContent><MessageActions><MessageAction tooltip="Copy" onClick={() => navigator.clipboard.writeText(message.content)}><Copy /></MessageAction></MessageActions></Message>)}</ConversationContent><ConversationScrollButton /></Conversation><div className="border-t p-3 sm:p-4"><PromptInput onSubmit={({ text: submitted }) => { if (!submitted.trim()) return; setText(""); startTransition(() => void sendThreadMessage(threadId, submitted)); }}><PromptInputBody><PromptInputTextarea value={text} onChange={(event) => setText(event.target.value)} placeholder={workerOnline ? "Ask Career OS…" : "Worker offline — your message will remain queued"} /></PromptInputBody><PromptInputFooter><span className="text-xs text-muted-foreground">{workerOnline ? "Current state will be refreshed before this turn" : "Queued until the worker reconnects"}</span><PromptInputSubmit disabled={!text.trim() || pending} status={pending ? "submitted" : "ready"}>{pending ? <Square /> : <Send />}</PromptInputSubmit></PromptInputFooter></PromptInput></div></div>;
}
