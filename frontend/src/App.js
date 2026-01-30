// frontend/src/App.js
import React, { useState } from "react";
import {
  Home,
  History,
  TrendingUp,
  FileText,
  Dumbbell,
  Settings,
  Download,
} from "lucide-react";

import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";
import ProgrammesPage from "./pages/ProgrammesPage";
import ExercisesPage from "./pages/ExercisesPage";
import ExercisePage from "./pages/ExercisePage"; // ✅ NEW combined page
import SettingsPage from "./pages/SettingsPage";
import ImportExportPage from "./pages/ImportExportPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";

import { SettingsProvider } from "./contexts/SettingsContext";
import { Toaster } from "./components/ui/sonner";

import useUpsideDown from "./hooks/useUpsideDown";

const App = () => {
  const upsideDown = useUpsideDown();

  const [currentPage, setCurrentPage] = useState("home");

  const [editingWorkoutId, setEditingWorkoutId] = useState(null);

  const isEditMode = currentPage === "edit-workout";

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== "edit-workout") setEditingWorkoutId(null);
  };

  const openEditWorkout = (workoutId) => {
    if (!workoutId) return;
    setEditingWorkoutId(workoutId);
    setCurrentPage("edit-workout");
  };

  const closeEditWorkout = () => {
    setEditingWorkoutId(null);
    setCurrentPage("history");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;

      case "history":
        return <HistoryPage onEditWorkout={openEditWorkout} />;

      case "edit-workout":
        if (!editingWorkoutId) {
          return <HistoryPage onEditWorkout={openEditWorkout} />;
        }
        return <EditWorkoutPage workoutId={editingWorkoutId} onClose={closeEditWorkout} />;

      case "progress":
        return <ProgressPage />;

      // ✅ NEW combined page
      case "plan":
        return <ExercisePage />;

      // Keep old pages while you test
      case "programmes":
        return <ProgrammesPage />;

      case "exercises":
        return <ExercisesPage />;

      case "settings":
        return <SettingsPage />;

      case "import-export":
        return <ImportExportPage />;

      default:
        return <HomePage />;
    }
  };

  return (
    <SettingsProvider>
      <div
        className={`fixed inset-0 transform-gpu transition-transform duration-350 ease-out ${
          upsideDown ? "rotate-180" : ""
        }`}
      >
        <div className="flex flex-col h-full bg-background text-foreground">
          <main className={`flex-1 overflow-y-auto ${isEditMode ? "" : "pb-20"}`}>
            {renderPage()}
          </main>

          {!isEditMode && (
            <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex items-center h-16 px-2 min-w-max">
                  <NavButton
                    icon={<Home className="w-5 h-5" />}
                    label="Today"
                    active={currentPage === "home"}
                    onClick={() => handleNavigate("home")}
                  />
                  <NavButton
                    icon={<History className="w-5 h-5" />}
                    label="History"
                    active={currentPage === "history"}
                    onClick={() => handleNavigate("history")}
                  />
                  <NavButton
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Progress"
                    active={currentPage === "progress"}
                    onClick={() => handleNavigate("progress")}
                  />

                  {/* ✅ NEW single combined nav button */}
                  <NavButton
                    icon={<Dumbbell className="w-5 h-5" />}
                    label="Plan"
                    active={currentPage === "plan"}
                    onClick={() => handleNavigate("plan")}
                  />

                  {/* Keep old ones until you're happy */}
                  <NavButton
                    icon={<FileText className="w-5 h-5" />}
                    label="Programmes"
                    active={currentPage === "programmes"}
                    onClick={() => handleNavigate("programmes")}
                  />
                  <NavButton
                    icon={<Dumbbell className="w-5 h-5" />}
                    label="Exercises"
                    active={currentPage === "exercises"}
                    onClick={() => handleNavigate("exercises")}
                  />

                  <NavButton
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    active={currentPage === "settings"}
                    onClick={() => handleNavigate("settings")}
                  />
                  <NavButton
                    icon={<Download className="w-5 h-5" />}
                    label="Data"
                    active={currentPage === "import-export"}
                    onClick={() => handleNavigate("import-export")}
                  />
                </div>
              </div>
            </nav>
          )}

          <Toaster />
        </div>
      </div>
    </SettingsProvider>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
      active
        ? "text-primary scale-105"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`}
  >
    <div className={active ? "glow-primary" : ""}>{icon}</div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;