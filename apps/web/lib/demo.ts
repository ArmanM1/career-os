import { demoApplications, demoGoals, demoSourceMonitors, demoTasks } from "@career-os/core";

export const demoApprovals = [
  {
    id: "88888888-8888-4888-8888-888888888888",
    title: "Enable authenticated application portal status checks",
    status: "pending",
    action_type: "browser_control.run_authenticated",
    risk_level: "medium",
    rationale: "Some portals do not provide email status updates.",
    labels: ["status check", "approval"],
  },
];

export const demoResumes = [
  {
    id: "99999999-9999-4999-8999-999999999999",
    title: "Base SWE Resume",
    status: "draft",
    labels: ["latex", "swe"],
    latex_path: "resumes/bases/arman-base-swe.tex",
    pdf_path: null,
  },
];

export const demoAgentRuns = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Onboarding profile setup",
    status: "queued",
    agent_id: "career-onboarding",
    created_at: new Date().toISOString(),
  },
];

export const demoSourceCandidates = [
  {
    id: "abababab-abab-4bab-8bab-abababababab",
    title: "Summer 2027 internships GitHub list",
    status: "active",
    labels: ["github", "demo"],
    source_type: "github_repo",
    url: "https://github.com/example/internships",
    recommendation: "propose",
    rationale: "Likely durable because it is a structured public internship list with application links.",
    target_season: "summer_2027",
  },
];

export const demoSourceDiscoveryRuns = [
  {
    id: "bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc",
    title: "Manual source discovery",
    status: "success",
    mode: "manual",
    query: "Find Summer 2027 SWE internship sources.",
    browser_use_allowed: true,
    computer_use_allowed: true,
    target_season: "summer_2027",
    source_candidates_found: 1,
    source_monitors_created: 0,
    parser_jobs_queued: 0,
  },
];

export const demoSignals = [
  {
    id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
    title: "Example SWE Internship signal",
    status: "queued_for_ranking",
    labels: ["github", "job app"],
    signal_type: "internship_post",
    source_type: "github_repo",
    canonical_url: "https://example.com/careers/swe-intern",
    rationale: "Parsed from a configured GitHub source monitor.",
  },
];

export const demoOpportunityRecommendations = [
  {
    id: "dededede-dede-4ede-8ede-dededededede",
    title: "Example SWE Internship recommendation",
    status: "active",
    labels: ["job app", "demo"],
    recommendation: "needs_review",
    rationale: "The ranking agent will turn raw signals into planner-ready recommendations.",
  },
];

export const demoData = {
  goals: demoGoals,
  tasks: demoTasks,
  applications: demoApplications,
  sourceMonitors: demoSourceMonitors,
  approvals: demoApprovals,
  resumes: demoResumes,
  agentRuns: demoAgentRuns,
  sourceCandidates: demoSourceCandidates,
  sourceDiscoveryRuns: demoSourceDiscoveryRuns,
  signals: demoSignals,
  opportunityRecommendations: demoOpportunityRecommendations,
};
