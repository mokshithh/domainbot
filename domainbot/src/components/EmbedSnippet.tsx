"use client";

import { useState } from "react";

interface EmbedSnippetProps {
  botKey: string;
  appUrl: string;
}

export default function EmbedSnippet({ botKey, appUrl }: EmbedSnippetProps) {
  const [copied, setCopied] = useState(false);

  const snippet = `<script
  src="${appUrl}/api/widget"
  data-bot-key="${botKey}"
  defer
></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div>
          <p className="text-sm font-semibold text-white">Embed on your website</p>
          <p className="text-xs text-white/40 mt-0.5">
            Paste this snippet before the &lt;/body&gt; tag
          </p>
        </div>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            copied
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/8 text-white/60 hover:text-white hover:bg-white/12"
          }`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-5 font-mono text-[12px] leading-relaxed text-brand-300 overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
  );
}
