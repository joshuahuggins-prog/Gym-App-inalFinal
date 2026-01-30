import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./theme.css";
import App from "./App";

import { initStorage } from "./utils/storage";

initStorage();

// TEMP DEBUG: capture InvalidCharacterError source on white-screen crashes
(() => {
  const wrap = (obj, name) => {
    const orig = obj && obj[name];
    if (!orig) return;
    obj[name] = function (...args) {
      try {
        return orig.apply(this, args);
      } catch (e) {
        // Log EVERYTHING we can while still allowing the crash to show up
        console.error(`🔥 THROW in ${name}`, { args, error: e, thisObj: this });
        throw e;
      }
    };
  };

  // Most common sources of InvalidCharacterError
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

  // Also grab global errors
  window.addEventListener("error", (evt) => {
    console.error("🔥 window.error", evt?.error || evt);
  });
  window.addEventListener("unhandledrejection", (evt) => {
    console.error("🔥 unhandledrejection", evt?.reason || evt);
  });
})();

// PWA service worker
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker (offline + installable)
serviceWorkerRegistration.unregister();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
};
)