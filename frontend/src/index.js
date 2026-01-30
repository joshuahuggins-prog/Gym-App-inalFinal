// frontend/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import "./theme.css";
import App from "./App";

import { initStorage } from "./utils/storage";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

initStorage();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Back to normal PWA behaviour
serviceWorkerRegistration.register();