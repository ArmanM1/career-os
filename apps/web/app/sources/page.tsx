import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

type SourceRow = { id: string; title: string; status?: string; labels?: string[]; priority?: number; url?: string };

export default async function SourcesPage() {
  const { sourceMonitors } = await getDashboardData();
  const rows = sourceMonitors as SourceRow[];

  return (
    <>
      <PageHeader
        title="Sources"
        description="Durable job, event, and application-status sources should become deterministic monitors when possible."
      />
      <Panel title="Source Monitors" count={rows.length}>
        <div className="item-list">
          {rows.map((source) => (
            <ObjectCard
              key={source.id}
              item={source}
              footer={<div className="item-meta">{source.url ? <span>{source.url}</span> : null}</div>}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
