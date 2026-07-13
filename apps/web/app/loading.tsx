import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="mx-auto w-full max-w-7xl space-y-6"><div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-5 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-80" /></div>;
}
