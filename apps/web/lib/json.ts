import type { Json } from "@career-os/db";

/** Convert already-validated Zod/domain values into Supabase's recursive JSON type. */
export function toJson(value: unknown): Json {
  return value as Json;
}
