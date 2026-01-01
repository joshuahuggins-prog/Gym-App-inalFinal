import React, { useState, useEffect } from 'react';
import { Home, History, TrendingUp, BarChart3, FileText, Dumbbell, Settings, Download } from 'lucide-react';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import ProgressPage from './pages/ProgressPage';
import ProgrammesPage from './pages/ProgrammesPage';
import ExercisesPage from './pages/ExercisesPage';
import SettingsPage from './pages/SettingsPage';
import ImportExportPage from './pages/ImportExportPage';
import { SettingsProvider } from './contexts/SettingsContext';
import { Toaster } from './components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Button } from './components/ui/button';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);

  const handleNavigate = (page) => {
    // If on home page with unsaved data, show warning
    if (currentPage === 'home' && hasUnsavedData && page !== 'home') {
      setPendingPage(page);
      setShowNavigationWarning(true);
    } else {
      setCurrentPage(page);
      if (page !== 'home') {
        setHasUnsavedData(false);
      }
    }
  };

  const handleConfirmNavigation = () => {
    setCurrentPage(pendingPage);
    setHasUnsavedData(false);
    setShowNavigationWarning(false);
    setPendingPage(null);
  };

  const handleCancelNavigation = () => {
    setShowNavigationWarning(false);
    setPendingPage(null);
  };

  const handleWorkoutDataChange = (hasData) => {
    setHasUnsavedData(hasData);
  };

  const handleWorkoutSaved = () => {
    setHasUnsavedData(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onDataChange={handleWorkoutDataChange} onSaved={handleWorkoutSaved} />;
      case 'history':
        return <HistoryPage />;
      case 'stats':
        return <StatsPage />;
      case 'progress':
        return <ProgressPage />;
      case 'programmes':
        return <ProgrammesPage />;
      case 'exercises':
        return <ExercisesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'import-export':
        return <ImportExportPage />;
      default:
        return <HomePage onDataChange={handleWorkoutDataChange} onSaved={handleWorkoutSaved} />;
    }
  };

  return (
    <SettingsProvider>
      <div className="flex flex-col h-full bg-background text-foreground">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {renderPage()}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center h-16 px-2 min-w-max">
              <NavButton
                icon={<Home className="w-5 h-5" />}
                label="Today"
                active={currentPage === 'home'}
                onClick={() => handleNavigate('home')}
              />
              <NavButton
                icon={<History className="w-5 h-5" />}
                label="History"
                active={currentPage === 'history'}
                onClick={() => handleNavigate('history')}
              />
              <NavButton
                icon={<TrendingUp className="w-5 h-5" />}
                label="Progress"
                active={currentPage === 'progress'}
                onClick={() => handleNavigate('progress')}
              />
              <NavButton
                icon={<FileText className="w-5 h-5" />}
                label="Programmes"
                active={currentPage === 'programmes'}
                onClick={() => handleNavigate('programmes')}
              />
              <NavButton
                icon={<Dumbbell className="w-5 h-5" />}
                label="Exercises"
                active={currentPage === 'exercises'}
                onClick={() => handleNavigate('exercises')}
              />
              <NavButton
                icon={<Settings className="w-5 h-5" />}
                label="Settings"
                active={currentPage === 'settings'}
                onClick={() => handleNavigate('settings')}
              />
              <NavButton
                icon={<Download className="w-5 h-5" />}
                label="Data"
                active={currentPage === 'import-export'}
                onClick={() => handleNavigate('import-export')}
              />
            </div>
          </div>
        </nav>

        <Toaster />
      </div>
    </SettingsProvider>
  );
};

const NavButton = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
        active
          ? 'text-primary scale-105'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <div className={active ? 'glow-primary' : ''}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};

export default App;