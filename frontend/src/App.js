// frontend/src/App.js
import React, { useEffect, useState } from "react";

// Pages (use your existing separate pages)
import HomePage from "./pages/HomePage";
import ProgrammesPage from "./pages/ProgrammesPage";
import ExercisesPage from "./pages/ExercisesPage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("gym_current_page") || "home";
  });

  useEffect(() => {
    localStorage.setItem("gym_current_page", currentPage);
  }, [currentPage]);

  const go = (page) => setCurrentPage(page);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Content */}
      {currentPage === "home" && <HomePage />}
      {currentPage === "programmes" && <ProgrammesPage />}
      {currentPage === "exercises" && <ExercisesPage />}
      {currentPage === "history" && <HistoryPage />}
      {currentPage === "progress" && <ProgressPage />}
      {currentPage === "settings" && <SettingsPage />}

      {/* Bottom Nav (TEXT ONLY - no icons) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-2 py-2 grid grid-cols-6 gap-1">
          <button
            onClick={() => go("home")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "home"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            Home
          </button>

          <button
            onClick={() => go("programmes")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "programmes"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            Programmes
          </button>

          <button
            onClick={() => go("exercises")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "exercises"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            Exercises
          </button>

          <button
            onClick={() => go("history")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "history"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            History
          </button>

          <button
            onClick={() => go("progress")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "progress"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            Progress
          </button>

          <button
            onClick={() => go("settings")}
            className={cx(
              "py-2 rounded-lg text-xs font-semibold",
              currentPage === "settings"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}