import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WorkerEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  pollMs: number;
  runtime: "codex-app-server" | "mock";
};

function loadEnvFile(path: string) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) return;

  const lines = readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

function loadLocalEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  loadEnvFile("../../.env.local");
  loadEnvFile("../../.env");
}

export function readWorkerEnv(): WorkerEnv {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pollMs = Number(process.env.CAREER_OS_WORKER_POLL_MS ?? "10000");
  const runtime = (process.env.CAREER_OS_RUNTIME ?? "codex-app-server") as WorkerEnv["runtime"];

  if (!supabaseUrl || supabaseUrl.includes("replace-with")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for the worker.");
  }

  if (!serviceRoleKey || serviceRoleKey.includes("replace-with")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the worker.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    pollMs: Number.isFinite(pollMs) ? pollMs : 10000,
    runtime: runtime === "mock" ? "mock" : "codex-app-server",
  };
}
