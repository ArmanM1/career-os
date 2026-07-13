"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

const publicPrefixes = ["/login", "/auth/"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) return children;
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-6 md:px-8 md:pb-10 md:pt-8">{children}</main>
    </div>
  );
}
