import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ReviewCard } from "@/components/ReviewCard";
import { SignOutButton } from "@/components/SignOutButton";
import { QUARANTINE_MS } from "@/lib/score";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle} — DramaScore` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      reviewCount: true,
      isFoundingMember: true,
      createdAt: true,
    },
  });
  if (!profile) notFound();

  const [reviews, me] = await Promise.all([
    prisma.review.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { series: { select: { id: true, canonicalTitle: true } } },
    }),
    getCurrentUser(),
  ]);

  const isMe = me?.id === profile.id;
  const now = Date.now();
  const memberSince = profile.createdAt.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="pb-8 pt-6">
      <div className="flex items-center justify-between px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        {isMe && <SignOutButton />}
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pt-3 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white"
          style={{ background: "linear-gradient(135deg,#ff4d7d,#6c5ce7)" }}
        >
          {handle.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-1 text-2xl font-black">@{profile.handle}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {profile.isFoundingMember && (
            <span className="rounded-full bg-coin/15 px-3 py-1 text-xs font-bold text-coin">
              🌟 Founding member
            </span>
          )}
          <span className="rounded-full bg-bg-elevated px-3 py-1 text-xs text-ink-soft">
            {profile.reviewCount} review{profile.reviewCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-bg-elevated px-3 py-1 text-xs text-ink-faint">
            since {memberSince}
          </span>
        </div>
      </div>

      <section className="mt-7 px-4">
        <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-lg font-black">Recent reviews</h2>
        {reviews.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-soft">
            {isMe
              ? "You haven't reviewed anything yet. One review unlocks the whole app."
              : "No reviews yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {reviews.map((r) => (
              <div key={r.id}>
                <Link
                  href={`/series/${r.series.id}`}
                  className="mb-1 block text-xs font-semibold text-ink-faint"
                >
                  on {r.series.canonicalTitle} ›
                </Link>
                <ReviewCard
                  review={{
                    id: r.id,
                    stars: r.stars,
                    worthCoins: r.worthCoins,
                    endingVerdict: r.endingVerdict,
                    fallsApartAtEp: r.fallsApartAtEp,
                    oneLiner: r.oneLiner,
                    createdAt: r.createdAt.toISOString(),
                    handle: profile.handle,
                    isFoundingMember: profile.isFoundingMember,
                    quarantined: now - profile.createdAt.getTime() < QUARANTINE_MS,
                  }}
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
