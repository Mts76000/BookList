import { Skeleton } from "@/components/ui/skeleton";

/** Voir app/books/loading.tsx : un retour immédiat au clic, surtout en PWA. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="mt-6 h-48 w-full" />
      <Skeleton className="mt-4 h-48 w-full" />
    </main>
  );
}
