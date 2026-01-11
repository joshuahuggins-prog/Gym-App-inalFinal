import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { initStorage } from "./utils/storage";

initStorage();

// PWA service worker
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker (offline + installable)
serviceWorkerRegistration.register();
