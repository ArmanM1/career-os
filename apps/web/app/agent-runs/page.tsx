import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";
import { queueBrowserViabilityCheck } from "./actions";

export const dynamic = "force-dynamic";

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
      <div className="grid cols-2">
        <Panel title="Browser Viability Check">
          <form action={queueBrowserViabilityCheck} className="stack">
            <div className="field">
              <label htmlFor="browser-url">URL</label>
              <input id="browser-url" name="url" defaultValue="https://example.com" />
            </div>
            <div className="field">
              <label htmlFor="browser-task">Read-only task</label>
              <textarea
                id="browser-task"
                name="task"
                rows={4}
                defaultValue="Open the page, inspect the visible title or heading, take a screenshot, and report what you verified."
              />
            </div>
            <button className="button primary" type="submit">
              Queue browser check
            </button>
          </form>
        </Panel>

        <Panel title="Runs" count={rows.length}>
          <div className="item-list">
            {rows.map((run) => (
              <ObjectCard key={run.id} item={{ id: run.id, title: run.title ?? run.agent_id ?? "Agent run", status: run.status, labels: run.agent_id ? [run.agent_id] : [] }} />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
