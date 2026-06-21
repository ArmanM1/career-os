import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";
import { addKnownGitHubSource, queueSourceDiscovery, updateSourceMonitorStatus } from "./actions";

export const dynamic = "force-dynamic";

type SourceRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  priority?: number;
  url?: string;
  source_type?: string;
  fetch_strategy?: string;
  schedule?: string;
  source_rationale?: string;
};

type CandidateRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  url?: string;
  recommendation?: string;
  rationale?: string;
  source_type?: string;
  target_season?: string;
};

type DiscoveryRunRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  mode?: string;
  query?: string;
  target_season?: string;
  source_candidates_found?: number;
};

type SignalRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  signal_type?: string;
  canonical_url?: string;
  rationale?: string;
};

export default async function SourcesPage() {
  const { sourceMonitors, sourceCandidates, sourceDiscoveryRuns, signals } = await getDashboardData();
  const rows = sourceMonitors as SourceRow[];
  const candidates = sourceCandidates as CandidateRow[];
  const discoveryRuns = sourceDiscoveryRuns as DiscoveryRunRow[];
  const signalRows = signals as SignalRow[];

  return (
    <>
      <PageHeader
        title="Sources"
        description="Durable job, event, and application-status sources should become deterministic monitors when possible."
      />
      <div className="grid cols-2">
        <Panel title="Run Source Discovery">
          <form action={queueSourceDiscovery} className="stack">
            <div className="field">
              <label htmlFor="query">Search goal</label>
              <textarea
                id="query"
                name="query"
                rows={4}
                defaultValue="Find durable Summer 2027 SWE internship sources. Start with GitHub for testing, and include useful X or Instagram accounts if browser use is enabled."
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="targetSeason">Target season</label>
                <input id="targetSeason" name="targetSeason" defaultValue="summer_2027" />
              </div>
              <div className="field">
                <label htmlFor="targetRoles">Target roles</label>
                <input id="targetRoles" name="targetRoles" defaultValue="swe_intern, founder_facing_engineer" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="accountHints">Accounts or source hints</label>
              <textarea id="accountHints" name="accountHints" rows={3} defaultValue="zero2sudo" />
            </div>
            <div className="check-grid">
              {[
                ["github_repo", "GitHub"],
                ["company_careers_page", "Company boards"],
                ["greenhouse_board", "Greenhouse"],
                ["lever_board", "Lever"],
                ["ashby_board", "Ashby"],
                ["social_account", "X / Instagram"],
                ["community_page", "Communities"],
              ].map(([value, label]) => (
                <label className="check-row" key={value}>
                  <input name="sourceTypes" type="checkbox" value={value} defaultChecked={value !== "social_account"} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="form-grid">
              <label className="check-row boxed">
                <input name="browserUseAllowed" type="checkbox" />
                <span>Browser/computer use</span>
              </label>
              <div className="field">
                <label htmlFor="maxDurationMinutes">Max minutes</label>
                <input id="maxDurationMinutes" name="maxDurationMinutes" type="number" min="5" max="120" defaultValue="30" />
              </div>
            </div>
            <button className="button primary" type="submit">
              Run source discovery
            </button>
          </form>
        </Panel>

        <Panel title="Add GitHub Source">
          <form action={addKnownGitHubSource} className="stack">
            <div className="field">
              <label htmlFor="github-title">Title</label>
              <input id="github-title" name="title" defaultValue="Summer 2027 internships repo" />
            </div>
            <div className="field">
              <label htmlFor="github-url">GitHub repo URL</label>
              <input id="github-url" name="url" placeholder="https://github.com/org/repo" />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="github-season">Target season</label>
                <input id="github-season" name="targetSeason" defaultValue="summer_2027" />
              </div>
              <div className="field">
                <label htmlFor="github-schedule">Schedule</label>
                <select id="github-schedule" name="schedule" defaultValue="daily">
                  <option value="daily">Daily</option>
                  <option value="every_6_hours">Every 6 hours</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="github-rationale">Rationale</label>
              <textarea
                id="github-rationale"
                name="rationale"
                rows={3}
                defaultValue="User-provided GitHub source for deterministic parsing once activated."
              />
            </div>
            <button className="button" type="submit">
              Add proposed source
            </button>
          </form>
        </Panel>
      </div>

      <div className="grid cols-2 page-section">
        <Panel title="Source Monitors" count={rows.length}>
          <div className="item-list">
            {rows.map((source) => (
              <ObjectCard
                key={source.id}
                item={source}
                footer={
                  <div className="stack compact">
                    <div className="item-meta">
                      {source.source_type ? <span>{source.source_type}</span> : null}
                      {source.fetch_strategy ? <span>{source.fetch_strategy}</span> : null}
                      {source.schedule ? <span>{source.schedule}</span> : null}
                      {source.url ? <span>{source.url}</span> : null}
                    </div>
                    {source.source_rationale ? <p className="card-copy">{source.source_rationale}</p> : null}
                    <div className="toolbar">
                      {source.status !== "active" ? (
                        <form action={updateSourceMonitorStatus}>
                          <input name="id" type="hidden" value={source.id} />
                          <input name="status" type="hidden" value="active" />
                          <button className="button" type="submit">
                            Activate
                          </button>
                        </form>
                      ) : null}
                      {source.status !== "paused" ? (
                        <form action={updateSourceMonitorStatus}>
                          <input name="id" type="hidden" value={source.id} />
                          <input name="status" type="hidden" value="paused" />
                          <button className="button" type="submit">
                            Pause
                          </button>
                        </form>
                      ) : null}
                      {source.status !== "archived" ? (
                        <form action={updateSourceMonitorStatus}>
                          <input name="id" type="hidden" value={source.id} />
                          <input name="status" type="hidden" value="archived" />
                          <button className="button" type="submit">
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </Panel>

        <Panel title="Source Candidates" count={candidates.length}>
          <div className="item-list">
            {candidates.map((candidate) => (
              <ObjectCard
                key={candidate.id}
                item={candidate}
                footer={
                  <div className="stack compact">
                    <div className="item-meta">
                      {candidate.recommendation ? <span>{candidate.recommendation}</span> : null}
                      {candidate.source_type ? <span>{candidate.source_type}</span> : null}
                      {candidate.target_season ? <span>{candidate.target_season}</span> : null}
                      {candidate.url ? <span>{candidate.url}</span> : null}
                    </div>
                    {candidate.rationale ? <p className="card-copy">{candidate.rationale}</p> : null}
                  </div>
                }
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid cols-2 page-section">
        <Panel title="Discovery Runs" count={discoveryRuns.length}>
          <div className="item-list">
            {discoveryRuns.map((run) => (
              <ObjectCard
                key={run.id}
                item={run}
                footer={
                  <div className="item-meta">
                    {run.mode ? <span>{run.mode}</span> : null}
                    {run.target_season ? <span>{run.target_season}</span> : null}
                    {typeof run.source_candidates_found === "number" ? <span>{run.source_candidates_found} candidates</span> : null}
                    {run.query ? <span>{run.query}</span> : null}
                  </div>
                }
              />
            ))}
          </div>
        </Panel>

        <Panel title="Raw Signals" count={signalRows.length}>
          <div className="item-list">
            {signalRows.map((signal) => (
              <ObjectCard
                key={signal.id}
                item={signal}
                footer={
                  <div className="stack compact">
                    <div className="item-meta">
                      {signal.signal_type ? <span>{signal.signal_type}</span> : null}
                      {signal.canonical_url ? <span>{signal.canonical_url}</span> : null}
                    </div>
                    {signal.rationale ? <p className="card-copy">{signal.rationale}</p> : null}
                  </div>
                }
              />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
