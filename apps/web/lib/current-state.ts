import type { CurrentStateBundle } from "@career-os/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Row = Record<string, unknown>;

async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as Row[];
}

export async function assembleCurrentState(userId: string): Promise<CurrentStateBundle> {
  const db = getSupabaseAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const thirtyDays = new Date(now.getTime() + 30 * 86400_000).toISOString();
  const [profileRows, academicRows, seasons, goals, stateItems, decisions, questions, activeTasks, completedTasks, blockedTasks, applications, opportunities, events, relationships, constraints, checkIns, summaries] = await Promise.all([
    rows(db.from("profiles").select("*").eq("user_id", userId).limit(1)),
    rows(db.from("academic_contexts").select("*").eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1)),
    rows(db.from("career_seasons").select("*").eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1)),
    rows(db.from("goals").select("*").eq("user_id", userId).eq("status", "active").order("priority", { ascending: false }).limit(30)),
    rows(db.from("state_items").select("*").eq("user_id", userId).eq("status", "active").or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`).order("salience", { ascending: false }).limit(100)),
    rows(db.from("decisions").select("*").eq("user_id", userId).in("status", ["active", "reconsidering"]).order("decided_at", { ascending: false }).limit(20)),
    rows(db.from("open_questions").select("*").eq("user_id", userId).in("status", ["open", "asked"]).order("created_at", { ascending: false }).limit(30)),
    rows(db.from("tasks").select("*").eq("user_id", userId).in("status", ["todo", "in_progress", "waiting"]).order("priority", { ascending: false }).limit(100)),
    rows(db.from("tasks").select("*").eq("user_id", userId).eq("status", "completed").gte("updated_at", weekAgo).order("updated_at", { ascending: false }).limit(50)),
    rows(db.from("tasks").select("*").eq("user_id", userId).in("status", ["blocked", "skipped"]).gte("updated_at", weekAgo).order("updated_at", { ascending: false }).limit(50)),
    rows(db.from("applications").select("*").eq("user_id", userId).not("status", "in", "(rejected,withdrawn)").order("updated_at", { ascending: false }).limit(100)),
    rows(db.from("opportunity_recommendations").select("*,opportunities(*)").eq("user_id", userId).in("recommendation", ["apply_now", "prepare_then_apply", "build_project_then_apply"]).order("score", { ascending: false }).limit(30)),
    rows(db.from("events").select("*").eq("user_id", userId).gte("starts_at", now.toISOString()).lte("starts_at", thirtyDays).order("starts_at").limit(50)),
    rows(db.from("relationships").select("*,contacts(*)").eq("user_id", userId).not("status", "eq", "archived").order("next_action_at").limit(50)),
    rows(db.from("constraints").select("*").eq("user_id", userId).eq("status", "active").or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`).order("starts_at").limit(50)),
    rows(db.from("check_ins").select("*").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(10)),
    rows(db.from("thread_summaries").select("*,threads!inner(thread_type,status)").eq("user_id", userId).eq("status", "current").order("created_at", { ascending: false }).limit(20)),
  ]);

  const profile = profileRows[0] ?? {};
  return {
    asOf: now.toISOString(),
    stateVersion: Number(profile.state_version ?? 0),
    profile,
    academicContext: academicRows[0] ?? {},
    careerSeason: seasons[0] ?? {},
    activeGoals: goals,
    currentStateItems: stateItems,
    recentDecisions: decisions,
    openQuestions: questions,
    activeTasks,
    recentlyCompletedTasks: completedTasks,
    blockedOrSkippedTasks: blockedTasks,
    applications,
    topOpportunities: opportunities,
    upcomingEvents: events,
    relationshipObligations: relationships,
    calendarConstraints: constraints,
    recentCheckIns: checkIns,
    relevantThreadSummaries: summaries,
  };
}
