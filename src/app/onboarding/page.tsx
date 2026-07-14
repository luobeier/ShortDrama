import { Logo } from "@/components/Header";
import { HandlePicker } from "@/components/HandlePicker";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/onboarding");
  if (user.handle) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-24 pt-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="mt-4 text-2xl font-black">Pick your handle</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          This is the only name anyone sees. Make it fun — no real names on DramaScore.
        </p>
      </div>
      <HandlePicker />
    </main>
  );
}
