import Link from "next/link";

export default function BillingCancelledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] border border-white/10 mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">No charge made</h1>
          <p className="text-sm text-white/50 leading-relaxed">
            You cancelled the checkout. Your current plan is unchanged and you haven't been charged anything.
          </p>
        </div>

        {/* What they're missing */}
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Still available on paid plans</p>
          <ul className="space-y-2">
            {[
              { plan: "Pro · $20/mo", feat: "500 chats/day + file uploads (PDF, DOCX, TXT)" },
              { plan: "Max · $45/mo", feat: "Unlimited chats + customization + lead capture + analytics" },
            ].map(({ plan, feat }) => (
              <li key={plan} className="flex gap-3 text-sm">
                <span className="text-brand-400 font-semibold whitespace-nowrap">{plan}</span>
                <span className="text-white/40">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account"
            className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-border-subtle px-6 py-3 text-sm font-semibold text-white/60 hover:text-white hover:border-border-default transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-white/20">
          Questions? <a href="mailto:support@domainbot.ai" className="text-brand-400 hover:text-brand-300">Contact support</a>
        </p>
      </div>
    </div>
  );
}
