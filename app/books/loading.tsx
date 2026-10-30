import { Skeleton } from "@/components/ui/skeleton";

/**
 * Affiché dès le clic, pendant le rendu serveur de l'étagère : sans lui, la PWA restait
 * figée sur l'écran précédent et donnait l'impression d'avoir planté.
 */
export default function BooksLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="mb-6 h-9 w-56" />
      <Skeleton className="mb-3 h-11 w-full" />
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
            <Skeleton className="mt-1.5 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
