"use client";

import { useState, useRef, useEffect } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: { url: string; title: string }[];
}

export default function ChatPanel({ botKey }: { botKey: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hi! I'm ready to answer questions about this website. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((p) => [...p, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_key: botKey, message: text, session_id: sessionId }),
      });
      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: data.answer || data.error || "Something went wrong.",
          citations: data.citations,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand shadow-glow-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" fill="white" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Test Your Bot</p>
          <p className="text-[11px] text-white/40">Live preview</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div className="max-w-[82%] space-y-1">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : "bg-surface-3 text-white/85 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {m.citations.slice(0, 3).map((c, ci) => (
                    <a
                      key={ci}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      ↗ {c.title || c.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="rounded-2xl rounded-bl-sm bg-surface-3 px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-subtle p-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none rounded-xl bg-surface-3 border border-border-subtle px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-500/50 transition-colors disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow transition-shadow disabled:opacity-40 disabled:cursor-default flex-shrink-0 self-end"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
