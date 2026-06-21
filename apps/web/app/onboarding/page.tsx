import { Bot, CalendarDays, Github, Mail, UserRoundCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";

const connectors: Array<[string, string, LucideIcon]> = [
  ["GitHub", "Source and activity context", Github],
  ["Gmail", "Application status signals", Mail],
  ["Google Calendar", "Constraints and events", CalendarDays],
  ["Codex", "Local agent execution", Bot],
];

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        title="Onboarding"
        description="The first workflow captures profile, academic context, goals, source preferences, applications strategy, and connector readiness."
      />
      <div className="grid cols-2">
        <Panel title="Profile Calibration">
          <div className="form-grid">
            <div className="field">
              <label>Current college year</label>
              <select defaultValue="">
                <option value="" disabled>
                  Select year
                </option>
                <option>Freshman</option>
                <option>Sophomore</option>
                <option>Junior</option>
                <option>Senior</option>
              </select>
            </div>
            <div className="field">
              <label>Expected graduation</label>
              <input placeholder="May 2028" />
            </div>
            <div className="field">
              <label>Active focus</label>
              <select defaultValue="recruiting">
                <option value="recruiting">Recruiting sprint</option>
                <option value="build">Build sprint</option>
                <option value="explore">Exploration sprint</option>
              </select>
            </div>
            <div className="field">
              <label>Target role</label>
              <input placeholder="SWE intern, FDE-adjacent engineer" />
            </div>
          </div>
        </Panel>
        <Panel title="Connector Readiness">
          <div className="item-list">
            {connectors.map(([name, copy, Icon]) => {
              return (
                <div className="item" key={name}>
                  <div className="item-title">
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <Icon size={17} />
                      {name}
                    </span>
                    <span className="badge">placeholder</span>
                  </div>
                  <div className="item-meta">{copy}</div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Dynamic Interview">
          <div className="item">
            <div className="item-title">
              <span>
                <UserRoundCog size={17} /> Onboarding agent
              </span>
              <span className="badge green">queued by worker</span>
            </div>
            <p className="muted">
              This surface will enqueue `career-onboarding` jobs. V1 stores the form state first, then the worker turns it into goals, tasks,
              applications strategy, and source monitor proposals.
            </p>
          </div>
        </Panel>
        <Panel title="Job Source Setup">
          <p className="muted">
            Job search is part of onboarding. The system should identify durable GitHub repos, company boards, school event pages, and social
            sources, then create source monitor proposals.
          </p>
        </Panel>
      </div>
    </>
  );
}
