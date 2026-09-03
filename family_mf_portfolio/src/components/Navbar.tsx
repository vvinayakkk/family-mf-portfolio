import React, { useState, useEffect } from 'react';
import {
  Table, Activity, ArrowRightLeft,
  Sun, Moon, Trophy, LineChart as ChartIcon,
  Maximize2, Minimize2, RefreshCw, Clock, CheckCircle2,
  Filter, Coins
} from 'lucide-react';
import { getSyncStatus, performLiveBrowserSync } from '../lib/syncEngine';
import { reloadMasterDatasetWithFunds } from '../lib/data';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isFullScreen: boolean;
  setIsFullScreen: (val: boolean) => void;
}

const NAV_ITEMS = [
  { id: 'screener',      label: 'Screener',         icon: Filter },
  { id: 'etf-hub',       label: 'Gold / Silver / ETFs', icon: Coins },
  { id: 'holdings',      label: '91 Holdings',      icon: Table },
  { id: 'graphs',        label: 'Fund Graphs',      icon: ChartIcon },
  { id: 'master-ranking',label: '1,500 Master DB',  icon: Trophy },
  { id: 'analytics',     label: 'Risk Analytics',   icon: Activity },
  { id: 'stp-tax',       label: 'STP & Tax',        icon: ArrowRightLeft },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, isDarkMode, setIsDarkMode,
  isFullScreen, setIsFullScreen
}) => {
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('');
  const [showCooldownTooltip, setShowCooldownTooltip] = useState(false);
  const [justFinishedSync, setJustFinishedSync] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  void mobileOpen; void setMobileOpen;

  useEffect(() => {
    const update = () => setSyncStatus(getSyncStatus());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSync = async () => {
    const currentStatus = getSyncStatus();
    if (!currentStatus.canSync || isSyncing) {
      setShowCooldownTooltip(true);
      setTimeout(() => setShowCooldownTooltip(false), 4000);
      return;
    }
    setIsSyncing(true);
    setJustFinishedSync(false);
    try {
      const updatedFunds = await performLiveBrowserSync((_, __, msg) => {
        setSyncProgressMsg(msg);
      });
      reloadMasterDatasetWithFunds(updatedFunds);
      setSyncStatus(getSyncStatus());
      setJustFinishedSync(true);
      setTimeout(() => setJustFinishedSync(false), 5000);
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  return (
    <header
      className="sticky top-0 z-40 no-print"
      style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Top mini bar ───────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-sub)', borderBottom: '1px solid var(--border-color)', padding: '5px 0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-main)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PORTFOLIO TERMINAL
            </span>
            <span className="hidden sm:inline">Invested Wealth: <strong style={{ color: 'var(--text-main)' }}>₹7.93 Crore</strong></span>
            <span className="hidden md:inline">{syncStatus.formattedLastSynced && <>Last Synced: <strong style={{ color: 'var(--text-main)' }}>{syncStatus.formattedLastSynced}</strong></>}</span>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Sync Button (Clean Border Only) */}
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing || !syncStatus.canSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={{
                background: 'transparent',
                color: syncStatus.canSync ? 'var(--accent)' : 'var(--text-sub)',
                border: `1px solid ${syncStatus.canSync ? 'var(--accent)' : 'var(--border-color)'}`,
                cursor: isSyncing || !syncStatus.canSync ? 'not-allowed' : 'pointer',
              }}
            >
              {justFinishedSync
                ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sync Complete!</>
                : isSyncing
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" /> Syncing...</>
                  : syncStatus.canSync
                    ? <><RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Refresh Live Data</>
                    : <><Clock className="w-3.5 h-3.5" /> Cooldown ({syncStatus.formattedCountdown})</>
              }
            </button>
            {showCooldownTooltip && !syncStatus.canSync && (
              <div className="absolute right-0 top-8 z-50 text-[11px] font-semibold py-2 px-3 rounded-lg shadow-xl whitespace-nowrap animate-fadeIn"
                style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                ⏱ Rate limit active. Next sync in {syncStatus.formattedCountdown}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync progress banner */}
      {isSyncing && (
        <div className="text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b"
          style={{ background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {syncProgressMsg}
        </div>
      )}

      {/* ── Main nav bar ───────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 gap-4">
          {/* Desktop Nav tabs (horizontal) */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-start overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all relative rounded-lg"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    background: 'transparent',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.id === 'screener' && (
                    <span className="pro-badge ml-1">NEW</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg transition"
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile nav ─────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex overflow-x-auto px-3 py-2 gap-1 scrollbar-none"
        style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-sub)' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition"
              style={{
                background: isActive ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
