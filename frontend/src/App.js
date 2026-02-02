// src/App.js
import React, { useCallback, useMemo, useState } from "react";
import {
  History,
  TrendingUp,
  FileText,
  Dumbbell,
  Settings,
  Download,
  Plus,
} from "lucide-react";

import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";
import ProgrammesPage from "./pages/ProgrammesPage";
import ExercisesPage from "./pages/ExercisesPage";
import SettingsPage from "./pages/SettingsPage";
import ImportExportPage from "./pages/ImportExportPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";
import ThemeCreatorPage from "./pages/ThemeCreatorPage";

import { SettingsProvider } from "./contexts/SettingsContext";
import { Toaster } from "./components/ui/sonner";

import useUpsideDown from "./hooks/useUpsideDown";

const PAGES = {
  HOME: "home",
  HISTORY: "history",
  EDIT_WORKOUT: "edit-workout",
  PROGRESS: "progress",
  PROGRAMMES: "programmes",
  EXERCISES: "exercises",
  SETTINGS: "settings",
  IMPORT_EXPORT: "import-export",
  THEME_CREATOR: "themeCreator",
};

const App = () => {
  const upsideDown = useUpsideDown();

  const [currentPage, setCurrentPage] = useState(PAGES.HOME);

  // Edit workout page state
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);

  const isEditMode = currentPage === PAGES.EDIT_WORKOUT;

  const handleNavigate = useCallback((page) => {
    setCurrentPage(page);

    // If navigating away from edit screen, clear selected workout
    if (page !== PAGES.EDIT_WORKOUT) setEditingWorkoutId(null);
  }, []);

  // Called by HistoryPage pencil button
  const openEditWorkout = useCallback((workoutId) => {
    if (!workoutId) return;
    setEditingWorkoutId(workoutId);
    setCurrentPage(PAGES.EDIT_WORKOUT);
  }, []);

  const closeEditWorkout = useCallback(() => {
    setEditingWorkoutId(null);
    setCurrentPage(PAGES.HISTORY);
  }, []);

  const openThemeCreator = useCallback(() => {
    setCurrentPage(PAGES.THEME_CREATOR);
  }, []);

  const closeThemeCreator = useCallback(() => {
    setCurrentPage(PAGES.SETTINGS);
  }, []);

  // ✅ Home removed from the nav items (replaced by + button)
  const navItems = useMemo(
    () => [
      { key: PAGES.HISTORY, label: "History", icon: <History className="w-5 h-5" /> },
      { key: PAGES.PROGRESS, label: "Progress", icon: <TrendingUp className="w-5 h-5" /> },
      { key: PAGES.PROGRAMMES, label: "Programmes", icon: <FileText className="w-5 h-5" /> },
      { key: PAGES.EXERCISES, label: "Exercises", icon: <Dumbbell className="w-5 h-5" /> },
      { key: PAGES.SETTINGS, label: "Settings", icon: <Settings className="w-5 h-5" /> },
      { key: PAGES.IMPORT_EXPORT, label: "Data", icon: <Download className="w-5 h-5" /> },
    ],
    []
  );

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.HOME:
        return <HomePage />;

      case PAGES.HISTORY:
        return <HistoryPage onEditWorkout={openEditWorkout} />;

      case PAGES.EDIT_WORKOUT:
        if (!editingWorkoutId) {
          return <HistoryPage onEditWorkout={openEditWorkout} />;
        }
        return (
          <EditWorkoutPage workoutId={editingWorkoutId} onClose={closeEditWorkout} />
        );

      case PAGES.PROGRESS:
        return <ProgressPage />;

      case PAGES.PROGRAMMES:
        return <ProgrammesPage />;

      case PAGES.EXERCISES:
        return <ExercisesPage />;

      case PAGES.SETTINGS:
        return <SettingsPage onCreateTheme={openThemeCreator} />;

      case PAGES.THEME_CREATOR:
        return <ThemeCreatorPage onBack={closeThemeCreator} />;

      case PAGES.IMPORT_EXPORT:
        return <ImportExportPage />;

      default:
        return <HomePage />;
    }
  };

  const handlePlus = useCallback(() => {
    // ✅ Plus replaces Home tab: go to Today/Home page
    handleNavigate(PAGES.HOME);
  }, [handleNavigate]);

  return (
    <SettingsProvider>
      <div
        className={`fixed inset-0 transform-gpu transition-transform duration-350 ease-out ${
          upsideDown ? "rotate-180" : ""
        }`}
      >
        <div className="flex flex-col h-full bg-background text-foreground">
          {/* Main Content (ONLY scrolling area) */}
          <main className={`flex-1 overflow-y-auto ${isEditMode ? "" : "pb-20"}`}>
            {renderPage()}
          </main>

          {/* Bottom Navigation (hidden while editing a workout) */}
          {!isEditMode && (
            <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex items-center h-16 px-2 min-w-max">
                  {/* ✅ Plus button on the LEFT, inside the same scroll row */}
                  <PlusNavButton onClick={handlePlus} />

                  {navItems.map((it) => (
                    <NavButton
                      key={it.key}
                      icon={it.icon}
                      label={it.label}
                      active={currentPage === it.key}
                      onClick={() => handleNavigate(it.key)}
                    />
                  ))}
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

const PlusNavButton = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Today / Add"
    className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
  >
    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-95 transition-transform">
      <Plus className="w-6 h-6" />
    </div>
    <span className="text-[10px] font-medium text-muted-foreground">Today</span>
  </button>
);

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
