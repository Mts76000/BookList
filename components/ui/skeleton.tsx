export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-md ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
