import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

interface BotConfig {
  botKey: string;
  botName: string;
  welcomeMessage: string;
  primaryColor: string;
  avatarUrl: string;
  removeBranding: boolean;
  customCss: string;
  widgetPosition: string;
  widgetTheme: string;
  borderRadius: string;
  widgetSize: string;
  suggestedQuestions: string[];
  autoOpenDelay: number;
  // Lead capture
  leadCaptureEnabled: boolean;
  leadFields: string[];
  leadCaptureTitle: string;
  leadCaptureSubtitle: string;
  // Handoff
  handoffEnabled: boolean;
  handoffTrigger: string;
  handoffMessage: string;
  handoffEmail: string;
  handoffPhone: string;
  handoffUrl: string;
  // Away / business hours
  businessHoursEnabled: boolean;
  awayMessage: string;
  // Response tuning
  responseLength: string;
  toneOverride: string;
}

/** GET /api/widget — serves the embeddable chatbot widget script */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";
  const botKey = searchParams.get("bot_key") || "";

  const config: BotConfig = {
    botKey,
    botName: "AI Assistant",
    welcomeMessage: "",
    primaryColor: "#3a65cc",
    avatarUrl: "",
    removeBranding: false,
    customCss: "",
    widgetPosition: "bottom-right",
    widgetTheme: "dark",
    borderRadius: "rounded",
    widgetSize: "standard",
    suggestedQuestions: [],
    autoOpenDelay: 0,
    leadCaptureEnabled: false,
    leadFields: ["name", "email"],
    leadCaptureTitle: "Before we chat\u2026",
    leadCaptureSubtitle: "Share your details and we\u2019ll get right back to you.",
    handoffEnabled: false,
    handoffTrigger: "speak to a human",
    handoffMessage: "Happy to connect you! You can reach our team at:",
    handoffEmail: "",
    handoffPhone: "",
    handoffUrl: "",
    businessHoursEnabled: false,
    awayMessage: "We\u2019re currently offline. Leave your email and we\u2019ll get back to you!",
    responseLength: "medium",
    toneOverride: "",
  };

  if (botKey) {
    try {
      const db = getServiceSupabase();

      const { data: bot } = await db
        .from("bots")
        .select(
          "id, name, allowed_domain, bot_name_display, welcome_message, primary_color, avatar_url, remove_branding, custom_css, widget_position, widget_theme, border_radius, widget_size"
        )
        .eq("bot_key", botKey)
        .single();

      if (bot) {
        config.botName =
          bot.bot_name_display ||
          bot.name ||
          (bot.allowed_domain
            ? bot.allowed_domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
            : "AI Assistant");
        if (bot.welcome_message) config.welcomeMessage = bot.welcome_message;
        if (bot.primary_color) config.primaryColor = bot.primary_color;
        if (bot.avatar_url) config.avatarUrl = bot.avatar_url;
        if (bot.remove_branding) config.removeBranding = true;
        if (bot.custom_css) config.customCss = bot.custom_css;
        if (bot.widget_position) config.widgetPosition = bot.widget_position;
        if (bot.widget_theme) config.widgetTheme = bot.widget_theme;
        if (bot.border_radius) config.borderRadius = bot.border_radius;
        if (bot.widget_size) config.widgetSize = bot.widget_size;

        // Fetch bot_settings separately using the resolved bot id
        if (bot.id) {
          const { data: s } = await db
            .from("bot_settings")
            .select("suggested_questions, auto_open_delay, lead_capture_enabled, lead_fields, lead_capture_title, lead_capture_subtitle, handoff_enabled, handoff_trigger, handoff_message, handoff_email, handoff_phone, handoff_url, business_hours_enabled, away_message, response_length, tone_override")
            .eq("bot_id", bot.id)
            .maybeSingle();
          if (s) {
            if (Array.isArray(s.suggested_questions) && s.suggested_questions.length > 0) config.suggestedQuestions = s.suggested_questions as string[];
            if (typeof s.auto_open_delay === "number" && s.auto_open_delay > 0) config.autoOpenDelay = s.auto_open_delay;
            if (s.lead_capture_enabled === true) config.leadCaptureEnabled = true;
            if (Array.isArray(s.lead_fields) && s.lead_fields.length > 0) config.leadFields = s.lead_fields as string[];
            if (s.lead_capture_title) config.leadCaptureTitle = s.lead_capture_title as string;
            if (s.lead_capture_subtitle) config.leadCaptureSubtitle = s.lead_capture_subtitle as string;
            if (s.handoff_enabled === true) config.handoffEnabled = true;
            if (s.handoff_trigger) config.handoffTrigger = s.handoff_trigger as string;
            if (s.handoff_message) config.handoffMessage = s.handoff_message as string;
            if (s.handoff_email) config.handoffEmail = s.handoff_email as string;
            if (s.handoff_phone) config.handoffPhone = s.handoff_phone as string;
            if (s.handoff_url) config.handoffUrl = s.handoff_url as string;
            if (s.business_hours_enabled === true) config.businessHoursEnabled = true;
            if (s.away_message) config.awayMessage = s.away_message as string;
            if (s.response_length) config.responseLength = s.response_length as string;
            if (s.tone_override) config.toneOverride = s.tone_override as string;
          }
        }
      }
    } catch {
      // fallback to defaults
    }
  }

  const script = buildWidgetScript(origin, config);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ─── CSS helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "58,101,204";
  return `${r},${g},${b}`;
}

function getBorderRadii(preset: string): { panel: string; msgUser: string; msgAssistant: string; input: string; btn: string } {
  switch (preset) {
    case "sharp":
      return { panel: "8px", msgUser: "6px 6px 2px 6px", msgAssistant: "6px 6px 6px 2px", input: "6px", btn: "6px" };
    case "pill":
      return { panel: "28px", msgUser: "22px 22px 4px 22px", msgAssistant: "22px 22px 22px 4px", input: "20px", btn: "14px" };
    default: // rounded
      return { panel: "22px", msgUser: "18px 18px 4px 18px", msgAssistant: "18px 18px 18px 4px", input: "14px", btn: "12px" };
  }
}

function getWidgetDimensions(preset: string): { width: string; height: string } {
  switch (preset) {
    case "compact": return { width: "320px", height: "460px" };
    case "large":   return { width: "420px", height: "600px" };
    default:        return { width: "372px", height: "530px" };
  }
}

function buildThemeVars(theme: string, primaryColor: string) {
  const rgb = hexToRgb(primaryColor);

  const dark = {
    panelBg: "#111118",
    panelBorder: "rgba(255,255,255,.09)",
    headerBg: "rgba(255,255,255,.018)",
    headerBorder: "rgba(255,255,255,.07)",
    titleColor: "rgba(255,255,255,.92)",
    statusColor: "rgba(255,255,255,.38)",
    avatarBg: "rgba(255,255,255,.1)",
    avatarBorder: "rgba(255,255,255,.08)",
    avatarIconFill: "rgba(255,255,255,.6)",
    closeBtnColor: "rgba(255,255,255,.35)",
    closeBtnHoverBg: "rgba(255,255,255,.08)",
    closeBtnHoverColor: "rgba(255,255,255,.8)",
    msgUserBg: `rgba(${rgb},.22)`,
    msgUserBorder: `rgba(${rgb},.2)`,
    msgUserColor: "rgba(255,255,255,.93)",
    msgAssistantBg: "rgba(255,255,255,.07)",
    msgAssistantBorder: "rgba(255,255,255,.06)",
    msgAssistantColor: "rgba(255,255,255,.84)",
    welcomeColor: "rgba(255,255,255,.45)",
    typingBg: "rgba(255,255,255,.07)",
    typingBorder: "rgba(255,255,255,.06)",
    dotColor: "rgba(255,255,255,.45)",
    cursorColor: "rgba(255,255,255,.5)",
    citeBg: "rgba(255,255,255,.06)",
    citeBorder: "rgba(255,255,255,.09)",
    citeColor: "rgba(255,255,255,.45)",
    citeHoverBg: "rgba(255,255,255,.1)",
    citeHoverColor: "rgba(255,255,255,.75)",
    inputRowBorder: "rgba(255,255,255,.06)",
    inputBg: "rgba(255,255,255,.06)",
    inputBorder: "rgba(255,255,255,.09)",
    inputColor: "rgba(255,255,255,.85)",
    inputPlaceholder: "rgba(255,255,255,.25)",
    inputFocusBorder: `rgba(${rgb},.45)`,
    inputFocusBg: `rgba(${rgb},.07)`,
    scrollbarThumb: "rgba(255,255,255,.07)",
    badgeBorder: "#111118",
    poweredColor: "rgba(255,255,255,.11)",
    poweredLinkColor: `rgba(${rgb},.6)`,
    chipBg: "rgba(255,255,255,.07)",
    chipBorder: "rgba(255,255,255,.1)",
    chipColor: "rgba(255,255,255,.6)",
    chipHoverBg: "rgba(255,255,255,.11)",
    chipHoverBorder: "rgba(255,255,255,.18)",
    chipHoverColor: "rgba(255,255,255,.88)",
  };

  const light = {
    panelBg: "#ffffff",
    panelBorder: "rgba(0,0,0,.09)",
    headerBg: "rgba(0,0,0,.018)",
    headerBorder: "rgba(0,0,0,.07)",
    titleColor: "rgba(0,0,0,.88)",
    statusColor: "rgba(0,0,0,.38)",
    avatarBg: "rgba(0,0,0,.07)",
    avatarBorder: "rgba(0,0,0,.08)",
    avatarIconFill: "rgba(0,0,0,.45)",
    closeBtnColor: "rgba(0,0,0,.32)",
    closeBtnHoverBg: "rgba(0,0,0,.06)",
    closeBtnHoverColor: "rgba(0,0,0,.72)",
    msgUserBg: `rgba(${rgb},.13)`,
    msgUserBorder: `rgba(${rgb},.18)`,
    msgUserColor: "rgba(0,0,0,.88)",
    msgAssistantBg: "rgba(0,0,0,.045)",
    msgAssistantBorder: "rgba(0,0,0,.07)",
    msgAssistantColor: "rgba(0,0,0,.82)",
    welcomeColor: "rgba(0,0,0,.42)",
    typingBg: "rgba(0,0,0,.045)",
    typingBorder: "rgba(0,0,0,.07)",
    dotColor: "rgba(0,0,0,.38)",
    cursorColor: "rgba(0,0,0,.45)",
    citeBg: "rgba(0,0,0,.04)",
    citeBorder: "rgba(0,0,0,.09)",
    citeColor: "rgba(0,0,0,.48)",
    citeHoverBg: "rgba(0,0,0,.07)",
    citeHoverColor: "rgba(0,0,0,.75)",
    inputRowBorder: "rgba(0,0,0,.07)",
    inputBg: "rgba(0,0,0,.025)",
    inputBorder: "rgba(0,0,0,.1)",
    inputColor: "rgba(0,0,0,.82)",
    inputPlaceholder: "rgba(0,0,0,.28)",
    inputFocusBorder: `rgba(${rgb},.5)`,
    inputFocusBg: `rgba(${rgb},.05)`,
    scrollbarThumb: "rgba(0,0,0,.09)",
    badgeBorder: "#ffffff",
    poweredColor: "rgba(0,0,0,.22)",
    poweredLinkColor: `rgba(${rgb},.7)`,
    chipBg: "rgba(0,0,0,.04)",
    chipBorder: "rgba(0,0,0,.1)",
    chipColor: "rgba(0,0,0,.52)",
    chipHoverBg: "rgba(0,0,0,.07)",
    chipHoverBorder: "rgba(0,0,0,.18)",
    chipHoverColor: "rgba(0,0,0,.82)",
  };

  return { dark, light, theme };
}

function renderThemeCss(
  v: ReturnType<typeof buildThemeVars>["dark"],
  radii: ReturnType<typeof getBorderRadii>,
  dims: ReturnType<typeof getWidgetDimensions>,
  primaryColor: string,
  rgb: string
): string {
  return `
#db-widget-panel{background:${v.panelBg};border:1px solid ${v.panelBorder};border-radius:${radii.panel};}
#db-widget-panel.db-open{display:flex;}
#db-widget-header{border-bottom:1px solid ${v.headerBorder};background:${v.headerBg};}
#db-widget-avatar{background:${v.avatarBg};border:1px solid ${v.avatarBorder};}
#db-widget-avatar svg{fill:${v.avatarIconFill};}
#db-widget-header-title{color:${v.titleColor};}
#db-widget-header-status{color:${v.statusColor};}
.db-status-dot{background:${primaryColor};}
#db-widget-close{color:${v.closeBtnColor};}
#db-widget-close:hover{background:${v.closeBtnHoverBg};color:${v.closeBtnHoverColor};}
#db-widget-messages::-webkit-scrollbar-thumb{background:${v.scrollbarThumb};}
.db-msg.user{background:${v.msgUserBg};border:1px solid ${v.msgUserBorder};color:${v.msgUserColor};border-radius:${radii.msgUser};}
.db-msg.assistant{background:${v.msgAssistantBg};border:1px solid ${v.msgAssistantBorder};color:${v.msgAssistantColor};border-radius:${radii.msgAssistant};}
.db-msg.assistant strong{font-weight:600;}
.db-msg.assistant ul,.db-msg.assistant ol{margin:4px 0 6px;padding-left:16px;}
.db-msg.assistant li{margin:3px 0;}
.db-msg.assistant p{margin:0 0 6px;}
.db-msg.assistant p:last-child{margin-bottom:0;}
.db-msg.assistant .db-h2{font-size:13.5px;font-weight:700;margin:10px 0 3px;line-height:1.3;padding-bottom:2px;border-bottom:1px solid rgba(128,128,128,0.2);}
.db-msg.assistant .db-h2:first-child{margin-top:2px;}
.db-msg.assistant .db-h3{font-size:13px;font-weight:600;margin:7px 0 2px;line-height:1.3;opacity:0.85;}
.db-msg.assistant hr.db-hr{border:none;border-top:1px solid rgba(128,128,128,0.18);margin:6px 0;}
.db-msg.db-welcome{color:${v.welcomeColor};}
.db-typing{background:${v.typingBg};border:1px solid ${v.typingBorder};border-radius:${radii.msgAssistant};}
.db-dot{background:${v.dotColor};}
.db-cursor{background:${v.cursorColor};}
.db-citations{}
.db-cite-chip{background:${v.citeBg};border:1px solid ${v.citeBorder};color:${v.citeColor};}
.db-cite-chip:hover{background:${v.citeHoverBg};color:${v.citeHoverColor};}
#db-widget-input-row{border-top:1px solid ${v.inputRowBorder};}
#db-widget-input{background:${v.inputBg};border:1px solid ${v.inputBorder};color:${v.inputColor};border-radius:${radii.input};}
#db-widget-input::placeholder{color:${v.inputPlaceholder};}
#db-widget-input:focus{border-color:${v.inputFocusBorder};background:${v.inputFocusBg};}
#db-widget-send{background:${primaryColor};border:1px solid rgba(${rgb},.3);border-radius:${radii.btn};box-shadow:0 2px 8px rgba(${rgb},.35),inset 0 1px 0 rgba(255,255,255,.15);}
#db-widget-send:hover{background:${primaryColor};filter:brightness(1.1);transform:scale(1.03);box-shadow:0 4px 14px rgba(${rgb},.5),inset 0 1px 0 rgba(255,255,255,.18);}
#db-widget-send:disabled{opacity:.3;cursor:default;transform:none;filter:none;}
#db-powered{color:${v.poweredColor};}
#db-powered a{color:${v.poweredLinkColor};}
#db-widget-panel{width:${dims.width};height:${dims.height};}
#db-widget-btn{background:${primaryColor};box-shadow:0 6px 24px rgba(${rgb},.45),0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.18);}
#db-widget-btn:hover{box-shadow:0 10px 32px rgba(${rgb},.55),0 4px 12px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.22);}
#db-unread-badge{border-color:${v.badgeBorder};}
.db-suggestion-chip{background:${v.chipBg};border:1px solid ${v.chipBorder};color:${v.chipColor};}
.db-suggestion-chip:hover{background:${v.chipHoverBg};color:${v.chipHoverColor};border-color:${v.chipHoverBorder};}
  `.trim();
}

function buildWidgetScript(appUrl: string, cfg: BotConfig): string {
  const { dark, light } = buildThemeVars(cfg.widgetTheme, cfg.primaryColor);
  const radii = getBorderRadii(cfg.borderRadius);
  const dims = getWidgetDimensions(cfg.widgetSize);
  const rgb = hexToRgb(cfg.primaryColor);
  const isLeft = cfg.widgetPosition === "bottom-left";

  const darkCss = renderThemeCss(dark, radii, dims, cfg.primaryColor, rgb);
  const lightCss = renderThemeCss(light, radii, dims, cfg.primaryColor, rgb);

  let themeCss: string;
  if (cfg.widgetTheme === "light") {
    themeCss = lightCss;
  } else if (cfg.widgetTheme === "auto") {
    themeCss = `@media(prefers-color-scheme:light){${lightCss}}@media(prefers-color-scheme:dark){${darkCss}}`;
  } else {
    themeCss = darkCss;
  }

  const brandingCss = cfg.removeBranding ? "#db-powered{display:none!important;}" : "";

  const safeBotName = cfg.botName.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/`/g, "\\`");
  const safeWelcome = cfg.welcomeMessage
    ? cfg.welcomeMessage.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")
    : "";
  const safeAvatarUrl = cfg.avatarUrl.replace(/"/g, "%22").replace(/</g, "%3C");
  const safeCustomCss = cfg.customCss.replace(/`/g, "\\`").replace(/\\/g, "\\\\");
  const safeSuggestedQuestions = JSON.stringify(
    cfg.suggestedQuestions.map((q) => q.replace(/"/g, '\\"'))
  );
  function safeStr(s: string) { return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$"); }
  const leadCaptureJson = JSON.stringify({
    enabled: cfg.leadCaptureEnabled,
    fields: cfg.leadFields,
    title: cfg.leadCaptureTitle,
    subtitle: cfg.leadCaptureSubtitle,
  });
  const handoffJson = JSON.stringify({
    enabled: cfg.handoffEnabled,
    trigger: cfg.handoffTrigger.toLowerCase(),
    message: cfg.handoffMessage,
    email: cfg.handoffEmail,
    phone: cfg.handoffPhone,
    url: cfg.handoffUrl,
  });
  const safeAwayMsg = safeStr(cfg.awayMessage);
  const safeToneOverride = safeStr(cfg.toneOverride);

  const avatarHtml = safeAvatarUrl
    ? `<img src="${safeAvatarUrl}" width="32" height="32" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;" alt="" />`
    : `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>`;

  return `
(function () {
  "use strict";

  // ── Bot key resolution — 5 strategies, first match wins ──────────────
  var BOT_KEY = (function() {
    var cfg = window.DomainBotConfig;
    if (cfg && cfg.botKey) return cfg.botKey;
    var cs = document.currentScript;
    if (cs) { var k = cs.getAttribute("data-bot-key"); if (k) return k; }
    var byUrl = document.querySelectorAll('script[src*="/api/widget"]');
    for (var i = byUrl.length - 1; i >= 0; i--) {
      var k2 = byUrl[i].getAttribute("data-bot-key");
      if (k2) return k2;
    }
    var byAttr = document.querySelectorAll('script[data-bot-key]');
    if (byAttr.length) return byAttr[byAttr.length - 1].getAttribute("data-bot-key");
    return "${cfg.botKey}";
  })();

  var APP_URL = "${appUrl}";
  var BOT_NAME = "${safeBotName}";
  var WELCOME_MSG = \`${safeWelcome}\`;
  var IS_LEFT = ${isLeft};
  var SUGGESTED_QUESTIONS = ${safeSuggestedQuestions};
  var AUTO_OPEN_DELAY = ${cfg.autoOpenDelay};
  var SESSION_KEY = "domainbot_session_" + BOT_KEY;
  var LEAD_CAPTURE = ${leadCaptureJson};
  var HANDOFF = ${handoffJson};
  var AWAY_ENABLED = ${cfg.businessHoursEnabled};
  var AWAY_MSG = \`${safeAwayMsg}\`;
  var RESPONSE_LENGTH = "${cfg.responseLength}";
  var TONE_OVERRIDE = \`${safeToneOverride}\`;
  var leadCaptured = storageGet("domainbot_lead_" + BOT_KEY) === "1";

  if (!BOT_KEY) {
    console.warn("[DomainBot] No bot key found.");
    return;
  }

  // ── Base styles ───────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "@keyframes db-slide-in{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}",
    "@keyframes db-msg-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes db-dot{0%,80%,100%{transform:scale(.7);opacity:.35}40%{transform:scale(1);opacity:.8}}",
    "@keyframes db-blink{0%,100%{opacity:.8}50%{opacity:0}}",
    "@keyframes db-badge-pop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}",
    "#db-widget-btn{position:fixed;bottom:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:2147483647;display:flex;align-items:center;justify-content:center;transition:transform .25s cubic-bezier(.25,1,.5,1),box-shadow .25s cubic-bezier(.25,1,.5,1),filter .2s;}",
    "#db-widget-btn:hover{transform:scale(1.06);}",
    "#db-widget-btn > svg{width:22px;height:22px;fill:rgba(255,255,255,.92);}",
    "#db-unread-badge{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;background:#ef4444;border-radius:9px;font-size:9px;font-weight:700;color:#fff;display:none;align-items:center;justify-content:center;border:2px solid transparent;box-sizing:border-box;animation:db-badge-pop .25s ease-out;}",
    "#db-unread-badge.db-show{display:flex;}",
    "#db-widget-panel{position:fixed;bottom:88px;max-width:calc(100vw - 28px);box-shadow:0 40px 80px rgba(0,0,0,.35),0 16px 32px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.05);z-index:2147483646;display:none;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;overflow:hidden;}",
    "#db-widget-panel.db-open{animation:db-slide-in .28s cubic-bezier(.16,1,.3,1) forwards;}",
    "#db-widget-header{padding:12px 14px 11px;display:flex;align-items:center;gap:10px;flex-shrink:0;}",
    "#db-widget-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}",
    "#db-widget-avatar svg{width:14px;height:14px;}",
    "#db-widget-header-text{flex:1;min-width:0;}",
    "#db-widget-header-title{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;letter-spacing:-.01em;}",
    "#db-widget-header-status{font-size:11px;display:flex;align-items:center;gap:4px;margin-top:1.5px;letter-spacing:.01em;}",
    ".db-status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;opacity:.8;}",
    "#db-widget-close{background:transparent;border:none;cursor:pointer;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,color .2s;}",
    "#db-widget-close svg{width:13px;height:13px;fill:currentColor;}",
    "#db-widget-messages{flex:1;overflow-y:auto;padding:14px 14px 6px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;}",
    "#db-widget-messages::-webkit-scrollbar{width:2px;}",
    "#db-widget-messages::-webkit-scrollbar-track{background:transparent;}",
    ".db-msg{max-width:86%;padding:10px 14px;font-size:13.5px;line-height:1.58;word-break:break-word;animation:db-msg-in .18s ease-out forwards;}",
    ".db-msg.user{align-self:flex-end;}",
    ".db-msg.assistant{align-self:flex-start;}",
    ".db-msg.db-welcome{background:transparent!important;border:none!important;font-size:12.5px;text-align:center;align-self:center;max-width:100%;padding:4px;border-radius:0!important;}",
    ".db-typing{align-self:flex-start;padding:11px 15px;display:flex;gap:4px;align-items:center;}",
    ".db-dot{width:5px;height:5px;border-radius:50%;}",
    ".db-dot:nth-child(1){animation:db-dot 1.4s 0s ease-in-out infinite;}",
    ".db-dot:nth-child(2){animation:db-dot 1.4s .18s ease-in-out infinite;}",
    ".db-dot:nth-child(3){animation:db-dot 1.4s .36s ease-in-out infinite;}",
    ".db-cursor{display:inline-block;width:1.5px;height:12px;margin-left:2px;border-radius:1px;animation:db-blink .8s step-end infinite;vertical-align:middle;}",
    ".db-citations{align-self:flex-start;display:flex;flex-wrap:wrap;gap:3px;margin-top:-1px;max-width:85%;}",
    ".db-cite-chip{display:inline-flex;align-items:center;gap:2.5px;padding:3px 8px;border-radius:20px;font-size:10.5px;text-decoration:none;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;transition:background .15s,color .15s;}",
    ".db-cite-chip svg{width:9px;height:9px;fill:currentColor;flex-shrink:0;}",
    "#db-widget-input-row{padding:9px 12px 12px;display:flex;gap:7px;align-items:flex-end;flex-shrink:0;}",
    "#db-widget-input{flex:1;border:1px solid transparent;padding:9px 13px;font-size:13.5px;outline:none;resize:none;height:40px;max-height:110px;overflow-y:auto;font-family:inherit;line-height:1.45;transition:border-color .2s,background .2s;}",
    "#db-widget-send{width:38px;height:38px;cursor:pointer;color:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s,transform .15s,box-shadow .2s,filter .2s;}",
    "#db-widget-send svg{width:15px;height:15px;fill:currentColor;}",
    "#db-powered{text-align:center;font-size:9px;padding:2px 0 8px;letter-spacing:.5px;flex-shrink:0;}",
    // Suggested question chips (colors are theme-scoped in renderThemeCss)
    "#db-suggestions{display:flex;flex-wrap:wrap;gap:5px;padding:0 14px 10px;flex-shrink:0;}",
    ".db-suggestion-chip{border-radius:20px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit;transition:background .15s,color .15s,border-color .15s;}",
    // Lead capture form overlay
    "#db-lead-form{display:flex;flex-direction:column;gap:10px;padding:20px 18px;flex:1;overflow-y:auto;}",
    "#db-lead-form h4{font-size:14px;font-weight:600;margin:0;}",
    "#db-lead-form p{font-size:12.5px;margin:0;opacity:.6;line-height:1.5;}",
    "#db-lead-form input{width:100%;padding:9px 12px;font-size:13px;border-radius:10px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.08);font-family:inherit;color:inherit;outline:none;box-sizing:border-box;}",
    "#db-lead-form input:focus{border-color:rgba(128,128,128,.5);}",
    "#db-lead-submit{padding:10px;font-size:13px;font-weight:600;border:none;border-radius:10px;cursor:pointer;font-family:inherit;color:#fff;transition:filter .15s;}",
    "#db-lead-submit:hover{filter:brightness(1.12);}",
    "#db-lead-error{font-size:11.5px;color:#f87171;margin:0;min-height:16px;}",
    // Handoff contact card
    ".db-handoff-card{align-self:flex-start;max-width:86%;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.5;}",
    ".db-handoff-contacts{display:flex;flex-direction:column;gap:5px;margin-top:8px;}",
    ".db-handoff-link{display:flex;align-items:center;gap:6px;font-size:12.5px;text-decoration:none;opacity:.8;}",
    ".db-handoff-link:hover{opacity:1;}",
    ".db-handoff-link svg{width:12px;height:12px;fill:currentColor;flex-shrink:0;}",
    // Away message
    "#db-away-msg{padding:16px 18px;text-align:center;font-size:13px;line-height:1.6;opacity:.65;flex:1;display:flex;align-items:center;justify-content:center;}",
    // Theme-specific overrides
    "${themeCss.replace(/\n/g, " ")}",
    "${brandingCss}",
  ].join("");
  document.head.appendChild(style);

  ${cfg.customCss ? `
  // Custom CSS from bot settings
  var customStyle = document.createElement("style");
  customStyle.textContent = \`${safeCustomCss}\`;
  document.head.appendChild(customStyle);
  ` : ""}

  // ── Storage helpers ───────────────────────────────────────────────────
  function storageGet(key) {
    try { return localStorage.getItem(key) || null; } catch(e) { return null; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  }

  // ── State ──────────────────────────────────────────────────────────────
  var sessionId = storageGet(SESSION_KEY);
  var isOpen = false;
  var firstOpen = true;
  var unreadCount = 0;
  var messagesEl, inputEl, sendBtn, closeBtn, btn, panel;

  // ── Mount ─────────────────────────────────────────────────────────────
  function mount() {
    if (document.getElementById("db-widget-btn")) return;

    btn = document.createElement("button");
    btn.id = "db-widget-btn";
    btn.setAttribute("aria-label", "Open chat");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:rgba(255,255,255,.9);pointer-events:none;"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>' +
      '<div id="db-unread-badge"></div>';

    var S = btn.style;
    var imp = "important";
    S.setProperty("position",        "fixed",                          imp);
    S.setProperty("bottom",          "24px",                           imp);
    S.setProperty("right",           IS_LEFT ? "auto" : "24px",        imp);
    S.setProperty("left",            IS_LEFT ? "24px" : "auto",        imp);
    S.setProperty("width",           "56px",                           imp);
    S.setProperty("height",          "56px",                           imp);
    S.setProperty("border-radius",   "50%",                            imp);
    S.setProperty("border",          "none",                           imp);
    S.setProperty("padding",         "0",                              imp);
    S.setProperty("margin",          "0",                              imp);
    S.setProperty("cursor",          "pointer",                        imp);
    S.setProperty("display",         "flex",                           imp);
    S.setProperty("align-items",     "center",                         imp);
    S.setProperty("justify-content", "center",                         imp);
    S.setProperty("z-index",         "2147483647",                     imp);
    S.setProperty("transition",      "transform .2s,box-shadow .2s",   imp);
    S.setProperty("outline",         "none",                           imp);
    S.setProperty("box-sizing",      "border-box",                     imp);
    S.setProperty("overflow",        "visible",                        imp);
    S.setProperty("visibility",      "visible",                        imp);
    S.setProperty("opacity",         "1",                              imp);
    S.setProperty("pointer-events",  "auto",                           imp);
    S.setProperty("transform",       "none",                           imp);

    panel = document.createElement("div");
    panel.id = "db-widget-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat with " + BOT_NAME);
    var PS = panel.style;
    PS.setProperty("position",   "fixed",                          imp);
    PS.setProperty("bottom",     "92px",                           imp);
    PS.setProperty("right",      IS_LEFT ? "auto" : "24px",        imp);
    PS.setProperty("left",       IS_LEFT ? "24px" : "auto",        imp);
    PS.setProperty("z-index",    "2147483646",                     imp);
    PS.setProperty("display",    "none",                           imp);
    PS.setProperty("visibility", "visible",                        imp);
    PS.setProperty("opacity",    "1",                              imp);
    PS.setProperty("transform",  "none",                           imp);

    panel.innerHTML =
      '<div id="db-widget-header">' +
        '<div id="db-widget-avatar">${avatarHtml}</div>' +
        '<div id="db-widget-header-text">' +
          '<div id="db-widget-header-title">' + BOT_NAME + '</div>' +
          '<div id="db-widget-header-status"><span class="db-status-dot"></span>Ask me anything</div>' +
        '</div>' +
        '<button id="db-widget-close" aria-label="Close chat">' +
          '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div id="db-widget-messages" role="log" aria-live="polite"></div>' +
      '<div id="db-suggestions"></div>' +
      '<div id="db-widget-input-row">' +
        '<textarea id="db-widget-input" placeholder="Ask a question\u2026" rows="1" aria-label="Message"></textarea>' +
        '<button id="db-widget-send" aria-label="Send message">' +
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div id="db-powered">powered by&nbsp;<a href="${appUrl}" style="text-decoration:none;letter-spacing:.3px;" target="_blank" rel="noopener">DomainBot\u2122</a></div>';

    // ── Lead capture form (injected into panel) ───────────────────────
    if (LEAD_CAPTURE.enabled && !leadCaptured) {
      var leadForm = document.createElement("div");
      leadForm.id = "db-lead-form";
      var leadH = document.createElement("h4");
      leadH.textContent = LEAD_CAPTURE.title;
      var leadSub = document.createElement("p");
      leadSub.textContent = LEAD_CAPTURE.subtitle;
      leadForm.appendChild(leadH);
      leadForm.appendChild(leadSub);
      var leadInputs = {};
      var fieldLabels = { name: "Your name", email: "Your email", phone: "Your phone" };
      LEAD_CAPTURE.fields.forEach(function(f) {
        var inp = document.createElement("input");
        inp.type = f === "email" ? "email" : f === "phone" ? "tel" : "text";
        inp.placeholder = fieldLabels[f] || f;
        inp.id = "db-lead-" + f;
        leadForm.appendChild(inp);
        leadInputs[f] = inp;
      });
      var leadErr = document.createElement("p");
      leadErr.id = "db-lead-error";
      var leadBtn = document.createElement("button");
      leadBtn.id = "db-lead-submit";
      leadBtn.textContent = "Start Chat \u2192";
      leadBtn.style.background = "${cfg.primaryColor}";
      leadForm.appendChild(leadErr);
      leadForm.appendChild(leadBtn);
      leadBtn.addEventListener("click", function() {
        var vals = {};
        var hasVal = false;
        LEAD_CAPTURE.fields.forEach(function(f) {
          var v = leadInputs[f] ? leadInputs[f].value.trim() : "";
          vals[f] = v;
          if (v) hasVal = true;
        });
        if (!hasVal) { leadErr.textContent = "Please fill in at least one field."; return; }
        if (vals.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(vals.email)) {
          leadErr.textContent = "Please enter a valid email."; return;
        }
        leadBtn.disabled = true;
        leadBtn.textContent = "Saving\u2026";
        fetch(APP_URL + "/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_key: BOT_KEY, session_id: sessionId, source: "form", name: vals.name || null, email: vals.email || null, phone: vals.phone || null }),
        }).finally(function() {
          storageSet("domainbot_lead_" + BOT_KEY, "1");
          leadCaptured = true;
          leadForm.remove();
          var msgs = document.getElementById("db-widget-messages");
          if (msgs) msgs.style.display = "";
          var suggestions = document.getElementById("db-suggestions");
          if (suggestions) suggestions.style.display = "";
          var inputRow = document.getElementById("db-widget-input-row");
          if (inputRow) inputRow.style.display = "";
          showWelcome();
        });
      });
      // Hide chat area until lead captured
      panel.querySelector("#db-widget-messages").style.display = "none";
      panel.querySelector("#db-suggestions").style.display = "none";
      panel.querySelector("#db-widget-input-row").style.display = "none";
      panel.insertBefore(leadForm, panel.querySelector("#db-widget-input-row"));
    }

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    messagesEl = document.getElementById("db-widget-messages");
    inputEl    = document.getElementById("db-widget-input");
    sendBtn    = document.getElementById("db-widget-send");
    closeBtn   = document.getElementById("db-widget-close");

    btn.addEventListener("click", togglePanel);
    if (closeBtn) closeBtn.addEventListener("click", togglePanel);
    if (sendBtn)  sendBtn.addEventListener("click", sendMessage);
    if (inputEl) {
      inputEl.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      inputEl.addEventListener("input", function() {
        this.style.height = "40px";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
      });
    }
    console.log("[DomainBot] Widget mounted. Bot:", BOT_KEY.substring(0, 8) + "...");
  }

  if (document.body) { mount(); }
  else { document.addEventListener("DOMContentLoaded", mount); }

  // ── Auto-open ─────────────────────────────────────────────────────────
  if (AUTO_OPEN_DELAY > 0) {
    setTimeout(function() { if (!isOpen) togglePanel(); }, AUTO_OPEN_DELAY * 1000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function getBadge() { return document.getElementById("db-unread-badge"); }

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.style.setProperty("display", "flex", "important");
      panel.classList.add("db-open");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:rgba(255,255,255,.7);pointer-events:none;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
        '<div id="db-unread-badge"></div>';
      unreadCount = 0;
      var b = getBadge();
      if (b) { b.textContent = ""; b.style.display = "none"; }
      if (inputEl) inputEl.focus();
      if (firstOpen) { firstOpen = false; loadHistory(); }
      scrollToBottom();
    } else {
      panel.style.setProperty("display", "none", "important");
      panel.classList.remove("db-open");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:rgba(255,255,255,.9);pointer-events:none;"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>' +
        '<div id="db-unread-badge"></div>';
    }
  }

  function showWelcome() {
    if (!messagesEl || messagesEl.children.length > 0) return;
    var msg = WELCOME_MSG || "\\uD83D\\uDC4B Hi! Ask me anything about this website.";
    var div = document.createElement("div");
    div.className = "db-msg db-welcome";
    div.textContent = msg;
    messagesEl.appendChild(div);
    showSuggestions();
  }

  function showSuggestions() {
    var container = document.getElementById("db-suggestions");
    if (!container || !SUGGESTED_QUESTIONS.length) return;
    container.innerHTML = "";
    SUGGESTED_QUESTIONS.forEach(function(q) {
      var btn = document.createElement("button");
      btn.className = "db-suggestion-chip";
      btn.textContent = q;
      btn.onclick = function() {
        container.style.display = "none";
        if (inputEl) { inputEl.value = q; }
        sendMessage();
      };
      container.appendChild(btn);
    });
  }

  function showAwayMessage() {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    var div = document.createElement("div");
    div.id = "db-away-msg";
    div.textContent = AWAY_MSG || "We\u2019re currently offline. Please check back later.";
    messagesEl.appendChild(div);
    if (inputEl) inputEl.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (inputEl) inputEl.placeholder = "Currently offline\u2026";
  }

  async function loadHistory() {
    if (AWAY_ENABLED) { showAwayMessage(); return; }
    if (!sessionId) { showWelcome(); return; }
    try {
      var res = await fetch(APP_URL + "/api/chat?bot_key=" + BOT_KEY + "&session_id=" + sessionId);
      var data = await res.json();
      var msgs = (data && data.messages) ? data.messages : [];
      if (msgs.length === 0) { showWelcome(); return; }
      msgs.forEach(function(m) { appendMessage(m.role, m.content); });
      scrollToBottom();
    } catch(e) {
      showWelcome();
    }
  }

  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, content, citations) {
    var div = document.createElement("div");
    div.className = "db-msg " + role;
    div.textContent = content;
    if (messagesEl) messagesEl.appendChild(div);
    if (citations && citations.length > 0) appendCitations(citations);
    scrollToBottom();
    return div;
  }

  function appendCitations(citations) {
    if (!messagesEl) return;
    var citeEl = document.createElement("div");
    citeEl.className = "db-citations";
    citeEl.innerHTML = citations.slice(0, 3).map(function(c) {
      var label = (c.title || c.url);
      if (label.length > 30) label = label.substring(0, 30) + "\\u2026";
      return '<a href="' + c.url + '" target="_blank" rel="noopener" class="db-cite-chip">' +
        '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>' +
        label + '</a>';
    }).join("");
    messagesEl.appendChild(citeEl);
    scrollToBottom();
  }

  function makeTypingIndicator() {
    if (!messagesEl) return null;
    var div = document.createElement("div");
    div.className = "db-typing";
    div.innerHTML = '<span class="db-dot"></span><span class="db-dot"></span><span class="db-dot"></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function setLoading(loading) {
    if (sendBtn) sendBtn.disabled = loading;
    if (inputEl) inputEl.disabled = loading;
  }

  // ── Markdown renderer ─────────────────────────────────────────────────
  function renderMarkdown(text) {
    // 1. HTML-escape first (treat LLM output as untrusted)
    var s = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // 2. Bold: **text** or __text__
    s = s.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
    // 3. Process line by line
    var lines = s.split("\\n");
    var out = [];
    var inUl = false, inOl = false;
    function closeLists() {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var h3Match = line.match(/^###\\s+(.+)/);
      var h2Match = line.match(/^##\\s+(.+)/);
      var h1Match = line.match(/^#\\s+(.+)/);
      var ulMatch = line.match(/^[\\s]*[-*]\\s+(.+)/);
      var olMatch = line.match(/^[\\s]*\\d+\\.\\s+(.+)/);
      var hrMatch = /^-{3,}$/.test(line.trim());
      if (h3Match) {
        closeLists();
        out.push('<div class="db-h3">' + h3Match[1] + '</div>');
      } else if (h2Match) {
        closeLists();
        out.push('<div class="db-h2">' + h2Match[1] + '</div>');
      } else if (h1Match) {
        closeLists();
        out.push('<div class="db-h2">' + h1Match[1] + '</div>');
      } else if (hrMatch) {
        closeLists();
        out.push('<hr class="db-hr">');
      } else if (ulMatch) {
        if (inOl) { out.push("</ol>"); inOl = false; }
        if (!inUl) { out.push("<ul>"); inUl = true; }
        out.push("<li>" + ulMatch[1] + "</li>");
      } else if (olMatch) {
        if (inUl) { out.push("</ul>"); inUl = false; }
        if (!inOl) { out.push("<ol>"); inOl = true; }
        out.push("<li>" + olMatch[1] + "</li>");
      } else {
        closeLists();
        if (line.trim()) out.push("<p>" + line + "</p>");
      }
    }
    closeLists();
    return out.join("");
  }

  // ── Streaming SSE ─────────────────────────────────────────────────────
  function appendHandoffCard() {
    var card = document.createElement("div");
    card.className = "db-handoff-card db-msg assistant";
    card.innerHTML = '<p style="margin:0 0 4px;">' + (HANDOFF.message || "You can reach our team at:") + "</p>";
    var contacts = document.createElement("div");
    contacts.className = "db-handoff-contacts";
    if (HANDOFF.email) {
      contacts.innerHTML += '<a href="mailto:' + HANDOFF.email + '" class="db-handoff-link"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' + HANDOFF.email + "</a>";
    }
    if (HANDOFF.phone) {
      contacts.innerHTML += '<a href="tel:' + HANDOFF.phone + '" class="db-handoff-link"><svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>' + HANDOFF.phone + "</a>";
    }
    if (HANDOFF.url) {
      contacts.innerHTML += '<a href="' + HANDOFF.url + '" target="_blank" rel="noopener" class="db-handoff-link"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V19c0-.55.45-1 1-1s1 .45 1 1v.93A8.01 8.01 0 0 1 4.07 13H5c.55 0 1 .45 1 1s-.45 1-1 1H4.07A8.01 8.01 0 0 1 11 4.07V5c0 .55-.45 1-1 1s-1-.45-1-1v-.93A8.01 8.01 0 0 1 19.93 11H19c-.55 0-1-.45-1-1s.45-1 1-1h.93A8.01 8.01 0 0 1 11 19.93z"/></svg>Contact page</a>';
    }
    card.appendChild(contacts);
    if (messagesEl) messagesEl.appendChild(card);
    scrollToBottom();
  }

  async function sendMessage() {
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text) return;

    // Block if away mode enabled
    if (AWAY_ENABLED) return;

    // Check lead capture gate
    if (LEAD_CAPTURE.enabled && !leadCaptured) return;

    inputEl.value = "";
    inputEl.style.height = "40px";
    appendMessage("user", text, null);

    // Handoff detection
    if (HANDOFF.enabled && HANDOFF.trigger && text.toLowerCase().indexOf(HANDOFF.trigger) !== -1) {
      appendHandoffCard();
      return;
    }

    var typingEl = makeTypingIndicator();
    setLoading(true);

    try {
      var res = await fetch(APP_URL + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_key: BOT_KEY, message: text, session_id: sessionId, response_length: RESPONSE_LENGTH, tone_override: TONE_OVERRIDE }),
      });

      var contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        if (typingEl) typingEl.remove();
        var assistantEl = appendMessage("assistant", "", null);
        var cursorEl = document.createElement("span");
        cursorEl.className = "db-cursor";
        assistantEl.appendChild(cursorEl);

        var fullText = "";
        var finalCitations = [];
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        while (true) {
          var _ref = await reader.read();
          if (_ref.done) break;
          buffer += decoder.decode(_ref.value, { stream: true });
          var lines = buffer.split("\\n");
          buffer = lines.pop() || "";

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line.startsWith("data:")) continue;
            var jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            try {
              var evt = JSON.parse(jsonStr);
              if (evt.chunk) {
                fullText += evt.chunk;
                assistantEl.textContent = fullText;
                assistantEl.appendChild(cursorEl);
                scrollToBottom();
              }
              if (evt.session_id) { sessionId = evt.session_id; storageSet(SESSION_KEY, sessionId); }
              if (evt.citations) finalCitations = evt.citations;
              if (evt.error) assistantEl.textContent = "Sorry, something went wrong. Please try again.";
            } catch(e) {}
          }
        }

        cursorEl.remove();
        // Apply markdown formatting to final response
        assistantEl.innerHTML = renderMarkdown(fullText);
        if (finalCitations.length > 0) appendCitations(finalCitations);

        if (!isOpen) {
          unreadCount++;
          var b = getBadge();
          if (b) { b.textContent = String(unreadCount); b.style.display = "flex"; }
        }
      } else {
        var data = await res.json();
        if (typingEl) typingEl.remove();
        if (data.error) {
          appendMessage("assistant", "Sorry: " + data.error, null);
        } else {
          if (data.session_id) { sessionId = data.session_id; storageSet(SESSION_KEY, sessionId); }
          appendMessage("assistant", data.answer || data.content || "...", data.citations || null);
        }
      }
    } catch(e) {
      if (typingEl) typingEl.remove();
      var errMsg = e && e.message ? e.message : "";
      appendMessage("assistant", errMsg.indexOf("Failed to fetch") !== -1
        ? "Network error — check your connection or ad blocker."
        : "Something went wrong. Please try again.", null);
    } finally {
      setLoading(false);
    }
  }

})();
`.trim();
}
