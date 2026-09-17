import React from 'react';
import {
  Home,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Briefcase,
  Newspaper,
  Bot,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { TabType } from '../types';
import { useAuth } from '../context/AuthContext';

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
  badgeStyle?: 'live' | 'pro' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { isAdmin } = useAuth();

  const baseItems: NavItem[] = [
    { id: 'dashboard',          label: 'Dashboard',          sublabel: 'Overview & AI Feed',     icon: Home },
    { id: 'market_overview',    label: 'Market Overview',    sublabel: 'Sectors & Heatmaps',     icon: TrendingUp },
    { id: 'market_analysis',    label: 'Market Analysis',    sublabel: 'Technical & AI View',    icon: BarChart3 },
    { id: 'risk_analysis',      label: 'Risk Analysis',      sublabel: 'VaR, CVaR & Drawdowns',  icon: AlertTriangle },
    { id: 'portfolio_simulator',label: 'Portfolio Simulator',sublabel: 'Backtesting Engine',     icon: Briefcase, badge: 'PRO', badgeStyle: 'pro' },
    { id: 'news',               label: 'News',               sublabel: 'Sentiment Feed',         icon: Newspaper },
  ];

  const adminItems: NavItem[] = [
    { id: 'model_monitor',      label: 'Model Monitor',      sublabel: 'ML Health & Drift',      icon: Bot, badge: 'LIVE', badgeStyle: 'live' },
    { id: 'admin_console',      label: 'Admin Console',      sublabel: 'MLOps & Telemetry',      icon: Shield, badge: 'ADMIN', badgeStyle: 'admin' },
  ];

  const navItems = isAdmin ? [...baseItems, ...adminItems] : baseItems;

  return (
    <aside
      className="w-60 flex flex-col shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none overflow-hidden transition-colors duration-200"
      style={{
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Nav Label */}
      <div
        className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest font-mono"
        style={{ color: 'var(--text-muted)' }}
      >
        Navigation
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group ${
                isActive ? 'font-bold' : ''
              }`}
              style={
                isActive
                  ? {
                      background: item.id === 'admin_console' ? 'rgba(245,158,11,0.08)' : 'rgba(34,211,238,0.08)',
                      border: item.id === 'admin_console' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(34,211,238,0.2)',
                      color: item.id === 'admin_console' ? '#F59E0B' : 'var(--accent)',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'var(--text-secondary)',
                    }
              }
            >
              {/* Icon + Text */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="p-1.5 rounded-lg transition-colors shrink-0"
                  style={
                    isActive
                      ? {
                          background: item.id === 'admin_console' ? 'rgba(245,158,11,0.15)' : 'rgba(34,211,238,0.15)',
                          color: item.id === 'admin_console' ? '#F59E0B' : 'var(--accent)',
                        }
                      : { background: 'var(--bg-muted)', color: 'var(--text-muted)' }
                  }
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="truncate">
                  <div className="text-sm tracking-tight truncate flex items-center gap-1.5">
                    {item.label}
                    {item.badge && (
                      <span
                        className="text-[9px] font-mono px-1.5 rounded font-bold"
                        style={
                          item.badgeStyle === 'admin'
                            ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                            : item.badgeStyle === 'live'
                            ? { background: 'rgba(34,197,94,0.12)', color: 'var(--up)', border: '1px solid rgba(34,197,94,0.3)' }
                            : { background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.sublabel}
                  </div>
                </div>
              </div>

              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-60'}`}
              />
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
