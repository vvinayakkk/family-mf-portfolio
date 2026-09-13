import React, { useState, useMemo } from 'react';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { 
  TrendingUp, 
  User, 
  Building2, 
  Layers, 
  ChevronRight,
  Wallet
} from 'lucide-react';

interface NetWealthDashboardProps {
  onNavigateToHoldings: () => void;
  onNavigateToScreener?: () => void;
}

export const NetWealthDashboard: React.FC<NetWealthDashboardProps> = ({
  onNavigateToHoldings,
}) => {
  const [excludeElss, setExcludeElss] = useState<boolean>(false);

  // Filtered holdings (all vs excluding ELSS)
  const holdings = useMemo(() => {
    if (!excludeElss) return PORTFOLIO_HOLDINGS;
    return PORTFOLIO_HOLDINGS.filter(f => {
      const cat = f.category.toLowerCase();
      const name = f.name.toLowerCase();
      return !(cat.includes('elss') || name.includes('elss') || name.includes('tax saver'));
    });
  }, [excludeElss]);

  // Net totals
  const totalCost = useMemo(() => holdings.reduce((sum, f) => sum + (f.costValueInr || 0), 0), [holdings]);
  const totalValue = useMemo(() => holdings.reduce((sum, f) => sum + (f.currentValueInr || 0), 0), [holdings]);
  const totalGain = totalValue - totalCost;
  const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Weighted Average XIRR
  const weightedXirr = useMemo(() => {
    if (totalValue <= 0) return 0;
    const sumProduct = holdings.reduce((acc, f) => acc + (f.xirr * (f.currentValueInr || 0)), 0);
    return sumProduct / totalValue;
  }, [holdings, totalValue]);

  // Investor Breakdown
  const investorStats = useMemo(() => {
    const map: Record<string, { name: string; cost: number; value: number; count: number; xirrWeightedSum: number }> = {};
    holdings.forEach(f => {
      const inv = f.investorName || 'Unknown';
      if (!map[inv]) {
        map[inv] = { name: inv, cost: 0, value: 0, count: 0, xirrWeightedSum: 0 };
      }
      map[inv].cost += f.costValueInr || 0;
      map[inv].value += f.currentValueInr || 0;
      map[inv].count += 1;
      map[inv].xirrWeightedSum += f.xirr * (f.currentValueInr || 0);
    });

    return Object.values(map).map(inv => ({
      name: inv.name,
      shortName: inv.name.split(' ')[0],
      cost: inv.cost,
      value: inv.value,
      gain: inv.value - inv.cost,
      gainPct: inv.cost > 0 ? ((inv.value - inv.cost) / inv.cost) * 100 : 0,
      sharePct: totalValue > 0 ? (inv.value / totalValue) * 100 : 0,
      count: inv.count,
      avgXirr: inv.value > 0 ? inv.xirrWeightedSum / inv.value : 0,
    })).sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  // Platform Breakdown (CAMPS vs KFinkart)
  const platformStats = useMemo(() => {
    const map: Record<string, { platform: string; cost: number; value: number; count: number }> = {};
    holdings.forEach(f => {
      const p = f.platform || 'Other';
      if (!map[p]) {
        map[p] = { platform: p, cost: 0, value: 0, count: 0 };
      }
      map[p].cost += f.costValueInr || 0;
      map[p].value += f.currentValueInr || 0;
      map[p].count += 1;
    });

    return Object.values(map).map(p => ({
      platform: p.platform,
      cost: p.cost,
      value: p.value,
      gain: p.value - p.cost,
      gainPct: p.cost > 0 ? ((p.value - p.cost) / p.cost) * 100 : 0,
      sharePct: totalValue > 0 ? (p.value / totalValue) * 100 : 0,
      count: p.count,
    })).sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  // Top 5 Categories breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { category: string; cost: number; value: number; count: number }> = {};
    holdings.forEach(f => {
      const c = f.category || 'Other';
      if (!map[c]) map[c] = { category: c, cost: 0, value: 0, count: 0 };
      map[c].cost += f.costValueInr || 0;
      map[c].value += f.currentValueInr || 0;
      map[c].count += 1;
    });
    return Object.values(map).map(c => ({
      category: c.category,
      cost: c.cost,
      value: c.value,
      gain: c.value - c.cost,
      gainPct: c.cost > 0 ? ((c.value - c.cost) / c.cost) * 100 : 0,
      sharePct: totalValue > 0 ? (c.value / totalValue) * 100 : 0,
      count: c.count
    })).sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  const formatCr = (inr: number) => `₹${(inr / 10000000).toFixed(2)} Cr`;
  const formatLakhs = (inr: number) => `₹${(inr / 100000).toFixed(2)}L`;
  const formatInr = (inr: number) => `₹${Math.round(inr).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-lg">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="chip font-bold text-xs flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Family Wealth Snapshot
            </span>
            <span className="chip font-medium text-xs">
              {holdings.length} Active Folios
            </span>
            {excludeElss && (
              <span className="chip font-bold text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10">
                ELSS Excluded
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Net Invested & Current Portfolio Wealth
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Verified aggregate wealth summary for Prem Ramchand Bhatia & Sarita Prem Bhatia across CAMPS & KFinkart.
          </p>
        </div>

        {/* 1-Click ELSS Filter Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => setExcludeElss(!excludeElss)}
            className={`px-4 py-2 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 border shadow-sm ${
              excludeElss
                ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400 dark:ring-rose-500'
                : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span>{excludeElss ? '✓ Filter: ELSS Excluded' : '🚫 Filter Out ELSS Schemes'}</span>
          </button>
        </div>
      </div>

      {/* ─── PRIMARY NET WEALTH METRICS CARDS (THE CORE HERO) ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Total Invested Cost */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invested (Net Cost)</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-900">
              {holdings.length} Funds
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            {formatCr(totalCost)}
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between font-mono">
            <span>{formatLakhs(totalCost)}</span>
            <span>{formatInr(totalCost)}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 text-[11px] text-neutral-500">
            Cumulative principal capital invested across all accounts
          </div>
        </div>

        {/* Card 2: Current Net Market Value */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-emerald-500/30 dark:border-emerald-500/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total Current Value (Net)
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Live NAVs
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCr(totalValue)}
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between font-mono">
            <span>{formatLakhs(totalValue)}</span>
            <span>{formatInr(totalValue)}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Weighted Portfolio XIRR:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{weightedXirr.toFixed(2)}%</strong>
          </div>
        </div>

        {/* Card 3: Net Profit & Appreciation */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Appreciation (Profit)</span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              +{gainPercentage.toFixed(2)}%
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-2">
            <span>+{formatCr(totalGain)}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between font-mono">
            <span>+{formatLakhs(totalGain)}</span>
            <span>+{formatInr(totalGain)}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 text-[11px] text-neutral-500">
            Absolute net capital growth generated since inception
          </div>
        </div>
      </div>

      {/* ─── FAMILY MEMBER BREAKDOWN: PREM VS SARITA ──────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
              Family Member Ownership Breakdown
            </h2>
          </div>
          <span className="text-xs text-neutral-500">2 Individual Accounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investorStats.map((inv) => (
            <div 
              key={inv.name}
              className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-base text-neutral-900 dark:text-white">{inv.name}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{inv.count} Active Schemes · {inv.sharePct.toFixed(1)}% of total family wealth</p>
                </div>
                <span className={`chip text-xs font-extrabold ${
                  inv.shortName === 'Prem' 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                }`}>
                  {inv.shortName}
                </span>
              </div>

              {/* Visual Wealth Bar */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${inv.shortName === 'Prem' ? 'bg-blue-500' : 'bg-purple-500'}`}
                  style={{ width: `${inv.sharePct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[11px] text-neutral-500 font-medium">Invested (Cost)</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">{formatCr(inv.cost)}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">{formatLakhs(inv.cost)}</p>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-500 font-medium">Current Value</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCr(inv.value)}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">{formatLakhs(inv.value)}</p>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-500 font-medium">Net Gain (Profit)</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{formatCr(inv.gain)}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">+{inv.gainPct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PLATFORM RTA BREAKDOWN: CAMPS VS KFINKART ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Platform Breakdown Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-extrabold text-base text-neutral-900 dark:text-white">
              Platform & RTA Split (CAMPS vs KFinkart)
            </h2>
          </div>

          <div className="space-y-3">
            {platformStats.map((p) => (
              <div 
                key={p.platform}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`chip text-xs font-bold ${
                      p.platform === 'CAMPS' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    }`}>
                      {p.platform}
                    </span>
                    <span className="text-xs text-neutral-500">{p.count} Schemes</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-neutral-900 dark:text-white">{formatCr(p.value)}</span>
                    <span className="text-xs text-neutral-400 ml-1.5">({p.sharePct.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${p.platform === 'CAMPS' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${p.sharePct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                  <span>Invested: <strong className="text-neutral-700 dark:text-neutral-300">{formatCr(p.cost)}</strong></span>
                  <span>Gain: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCr(p.gain)} (+{p.gainPct.toFixed(1)}%)</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Asset Category Net Distribution */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-extrabold text-base text-neutral-900 dark:text-white">
                Top Category Net Wealth Allocation
              </h2>
            </div>
            <span className="text-xs text-neutral-500">{categoryStats.length} Categories</span>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {categoryStats.slice(0, 5).map((cat) => (
              <div 
                key={cat.category}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">{cat.category}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Invested: {formatCr(cat.cost)} · {cat.count} schemes
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 dark:text-emerald-400">{formatCr(cat.value)}</p>
                  <p className="text-[10px] text-neutral-400">{cat.sharePct.toFixed(1)}% share</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onNavigateToHoldings}
            className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <span>Inspect All {holdings.length} Holdings in Master Terminal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
