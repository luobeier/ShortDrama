import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

// Number of earliest accounts that get the "founding member" badge.
const FOUNDING_MEMBER_CAP = 500;

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Find-or-create a user by email. New accounts start with no handle (the app
 * routes them through /onboarding to pick one) and are flagged as founding
 * members while we're under the cap.
 */
export async function upsertUserByEmail(
  email: string,
  image?: string | null
): Promise<{ id: string; handle: string | null }> {
  const normalized = email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) {
    if (image && !existing.image) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { image },
      });
    }
    return { id: existing.id, handle: existing.handle };
  }
  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      email: normalized,
      image: image ?? null,
      isFoundingMember: count < FOUNDING_MEMBER_CAP,
    },
  });
  return { id: user.id, handle: user.handle };
}

function buildProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  // Passwordless dev login: enter an email and you're in. Stands in for the
  // real magic-link flow so the app is fully usable without SMTP/OAuth.
  // Disable in production by setting ENABLE_DEV_LOGIN=false.
  if (process.env.ENABLE_DEV_LOGIN !== "false") {
    providers.push(
      CredentialsProvider({
        id: "dev",
        name: "Email (magic link)",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const email = credentials?.email?.trim().toLowerCase();
          if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
          const user = await upsertUserByEmail(email);
          return { id: user.id, email, name: user.handle ?? undefined };
        },
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth, ensure a row exists in our User table keyed by email.
      if (account?.provider === "google" && user.email) {
        await upsertUserByEmail(user.email, user.image);
      }
      return true;
    },
    async jwt({ token }) {
      // Keep the token hydrated from our User table so handle changes reflect.
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.handle = dbUser.handle;
          token.isFoundingMember = dbUser.isFoundingMember;
          token.reviewCount = dbUser.reviewCount;
          token.isAdmin = isAdminEmail(dbUser.email);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.handle = (token.handle as string | null) ?? null;
        session.user.isFoundingMember = Boolean(token.isFoundingMember);
        session.user.reviewCount = Number(token.reviewCount ?? 0);
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
