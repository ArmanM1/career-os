import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerSecret } from "@/lib/env";

const allowedBuckets = new Set(["resume-sources", "resume-artifacts", "thread-attachments", "evidence", "exports"]);

function hmac(scope: "pair" | "device", value: string) {
  return createHmac("sha256", requireServerSecret("CAREER_OS_WORKER_PAIRING_PEPPER"))
    .update(`${scope}:${value}`)
    .digest("hex");
}

export function normalizePairingCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function hashPairingCode(code: string) {
  return hmac("pair", normalizePairingCode(code));
}

export function hashDeviceSecret(secret: string) {
  return hmac("device", secret);
}

export function createPairingCode() {
  const raw = randomBytes(12).toString("hex").toUpperCase();
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

export function createDeviceSecret() {
  return randomBytes(32).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type AuthenticatedDevice = {
  id: string;
  userId: string;
  capabilities: string[];
};

export async function authenticateWorker(request: Request): Promise<AuthenticatedDevice | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const separator = token.indexOf(".");
  if (separator < 1) return null;
  const id = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id) || secret.length < 32) return null;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("worker_devices")
    .select("id,user_id,status,secret_hash,capabilities")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.status === "revoked" || !data.secret_hash) return null;
  if (!safeEqual(data.secret_hash, hashDeviceSecret(secret))) return null;
  return { id: data.id, userId: data.user_id, capabilities: data.capabilities ?? [] };
}

export function workerUnauthorized() {
  return NextResponse.json({ error: "Invalid or revoked worker device" }, { status: 401 });
}

export function isAllowedStoragePath(userId: string, bucket: string, path: string) {
  return allowedBuckets.has(bucket) && path.startsWith(`${userId}/`) && !path.includes("..") && !path.includes("\\");
}
