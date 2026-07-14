import { Logo } from "@/components/Header";
import { SignInForm } from "@/components/SignInForm";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(user.handle ? (next ?? "/") : "/onboarding");

  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const devEnabled = process.env.ENABLE_DEV_LOGIN !== "false";

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-24 pt-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="mt-4 text-2xl font-black">Log in to log your dramas</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Pick a handle, keep it anonymous. One review unlocks everything —
          verdicts, spoilers, the works.
        </p>
      </div>
      <SignInForm googleEnabled={googleEnabled} devEnabled={devEnabled} next={next} />
      <p className="mt-8 text-center text-xs text-ink-faint">
        No real names, ever. You choose a display handle after signing in.
      </p>
    </main>
  );
}
