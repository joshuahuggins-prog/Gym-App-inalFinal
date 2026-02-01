// src/App.js
import React, { useCallback, useMemo, useState } from "react";
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

  const navItems = useMemo(
    () => [
      { key: PAGES.HOME, label: "Today", icon: <Home className="w-5 h-5" /> },
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
        // Safety: if somehow opened without an id, bounce to history
        if (!editingWorkoutId) {
          return <HistoryPage onEditWorkout={openEditWorkout} />;
        }
        return (
          <EditWorkoutPage
            workoutId={editingWorkoutId}
            onClose={closeEditWorkout}
          />
        );

      case PAGES.PROGRESS:
        return <ProgressPage />;

      case PAGES.PROGRAMMES:
        return <ProgrammesPage />;

      case PAGES.EXERCISES:
        return <ExercisesPage />;

      case PAGES.SETTINGS:
        // ✅ Pass prop so Settings can open ThemeCreator
        return <SettingsPage onCreateTheme={openThemeCreator} />;

      case PAGES.THEME_CREATOR:
        return <ThemeCreatorPage onBack={closeThemeCreator} />;

      case PAGES.IMPORT_EXPORT:
        return <ImportExportPage />;

      default:
        return <HomePage />;
    }
  };

  return (
    <SettingsProvider>
      {/* ✅ IMPORTANT: fixed viewport wrapper prevents "fixed" children from scrolling
          when the app is rotated (transform would otherwise break position: fixed). */}
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
