import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/session";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "DramaScore — is it worth your coins?",
  description:
    "Community reviews and tracking for short vertical dramas. Log what you binge, warn people where it falls apart, and see the Coin Score before you spend.",
  applicationName: "DramaScore",
  appleWebApp: {
    capable: true,
    title: "DramaScore",
    statusBarStyle: "black-translucent",
  },
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
          {/* Pages own their horizontal padding (px-4); the wrapper only adds
              extra gutters on large screens to avoid double-padding mobile. */}
          <div className="mx-auto min-h-dvh w-full max-w-7xl lg:px-8">{children}</div>
          <BottomNav
            isLoggedIn={!!user}
            handle={user?.handle ?? null}
            isAdmin={user?.isAdmin ?? false}
          />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
