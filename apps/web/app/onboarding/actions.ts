"use server";

import { revalidatePath } from "next/cache";
import { Cron } from "croner";
import { requireUser } from "@/lib/supabase/server";

export async function startOnboarding() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("onboarding_sessions")
    .upsert(
      {
        user_id: user.id,
        status: "in_progress",
        current_step: 1,
        started_at: new Date().toISOString(),
        created_by: "user",
        updated_by: "user",
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
}

export async function advanceOnboarding(
  sessionId: string,
  step: number,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session || session.current_step !== step)
    throw new Error("Onboarding changed elsewhere. Refresh to continue.");
  const stepAnswers = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value).trim()]),
  );
  const answers = {
    ...(session.answers as Record<string, unknown>),
    ...stepAnswers,
  };
  const completedSteps = Array.from(
    new Set([...(session.completed_steps ?? []), step]),
  ).sort((a, b) => a - b);
  const final = step === 18;
  if (step === 1 && stepAnswers.timezone)
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          title: "Profile",
          timezone: stepAnswers.timezone,
          status: "active",
          created_by: "user",
          updated_by: "user",
        },
        { onConflict: "user_id" },
      );
  if (step === 3) {
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          title: "Profile",
          full_name: stepAnswers.fullName || null,
          status: "active",
          metadata: { currentEmployment: stepAnswers.currentEmployment },
          created_by: "user",
          updated_by: "user",
        },
        { onConflict: "user_id" },
      );
    await supabase
      .from("academic_contexts")
      .insert({
        user_id: user.id,
        title: "Academic context",
        institution: stepAnswers.institution || null,
        degree_program: stepAnswers.degreeProgram || null,
        expected_graduation_date: stepAnswers.graduationDate || null,
        status: "active",
        created_by: "user",
        updated_by: "user",
      });
  }
  if (step === 4 && stepAnswers.seasonType)
    await supabase
      .from("career_seasons")
      .insert({
        user_id: user.id,
        title: "Current career season",
        season_type: stepAnswers.seasonType,
        summary: stepAnswers.seasonSummary ?? "",
        status: "active",
        created_by: "user",
        updated_by: "user",
      });
  if (step === 5 && stepAnswers.primaryGoal)
    await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: stepAnswers.primaryGoal,
        status: "active",
        horizon: "1_year",
        track: "general",
        rationale: stepAnswers.goalRationale ?? "",
        created_by: "user",
        updated_by: "user",
      });
  if (step === 15) await createDefaultSchedules(supabase, user.id);
  const { error } = await supabase
    .from("onboarding_sessions")
    .update({
      answers,
      completed_steps: completedSteps,
      current_step: final ? 18 : Math.min(18, step + 1),
      status: final ? "completed" : "in_progress",
      completed_at: final ? new Date().toISOString() : null,
      updated_by: "user",
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("version", session.version);
  if (error) throw new Error(error.message);
  const inputType = final ? "onboarding.review" : "onboarding.answer";
  await supabase
    .from("agent_jobs")
    .insert({
      user_id: user.id,
      agent_id: "career-onboarding",
      title: `Onboarding step ${step}`,
      status: "queued",
      queue: "onboarding",
      input_type: inputType,
      input: {
        schemaVersion: 1,
        type: inputType,
        step,
        answers: stepAnswers,
        sessionId,
      },
      priority: 70,
      scheduled_for: new Date().toISOString(),
      dedupe_key: `onboarding:${session.id}:step:${step}:v${session.version}`,
      created_by: "system",
      updated_by: "system",
    });
  if (step === 16) await supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-source-discovery", title: "Initial onboarding source discovery", queue: "sources", input_type: "source.discover", input: { schemaVersion: 1, type: "source.discover", mode: "onboarding", onboardingSessionId: session.id, answers }, priority: 85, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-source-discovery`, required_capabilities: ["browser_read"], created_by: "system", updated_by: "system" });
  if (step === 17) await Promise.all([
    supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-positioning", title: "Generate initial career strategy", queue: "planning", input_type: "positioning.review", input: { schemaVersion: 1, type: "positioning.review", onboardingSessionId: session.id }, priority: 90, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-positioning`, created_by: "system", updated_by: "system" }),
    supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-daily-weekly-planner", title: "Generate initial weekly plan", queue: "planning", input_type: "planner.weekly_review", input: { schemaVersion: 1, type: "planner.weekly_review", onboardingSessionId: session.id, initial: true }, priority: 88, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-weekly-plan`, created_by: "system", updated_by: "system" }),
  ]);
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

async function createDefaultSchedules(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
) {
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", userId).maybeSingle();
  const timezone = profile?.timezone ?? "America/Denver";
  const schedules = [
    {
      title: "Morning brief",
      schedule_type: "morning_brief",
      cron_expression: "0 6 * * *",
      dedupe_prefix: "morning",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.morning",
        title: "Generate morning brief",
        queue: "planning",
        priority: 100,
        input: { schemaVersion: 1, type: "planner.morning" },
      },
    },
    {
      title: "Daily check-in",
      schedule_type: "daily_check_in",
      cron_expression: "0 19 * * *",
      dedupe_prefix: "daily-check-in",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.daily_check_in",
        title: "Create daily check-in",
        queue: "planning",
        priority: 80,
        input: { schemaVersion: 1, type: "planner.daily_check_in" },
      },
    },
    {
      title: "Weekly review",
      schedule_type: "weekly_review",
      cron_expression: "0 18 * * 0",
      dedupe_prefix: "weekly-review",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.weekly_review",
        title: "Create weekly review",
        queue: "planning",
        priority: 90,
        input: { schemaVersion: 1, type: "planner.weekly_review" },
      },
    },
  ];
  for (const schedule of schedules)
    await supabase
      .from("schedules")
      .upsert(
        {
          user_id: userId,
          ...schedule,
          timezone,
          next_run_at: new Cron(schedule.cron_expression, { timezone }).nextRun()?.toISOString() ?? null,
          status: "active",
          created_by: "system",
          updated_by: "system",
        },
        { onConflict: "user_id,dedupe_prefix" },
      );
}
