"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-white">
          SupportCoach AI
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/upload"
            className="rounded-lg border border-white/10 px-4 py-2 text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            Upload
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/10 px-4 py-2 text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-white/10 px-4 py-2 text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            Settings
          </Link>
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-white/10 px-4 py-2 text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}