"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, ExternalLink, RotateCcw } from "lucide-react";

interface Citation {
  url: string;
  title: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  id: string;
}

function genId() {
  return Math.random().toString(36).slice(2);
}

/* ── Typing cursor that blinks while streaming ── */
function Cursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-brand-400 ml-[2px] align-middle"
      style={{ animation: "blink 0.9s step-end infinite" }}
    />
  );
}

/* ── Staggered loading dots ── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-[5px] px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[6px] w-[6px] rounded-full bg-white/25"
          style={{
            animation: "thinking 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Citation pill ── */
function CitationPill({ citation, index }: { citation: Citation; index: number }) {
  const label = citation.title?.replace(/^https?:\/\//, "").replace(/\/$/, "") || citation.url;
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 rounded-full border border-brand-500/20 bg-brand-500/8 px-2.5 py-0.5 text-[11px] text-brand-400/80 transition-all hover:border-brand-400/40 hover:bg-brand-500/15 hover:text-brand-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="max-w-[160px] truncate">{label}</span>
      <ExternalLink size={9} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{ animation: "msgSlide 0.22s ease-out forwards" }}
    >
      {/* Avatar — only for assistant */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand shadow-glow-sm mt-0.5">
          <Sparkles size={12} className="text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[82%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-brand-600/90 text-white rounded-br-[4px] shadow-[0_2px_12px_rgba(6,182,212,0.15)]"
              : "bg-white/[0.06] border border-white/[0.07] text-white/88 rounded-bl-[4px] backdrop-blur-sm"
          }`}
        >
          {msg.content || (msg.streaming ? null : <span className="text-white/30 italic">…</span>)}
          {msg.streaming && msg.content && <Cursor />}
          {msg.streaming && !msg.content && <ThinkingDots />}
        </div>

        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.citations.slice(0, 4).map((c, i) => (
              <CitationPill key={i} citation={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function ChatPanel({ botKey }: { botKey: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: genId(),
      role: "assistant",
      content: "Hi! I'm ready to answer questions about this website. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Auto-resize textarea */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      resizeTextarea();
    },
    [resizeTextarea]
  );

  /* ── SEND — with SSE streaming ── */
  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsgId = genId();
    const assistantMsgId = genId();

    setMessages((p) => [
      ...p,
      { id: userMsgId, role: "user", content: text },
      { id: assistantMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_key: botKey, message: text, session_id: sessionId }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const data = JSON.parse(raw);

            if (data.chunk) {
              setMessages((p) =>
                p.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + data.chunk }
                    : m
                )
              );
            }

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              if (data.session_id) setSessionId(data.session_id);
              setMessages((p) =>
                p.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, streaming: false, citations: data.citations || [] }
                    : m
                )
              );
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue; // partial JSON, ignore
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setMessages((p) =>
        p.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: msg, streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([
      {
        id: genId(),
        role: "assistant",
        content: "Hi! I'm ready to answer questions about this website. Ask me anything!",
      },
    ]);
    setSessionId(undefined);
    setError(null);
    textareaRef.current?.focus();
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <>
      {/* Injected keyframes */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes thinking {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes msgSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex h-[560px] flex-col rounded-2xl border border-white/[0.07] bg-surface-1 overflow-hidden shadow-card">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand shadow-glow-sm">
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Test Your Bot</p>
            <p className="text-[11px] text-white/35 leading-tight">Live preview</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Active
            </div>
            <button
              onClick={clearChat}
              title="Clear chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/[0.06] hover:text-white/60"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Input area ── */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2 rounded-xl border border-white/[0.07] bg-surface-3 px-3 py-2 transition-all focus-within:border-brand-500/40 focus-within:shadow-[0_0_0_1px_rgba(6,182,212,0.12)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              placeholder="Ask a question…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent py-0.5 text-sm text-white placeholder:text-white/25 outline-none disabled:opacity-50 leading-relaxed"
              style={{ minHeight: "24px", maxHeight: "128px" }}
            />
            <button
              onClick={send}
              disabled={!canSend}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                canSend
                  ? "bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow hover:scale-105"
                  : "bg-white/[0.05] text-white/20 cursor-default"
              }`}
            >
              <Send size={13} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-white/15">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
