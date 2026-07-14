"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInForm({
  googleEnabled,
  devEnabled,
  next,
}: {
  googleEnabled: boolean;
  devEnabled: boolean;
  next?: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const callbackUrl = next || "/";

  return (
    <div className="flex flex-col gap-3">
      {googleEnabled && (
        <button
          onClick={() => {
            setLoading("google");
            signIn("google", { callbackUrl });
          }}
          disabled={loading !== null}
          className="btn-ghost w-full"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9Z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8Z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4Z" />
          </svg>
          Continue with Google
        </button>
      )}

      {googleEnabled && devEnabled && (
        <div className="flex items-center gap-3 py-1 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
      )}

      {devEnabled && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            setLoading("email");
            signIn("dev", { email: email.trim(), callbackUrl });
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="input"
            enterKeyHint="go"
          />
          <button disabled={loading !== null} className="btn-primary w-full">
            {loading === "email" ? "Signing in…" : "Continue with email"}
          </button>
          <p className="text-center text-[11px] text-ink-faint">
            Dev mode: enter an email and you&apos;re in — no password, no inbox check.
          </p>
        </form>
      )}

      {!googleEnabled && !devEnabled && (
        <p className="text-center text-sm text-ink-soft">
          No sign-in providers are configured. Set <code>ENABLE_DEV_LOGIN</code> or Google
          OAuth env vars.
        </p>
      )}
    </div>
  );
}
