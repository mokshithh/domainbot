import Link from "next/link";
import { HeroShapes } from "@/components/ui/shape-landing-hero";
import PricingSection from "@/components/ui/pricing-section-4";
import {
  Globe,
  Brain,
  Rocket,
  Zap,
  Search,
  BookOpen,
  Puzzle,
  BarChart2,
  Lock,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter your domain",
    desc: "Type in your website URL and give your bot a name.",
    icon: Globe,
  },
  {
    step: "02",
    title: "We crawl it",
    desc: "DomainBot automatically crawls up to 25 pages and extracts content.",
    icon: Search,
  },
  {
    step: "03",
    title: "AI learns it",
    desc: "Content is chunked, embedded, and stored in a vector database.",
    icon: Brain,
  },
  {
    step: "04",
    title: "Deploy it",
    desc: "Paste one script tag. Your chatbot is live, answering questions instantly.",
    icon: Rocket,
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Instant crawl",
    desc: "Sitemap-first crawler discovers and indexes up to 25 pages automatically.",
    color: "text-amber-400 bg-amber-400/10",
  },
  {
    icon: Search,
    title: "RAG-powered answers",
    desc: "Uses vector search + LLM to answer from YOUR content only — no hallucinations.",
    color: "text-brand-400 bg-brand-400/10",
  },
  {
    icon: BookOpen,
    title: "Source citations",
    desc: "Every answer includes links back to the exact pages that informed the response.",
    color: "text-purple-400 bg-purple-400/10",
  },
  {
    icon: Puzzle,
    title: "One-line embed",
    desc: "A single script tag. Works on any website, CMS, or landing page.",
    color: "text-emerald-400 bg-emerald-400/10",
  },
  {
    icon: BarChart2,
    title: "Daily limits",
    desc: "Set per-bot daily chat limits so you stay in control of usage.",
    color: "text-rose-400 bg-rose-400/10",
  },
  {
    icon: Lock,
    title: "Domain-locked",
    desc: "Each bot is tied to a specific domain for security and relevance.",
    color: "text-sky-400 bg-sky-400/10",
  },
];


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
            <Link
              href="#pricing"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              <LayoutDashboard size={14} />
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
      <section className="relative z-10 px-6 pt-28 pb-24 text-center overflow-hidden">
        <HeroShapes />
        <div className="relative z-10 mx-auto max-w-3xl">
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
            Enter your domain. We crawl it, understand it, and give you an embeddable chatbot
            that answers visitor questions — powered by your own content.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/bots/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-7 py-3.5 text-base font-semibold text-white shadow-glow hover:shadow-[0_0_60px_rgba(6,182,212,0.25)] transition-all hover:-translate-y-0.5"
            >
              Create your bot
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-base font-medium text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              <LayoutDashboard size={15} />
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
            <p className="mt-3 text-white/40">Four steps from zero to live chatbot.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {HOW_IT_WORKS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card"
                >
                  {/* Connector line */}
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-8 -right-2 w-4 h-px bg-border-subtle z-10" />
                  )}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
                      <Icon size={16} className="text-brand-400" />
                    </div>
                    <span className="font-mono text-xs text-brand-500/60">{item.step}</span>
                  </div>
                  <h3 className="mb-2 text-[15px] font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything you need
            </h2>
            <p className="mt-3 text-white/40">Built for speed, reliability, and simplicity.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card hover:border-border-default transition-colors"
                >
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${f.color}`}>
                    <Icon size={16} />
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-semibold text-white">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10">
        <PricingSection />
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
            <span
              className="text-sm font-semibold text-white/60"
              style={{ fontFamily: "var(--font-display)" }}
            >
              DomainBot
            </span>
          </div>
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} DomainBot. Built with Next.js, Supabase & Groq.
          </p>
        </div>
      </footer>
    </div>
  );
}
