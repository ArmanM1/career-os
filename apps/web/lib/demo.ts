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

export const demoData = {
  goals: demoGoals,
  tasks: demoTasks,
  applications: demoApplications,
  sourceMonitors: demoSourceMonitors,
  approvals: demoApprovals,
  resumes: demoResumes,
  agentRuns: demoAgentRuns,
};

