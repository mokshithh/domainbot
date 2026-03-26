import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 text-center px-6">
      <div className="mb-6 text-6xl">🤖</div>
      <h1
        className="text-4xl font-bold text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        404
      </h1>
      <p className="mt-3 text-white/45 text-lg">This page doesn&apos;t exist.</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
