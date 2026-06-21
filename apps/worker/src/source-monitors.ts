import type { WorkerSupabase } from "./supabase";

export async function runDueApplicationStatusChecks(supabase: WorkerSupabase) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("application_status_checks")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .limit(10);

  if (error || !data?.length) return { processed: 0 };

  for (const check of data) {
    await supabase
      .from("application_status_checks")
      .update({
        status: "completed",
        result_status: "no_change",
        completed_at: now,
        updated_at: now,
        metadata: {
          ...(check.metadata ?? {}),
          note: "V1 placeholder status check recorded no_change. Email/calendar/browser connectors wire in next.",
        },
      })
      .eq("id", check.id);
  }

  return { processed: data.length };
}

export async function runDueSourceMonitors(supabase: WorkerSupabase) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("source_monitors").select("*").eq("status", "active").limit(10);
  if (error || !data?.length) return { processed: 0 };

  for (const monitor of data) {
    await supabase.from("source_runs").insert({
      user_id: monitor.user_id,
      source_monitor_id: monitor.id,
      title: `Run ${monitor.title}`,
      status: "no_change",
      started_at: now,
      completed_at: now,
      new_signal_count: 0,
      new_opportunity_count: 0,
      metadata: {
        note: "V1 placeholder monitor run. Fetch/parser execution is implemented after source scripts exist.",
      },
      created_by: "system",
      updated_by: "system",
    });
  }

  return { processed: data.length };
}

