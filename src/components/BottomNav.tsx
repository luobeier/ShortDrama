"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  isLoggedIn: boolean;
  handle: string | null;
  isAdmin: boolean;
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const DiaryIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 3h11a2 2 0 0 1 2 2v16l-4-2-4 2V5M6 3a2 2 0 0 0-2 2v14"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const SearchIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} />
    <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
  </svg>
);
const UserIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} />
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
  </svg>
);

export function BottomNav({ isLoggedIn, handle, isAdmin }: Props) {
  const pathname = usePathname();
  // Hidden on full-screen flows like the share card.
  if (pathname?.startsWith("/share")) return null;

  const items = [
    { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
    { href: "/search", label: "Search", Icon: SearchIcon, match: (p: string) => p.startsWith("/search") },
    { href: "/diary", label: "Diary", Icon: DiaryIcon, match: (p: string) => p.startsWith("/diary") },
    {
      href: isLoggedIn ? (handle ? `/u/${handle}` : "/onboarding") : "/signin",
      label: isLoggedIn ? "You" : "Sign in",
      Icon: UserIcon,
      match: (p: string) => p.startsWith("/u/") || p.startsWith("/signin") || p.startsWith("/onboarding"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-stretch justify-around px-4 lg:px-8">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname ?? "");
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-brand" : "text-ink-faint"
              }`}
            >
              <Icon active={active} />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              (pathname ?? "").startsWith("/admin") ? "text-brand" : "text-ink-faint"
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
            </svg>
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
