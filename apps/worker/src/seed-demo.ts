import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  demoApplications,
  demoGoals,
  demoSourceMonitors,
  demoTasks,
} from "@career-os/core";

function loadEnvFile(path: string) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    return;
  }

  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.CAREER_OS_SEED_USER_ID;

if (!supabaseUrl || !serviceRoleKey || !userId) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CAREER_OS_SEED_USER_ID.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict = "id") {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

const now = new Date().toISOString();

await upsertRows(
  "profiles",
  [
    {
      user_id: userId,
      title: "Profile",
      status: "active",
      labels: ["demo"],
      full_name: "Arman Mokhlesi",
      headline: "SWE and entrepreneurship career operating system",
      timezone: "America/Denver",
      metadata: { seeded: true },
      created_by: "user",
      updated_by: "user",
    },
  ],
  "user_id",
);

await upsertRows("academic_contexts", [
  {
    id: "12121212-1212-4212-8212-121212121212",
    user_id: userId,
    title: "Current college context",
    status: "active",
    labels: ["college", "demo"],
    institution: "School TBD",
    degree_program: "Computer Science",
    current_year: "other",
    current_term: "current",
    expected_graduation_date: "2028-05-15",
    recruiting_season: "internship_peak",
    timezone: "America/Denver",
    metadata: { seeded: true, note: "Replace during onboarding." },
    created_by: "user",
    updated_by: "user",
  },
]);

await upsertRows(
  "goals",
  demoGoals.map((goal) => ({
    id: goal.id,
    user_id: userId,
    title: goal.title,
    status: goal.status,
    labels: goal.labels,
    priority: goal.priority ?? null,
    due_at: goal.dueAt ?? null,
    horizon: goal.horizon,
    track: goal.track,
    allocation_percent: goal.allocationPercent,
    rationale: goal.rationale,
    related_goal_ids: goal.relatedGoalIds,
    evidence_ids: goal.evidenceIds,
    metadata: { seeded: true },
    created_by: goal.createdBy,
    updated_by: goal.updatedBy,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  })),
);

await upsertRows(
  "source_monitors",
  demoSourceMonitors.map((monitor) => ({
    id: monitor.id,
    user_id: userId,
    title: monitor.title,
    status: monitor.status,
    labels: monitor.labels,
    priority: monitor.priority ?? null,
    source_type: monitor.sourceType,
    url: monitor.url,
    fetch_strategy: monitor.fetchStrategy,
    schedule: monitor.schedule,
    requires_auth: monitor.requiresAuth,
    related_goal_ids: monitor.relatedGoalIds,
    evidence_ids: monitor.evidenceIds,
    metadata: { seeded: true },
    created_by: monitor.createdBy,
    updated_by: monitor.updatedBy,
    created_at: monitor.createdAt,
    updated_at: monitor.updatedAt,
  })),
);

await upsertRows("opportunities", [
  {
    id: demoApplications[0].opportunityId,
    user_id: userId,
    title: "Example SWE Internship",
    status: "active",
    labels: ["job app", "swe", "demo"],
    priority: 75,
    opportunity_type: "internship",
    url: "https://example.com/careers/swe-intern",
    source_monitor_id: demoSourceMonitors[0].id,
    discovered_at: now,
    fit_rationale: "Seed opportunity for dashboard and application pipeline acceptance checks.",
    related_goal_ids: [demoGoals[0].id],
    evidence_ids: [],
    metadata: { seeded: true },
    created_by: "agent",
    updated_by: "agent",
  },
]);

await upsertRows(
  "tasks",
  demoTasks.map((task) => ({
    id: task.id,
    user_id: userId,
    title: task.title,
    status: task.status,
    labels: task.labels,
    priority: task.priority ?? null,
    due_at: task.dueAt ?? null,
    task_type: task.taskType,
    effort: task.effort,
    urgency: task.urgency,
    energy: task.energy,
    source: task.source,
    related_goal_ids: task.relatedGoalIds,
    related_application_ids: task.relatedApplicationIds,
    related_opportunity_ids: task.relatedOpportunityIds,
    related_contact_ids: task.relatedContactIds,
    related_event_ids: task.relatedEventIds,
    evidence_ids: task.evidenceIds,
    metadata: { seeded: true },
    created_by: task.createdBy,
    updated_by: task.updatedBy,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  })),
);

await upsertRows(
  "applications",
  demoApplications.map((application) => ({
    id: application.id,
    user_id: userId,
    title: application.title,
    status: application.status,
    labels: application.labels,
    priority: application.priority ?? null,
    due_at: application.dueAt ?? null,
    opportunity_id: application.opportunityId,
    status_check_policy: application.statusCheckPolicy,
    next_status_check_at: application.nextStatusCheckAt,
    related_goal_ids: application.relatedGoalIds,
    related_opportunity_ids: application.relatedOpportunityIds,
    related_contact_ids: application.relatedContactIds,
    evidence_ids: application.evidenceIds,
    metadata: { seeded: true },
    created_by: application.createdBy,
    updated_by: application.updatedBy,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
  })),
);

await upsertRows("approval_requests", [
  {
    id: "88888888-8888-4888-8888-888888888888",
    user_id: userId,
    title: "Enable authenticated application portal status checks",
    status: "pending",
    labels: ["status check", "approval", "demo"],
    action_type: "browser_control.run_authenticated",
    rationale: "Some portals do not provide email status updates.",
    risk_level: "medium",
    payload: { seeded: true },
    evidence_ids: [],
    created_by: "agent",
    updated_by: "agent",
  },
]);

console.log("Seeded demo Career OS rows for", userId);
