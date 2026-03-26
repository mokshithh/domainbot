"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close on route change */
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-60 left-1/3 h-[500px] w-[700px] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute top-1/2 right-0 h-[300px] w-[400px] rounded-full bg-purple-500/4 blur-[100px]" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar onNavClick={() => {}} />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-0/90 backdrop-blur-md px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-glow-sm">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" fill="white" />
            </svg>
          </div>
          <span className="text-[14px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            DomainBot
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavClick={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <main className="relative z-10 lg:ml-60 min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
