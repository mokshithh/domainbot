"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bot, Plus, Zap } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
];

interface SidebarProps {
  onNavClick?: () => void;
}

export default function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/[0.06] bg-surface-1">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
        <Link href="/" onClick={onNavClick} className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z"
                fill="white"
              />
            </svg>
          </div>
          <span
            className="text-[15px] font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            DomainBot
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
              )}
            >
              <Icon
                size={16}
                className={isActive ? "text-brand-400" : "text-current"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* New Bot CTA */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <Link
          href="/bots/new"
          onClick={onNavClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
        >
          <Plus size={15} />
          New Bot
        </Link>
        <p className="mt-3 flex items-center gap-1.5 px-1 text-xs text-white/25">
          <Zap size={11} />
          Powered by Groq + Jina AI
        </p>
      </div>
    </aside>
  );
}
