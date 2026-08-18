import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { MarketOverviewView } from './views/MarketOverviewView';
import { MarketAnalysisView } from './views/MarketAnalysisView';
import { RiskAnalysisView } from './views/RiskAnalysisView';
import { PortfolioSimulatorView } from './views/PortfolioSimulatorView';
import { NewsSentimentView } from './views/NewsSentimentView';
import { ModelMonitorView } from './views/ModelMonitorView';
import { TabType } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleNavigateToSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('market_analysis');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Platform Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Tab Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full"
          style={{ background: 'var(--bg-base)' }}
        >
          <div key={refreshKey} className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigateToSymbol={handleNavigateToSymbol}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'market_overview' && (
              <MarketOverviewView onNavigateToSymbol={handleNavigateToSymbol} />
            )}

            {activeTab === 'market_analysis' && (
              <MarketAnalysisView initialSymbol={selectedSymbol} />
            )}

            {activeTab === 'risk_analysis' && <RiskAnalysisView />}

            {activeTab === 'portfolio_simulator' && <PortfolioSimulatorView />}

            {activeTab === 'news' && <NewsSentimentView />}

            {activeTab === 'model_monitor' && <ModelMonitorView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
