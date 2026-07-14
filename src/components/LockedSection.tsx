import Link from "next/link";

/**
 * Give-to-get gate. When `locked`, children are blurred and non-interactive,
 * with a clear CTA overlay. After a user's first review, everything unlocks
 * permanently and this just renders children.
 */
export function LockedSection({
  locked,
  isLoggedIn,
  children,
  onUnlockHref = "#log",
}: {
  locked: boolean;
  isLoggedIn: boolean;
  children: React.ReactNode;
  onUnlockHref?: string;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="locked-veil" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/40 px-6 text-center backdrop-blur-[2px]">
        <span className="text-3xl">🔒</span>
        <p className="text-sm font-bold text-ink">
          Review any drama you&apos;ve watched to unlock everything
        </p>
        <p className="max-w-xs text-xs text-ink-soft">
          Ending verdicts, where it falls apart, one-liners, the full breakdown.
          Give one review, get all of it — forever.
        </p>
        {isLoggedIn ? (
          <a href={onUnlockHref} className="btn-coin mt-1 px-4 py-2 text-sm">
            Log &amp; review this one
          </a>
        ) : (
          <Link href="/signin" className="btn-coin mt-1 px-4 py-2 text-sm">
            Sign in to start
          </Link>
        )}
      </div>
    </div>
  );
}
