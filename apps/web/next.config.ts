import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootEnvFile = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(rootEnvFile) && !process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  transpilePackages: ["@career-os/core"],
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
    const connectSources = ["'self'", supabase?.origin, supabase ? `wss://${supabase.host}` : null].filter(Boolean).join(" ");
    const scriptSources = ["'self'", "'unsafe-inline'", process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : null].filter(Boolean).join(" ");
    const csp = [`default-src 'self'`, `script-src ${scriptSources}`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `font-src 'self' data:`, `connect-src ${connectSources}`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`].join("; ");
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    ] }];
  },
};

export default nextConfig;
