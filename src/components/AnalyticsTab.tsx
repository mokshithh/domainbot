"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "@/lib/types";
import { MessageSquare, Users, TrendingUp, ExternalLink } from "lucide-react";

interface Props {
  botId: string;
}

export default function AnalyticsTab({ botId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bots/${botId}/analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-white/[0.06] bg-surface-2">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-white/40">Failed to load analytics.</p>;

  const stats = [
    { label: "Messages Today", value: data.messages_today, icon: MessageSquare },
    { label: "Total Messages", value: data.total_messages, icon: TrendingUp },
    { label: "Unique Sessions", value: data.total_sessions, icon: Users },
  ];

  const maxCount = Math.max(...data.messages_per_day.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-white/[0.06] bg-surface-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
                <Icon size={14} className="text-white/20" />
              </div>
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Messages per day chart */}
      <Card className="border-white/[0.06] bg-surface-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white/60">Messages — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {data.total_messages === 0 ? (
            <div className="flex h-36 items-center justify-center text-sm text-white/30">
              No conversations yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.messages_per_day} barCategoryGap="30%">
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#13131e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 12,
                  }}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })
                  }
                  formatter={(v) => [v ?? 0, "messages"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.messages_per_day.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count === maxCount ? "#06b6d4" : "rgba(6,182,212,0.25)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top cited pages */}
      {data.top_pages.length > 0 && (
        <Card className="border-white/[0.06] bg-surface-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Top Referenced Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.top_pages.map((page, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs text-white/25 w-5 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/80">{page.title || page.url}</p>
                    <p className="truncate text-xs text-white/30">{page.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-brand-400">{page.citation_count}×</span>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-white/60 transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
