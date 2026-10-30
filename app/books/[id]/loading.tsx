import { Skeleton } from "@/components/ui/skeleton";

export default function BookLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex gap-5">
        <Skeleton className="aspect-[2/3] w-32 shrink-0 sm:w-40" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
      <Skeleton className="mt-8 h-32 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </main>
  );
}
