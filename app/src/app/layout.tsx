import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "SupportCoach AI",
  description: "AI-powered support coaching and QA intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-xl font-bold tracking-tight">
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

          {children}
        </div>
      </body>
    </html>
  );
}