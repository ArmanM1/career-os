import { demoData } from "@/lib/demo";
import { createCareerServerClient } from "@/lib/server-supabase";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";

async function listTable<T>(table: string, fallback: T[]): Promise<T[]> {
  const server = createCareerServerClient();
  if (server) {
    const { data, error } = await server.supabase
      .from(table)
      .select("*")
      .eq("user_id", server.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) return data as T[];
  }

  const supabase = createSupabaseBrowserlessClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return fallback;
  return data as T[];
}

export async function getDashboardData() {
  const [
    tasks,
    applications,
    approvals,
    sourceMonitors,
    goals,
    resumes,
    agentRuns,
    sourceCandidates,
    sourceDiscoveryRuns,
    signals,
    opportunityRecommendations,
  ] = await Promise.all([
    listTable("tasks", demoData.tasks),
    listTable("applications", demoData.applications),
    listTable("approval_requests", demoData.approvals),
    listTable("source_monitors", demoData.sourceMonitors),
    listTable("goals", demoData.goals),
    listTable("resume_variants", demoData.resumes),
    listTable("agent_runs", demoData.agentRuns),
    listTable("source_candidates", demoData.sourceCandidates),
    listTable("source_discovery_runs", demoData.sourceDiscoveryRuns),
    listTable("signals", demoData.signals),
    listTable("opportunity_recommendations", demoData.opportunityRecommendations),
  ]);

  return {
    tasks,
    applications,
    approvals,
    sourceMonitors,
    goals,
    resumes,
    agentRuns,
    sourceCandidates,
    sourceDiscoveryRuns,
    signals,
    opportunityRecommendations,
  };
}
