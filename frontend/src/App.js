// src/App.js
import React, { useCallback, useMemo, useState } from "react";
import { History, TrendingUp, Plus, Home, Wrench } from "lucide-react";

import WelcomePage from "./pages/WelcomePage";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";
import SetupPage from "./pages/SetupPage";

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
  WELCOME: "welcome",
  HOME: "home",
  HISTORY: "history",
  EDIT_WORKOUT: "edit-workout",
  PROGRESS: "progress",
  SETUP: "setup",

  // setup destinations
  PROGRAMMES: "programmes",
  EXERCISES: "exercises",
  SETTINGS: "settings",
  IMPORT_EXPORT: "import-export",

  THEME_CREATOR: "themeCreator",
};

const App = () => {
  const upsideDown = useUpsideDown();

  // ✅ Start on Welcome page
  const [currentPage, setCurrentPage] = useState(PAGES.WELCOME);

  // Edit workout page state
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);

  const isEditMode = currentPage === PAGES.EDIT_WORKOUT;

  const handleNavigate = useCallback((page) => {
    setCurrentPage(page);
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

  // ✅ Bottom nav: 4 icons + centre plus
  const navItems = useMemo(
    () => [
      { key: PAGES.WELCOME, label: "Overview", icon: <Home className="w-5 h-5" /> },
      { key: PAGES.PROGRESS, label: "Progress", icon: <TrendingUp className="w-5 h-5" /> },
      { key: PAGES.SETUP, label: "Setup", icon: <Wrench className="w-5 h-5" /> },
      { key: PAGES.HISTORY, label: "History", icon: <History className="w-5 h-5" /> },
    ],
    []
  );

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.WELCOME:
        return <WelcomePage onStartToday={() => handleNavigate(PAGES.HOME)} />;

      case PAGES.HOME:
        return <HomePage />;

      case PAGES.HISTORY:
        return <HistoryPage onEditWorkout={openEditWorkout} />;

      case PAGES.EDIT_WORKOUT:
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

      case PAGES.SETUP:
        return <SetupPage onNavigate={(k) => handleNavigate(k)} />;

      // setup destinations
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
        return <WelcomePage onStartToday={() => handleNavigate(PAGES.HOME)} />;
    }
  };

  const handlePlus = useCallback(() => {
    // ✅ Centre Plus = "Today / Log Workout"
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
              <div className="h-16 grid grid-cols-5 items-center px-2">
                {/* Left 2 icons */}
                <NavButton
                  icon={navItems[0].icon}
                  label={navItems[0].label}
                  active={currentPage === navItems[0].key}
                  onClick={() => handleNavigate(navItems[0].key)}
                />
                <NavButton
                  icon={navItems[1].icon}
                  label={navItems[1].label}
                  active={currentPage === navItems[1].key}
                  onClick={() => handleNavigate(navItems[1].key)}
                />

                {/* Centre + */}
                <div className="flex items-center justify-center">
                  <PlusNavButton onClick={handlePlus} />
                </div>

                {/* Right 2 icons */}
                <NavButton
                  icon={navItems[2].icon}
                  label={navItems[2].label}
                  active={currentPage === navItems[2].key}
                  onClick={() => handleNavigate(navItems[2].key)}
                />
                <NavButton
                  icon={navItems[3].icon}
                  label={navItems[3].label}
                  active={currentPage === navItems[3].key}
                  onClick={() => handleNavigate(navItems[3].key)}
                />
              </div>
            </nav>
          )}

          <Toaster />
        </div>
      </div>
    </SettingsProvider>
  );
};

// ✅ Centre button. Slightly larger, feels "app-like"
const PlusNavButton = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Start workout"
    className="flex items-center justify-center w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 transition-transform"
    style={{ width: 52, height: 52 }}
  >
    <Plus className="w-6 h-6" />
  </button>
);

const NavButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 ${
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