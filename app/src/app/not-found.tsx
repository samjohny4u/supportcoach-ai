import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#020817] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#081225] p-8">
        <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300">
          404
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mb-8 text-gray-300">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
