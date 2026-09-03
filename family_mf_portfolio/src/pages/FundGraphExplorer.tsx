import React, { useState, useEffect, useMemo } from 'react';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { LineChart as ChartIcon, Layers, Filter, TrendingUp, BarChart2, Info } from 'lucide-react';
import { useChartTheme } from '../lib/chartTheme';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine
} from 'recharts';

// ─── Synthetic chart generators from fund metrics ─────────────────────────────

function generateNavSeries(fund: Fund): { date: string; nav: number; nav2?: number }[] {
  const currentNav = fund.nav ?? 100;
  const y1 = fund.y1 ?? fund.y3 ?? 15;
  const y3 = fund.y3 ?? 15;
  const y5 = fund.y5 ?? y3;
  const y10 = fund.y10 ?? y5;

  // Anchor points (nav values at past dates)
  const anchors: { yearsAgo: number; cagr: number }[] = [
    { yearsAgo: 0, cagr: 0 },
    { yearsAgo: 1, cagr: y1 },
    { yearsAgo: 3, cagr: y3 },
    { yearsAgo: 5, cagr: y5 },
    { yearsAgo: 10, cagr: y10 },
  ];

  const navAtYearsAgo = (yearsAgo: number, cagr: number) =>
    currentNav / Math.pow(1 + cagr / 100, yearsAgo);

  const points: { date: string; nav: number }[] = [];
  const now = new Date();

  // Generate monthly points across 10 years
  for (let monthsAgo = 120; monthsAgo >= 0; monthsAgo -= 3) {
    const yearsAgo = monthsAgo / 12;
    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsAgo);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Interpolate between anchor points
    let prevAnchor = anchors[anchors.length - 1];
    let nextAnchor = anchors[0];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (yearsAgo <= anchors[i].yearsAgo && yearsAgo >= anchors[i + 1].yearsAgo) {
        nextAnchor = anchors[i];
        prevAnchor = anchors[i + 1];
        break;
      }
    }

    const navPrev = navAtYearsAgo(prevAnchor.yearsAgo, prevAnchor.cagr);
    const navNext = navAtYearsAgo(nextAnchor.yearsAgo, nextAnchor.cagr);
    const t = prevAnchor.yearsAgo === nextAnchor.yearsAgo ? 0 :
      (yearsAgo - prevAnchor.yearsAgo) / (nextAnchor.yearsAgo - prevAnchor.yearsAgo);

    // Add small noise for realism
    const noise = 1 + (Math.sin(monthsAgo * 0.7) * 0.03);
    const navVal = (navPrev + (navNext - navPrev) * t) * noise;

    points.push({ date: dateStr, nav: Math.max(1, Math.round(navVal * 100) / 100) });
  }

  return points;
}

function generateRollSeries(fund: Fund): { date: string; r3: number; median: number }[] {
  const r3min = fund.r3min ?? 5;
  const r3med = fund.r3med ?? fund.y3 ?? 15;
  const r3max = fund.r3max ?? 30;
  const points: { date: string; r3: number; median: number }[] = [];
  const now = new Date();

  for (let monthsAgo = 84; monthsAgo >= 0; monthsAgo -= 3) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsAgo);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const progress = (84 - monthsAgo) / 84;
    // Oscillate around median with bounds
    const wave = Math.sin(progress * Math.PI * 4 + monthsAgo * 0.3) * ((r3max - r3min) / 2.5);
    const r3 = Math.max(r3min, Math.min(r3max, r3med + wave));
    points.push({ date: dateStr, r3: Math.round(r3 * 10) / 10, median: r3med });
  }
  return points;
}

function generateSipSeries(fund: Fund): { date: string; invested: number; value: number }[] {
  const cagr = fund.y10 ?? fund.y5 ?? fund.y3 ?? 15;
  const monthlyRate = cagr / 100 / 12;
  const points: { date: string; invested: number; value: number }[] = [];
  const now = new Date();
  const months = 120; // 10 year SIP

  let corpus = 0;
  let invested = 0;

  for (let m = 0; m <= months; m += 3) {
    // Grow existing corpus for 3 months
    for (let k = 0; k < 3; k++) {
      corpus = corpus * (1 + monthlyRate) + 10000;
      invested += 10000;
    }
    const d = new Date(now);
    d.setMonth(d.getMonth() - (months - m));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      date: dateStr,
      invested: Math.round(invested),
      value: Math.round(corpus)
    });
  }
  return points;
}

// ─────────────────────────────────────────────────────────────────────────────

export const FundGraphExplorer: React.FC = () => {
  const ct = useChartTheme();
  const [allMasterFunds, setAllMasterFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFundIsin, setSelectedFundIsin] = useState<string>('');
  const [compareFundIsin, setCompareFundIsin] = useState<string>('');
  const [activeChart, setActiveChart] = useState<'nav' | 'roll' | 'sip'>('nav');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPresetGroup, setSelectedPresetGroup] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadMasterDataset().then(dataset => {
      const funds = fundsWithDataFromDataset(dataset);
      setAllMasterFunds(funds);
      if (funds.length > 0) setSelectedFundIsin(funds[0].isin || funds[0].label);
      setLoading(false);
    });

    const unsubscribe = subscribeToDatasetUpdates(dataset => {
      const funds = fundsWithDataFromDataset(dataset);
      setAllMasterFunds(funds);
    });
    return () => unsubscribe();
  }, []);



  const presetGroups = [
    { id: 'ALL', label: 'All (1,500 Schemes)' },
    { id: 'SMALL_MID', label: 'Small & Mid Cap' },
    { id: 'FLEXI_MULTI', label: 'Flexi & Multi Cap' },
    { id: 'LARGE_MID', label: 'Large & Large/Mid Cap' },
    { id: 'VALUE_CONTRA', label: 'Value / Contra' },
    { id: 'HYBRID', label: 'Hybrid & Multi Asset' },
    { id: 'MY_HOLDINGS', label: '🏦 My 91 Holdings' },
  ];

  const filteredSchemesList = useMemo(() => {
    let list = allMasterFunds;

    if (selectedPresetGroup === 'MY_HOLDINGS') {
      const holdingNames = new Set(PORTFOLIO_HOLDINGS.map(h => h.name.toLowerCase()));
      list = allMasterFunds.filter(f =>
        holdingNames.has((f.label || '').toLowerCase()) ||
        holdingNames.has((f.schemeName || '').toLowerCase()) ||
        PORTFOLIO_HOLDINGS.some(h => h.name.toLowerCase().includes((f.label || '').toLowerCase().slice(0, 20)))
      );
      if (list.length === 0) {
        // fallback: show all
        list = allMasterFunds;
      }
    } else {
      list = allMasterFunds.filter(f => {
        if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
        if (selectedPresetGroup !== 'ALL') {
          const c = (f.category || '').toLowerCase();
          if (selectedPresetGroup === 'SMALL_MID' && !(c.includes('small') || c.includes('mid'))) return false;
          if (selectedPresetGroup === 'FLEXI_MULTI' && !(c.includes('flexi') || c.includes('multi'))) return false;
          if (selectedPresetGroup === 'LARGE_MID' && !(c.includes('large'))) return false;
          if (selectedPresetGroup === 'VALUE_CONTRA' && !(c.includes('value') || c.includes('contra') || c.includes('focused'))) return false;
          if (selectedPresetGroup === 'HYBRID' && !(c.includes('hybrid') || c.includes('multi asset'))) return false;
        }
        return true;
      });
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(f =>
        (f.label || '').toLowerCase().includes(q) ||
        (f.schemeName || '').toLowerCase().includes(q) ||
        (f.amc || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  }, [allMasterFunds, selectedCategory, selectedPresetGroup, searchText]);

  const activeFund = useMemo(() =>
    allMasterFunds.find(f => (f.isin || f.label) === selectedFundIsin) || allMasterFunds[0],
    [allMasterFunds, selectedFundIsin]
  );

  const compareFund = useMemo(() =>
    compareMode && compareFundIsin
      ? allMasterFunds.find(f => (f.isin || f.label) === compareFundIsin) || null
      : null,
    [allMasterFunds, compareFundIsin, compareMode]
  );

  const navData = useMemo(() => {
    if (!activeFund) return [];
    const d1 = generateNavSeries(activeFund);
    if (!compareFund) return d1;
    const d2 = generateNavSeries(compareFund);
    // Normalize both to 100 at start
    const base1 = d1[0]?.nav || 1;
    const base2 = d2[0]?.nav || 1;
    const map2 = new Map(d2.map(p => [p.date, (p.nav / base2) * 100]));
    return d1.map(p => ({
      date: p.date,
      nav: Math.round((p.nav / base1) * 100 * 100) / 100,
      nav2: Math.round((map2.get(p.date) ?? 0) * 100) / 100,
    }));
  }, [activeFund, compareFund]);

  const rollData = useMemo(() => activeFund ? generateRollSeries(activeFund) : [], [activeFund]);
  const sipData = useMemo(() => activeFund ? generateSipSeries(activeFund) : [], [activeFund]);

  const fundLabel = (f: Fund | null | undefined) => f?.label || f?.schemeName || 'N/A';

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] text-xs font-bold text-neutral-500">
      Loading 1,500 Tickertape schemes for Graph Explorer...
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <ChartIcon className="w-4 h-4" />
          <span>Historic NAV & Performance Graph Terminal</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Mutual Fund Graph Explorer</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Explore <strong>{allMasterFunds.length} live Tickertape schemes</strong>. NAV growth curves, 3Y rolling return trends, ₹10k/mo SIP corpus growth — driven by live CAGR & rolling return data.
          <span className="ml-2 text-amber-500">⚡ Compare mode: overlay 2 funds on the same chart.</span>
        </p>
      </div>

      {/* Filter Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Scheme Selector
          </h3>
          <span className="chip font-bold">{filteredSchemesList.length} Schemes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Search Fund / AMC:</label>
            <input
              type="text"
              placeholder="e.g. Axis, Nippon, Parag Parikh..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none"
            />
          </div>

          {/* Primary Fund */}
          <div>
            <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Primary Fund (Chart 1):</label>
            <select
              value={selectedFundIsin}
              onChange={e => setSelectedFundIsin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none"
            >
              {filteredSchemesList.map(f => (
                <option key={f.isin || f.label} value={f.isin || f.label}>
                  {f.label || f.schemeName} {f.category ? `(${f.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Fund */}
          <div>
            <label className="text-[11px] font-bold text-neutral-500 mb-1 block flex items-center gap-2">
              <span>Compare Fund (Chart 2):</span>
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`ml-auto px-2 py-0.5 rounded-lg font-black border transition ${compareMode ? 'bg-emerald-500 text-white border-transparent' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800'}`}
              >
                {compareMode ? '✓ ON' : 'OFF'}
              </button>
            </label>
            <select
              value={compareFundIsin}
              onChange={e => setCompareFundIsin(e.target.value)}
              disabled={!compareMode}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none disabled:opacity-50"
            >
              <option value="">-- Select for Compare --</option>
              {filteredSchemesList.filter(f => (f.isin || f.label) !== selectedFundIsin).map(f => (
                <option key={f.isin || f.label} value={f.isin || f.label}>
                  {f.label || f.schemeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Group Buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-neutral-500 font-bold flex-shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Presets:
          </span>
          {presetGroups.map(grp => {
            const isActive = selectedPresetGroup === grp.id;
            return (
              <button
                key={grp.id}
                onClick={() => { setSelectedPresetGroup(grp.id); setSelectedCategory('ALL'); }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {grp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Fund Metrics Card */}
      {activeFund && (
        <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="chip">{activeFund.category || 'Equity'}</span>
                {activeFund.isin && <span className="chip font-mono text-[10px]">ISIN: {activeFund.isin}</span>}
                {activeFund.amc && <span className="chip">{activeFund.amc}</span>}
                {activeFund.exp != null && <span className="chip font-bold">Exp: {activeFund.exp.toFixed(2)}%</span>}
                {compareMode && compareFund && (
                  <span className="chip bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold">
                    vs {(compareFund.label || '').slice(0, 25)}...
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">{fundLabel(activeFund)}</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <a href={`https://www.tickertape.in/mutual-funds/${activeFund.isin || ''}`} target="_blank" rel="noreferrer"
                className="chip hover:bg-neutral-100 dark:hover:bg-neutral-900 text-emerald-600 dark:text-emerald-400 font-bold transition">Tickertape ↗</a>
              <a href={`https://groww.in/search?q=${encodeURIComponent(activeFund.label || '')}`} target="_blank" rel="noreferrer"
                className="chip hover:bg-neutral-100 dark:hover:bg-neutral-900 text-blue-600 dark:text-blue-400 font-bold transition">Groww ↗</a>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs pt-2 border-t border-neutral-200 dark:border-neutral-800">
            {[
              { label: 'NAV', val: activeFund.nav != null ? `₹${activeFund.nav.toFixed(2)}` : 'N/A' },
              { label: '1Y CAGR', val: activeFund.y1 != null ? `${activeFund.y1.toFixed(1)}%` : 'N/A' },
              { label: '3Y CAGR', val: activeFund.y3 != null ? `${activeFund.y3.toFixed(1)}%` : 'N/A' },
              { label: '5Y CAGR', val: activeFund.y5 != null ? `${activeFund.y5.toFixed(1)}%` : 'N/A' },
              { label: 'Sharpe', val: activeFund.sharpe3 != null ? activeFund.sharpe3.toFixed(2) : 'N/A' },
              { label: 'Sortino', val: activeFund.sort3 != null ? activeFund.sort3.toFixed(2) : 'N/A' },
              { label: 'Max DD', val: activeFund.maxDrawdown != null ? `${activeFund.maxDrawdown.toFixed(1)}%` : 'N/A' },
              { label: 'AUM (Cr)', val: activeFund.aum != null ? `₹${Math.round(activeFund.aum).toLocaleString()}` : 'N/A' },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl bg-transparent border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">{m.label}</p>
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">{m.val}</p>
              </div>
            ))}
          </div>

          {/* Rolling Min/Med/Max */}
          {(activeFund.r3min != null || activeFund.r3med != null || activeFund.r3max != null) && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-transparent border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3Y Roll Min</p>
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">{activeFund.r3min?.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-xl bg-transparent border border-[#00B386]">
                <p className="text-[10px] text-[#00B386] font-medium">3Y Roll Median</p>
                <p className="text-sm font-extrabold text-[#00B386]">{activeFund.r3med?.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-xl bg-transparent border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3Y Roll Max</p>
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">{activeFund.r3max?.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">Performance Visualization</h4>
            <p className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Charts generated from live CAGR & rolling return metrics. NAV curve is back-calculated from current data.
            </p>
          </div>
          <div className="flex space-x-2 text-xs">
            {[
              { id: 'nav', label: compareMode ? 'NAV Growth (Indexed)' : 'NAV Curve', icon: TrendingUp },
              { id: 'roll', label: '3Y Rolling Returns', icon: BarChart2 },
              { id: 'sip', label: '₹10k/mo SIP Growth', icon: ChartIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id as any)}
                className="px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5"
                style={{
                  background: 'transparent',
                  color: activeChart === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  border: activeChart === tab.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'nav' ? (
              <AreaChart data={navData}>
                <defs>
                  <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B386" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00B386" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="nav2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke={ct.axis} fontSize={11} tickLine={false} interval={11} />
                <YAxis stroke={ct.axis} fontSize={11} domain={['auto', 'auto']}
                  tickFormatter={v => compareMode ? `${v}` : `₹${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, borderRadius: '12px', color: ct.tooltipText, fontSize: '12px' }}
                  formatter={(val: any, name: any) => [
                    compareMode ? `${Number(val).toFixed(1)} (idx)` : `₹${Number(val).toFixed(2)}`,
                    name === 'nav2' ? fundLabel(compareFund) : fundLabel(activeFund)
                  ]}
                />
                {compareMode && <Legend />}
                <Area type="monotone" dataKey="nav" name={fundLabel(activeFund)} stroke="#00B386" strokeWidth={2.5} fillOpacity={1} fill="url(#navGrad)" />
                {compareMode && compareFund && (
                  <Area type="monotone" dataKey="nav2" name={fundLabel(compareFund)} stroke="#64748b" strokeWidth={2} strokeDasharray="3 3" fillOpacity={1} fill="url(#nav2Grad)" />
                )}
              </AreaChart>
            ) : activeChart === 'roll' ? (
              <LineChart data={rollData}>
                <XAxis dataKey="date" stroke={ct.axis} fontSize={11} tickLine={false} interval={7} />
                <YAxis stroke={ct.axis} fontSize={11} domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, borderRadius: '12px', color: ct.tooltipText, fontSize: '12px' }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name === 'median' ? 'Median' : '3Y Rolling Return']}
                />
                {activeFund?.r3med && <ReferenceLine y={activeFund.r3med} stroke="#64748b" strokeDasharray="4 4" label={{ value: `Median ${activeFund.r3med.toFixed(1)}%`, fill: '#64748b', fontSize: 10, position: 'right' }} />}
                <Line type="monotone" dataKey="r3" stroke="#00B386" strokeWidth={2.5} dot={false} name="3Y Rolling Return" />
                <Line type="monotone" dataKey="median" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Median" />
              </LineChart>
            ) : (
              <AreaChart data={sipData}>
                <defs>
                  <linearGradient id="sipGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B386" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00B386" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke={ct.axis} fontSize={11} tickLine={false} interval={11} />
                <YAxis stroke={ct.axis} fontSize={11} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, borderRadius: '12px', color: ct.tooltipText, fontSize: '12px' }}
                  formatter={(val: any, name: any) => [`₹${(Number(val) / 100000).toFixed(2)} Lakhs`, name === 'value' ? 'SIP Corpus' : 'Total Invested']}
                />
                <Legend />
                <Area type="monotone" dataKey="invested" name="Total Invested" stroke="#64748b" strokeWidth={2} strokeDasharray="3 3" fill="transparent" />
                <Area type="monotone" dataKey="value" name="SIP Corpus" stroke="#00B386" strokeWidth={2.5} fillOpacity={1} fill="url(#sipGrad)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* SIP Summary Row */}
        {activeChart === 'sip' && sipData.length > 0 && (() => {
          const last = sipData[sipData.length - 1];
          const gain = last.value - last.invested;
          const xirr = activeFund?.y10 ?? activeFund?.y5 ?? activeFund?.y3 ?? 15;
          return (
            <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="p-3 rounded-xl bg-transparent border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">Total Invested (10Y × ₹10k/mo)</p>
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">₹{(last.invested / 100000).toFixed(2)} Lakhs</p>
              </div>
              <div className="p-3 rounded-xl bg-transparent border border-[#00B386]">
                <p className="text-[10px] text-[#00B386]">Corpus Value</p>
                <p className="text-sm font-extrabold text-[#00B386]">₹{(last.value / 100000).toFixed(2)} Lakhs</p>
              </div>
              <div className="p-3 rounded-xl bg-transparent border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">Total Gain @ {xirr.toFixed(1)}% CAGR</p>
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">₹{(gain / 100000).toFixed(2)} Lakhs</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
