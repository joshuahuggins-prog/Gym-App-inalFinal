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

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
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
        return <HomePage />;
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
          <div className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
            <NavButton
              icon={<Home className="w-4 h-4" />}
              label="Today"
              active={currentPage === 'home'}
              onClick={() => setCurrentPage('home')}
            />
            <NavButton
              icon={<History className="w-4 h-4" />}
              label="History"
              active={currentPage === 'history'}
              onClick={() => setCurrentPage('history')}
            />
            <NavButton
              icon={<TrendingUp className="w-4 h-4" />}
              label="Progress"
              active={currentPage === 'progress'}
              onClick={() => setCurrentPage('progress')}
            />
            <NavButton
              icon={<FileText className="w-4 h-4" />}
              label="Programmes"
              active={currentPage === 'programmes'}
              onClick={() => setCurrentPage('programmes')}
            />
            <NavButton
              icon={<Dumbbell className="w-4 h-4" />}
              label="Exercises"
              active={currentPage === 'exercises'}
              onClick={() => setCurrentPage('exercises')}
            />
            <NavButton
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
              active={currentPage === 'settings'}
              onClick={() => setCurrentPage('settings')}
            />
            <NavButton
              icon={<Download className="w-4 h-4" />}
              label="Data"
              active={currentPage === 'import-export'}
              onClick={() => setCurrentPage('import-export')}
            />
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
      className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
        active
          ? 'text-primary scale-105'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <div className={active ? 'glow-primary' : ''}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export default App;