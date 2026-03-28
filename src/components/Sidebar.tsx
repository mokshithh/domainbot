"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bot, Plus, LogOut, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { Plan } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
];

interface SidebarProps {
  onNavClick?: () => void;
  userEmail?: string;
  plan?: Plan;
  dailyChatCount?: number;
}

export default function Sidebar({ onNavClick, userEmail, plan = "free", dailyChatCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const planConfig = PLANS[plan];
  const usagePct = Math.min((dailyChatCount / planConfig.chatsPerDay) * 100, 100);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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

        {/* Leads link — Pro/Max only */}
        {(plan === "pro" || plan === "max") && (
          <Link
            href="/leads"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              pathname.startsWith("/leads")
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
            )}
          >
            <Users
              size={16}
              className={pathname.startsWith("/leads") ? "text-brand-400" : "text-current"}
            />
            Leads
          </Link>
        )}

        {/* Account link */}
        <Link
          href="/account"
          onClick={onNavClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            pathname.startsWith("/account")
              ? "bg-white/[0.08] text-white shadow-sm"
              : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
          )}
        >
          <User
            size={16}
            className={pathname.startsWith("/account") ? "text-brand-400" : "text-current"}
          />
          Account
        </Link>
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-3">
        {/* New Bot CTA */}
        <Link
          href="/bots/new"
          onClick={onNavClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
        >
          <Plus size={15} />
          New Bot
        </Link>

        {/* Daily usage bar */}
        {dailyChatCount !== undefined && (
          <div className="px-1 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/30">Chats today</span>
              <span className="text-[10px] text-white/40 tabular-nums">
                {dailyChatCount} / {planConfig.chatsPerDay >= 10000 ? "10k" : planConfig.chatsPerDay}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan badge + user info */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-white/30 truncate">{userEmail ?? ""}</span>
          </div>
          <PlanBadge plan={plan} />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const styles: Record<Plan, string> = {
    free: "bg-white/10 text-white/50",
    pro: "bg-brand-500/20 text-brand-300",
    max: "bg-purple-500/20 text-purple-300",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[plan]}`}>
      {PLANS[plan].label}
    </span>
  );
}
