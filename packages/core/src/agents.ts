export const agentIds = [
  "career-advisor",
  "career-onboarding",
  "career-state-curator",
  "career-positioning",
  "career-source-discovery",
  "career-source-adapter-builder",
  "career-opportunity-intelligence",
  "career-application-manager",
  "career-resume-tailor",
  "career-relationship-manager",
  "career-event-scanner",
  "career-daily-weekly-planner",
  "career-project-spec",
] as const;

export type AgentId = (typeof agentIds)[number];
export type ThreadPolicy = "global" | "per_week" | "per_source" | "per_application" | "per_contact" | "per_event" | "per_resume";
export type AgentDefinition = { id: AgentId; displayName: string; skillPath: string; threadPolicy: ThreadPolicy; defaultQueue: string; description: string };

export const agentDefinitions: AgentDefinition[] = [
  { id: "career-advisor", displayName: "Career Advisor", skillPath: "career-os-agents/skills/career-advisor/SKILL.md", threadPolicy: "global", defaultQueue: "advisor", description: "Conversational interface, explanations, and routing." },
  { id: "career-onboarding", displayName: "Onboarding", skillPath: "career-os-agents/skills/career-onboarding/SKILL.md", threadPolicy: "global", defaultQueue: "onboarding", description: "Dynamic onboarding and profile construction." },
  { id: "career-state-curator", displayName: "State Curator", skillPath: "career-os-agents/skills/career-state-curator/SKILL.md", threadPolicy: "global", defaultQueue: "state", description: "Extracts and maintains living career state with expiry and undo." },
  { id: "career-positioning", displayName: "Career Positioning", skillPath: "career-os-agents/skills/career-positioning/SKILL.md", threadPolicy: "global", defaultQueue: "planning", description: "Goals, career seasons, exploration, and strategic direction." },
  { id: "career-source-discovery", displayName: "Source Discovery", skillPath: "career-os-agents/skills/career-source-discovery/SKILL.md", threadPolicy: "per_source", defaultQueue: "sources", description: "Finds and evaluates durable career sources." },
  { id: "career-source-adapter-builder", displayName: "Source Adapter Builder", skillPath: "career-os-agents/skills/career-source-adapter-builder/SKILL.md", threadPolicy: "per_source", defaultQueue: "sources", description: "Creates declarative source adapters and repair proposals." },
  { id: "career-opportunity-intelligence", displayName: "Opportunity Intelligence", skillPath: "career-os-agents/skills/career-opportunity-intelligence/SKILL.md", threadPolicy: "global", defaultQueue: "opportunities", description: "Normalizes, deduplicates, enriches, ranks, and explains opportunities." },
  { id: "career-application-manager", displayName: "Application Manager", skillPath: "career-os-agents/skills/career-application-manager/SKILL.md", threadPolicy: "per_application", defaultQueue: "applications", description: "Application packets, requirements, form preparation, and status workflows." },
  { id: "career-resume-tailor", displayName: "Resume Tailor", skillPath: "career-os-agents/skills/career-resume-tailor/SKILL.md", threadPolicy: "per_resume", defaultQueue: "resume", description: "Verified experience selection, LaTeX variants, compilation, and diffs." },
  { id: "career-relationship-manager", displayName: "Relationship Manager", skillPath: "career-os-agents/skills/career-relationship-manager/SKILL.md", threadPolicy: "per_contact", defaultQueue: "relationships", description: "Mentors, contacts, interactions, referral paths, and drafts." },
  { id: "career-event-scanner", displayName: "Event Scanner", skillPath: "career-os-agents/skills/career-event-scanner/SKILL.md", threadPolicy: "per_event", defaultQueue: "events", description: "Relevant events, attendance context, and follow-ups." },
  { id: "career-daily-weekly-planner", displayName: "Daily & Weekly Planner", skillPath: "career-os-agents/skills/career-daily-weekly-planner/SKILL.md", threadPolicy: "per_week", defaultQueue: "planning", description: "Morning briefs, daily replanning, and weekly plans." },
  { id: "career-project-spec", displayName: "Project Specification", skillPath: "career-os-agents/skills/career-project-spec/SKILL.md", threadPolicy: "per_application", defaultQueue: "projects", description: "Detailed project specifications tied to opportunity gaps." },
];

const legacyAliases: Record<string, AgentId> = {
  "career-job-sourcing": "career-source-discovery",
  "career-job-finder": "career-application-manager",
  "career-opportunity-ranking": "career-opportunity-intelligence",
  "career-weekly-planner": "career-daily-weekly-planner",
  "career-mentor-manager": "career-relationship-manager",
};

export function normalizeAgentId(id: string): AgentId | undefined {
  return agentIds.find((candidate) => candidate === id) ?? legacyAliases[id];
}

export function getAgentDefinition(id: string) {
  const normalized = normalizeAgentId(id);
  return normalized ? agentDefinitions.find((agent) => agent.id === normalized) : undefined;
}
