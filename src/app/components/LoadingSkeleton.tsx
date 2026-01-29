export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-20 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-20 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
