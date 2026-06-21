import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

type AgentRunRow = { id: string; title?: string; status?: string; labels?: string[]; agent_id?: string };

export default async function AgentRunsPage() {
  const { agentRuns } = await getDashboardData();
  const rows = agentRuns as AgentRunRow[];

  return (
    <>
      <PageHeader
        title="Agent Runs"
        description="Codex threads and turns are execution logs. Career state remains in Supabase objects."
      />
      <Panel title="Runs" count={rows.length}>
        <div className="item-list">
          {rows.map((run) => (
            <ObjectCard key={run.id} item={{ id: run.id, title: run.title ?? run.agent_id ?? "Agent run", status: run.status, labels: run.agent_id ? [run.agent_id] : [] }} />
          ))}
        </div>
      </Panel>
    </>
  );
}
