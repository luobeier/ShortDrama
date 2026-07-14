import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export interface CurrentUser {
  id: string;
  email: string;
  handle: string | null;
  isFoundingMember: boolean;
  reviewCount: number;
  isAdmin: boolean;
  /** Give-to-get: everything unlocks after the first review. */
  hasUnlocked: boolean;
}

/** Current user for server components, or null when logged out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  // Read review_count fresh so the unlock gate is always accurate.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      handle: true,
      isFoundingMember: true,
      reviewCount: true,
    },
  });
  if (!dbUser) return null;
  return {
    id: dbUser.id,
    email: dbUser.email,
    handle: dbUser.handle,
    isFoundingMember: dbUser.isFoundingMember,
    reviewCount: dbUser.reviewCount,
    isAdmin: session.user.isAdmin,
    hasUnlocked: dbUser.reviewCount > 0,
  };
}

/** Throws-free auth guard returning just the id, for API routes. */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** True when admin is configured (ADMIN_EMAILS set) and the user qualifies. */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.isAdmin);
}

export function adminEnabled(): boolean {
  return (process.env.ADMIN_EMAILS ?? "").trim().length > 0;
}
