export type WorkerEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  pollMs: number;
  runtime: "codex-app-server" | "mock";
};

export function readWorkerEnv(): WorkerEnv {
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

