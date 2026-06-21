import {
  BriefcaseBusiness,
  CalendarSearch,
  FileText,
  GitBranch,
  Home,
  Inbox,
  Network,
  Target,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/onboarding", label: "Onboarding", icon: UserRoundCog },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/sources", label: "Sources", icon: CalendarSearch },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: Inbox },
  { href: "/agent-runs", label: "Agent Runs", icon: GitBranch },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Network size={22} />
        <span>Career OS</span>
      </div>
      <nav className="nav" aria-label="Primary navigation">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Icon size={18} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="item-meta">
          <span className="badge green">Supabase-backed</span>
          <span className="badge blue">Codex-ready</span>
        </div>
      </div>
    </aside>
  );
}
