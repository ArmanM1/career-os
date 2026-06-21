import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

export function getCareerUserId() {
  loadLocalEnv();

  const userId = process.env.CAREER_OS_LOCAL_USER_ID ?? process.env.CAREER_OS_SEED_USER_ID;
  if (!userId || userId.includes("replace-with")) return null;
  return userId;
}

export function createCareerServerClient() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = getCareerUserId();

  if (!url || !key || !userId || key.includes("replace-with")) {
    return null;
  }

  return {
    userId,
    supabase: createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}
