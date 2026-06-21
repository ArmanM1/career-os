import { createClient } from "@supabase/supabase-js";

export function getCareerUserId() {
  const userId = process.env.CAREER_OS_LOCAL_USER_ID ?? process.env.CAREER_OS_SEED_USER_ID;
  if (!userId || userId.includes("replace-with")) return null;
  return userId;
}

export function createCareerServerClient() {
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
