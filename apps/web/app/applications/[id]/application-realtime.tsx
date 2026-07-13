"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const applicationTables = [
  "application_packets",
  "application_requirements",
  "application_status_history",
  "outreach_drafts",
  "project_specs",
  "referral_paths",
  "resume_variants",
] as const;

export function ApplicationRealtime({
  applicationId,
  children,
}: {
  applicationId: string;
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 150);
    };
    let channel = supabase
      .channel(`application:${applicationId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications", filter: `id=eq.${applicationId}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_jobs" }, refresh);

    for (const table of applicationTables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `application_id=eq.${applicationId}` },
        refresh,
      );
    }

    channel.subscribe();
    return () => {
      clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [applicationId, router]);

  return children;
}
