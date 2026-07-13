"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function OnboardingRealtime({
  sessionId,
  children,
}: {
  sessionId: string;
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
    const channel = supabase
      .channel(`onboarding:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "onboarding_work_items",
          filter: `onboarding_session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "onboarding_sessions",
          filter: `id=eq.${sessionId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router, sessionId]);
  return children;
}
