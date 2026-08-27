export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-sm)] bg-stone-100 ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
