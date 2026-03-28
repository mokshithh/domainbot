"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Bot } from "@/lib/types";

interface Props {
  bot: Bot;
}

const PERSONALITIES = [
  { value: "professional", label: "Professional", desc: "Formal, precise, business-focused" },
  { value: "friendly", label: "Friendly", desc: "Warm, approachable, helpful" },
  { value: "casual", label: "Casual", desc: "Relaxed, conversational" },
  { value: "formal", label: "Formal", desc: "Strict, detailed, authoritative" },
];

const RESPONSE_LENGTHS = [
  { value: "short", label: "Short", desc: "1-2 sentences, concise" },
  { value: "medium", label: "Medium", desc: "2-4 sentences (default)" },
  { value: "detailed", label: "Detailed", desc: "Full explanations" },
];

interface BotSettings {
  lead_capture_enabled: boolean;
  lead_fields: string[];
  lead_capture_title: string;
  lead_capture_subtitle: string;
  business_hours_enabled: boolean;
  away_message: string;
  handoff_enabled: boolean;
  handoff_trigger: string;
  handoff_message: string;
  handoff_email: string;
  handoff_phone: string;
  handoff_url: string;
  suggested_questions: string[];
  response_length: string;
  tone_override: string;
}

const defaultSettings: BotSettings = {
  lead_capture_enabled: false,
  lead_fields: ["name", "email"],
  lead_capture_title: "Before we chat…",
  lead_capture_subtitle: "Share your details and we'll get right back to you.",
  business_hours_enabled: false,
  away_message: "We're currently offline. Leave your email and we'll get back to you!",
  handoff_enabled: false,
  handoff_trigger: "I want to speak to a human",
  handoff_message: "Happy to connect you! You can reach our team at:",
  handoff_email: "",
  handoff_phone: "",
  handoff_url: "",
  suggested_questions: [],
  response_length: "medium",
  tone_override: "",
};

type Section = "identity" | "behavior" | "leads" | "handoff" | "advanced";

export default function CustomizeTab({ bot }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("identity");

  const [botForm, setBotForm] = useState({
    system_prompt: bot.system_prompt ?? "",
    avatar_url: bot.avatar_url ?? "",
    remove_branding: bot.remove_branding ?? false,
    custom_css: bot.custom_css ?? "",
    bot_personality: bot.bot_personality ?? "professional",
    bot_name_display: bot.bot_name_display ?? "",
    welcome_message: bot.welcome_message ?? "",
    primary_color: bot.primary_color ?? "#06b6d4",
  });

  const [settings, setSettings] = useState<BotSettings>(defaultSettings);
  const [newQuestion, setNewQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${bot.id}/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings((prev) => ({ ...prev, ...d.settings }));
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [bot.id]);

  function setBot(key: string, value: string | boolean) {
    setBotForm((p) => ({ ...p, [key]: value }));
  }

  function setSetting<K extends keyof BotSettings>(key: K, value: BotSettings[K]) {
    setSettings((p) => ({ ...p, [key]: value }));
  }

  function toggleLeadField(field: string) {
    setSettings((p) => ({
      ...p,
      lead_fields: p.lead_fields.includes(field)
        ? p.lead_fields.filter((f) => f !== field)
        : [...p.lead_fields, field],
    }));
  }

  function addQuestion() {
    const q = newQuestion.trim();
    if (!q) return;
    setSetting("suggested_questions", [...settings.suggested_questions, q]);
    setNewQuestion("");
  }

  function removeQuestion(i: number) {
    setSetting(
      "suggested_questions",
      settings.suggested_questions.filter((_, idx) => idx !== i)
    );
  }

  async function handleSaveBot() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Bot settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Advanced settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const sections: { id: Section; label: string }[] = [
    { id: "identity", label: "Identity" },
    { id: "behavior", label: "Behavior" },
    { id: "leads", label: "Lead Capture" },
    { id: "handoff", label: "Handoff" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-2 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
        <div>
          <h3 className="text-sm font-semibold text-white">Bot Customization</h3>
          <p className="text-xs text-white/35 mt-0.5">Max plan — full control over your bot</p>
        </div>
        <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 text-[10px] font-semibold">MAX</span>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? "bg-surface-4 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {/* ── Identity ── */}
        {activeSection === "identity" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bot Display Name" hint="Shown to users in the chat widget">
                <input type="text" value={botForm.bot_name_display} onChange={(e) => setBot("bot_name_display", e.target.value)} placeholder="e.g. Aria" className={inputCls} />
              </Field>
              <Field label="Avatar URL" hint="Direct URL to a PNG/JPG image">
                <input type="url" value={botForm.avatar_url} onChange={(e) => setBot("avatar_url", e.target.value)} placeholder="https://..." className={inputCls} />
              </Field>
            </div>

            <Field label="Widget Accent Color" hint="Primary color for the chat launcher and buttons">
              <div className="flex items-center gap-3">
                <input type="color" value={botForm.primary_color} onChange={(e) => setBot("primary_color", e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-border-subtle bg-surface-3 p-1" />
                <input type="text" value={botForm.primary_color} onChange={(e) => setBot("primary_color", e.target.value)} className={`${inputCls} font-mono uppercase`} maxLength={7} />
              </div>
            </Field>

            <Field label="Welcome Message" hint="First message the bot sends when a user opens the widget">
              <textarea value={botForm.welcome_message} onChange={(e) => setBot("welcome_message", e.target.value)} placeholder="Hi! How can I help you today?" rows={2} className={textareaCls} />
            </Field>

            <Toggle
              label='Remove "Powered by DomainBot"'
              hint="Hide the DomainBot branding from your widget"
              checked={botForm.remove_branding}
              onChange={(v) => setBot("remove_branding", v)}
            />

            <SaveButton onClick={handleSaveBot} saving={saving} />
          </>
        )}

        {/* ── Behavior ── */}
        {activeSection === "behavior" && (
          <>
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Personality</h4>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map((p) => (
                  <button key={p.value} onClick={() => setBot("bot_personality", p.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${botForm.bot_personality === p.value ? "border-brand-500/50 bg-brand-500/10" : "border-border-subtle bg-surface-3 hover:border-border-default"}`}>
                    <p className="text-sm font-medium text-white">{p.label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Response Length</h4>
              <div className="grid grid-cols-3 gap-2">
                {RESPONSE_LENGTHS.map((l) => (
                  <button key={l.value} onClick={() => setSetting("response_length", l.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${settings.response_length === l.value ? "border-brand-500/50 bg-brand-500/10" : "border-border-subtle bg-surface-3 hover:border-border-default"}`}>
                    <p className="text-sm font-medium text-white">{l.label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{l.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Custom System Prompt</h4>
              <p className="text-xs text-white/35">
                Override default instructions. Include <code className="text-brand-400">WEBSITE CONTENT:</code> for context injection.
              </p>
              <textarea
                value={botForm.system_prompt}
                onChange={(e) => setBot("system_prompt", e.target.value)}
                placeholder={`You are a helpful assistant for my company.\n\nWEBSITE CONTENT:\n{{content}}`}
                rows={6}
                className={`${textareaCls} font-mono text-xs`}
              />
              {botForm.system_prompt && !botForm.system_prompt.includes("WEBSITE CONTENT:") && (
                <p className="text-xs text-amber-400">Tip: Include <code>WEBSITE CONTENT:</code> so context is injected automatically.</p>
              )}
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Suggested Questions</h4>
              <p className="text-xs text-white/35">Quick-reply buttons shown to users when they open the chat.</p>
              <div className="space-y-2">
                {settings.suggested_questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 rounded-xl border border-border-subtle bg-surface-3 px-3 py-2 text-sm text-white/70">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="text-white/30 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                    placeholder="e.g. What are your business hours?"
                    className={`${inputCls} flex-1`}
                  />
                  <button onClick={addQuestion} className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm text-white/60 hover:text-white hover:border-border-default transition-all whitespace-nowrap">
                    Add
                  </button>
                </div>
              </div>
            </section>

            <SaveButton onClick={async () => { await handleSaveBot(); await handleSaveSettings(); }} saving={saving} />
          </>
        )}

        {/* ── Lead Capture ── */}
        {activeSection === "leads" && (
          <>
            <Toggle
              label="Enable Lead Capture Form"
              hint="Show a form before users can chat (collect name, email, phone)"
              checked={settings.lead_capture_enabled}
              onChange={(v) => setSetting("lead_capture_enabled", v)}
            />

            {settings.lead_capture_enabled && (
              <>
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Fields to Collect</h4>
                  <div className="flex gap-3 flex-wrap">
                    {["name", "email", "phone"].map((f) => (
                      <label key={f} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.lead_fields.includes(f)}
                          onChange={() => toggleLeadField(f)}
                          className="rounded border-border-subtle"
                        />
                        <span className="text-sm text-white/70 capitalize">{f}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Form Title">
                    <input type="text" value={settings.lead_capture_title} onChange={(e) => setSetting("lead_capture_title", e.target.value)} className={inputCls} placeholder="Before we chat…" />
                  </Field>
                  <Field label="Form Subtitle">
                    <input type="text" value={settings.lead_capture_subtitle} onChange={(e) => setSetting("lead_capture_subtitle", e.target.value)} className={inputCls} placeholder="Share your details…" />
                  </Field>
                </div>
              </>
            )}

            <div className="rounded-xl border border-border-subtle bg-surface-3 p-4 space-y-2">
              <p className="text-xs font-medium text-white/60">Lead Dashboard</p>
              <p className="text-xs text-white/35">
                Collected leads appear in the{" "}
                <a href="/dashboard" className="text-brand-400 hover:underline">Dashboard → Leads</a>{" "}
                section and can be exported as CSV.
              </p>
            </div>

            <SaveButton onClick={handleSaveSettings} saving={saving} />
          </>
        )}

        {/* ── Handoff ── */}
        {activeSection === "handoff" && (
          <>
            <Toggle
              label="Enable Human Handoff"
              hint="Detect escalation intent and show contact information"
              checked={settings.handoff_enabled}
              onChange={(v) => setSetting("handoff_enabled", v)}
            />

            {settings.handoff_enabled && (
              <>
                <Field label="Trigger Phrase" hint="When the user says this, show the handoff message">
                  <input type="text" value={settings.handoff_trigger} onChange={(e) => setSetting("handoff_trigger", e.target.value)} placeholder="I want to speak to a human" className={inputCls} />
                </Field>

                <Field label="Handoff Message" hint="Shown above the contact info">
                  <textarea value={settings.handoff_message} onChange={(e) => setSetting("handoff_message", e.target.value)} placeholder="Happy to connect you! You can reach our team at:" rows={2} className={textareaCls} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Email">
                    <input type="email" value={settings.handoff_email} onChange={(e) => setSetting("handoff_email", e.target.value)} placeholder="support@yourco.com" className={inputCls} />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" value={settings.handoff_phone} onChange={(e) => setSetting("handoff_phone", e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
                  </Field>
                  <Field label="Contact Page URL">
                    <input type="url" value={settings.handoff_url} onChange={(e) => setSetting("handoff_url", e.target.value)} placeholder="https://yourco.com/contact" className={inputCls} />
                  </Field>
                </div>
              </>
            )}

            <Toggle
              label="Enable Business Hours"
              hint="Show away message and disable chat outside working hours"
              checked={settings.business_hours_enabled}
              onChange={(v) => setSetting("business_hours_enabled", v)}
            />

            {settings.business_hours_enabled && (
              <Field label="Away Message" hint="Shown when the business is closed">
                <textarea value={settings.away_message} onChange={(e) => setSetting("away_message", e.target.value)} rows={2} className={textareaCls} placeholder="We're currently offline. Leave your email and we'll get back to you!" />
              </Field>
            )}

            <SaveButton onClick={handleSaveSettings} saving={saving} />
          </>
        )}

        {/* ── Advanced ── */}
        {activeSection === "advanced" && (
          <>
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Extra Tone Instructions</h4>
              <p className="text-xs text-white/35">Appended to the system prompt. Use for one-off style tweaks without replacing the full prompt.</p>
              <textarea
                value={settings.tone_override}
                onChange={(e) => setSetting("tone_override", e.target.value)}
                rows={3}
                placeholder="Always end responses with a friendly sign-off. Use bullet points when listing more than 3 items."
                className={textareaCls}
              />
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Custom Widget CSS</h4>
              <p className="text-xs text-white/35">Injected into the widget. Style any element using CSS class overrides.</p>
              <textarea value={botForm.custom_css} onChange={(e) => setBot("custom_css", e.target.value)} placeholder={`.db-msg.assistant { border-radius: 8px; }\n#db-widget-send { background: #your-color; }`} rows={4} className={`${textareaCls} font-mono text-xs`} />
            </section>

            <SaveButton onClick={async () => { await handleSaveBot(); await handleSaveSettings(); }} saving={saving} />
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/60">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/25">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 rounded-full transition-colors cursor-pointer flex-shrink-0 ${checked ? "bg-brand-500" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <div>
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-xs text-white/35">{hint}</p>}
      </div>
    </label>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-60 disabled:cursor-wait">
      {saving ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Saving…
        </>
      ) : "Save Changes"}
    </button>
  );
}

const inputCls = "w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors";
const textareaCls = "w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors resize-none";
