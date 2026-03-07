import { NextResponse } from "next/server";

/** GET /api/widget — serves the embeddable chatbot widget script */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";

  // Allow callers to get the script with their bot_key baked in
  const botKey = searchParams.get("bot_key") || "";

  const script = buildWidgetScript(origin, botKey);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function buildWidgetScript(appUrl: string, botKey: string): string {
  return `
(function () {
  "use strict";

  var BOT_KEY = document.currentScript
    ? (document.currentScript.getAttribute("data-bot-key") || "${botKey}")
    : "${botKey}";
  var APP_URL = "${appUrl}";
  var SESSION_KEY = "domainbot_session_" + BOT_KEY;

  if (!BOT_KEY) {
    console.warn("[DomainBot] No bot key found. Set data-bot-key on the script tag.");
    return;
  }

  // ── Styles ─────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#db-widget-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#a855f7);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(6,182,212,.4);z-index:2147483640;display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;}",
    "#db-widget-btn:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(6,182,212,.6);}",
    "#db-widget-btn svg{width:24px;height:24px;fill:white;}",
    "#db-widget-panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;background:#0d0d14;border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.7);z-index:2147483639;display:none;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;}",
    "#db-widget-panel.db-open{display:flex;}",
    "#db-widget-header{padding:16px;background:linear-gradient(135deg,rgba(6,182,212,.15),rgba(168,85,247,.15));border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;}",
    "#db-widget-header h4{margin:0;font-size:14px;font-weight:600;color:#fff;letter-spacing:.3px;}",
    "#db-widget-header span{font-size:11px;color:rgba(255,255,255,.4);}",
    "#db-widget-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.5);font-size:18px;padding:0 4px;line-height:1;}",
    "#db-widget-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}",
    "#db-widget-messages::-webkit-scrollbar{width:4px;}",
    "#db-widget-messages::-webkit-scrollbar-track{background:transparent;}",
    "#db-widget-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}",
    ".db-msg{max-width:84%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-break:break-word;}",
    ".db-msg.user{align-self:flex-end;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;border-bottom-right-radius:4px;}",
    ".db-msg.assistant{align-self:flex-start;background:rgba(255,255,255,.06);color:rgba(255,255,255,.9);border-bottom-left-radius:4px;}",
    ".db-msg.typing{color:rgba(255,255,255,.4);}",
    ".db-citations{align-self:flex-start;font-size:11px;color:rgba(255,255,255,.35);margin-top:-4px;}",
    ".db-citations a{color:#06b6d4;text-decoration:none;}",
    "#db-widget-input-row{padding:12px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;}",
    "#db-widget-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;outline:none;resize:none;height:40px;max-height:120px;overflow-y:auto;font-family:inherit;}",
    "#db-widget-input::placeholder{color:rgba(255,255,255,.3);}",
    "#db-widget-input:focus{border-color:rgba(6,182,212,.4);}",
    "#db-widget-send{background:linear-gradient(135deg,#06b6d4,#0891b2);border:none;border-radius:10px;width:40px;height:40px;cursor:pointer;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s;}",
    "#db-widget-send:hover{opacity:.85;}",
    "#db-widget-send:disabled{opacity:.4;cursor:default;}",
    "#db-powered{text-align:center;font-size:10px;color:rgba(255,255,255,.2);padding:4px 0 8px;}"
  ].join("");
  document.head.appendChild(style);

  // ── State ──────────────────────────────────────────────────────────────
  var sessionId = sessionStorage.getItem(SESSION_KEY) || null;
  var isOpen = false;

  // ── DOM ────────────────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.id = "db-widget-btn";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';

  var panel = document.createElement("div");
  panel.id = "db-widget-panel";
  panel.innerHTML =
    '<div id="db-widget-header">' +
      '<div><h4>Chat with us</h4><span id="db-bot-domain"></span></div>' +
      '<button id="db-widget-close" aria-label="Close">✕</button>' +
    '</div>' +
    '<div id="db-widget-messages"></div>' +
    '<div id="db-widget-input-row">' +
      '<textarea id="db-widget-input" placeholder="Ask a question…" rows="1"></textarea>' +
      '<button id="db-widget-send" aria-label="Send">➤</button>' +
    '</div>' +
    '<div id="db-powered">Powered by <a href="' + APP_URL + '" style="color:#06b6d4;text-decoration:none;" target="_blank">DomainBot</a></div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var messagesEl = document.getElementById("db-widget-messages");
  var inputEl = document.getElementById("db-widget-input");
  var sendBtn = document.getElementById("db-widget-send");
  var closeBtn = document.getElementById("db-widget-close");

  // ── Helpers ────────────────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add("db-open");
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      inputEl.focus();
      scrollToBottom();
    } else {
      panel.classList.remove("db-open");
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
    }
  }

  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, content, citations) {
    var div = document.createElement("div");
    div.className = "db-msg " + role;
    div.textContent = content;
    messagesEl.appendChild(div);

    if (citations && citations.length > 0) {
      var citeEl = document.createElement("div");
      citeEl.className = "db-citations";
      citeEl.innerHTML = "Sources: " + citations.slice(0, 3).map(function(c) {
        return '<a href="' + c.url + '" target="_blank">' + (c.title || c.url) + '</a>';
      }).join(", ");
      messagesEl.appendChild(citeEl);
    }

    scrollToBottom();
  }

  function setLoading(loading) {
    sendBtn.disabled = loading;
    inputEl.disabled = loading;
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    appendMessage("user", text, null);

    // Typing indicator
    var typingEl = document.createElement("div");
    typingEl.className = "db-msg assistant typing";
    typingEl.textContent = "Thinking…";
    messagesEl.appendChild(typingEl);
    scrollToBottom();
    setLoading(true);

    try {
      var res = await fetch(APP_URL + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_key: BOT_KEY,
          message: text,
          session_id: sessionId,
        }),
      });

      var data = await res.json();
      typingEl.remove();

      if (data.error) {
        appendMessage("assistant", "Sorry, something went wrong. Please try again.", null);
      } else {
        if (data.session_id) {
          sessionId = data.session_id;
          sessionStorage.setItem(SESSION_KEY, sessionId);
        }
        appendMessage("assistant", data.answer, data.citations);
      }
    } catch (e) {
      typingEl.remove();
      appendMessage("assistant", "Network error. Please check your connection.", null);
    } finally {
      setLoading(false);
    }
  }

  // ── Event listeners ────────────────────────────────────────────────────
  btn.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", togglePanel);

  sendBtn.addEventListener("click", sendMessage);

  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener("input", function() {
    this.style.height = "40px";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

})();
`.trim();
}
