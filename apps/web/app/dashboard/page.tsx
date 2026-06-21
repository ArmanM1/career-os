import { CheckCircle2, Plus } from "lucide-react";
import { ObjectCard } from "@/components/object-card";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

type DashboardRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  priority?: number;
  due_at?: string;
  dueAt?: string;
  urgency?: string;
  task_type?: string;
  taskType?: string;
  agent_id?: string;
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const tasks = data.tasks as DashboardRow[];
  const approvals = data.approvals as DashboardRow[];

  const today = tasks.filter((task) => task.status !== "done").slice(0, 4);
  const timeSensitive = tasks.filter((task) => task.urgency === "time_sensitive" || task.urgency === "high");
  const jobApps = tasks.filter((task) => task.task_type === "job_app" || task.taskType === "job_app" || task.labels?.includes("job app"));
  const resume = tasks.filter((task) => task.task_type === "resume" || task.taskType === "resume");

  return (
    <>
      <PageHeader
        title="Action Dashboard"
        description="Tasks are grouped by what you should act on, not by agent output. Supabase data appears here when env keys are configured."
      >
        <button className="button primary" type="button">
          <Plus size={16} />
          New task
        </button>
      </PageHeader>

      <div className="grid cols-3">
        <Panel title="Needs Approval" count={approvals.length}>
          <div className="item-list">
            {approvals.map((approval) => (
              <ObjectCard key={approval.id} item={approval} />
            ))}
          </div>
        </Panel>
        <Panel title="Do Today" count={today.length}>
          <div className="item-list">
            {today.map((task) => (
              <ObjectCard key={task.id} item={task} />
            ))}
          </div>
        </Panel>
        <Panel title="Time Sensitive" count={timeSensitive.length}>
          <div className="item-list">
            {timeSensitive.map((task) => (
              <ObjectCard key={task.id} item={task} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Job Apps" count={jobApps.length}>
          <div className="item-list">
            {jobApps.map((task) => (
              <ObjectCard key={task.id} item={task} />
            ))}
          </div>
        </Panel>
        <Panel title="Resume / Materials" count={resume.length}>
          <div className="item-list">
            {resume.map((task) => (
              <ObjectCard key={task.id} item={task} />
            ))}
          </div>
        </Panel>
        <Panel title="Mentors & Follow-Ups" count={0}>
          <p className="muted">Mentor records will appear after onboarding imports contacts.</p>
        </Panel>
        <Panel title="Events" count={0}>
          <p className="muted">Calendar and event monitor signals will land here.</p>
        </Panel>
        <Panel title="Projects & Skills" count={0}>
          <p className="muted">Project and skill-building tasks will be generated from goals.</p>
        </Panel>
        <Panel title="Waiting On" count={0}>
          <p className="muted">Applications, contacts, and approvals waiting on external state.</p>
        </Panel>
        <Panel title="Recently Changed" count={data.agentRuns.length}>
          <div className="item-list">
            {(data.agentRuns as DashboardRow[]).map((run) => (
              <ObjectCard
                key={run.id}
                item={{ id: run.id, title: run.title ?? run.agent_id ?? "Agent run", status: run.status, labels: run.agent_id ? [run.agent_id] : [] }}
                footer={
                  <span className="item-meta">
                    <CheckCircle2 size={14} /> Agent state tracked in Supabase
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
