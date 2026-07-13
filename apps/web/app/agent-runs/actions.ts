"use server";

import { revalidatePath } from "next/cache";
import { createCareerServerClient } from "@/lib/server-supabase";

function formText(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export async function queueBrowserViabilityCheck(formData: FormData) {
  const server = createCareerServerClient();
  if (!server) return;

  const url = formText(formData, "url", "https://example.com");
  const task = formText(
    formData,
    "task",
    "Open the page, inspect the visible title or heading, take a screenshot, and report what you verified.",
  );

  await server.supabase.from("agent_jobs").insert({
    user_id: server.userId,
    agent_id: "career-advisor",
    title: "Browser viability check",
    status: "queued",
    labels: ["browser-viability", "read-only"],
    queue: "browser",
    prompt: [
      "Run a read-only browser viability check through Codex app-server.",
      `Target URL: ${url}`,
      `Task: ${task}`,
      "Use browser tools only for read-only actions: navigate, list tabs, resize, snapshot, screenshot, wait, console, network, and web search if needed.",
      "Do not click, type, submit, log in, post, message, follow, purchase, upload, or mutate external account state.",
      "When taking screenshots or snapshots, do not pass filename arguments; let the browser tool manage its own artifact paths.",
      "Return a valid Career OS AgentOutput JSON object.",
      "Do not create proposed mutations.",
      "Include evidence entries for the page inspected and screenshot/browser artifact if available.",
    ].join("\n"),
    input: {
      type: "browser.viability_check",
      mode: "manual",
      url,
      task,
      browserUseAllowed: true,
      computerUseAllowed: true,
      maxDurationMinutes: 6,
      allowedBrowserActions: [
        "browser_tabs",
        "browser_navigate",
        "browser_resize",
        "browser_snapshot",
        "browser_take_screenshot",
        "browser_wait",
        "browser_console_messages",
        "browser_network_requests",
      ],
      disallowedActions: ["click", "type", "submit", "login", "post", "dm", "follow", "purchase", "upload"],
    },
    priority: 80,
    scheduled_for: new Date().toISOString(),
    created_by: "user",
    updated_by: "user",
  });

  revalidatePath("/agent-runs");
  revalidatePath("/dashboard");
}
