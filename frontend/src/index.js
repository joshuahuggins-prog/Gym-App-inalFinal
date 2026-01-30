// frontend/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import "./theme.css";
import App from "./App";

import { initStorage } from "./utils/storage";

// PWA service worker (keep your original behavior)
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

/**
 * TEMP DEBUG: hooks to catch InvalidCharacterError sources.
 * (Runs after imports, but before initStorage() + render.)
 */
(() => {
  const wrap = (obj, name) => {
    const orig = obj && obj[name];
    if (typeof orig !== "function") return;

    obj[name] = function (...args) {
      try {
        return orig.apply(this, args);
      } catch (e) {
        console.error(`🔥 THROW in ${name}`, { args, error: e });
        throw e;
      }
    };
  };

  // InvalidCharacterError throwers
  wrap(Document.prototype, "createElement");
  wrap(Document.prototype, "createElementNS");

  wrap(DOMTokenList.prototype, "add");
  wrap(DOMTokenList.prototype, "remove");
  wrap(DOMTokenList.prototype, "toggle");
  wrap(DOMTokenList.prototype, "replace");

  wrap(Document.prototype, "querySelector");
  wrap(Document.prototype, "querySelectorAll");
  wrap(Element.prototype, "querySelector");
  wrap(Element.prototype, "querySelectorAll");
  wrap(Element.prototype, "matches");

  window.addEventListener("error", (evt) => {
    console.error("🔥 window.error", evt?.error || evt);
  });
  window.addEventListener("unhandledrejection", (evt) => {
    console.error("🔥 unhandledrejection", evt?.reason || evt);
  });

  console.log("✅ debug hooks armed");
})();

/**
 * If initStorage throws, show a visible fallback instead of a white screen.
 */
const renderFatal = (title, err) => {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  const msg =
    (err && (err.stack || err.message || String(err))) || "Unknown error";

  rootEl.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
      padding: 16px;
      max-width: 860px;
      margin: 0 auto;
      line-height: 1.4;
    ">
      <h2 style="margin: 0 0 8px;">${title}</h2>
      <p style="margin: 0 0 12px; color: #666;">
        The app crashed before it could render. Open DevTools Console to see the 🔥 logs.
      </p>
      <pre style="
        background: #111;
        color: #0f0;
        padding: 12px;
        border-radius: 8px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      ">${msg.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
      <p style="margin-top: 12px; color: #666;">
        Tip: If this started after a reset, it’s likely a default/empty-state value causing InvalidCharacterError.
      </p>
    </div>
  `;
};

try {
  initStorage();
  console.log("✅ initStorage ok");
} catch (e) {
  console.error("🔥 initStorage threw", e);
  renderFatal("Storage init failed", e);
  // Stop here so we don't attempt to render App()
  throw e;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Root element "#root" not found');
}

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Keep your original SW behavior
serviceWorkerRegistration.register();