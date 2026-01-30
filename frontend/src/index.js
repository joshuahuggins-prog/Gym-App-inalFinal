import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./theme.css";
import App from "./App";

// TEMP DEBUG: capture InvalidCharacterError source on white-screen crashes
(() => {
  const wrap = (obj, name) => {
    const orig = obj && obj[name];
    if (!orig) return;
    obj[name] = function (...args) {
      try {
        return orig.apply(this, args);
      } catch (e) {
        console.error(`🔥 THROW in ${name}`, { args, error: e, thisObj: this });
        throw e;
      }
    };
  };

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

import { initStorage } from "./utils/storage";

// Wrap initStorage so we can see if it’s the trigger
try {
  initStorage();
  console.log("✅ initStorage ok");
} catch (e) {
  console.error("🔥 initStorage threw", e);
  throw e;
}

// PWA service worker
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// DEBUG: disable service worker while diagnosing
serviceWorkerRegistration.unregister();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}