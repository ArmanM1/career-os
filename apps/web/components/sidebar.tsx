"use client";

import {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  Compass,
  FileText,
  Goal,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  Network,
  ScanSearch,
  Settings,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth/actions";

const links = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/threads", label: "Threads", icon: MessageSquareText },
  { href: "/opportunities", label: "Opportunities", icon: Compass },
  { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/sources", label: "Sources", icon: ScanSearch },
  { href: "/relationships", label: "Relationships", icon: UsersRound },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/check-ins", label: "Check-ins", icon: BadgeCheck },
  { href: "/approvals", label: "Approvals", icon: CircleUserRound },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1" aria-label="Primary navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Button
            key={href}
            asChild
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "h-9 justify-start gap-3 px-3",
              active && "font-semibold",
            )}
          >
            <Link href={href} onClick={onNavigate}>
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r bg-sidebar md:sticky md:top-0 md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 px-5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Network className="size-4" />
          </span>
          <span>Career OS</span>
        </div>
        <Separator />
        <ScrollArea className="flex-1 p-3">
          <NavLinks />
        </ScrollArea>
        <div className="space-y-3 border-t p-4 text-xs text-muted-foreground">
          <div><p className="font-medium text-foreground">Private first-user system</p><p className="mt-1">Web UI · paired local worker</p></div>
          <form action={signOut}><Button type="submit" variant="ghost" size="sm" className="w-full justify-start"><LogOut />Sign out</Button></form>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Network className="size-5" />
          Career OS
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-4">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>Career OS</SheetTitle>
            </SheetHeader>
            <NavLinks />
            <form action={signOut} className="mt-4 border-t pt-4"><Button type="submit" variant="ghost" className="w-full justify-start"><LogOut />Sign out</Button></form>
          </SheetContent>
        </Sheet>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        {links.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted-foreground"
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
