import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Providers } from "@/components/Providers";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "DramaScore — is it worth your coins?",
  description:
    "Community reviews and tracking for short vertical dramas. Log what you binge, warn people where it falls apart, and see the Coin Score before you spend.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="en" style={{ fontFamily: "system-ui, sans-serif" }}>
      <body className="min-h-dvh bg-bg pb-20">
        <Providers>
          <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
          <BottomNav
            isLoggedIn={!!user}
            handle={user?.handle ?? null}
            isAdmin={user?.isAdmin ?? false}
          />
        </Providers>
      </body>
    </html>
  );
}
