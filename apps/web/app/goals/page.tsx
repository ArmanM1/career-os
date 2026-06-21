import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

const horizons = ["long_term", "1_year", "90_day", "30_day", "week"];
type GoalRow = { id: string; title: string; status?: string; labels?: string[]; horizon?: string; priority?: number };

export default async function GoalsPage() {
  const { goals } = await getDashboardData();
  const goalRows = goals as GoalRow[];

  return (
    <>
      <PageHeader title="Goals" description="Goal hierarchy across long-term, 1-year, 90-day, 30-day, and weekly horizons." />
      <div className="grid cols-2">
        {horizons.map((horizon) => {
          const scoped = goalRows.filter((goal) => goal.horizon === horizon);
          return (
            <Panel key={horizon} title={horizon.replace("_", " ")} count={scoped.length}>
              <div className="item-list">
                {scoped.length ? scoped.map((goal) => <ObjectCard key={goal.id} item={goal} />) : <p className="muted">No goals yet.</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
