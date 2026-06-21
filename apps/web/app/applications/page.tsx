import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

const statuses = ["found", "interested", "drafting", "ready_to_submit", "submitted", "oa", "interview", "rejected", "ghosted", "offer", "withdrawn"];
type ApplicationRow = { id: string; title: string; status?: string; labels?: string[]; priority?: number; due_at?: string };

export default async function ApplicationsPage() {
  const { applications } = await getDashboardData();
  const rows = applications as ApplicationRow[];

  return (
    <>
      <PageHeader
        title="Applications"
        description="Pipeline state is canonical. Email, calendar, portal, and manual checks should update this with evidence."
      />
      <div className="pipeline">
        {statuses.map((status) => {
          const scoped = rows.filter((row) => row.status === status);
          return (
            <section className="panel column" key={status}>
              <div className="panel-header">
                <h2 className="panel-title">{status}</h2>
                <span className="badge">{scoped.length}</span>
              </div>
              <div className="item-list">
                {scoped.length ? scoped.map((application) => <ObjectCard key={application.id} item={application} />) : <p className="muted">Empty</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
