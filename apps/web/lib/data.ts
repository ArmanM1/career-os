import { demoData } from "@/lib/demo";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";

async function listTable<T>(table: string, fallback: T[]): Promise<T[]> {
  const supabase = createSupabaseBrowserlessClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return fallback;
  return data as T[];
}

export async function getDashboardData() {
  const [tasks, applications, approvals, sourceMonitors, goals, resumes, agentRuns] = await Promise.all([
    listTable("tasks", demoData.tasks),
    listTable("applications", demoData.applications),
    listTable("approval_requests", demoData.approvals),
    listTable("source_monitors", demoData.sourceMonitors),
    listTable("goals", demoData.goals),
    listTable("resume_variants", demoData.resumes),
    listTable("agent_runs", demoData.agentRuns),
  ]);

  return { tasks, applications, approvals, sourceMonitors, goals, resumes, agentRuns };
}
