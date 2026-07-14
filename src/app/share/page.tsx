import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDiary } from "@/lib/diary";
import { ShareClient } from "@/components/ShareClient";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/share");
  if (!user.handle) redirect("/onboarding");

  const { stats } = await getDiary(user.id);

  if (stats.totalLogged === 0) {
    return (
      <main className="min-h-dvh pt-16">
        <EmptyState
          emoji="🎁"
          title="Nothing to wrap yet"
          body="Log a few dramas first, then come back for your shareable Wrapped card."
          ctaLabel="Start logging"
          ctaHref="/"
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-black px-4 pb-10 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/diary" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <h1 className="text-lg font-black">Your Wrapped</h1>
        <span className="w-6" />
      </div>
      <ShareClient handle={user.handle} />
    </main>
  );
}
