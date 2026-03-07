import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060a] relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-brand-500/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[400px] w-[500px] rounded-full bg-purple-500/6 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-brand-600/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 shadow-glow-sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" fill="white" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              DomainBot
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/bots/new"
              className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-28 pb-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/8 px-4 py-1.5 text-xs text-brand-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            No code required — deploy in minutes
          </div>

          <h1
            className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Turn your website into a{" "}
            <span className="gradient-text">smart AI chatbot</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg text-white/50 leading-relaxed">
            Enter your domain. We crawl it, understand it, and give you an
            embeddable chatbot that answers visitor questions — powered by your
            own content.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/bots/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-7 py-3.5 text-base font-semibold text-white shadow-glow hover:shadow-[0_0_60px_rgba(6,182,212,0.25)] transition-all hover:-translate-y-0.5"
            >
              Create your bot
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-7 py-3.5 text-base font-medium text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How it works
            </h2>
            <p className="mt-3 text-white/45">Four steps from zero to live chatbot.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Enter your domain",
                desc: "Type in your website URL and give your bot a name.",
                icon: "🌐",
              },
              {
                step: "02",
                title: "We crawl it",
                desc: "DomainBot automatically crawls up to 25 pages and extracts content.",
                icon: "🕷️",
              },
              {
                step: "03",
                title: "AI learns it",
                desc: "Content is chunked, embedded, and stored in a vector database.",
                icon: "🧠",
              },
              {
                step: "04",
                title: "Deploy it",
                desc: "Paste one script tag. Your chatbot is live, answering questions instantly.",
                icon: "🚀",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-mono text-xs text-brand-500">{item.step}</span>
                </div>
                <h3 className="mb-2 text-[15px] font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: "⚡",
                title: "Instant crawl",
                desc: "Sitemap-first crawler discovers and indexes up to 25 pages automatically.",
              },
              {
                icon: "🔍",
                title: "RAG-powered answers",
                desc: "Uses vector search + GPT to answer from YOUR content only — no hallucinations.",
              },
              {
                icon: "📎",
                title: "Source citations",
                desc: "Every answer includes links back to the exact pages that informed the response.",
              },
              {
                icon: "🧩",
                title: "One-line embed",
                desc: "A single script tag. Works on any website, CMS, or landing page.",
              },
              {
                icon: "📊",
                title: "Daily limits",
                desc: "Set per-bot daily chat limits so you stay in control of usage.",
              },
              {
                icon: "🔒",
                title: "Domain-locked",
                desc: "Each bot is tied to a specific domain for security and relevance.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="mb-1.5 text-[15px] font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Simple pricing
            </h2>
            <p className="mt-3 text-white/45">Start free. Scale when you grow.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "Free",
                period: "",
                features: ["3 bots", "25 pages / bot", "100 chats / day", "Embed widget", "Basic support"],
                cta: "Get started",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "/ mo",
                features: ["Unlimited bots", "100 pages / bot", "5,000 chats / day", "Custom branding", "Priority support"],
                cta: "Start free trial",
                highlight: true,
              },
              {
                name: "Business",
                price: "$99",
                period: "/ mo",
                features: ["Everything in Pro", "1,000 pages / bot", "Unlimited chats", "API access", "Dedicated support"],
                cta: "Contact sales",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 shadow-card flex flex-col gap-5 ${
                  plan.highlight
                    ? "border-brand-500/40 bg-gradient-to-b from-brand-500/8 to-surface-2"
                    : "border-border-subtle bg-surface-2"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-brand px-3 py-0.5 text-[11px] font-semibold text-white shadow-glow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white/50">{plan.name}</p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="mb-1 text-sm text-white/40">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand-400 flex-shrink-0">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/bots/new"
                  className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow"
                      : "border border-border-default text-white/60 hover:text-white hover:border-border-strong"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-white/25">
            Pricing plans are illustrative for this MVP. Billing not yet implemented.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-subtle px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-brand">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white/60" style={{ fontFamily: "var(--font-display)" }}>
              DomainBot
            </span>
          </div>
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} DomainBot. Built with Next.js, Supabase & OpenAI.
          </p>
        </div>
      </footer>
    </div>
  );
}
