export type AgentId =
  | "career-advisor"
  | "career-onboarding"
  | "career-job-sourcing"
  | "career-job-finder"
  | "career-opportunity-ranking"
  | "career-weekly-planner"
  | "career-resume-tailor"
  | "career-source-adapter-builder"
  | "career-event-scanner"
  | "career-mentor-manager";

export type AgentDefinition = {
  id: AgentId;
  displayName: string;
  skillPath: string;
  threadPolicy: "global" | "per_week" | "per_source" | "per_application" | "per_contact" | "per_event" | "per_resume";
  defaultQueue: string;
  description: string;
};

export const agentDefinitions: AgentDefinition[] = [
  {
    id: "career-advisor",
    displayName: "Advisor",
    skillPath: ".agents/skills/career-advisor/SKILL.md",
    threadPolicy: "global",
    defaultQueue: "advisor",
    description: "Main chat router and explainer.",
  },
  {
    id: "career-onboarding",
    displayName: "Onboarding",
    skillPath: ".agents/skills/career-onboarding/SKILL.md",
    threadPolicy: "global",
    defaultQueue: "onboarding",
    description: "Builds profile, academic context, goals, source setup, and application strategy.",
  },
  {
    id: "career-job-sourcing",
    displayName: "Job Sourcing",
    skillPath: ".agents/skills/career-job-sourcing/SKILL.md",
    threadPolicy: "per_source",
    defaultQueue: "sources",
    description: "Finds and maintains durable opportunity sources and source monitor proposals.",
  },
  {
    id: "career-job-finder",
    displayName: "Job Finder",
    skillPath: ".agents/skills/career-job-finder/SKILL.md",
    threadPolicy: "per_source",
    defaultQueue: "job-search",
    description: "Compatibility agent for job search flows that combine sourcing and opportunity creation.",
  },
  {
    id: "career-opportunity-ranking",
    displayName: "Opportunity Ranking",
    skillPath: ".agents/skills/career-opportunity-ranking/SKILL.md",
    threadPolicy: "global",
    defaultQueue: "opportunities",
    description: "Dedupe and rank opportunity signals, then produce rich recommendations, planner hints, applications, and tasks.",
  },
  {
    id: "career-weekly-planner",
    displayName: "Weekly Planner",
    skillPath: ".agents/skills/career-weekly-planner/SKILL.md",
    threadPolicy: "per_week",
    defaultQueue: "planning",
    description: "Reprioritizes tasks from goals, applications, events, check-ins, and signals.",
  },
  {
    id: "career-resume-tailor",
    displayName: "Resume Tailor",
    skillPath: ".agents/skills/career-resume-tailor/SKILL.md",
    threadPolicy: "per_resume",
    defaultQueue: "resume",
    description: "Creates resume variant proposals and metadata.",
  },
  {
    id: "career-source-adapter-builder",
    displayName: "Source Adapter Builder",
    skillPath: ".agents/skills/career-source-adapter-builder/SKILL.md",
    threadPolicy: "per_source",
    defaultQueue: "sources",
    description: "Builds deterministic monitor scripts.",
  },
  {
    id: "career-event-scanner",
    displayName: "Event Scanner",
    skillPath: ".agents/skills/career-event-scanner/SKILL.md",
    threadPolicy: "per_event",
    defaultQueue: "events",
    description: "Finds events tied to goals, applications, and companies.",
  },
  {
    id: "career-mentor-manager",
    displayName: "Mentor Manager",
    skillPath: ".agents/skills/career-mentor-manager/SKILL.md",
    threadPolicy: "per_contact",
    defaultQueue: "mentors",
    description: "Tracks contacts and follow-ups.",
  },
];

export function getAgentDefinition(id: string) {
  return agentDefinitions.find((agent) => agent.id === id);
}
