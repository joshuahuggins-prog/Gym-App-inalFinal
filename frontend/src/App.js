import React, { useState, useEffect } from 'react';
import { Home, History, TrendingUp, BarChart3 } from 'lucide-react';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import ProgressPage from './pages/ProgressPage';
import { SettingsProvider } from './contexts/SettingsContext';
import { Toaster } from './components/ui/sonner';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

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
          <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
            <NavButton
              icon={<Home className="w-5 h-5" />}
              label="Today"
              active={currentPage === 'home'}
              onClick={() => setCurrentPage('home')}
            />
            <NavButton
              icon={<History className="w-5 h-5" />}
              label="History"
              active={currentPage === 'history'}
              onClick={() => setCurrentPage('history')}
            />
            <NavButton
              icon={<BarChart3 className="w-5 h-5" />}
              label="Stats"
              active={currentPage === 'stats'}
              onClick={() => setCurrentPage('stats')}
            />
            <NavButton
              icon={<TrendingUp className="w-5 h-5" />}
              label="Progress"
              active={currentPage === 'progress'}
              onClick={() => setCurrentPage('progress')}
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