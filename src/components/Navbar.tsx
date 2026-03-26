"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/bots", label: "Bots" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z"
                fill="white"
              />
            </svg>
          </div>
          <span
            className="font-display text-[15px] font-700 tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            DomainBot
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(l.href)
                  ? "bg-white/8 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/bots/new"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-1.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
        >
          <span>+</span>
          <span>New Bot</span>
        </Link>
      </div>
    </nav>
  );
}
