import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WorkerEnv = {
  gatewayUrl: string;
  pollMs: number;
  runtime: "codex-app-server" | "mock";
  dataDir: string;
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

export function readWorkerEnv(): WorkerEnv {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  loadEnvFile("../../.env.local");
  loadEnvFile("../../.env");
  const gatewayUrl = process.env.CAREER_OS_GATEWAY_URL ?? "http://localhost:3000";
  const pollMs = Number(process.env.CAREER_OS_WORKER_POLL_MS ?? "10000");
  const runtime = process.env.CAREER_OS_RUNTIME === "mock" ? "mock" : "codex-app-server";
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) throw new Error("LOCALAPPDATA is required on the paired Windows worker.");
  return {
    gatewayUrl: gatewayUrl.replace(/\/$/, ""),
    pollMs: Number.isFinite(pollMs) && pollMs >= 1000 ? pollMs : 10000,
    runtime,
    dataDir: resolve(process.env.CAREER_OS_DATA_DIR ?? localAppData, "CareerOS"),
  };
}
