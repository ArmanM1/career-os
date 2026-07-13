import { z } from "zod";

const browserEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const serverEnvSchema = browserEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  CAREER_OS_APP_URL: z.url().default("http://localhost:3000"),
  CAREER_OS_OAUTH_ENCRYPTION_KEY: z.string().min(43).optional(),
  CAREER_OS_WORKER_PAIRING_PEPPER: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  RESEND_FROM_EMAIL: z.email().optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(20).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(5).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(5).optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().min(5).optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(5).optional(),
});

export function getBrowserEnv() {
  return browserEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CAREER_OS_APP_URL: process.env.CAREER_OS_APP_URL,
    CAREER_OS_OAUTH_ENCRYPTION_KEY: process.env.CAREER_OS_OAUTH_ENCRYPTION_KEY,
    CAREER_OS_WORKER_PAIRING_PEPPER: process.env.CAREER_OS_WORKER_PAIRING_PEPPER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GITHUB_OAUTH_CLIENT_ID: process.env.GITHUB_OAUTH_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_OAUTH_CLIENT_SECRET,
  });
}

export function requireServerSecret<K extends keyof ReturnType<typeof getServerEnv>>(key: K) {
  const value = getServerEnv()[key];
  if (!value) throw new Error(`Missing required server environment variable: ${key}`);
  return value;
}
