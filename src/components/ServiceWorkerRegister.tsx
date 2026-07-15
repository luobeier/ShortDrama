"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds only. In dev it actively unregisters,
 * so a previously-run local prod build can't serve stale assets into
 * `next dev`. StrictMode's double effect is harmless — register() with the
 * same scope+script is a no-op the second time.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures (e.g. private mode) are non-fatal */
      });
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
  }, []);
  return null;
}
