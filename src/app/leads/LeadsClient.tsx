"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, Filter } from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  bot_id: string;
}

interface Bot {
  id: string;
  name: string;
}

interface Props {
  bots: Bot[];
}

export default function LeadsClient({ bots }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (selectedBot) params.set("bot_id", selectedBot);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBot, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filtered = search
    ? leads.filter((l) =>
        [l.name, l.email, l.phone, l.notes]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(search.toLowerCase()))
      )
    : leads;

  const botName = (botId: string) => bots.find((b) => b.id === botId)?.name ?? "Unknown Bot";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-surface-2 border border-border-subtle pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
        {bots.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <select
              value={selectedBot}
              onChange={(e) => { setSelectedBot(e.target.value); setPage(0); }}
              className="appearance-none rounded-xl bg-surface-2 border border-border-subtle pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
            >
              <option value="">All Bots</option>
              {bots.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-20 text-center px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 border border-border-subtle mb-4">
            <Users size={20} className="text-white/20" />
          </div>
          <p className="text-sm font-medium text-white">No leads yet</p>
          <p className="text-xs text-white/35 mt-1 max-w-xs">
            Enable lead capture in your bot&apos;s Customize tab (Max plan) and leads will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border-subtle bg-surface-2 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                {total} lead{total !== 1 ? "s" : ""} total
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {["Name", "Email", "Phone", "Bot", "Source", "Date"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface-3 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{lead.name || <span className="text-white/25">—</span>}</td>
                      <td className="px-4 py-3 text-sm">
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="text-brand-400 hover:text-brand-300 transition-colors">
                            {lead.email}
                          </a>
                        ) : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{lead.phone || <span className="text-white/25">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-white/50">{botName(lead.bot_id)}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-surface-3 text-white/50 border border-border-subtle">
                          {lead.source || "chat"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:border-border-default disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:border-border-default disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
