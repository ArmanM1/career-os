import { AlertTriangle, CodeXml, Plus, Radar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/supabase/server";
import {
  addKnownGitHubSource,
  queueSourceDiscovery,
  updateSourceMonitorStatus,
} from "./actions";

export const dynamic = "force-dynamic";
const sections = [
  { key: "active", label: "Active", statuses: ["active"] },
  {
    key: "proposed",
    label: "Proposed",
    statuses: ["proposed", "pending_review"],
  },
  {
    key: "attention",
    label: "Needs attention",
    statuses: ["broken", "auth_required", "stale"],
  },
  {
    key: "paused",
    label: "Paused / low yield",
    statuses: ["paused", "low_yield"],
  },
] as const;

export default async function SourcesPage() {
  const { supabase, user } = await requireUser();
  const [{ data: monitors }, { data: candidates }, { data: discoveryRuns }] =
    await Promise.all([
      supabase
        .from("source_monitors")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("source_candidates")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("source_discovery_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-primary">
          Discovery & monitoring
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Public feeds auto-activate only after validation. Newly discovered
          authenticated sources require one-time enablement and then run
          read-only.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Find durable sources
            </CardTitle>
            <CardDescription>
              Search GitHub, target companies, school resources, newsletters,
              and configured social accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={queueSourceDiscovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">Discovery goal</Label>
                <Textarea
                  id="query"
                  name="query"
                  defaultValue="Find durable recruiting sources for my active goals and current career season."
                  rows={4}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetSeason">Target season</Label>
                  <Input
                    id="targetSeason"
                    name="targetSeason"
                    placeholder="summer_2027"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRoles">Target roles</Label>
                  <Input
                    id="targetRoles"
                    name="targetRoles"
                    placeholder="swe_intern, fde"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHints">Accounts or hints</Label>
                <Input
                  id="accountHints"
                  name="accountHints"
                  placeholder="zero2sudo, school career center"
                />
              </div>
              {["github_repo", "company_careers_page", "greenhouse_board", "lever_board", "ashby_board", "social_account", "community_page"].map((sourceType) => <input key={sourceType} type="hidden" name="sourceTypes" value={sourceType} />)}
              <div className="flex items-center gap-2">
                <Checkbox id="browserUseAllowed" name="browserUseAllowed" />
                <Label htmlFor="browserUseAllowed">
                  Allow the dedicated browser profile for this discovery run
                </Label>
              </div>
              <input type="hidden" name="maxDurationMinutes" value="30" />
              <Button>
                <Radar />
                Run discovery
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CodeXml className="size-5" />
              Add known GitHub source
            </CardTitle>
            <CardDescription>
              Create a proposed deterministic monitor from a repository you
              already trust.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addKnownGitHubSource} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-title">Title</Label>
                <Input
                  id="github-title"
                  name="title"
                  placeholder="Summer internships list"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-url">Repository URL</Label>
                <Input
                  id="github-url"
                  name="url"
                  type="url"
                  placeholder="https://github.com/org/repo"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github-season">Target season</Label>
                  <Input
                    id="github-season"
                    name="targetSeason"
                    placeholder="summer_2027"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-schedule">Cadence</Label>
                  <select
                    id="github-schedule"
                    name="schedule"
                    defaultValue="every_6_hours"
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="every_6_hours">Every 6 hours</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <input
                type="hidden"
                name="rationale"
                value="User-provided GitHub source for validated deterministic parsing."
              />
              <Button variant="outline">
                <Plus />
                Add proposed source
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {sections.map((section) => {
        const scoped = (monitors ?? []).filter((monitor) =>
          section.statuses.includes(monitor.status as never),
        );
        return (
          <section key={section.key}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{section.label}</h2>
              <Badge variant="outline">{scoped.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scoped.map((source) => (
                <Card key={source.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">
                        {source.title}
                      </CardTitle>
                      {["broken", "auth_required", "stale"].includes(
                        source.status,
                      ) ? (
                        <AlertTriangle className="size-5 text-destructive" />
                      ) : (
                        <Badge variant="outline">
                          {source.status.replaceAll("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {source.source_type.replaceAll("_", " ")} ·{" "}
                      {source.schedule}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {source.last_error ||
                        source.source_rationale ||
                        source.url}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {source.status !== "active" ? (
                        <form action={updateSourceMonitorStatus}>
                          <input type="hidden" name="id" value={source.id} />
                          <input type="hidden" name="status" value="active" />
                          <Button size="sm" variant="outline">
                            Activate
                          </Button>
                        </form>
                      ) : null}
                      {source.status !== "paused" ? (
                        <form action={updateSourceMonitorStatus}>
                          <input type="hidden" name="id" value={source.id} />
                          <input type="hidden" name="status" value="paused" />
                          <Button size="sm" variant="ghost">
                            Pause
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {scoped.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No sources in this section.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </section>
        );
      })}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Discovery proposals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {candidates?.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{candidate.title}</CardTitle>
                  <Badge variant="outline">{candidate.recommendation}</Badge>
                </div>
                <CardDescription>
                  {candidate.source_type?.replaceAll("_", " ")} ·{" "}
                  {candidate.target_season || "current season"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{candidate.rationale}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {candidate.url}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {discoveryRuns?.length ?? 0} recent discovery run(s) retained with
          evidence and counts.
        </p>
      </section>
    </div>
  );
}
