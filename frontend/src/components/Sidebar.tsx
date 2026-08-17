import React from 'react';
import {
  Home,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Briefcase,
  Newspaper,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Main Overview & AI Feed',
      icon: Home,
    },
    {
      id: 'market_overview',
      label: 'Market Overview',
      sublabel: 'Sectors & Heatmaps',
      icon: TrendingUp,
    },
    {
      id: 'market_analysis',
      label: 'Market Analysis',
      sublabel: 'Deep Technical & AI View',
      icon: BarChart3,
    },
    {
      id: 'risk_analysis',
      label: 'Risk Analysis',
      sublabel: 'VaR, CVaR & Drawdowns',
      icon: AlertTriangle,
    },
    {
      id: 'portfolio_simulator',
      label: 'Portfolio Simulator',
      sublabel: 'Backtesting Engine',
      icon: Briefcase,
      badge: 'PRO',
    },
    {
      id: 'news',
      label: 'News',
      sublabel: 'Sentiment Feed',
      icon: Newspaper,
    },
    {
      id: 'model_monitor',
      label: 'Model Monitor',
      sublabel: 'ML Health & Drift',
      icon: Bot,
      badge: 'LIVE',
    },
  ];

  return (
    <aside className="w-64 bg-dark-900/95 border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Navigation Links */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-dark-850 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-dark-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold tracking-tight truncate flex items-center gap-1.5">
                    {item.label}
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          item.badge === 'LIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{item.sublabel}</div>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Footer System Status Card */}
      <div className="p-3 border-t border-slate-800/80 bg-dark-950/40">
        <div className="p-3 rounded-xl bg-dark-850 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Ensemble State</span>
            <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              99.98% OK
            </span>
          </div>
          <div className="w-full bg-dark-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-[94%] rounded-full"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>RAM: 34%</span>
            <span>GPU: 18%</span>
            <span>DuckDB: Sync</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
