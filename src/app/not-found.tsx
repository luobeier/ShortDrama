import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl">🫥</span>
      <h1 className="text-2xl font-black">Nothing here</h1>
      <p className="text-sm text-ink-soft">
        This page abandoned us at ep 1. Let&apos;s get you back.
      </p>
      <Link href="/" className="btn-primary mt-2">
        Back home
      </Link>
    </main>
  );
}
