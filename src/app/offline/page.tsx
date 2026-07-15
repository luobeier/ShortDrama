"use client";

// Precached by the service worker and served as the fallback when a
// navigation fails offline. A plain reload button — a <Link> can't navigate
// while offline.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl">📵</span>
      <h1 className="text-2xl font-black">You&apos;re offline</h1>
      <p className="text-sm text-ink-soft">
        The coins can wait — reconnect to keep binging.
      </p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-2">
        Try again
      </button>
    </main>
  );
}
