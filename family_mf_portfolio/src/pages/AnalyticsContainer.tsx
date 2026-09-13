import React, { useState, useEffect, useMemo } from 'react';
import { PORTFOLIO_HOLDINGS, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import type { MutualFundHolding } from '../data/portfolioData';
import { useChartTheme } from '../lib/chartTheme';
import {
  Activity, BarChart2, Layers, ShieldAlert, TrendingDown, Award, AlertTriangle,
  CheckCircle2, XCircle, ArrowUpRight, Zap, Target, Shield, TrendingUp
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, CartesianGrid
} from 'recharts';

interface AnalyticsContainerProps {
  onSelectFund: (fund: MutualFundHolding) => void;
  onNavigateToStp: () => void;
}

// ─── Shared hook: load live dataset + build fuzzy lookup ─────────────────────
function useLiveEnrichedHoldings() {
  const [liveFunds, setLiveFunds] = useState<Fund[]>([]);
  const ct = useChartTheme();

  useEffect(() => {
    loadMasterDataset().then(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  const liveFundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    liveFunds.forEach(f => {
      if (f.label) map.set(f.label.toLowerCase(), f);
      if (f.schemeName) map.set((f.schemeName || '').toLowerCase(), f);
    });
    return map;
  }, [liveFunds]);

  const getLive = (name: string): Fund | undefined => {
    const q = name.toLowerCase();
    if (liveFundMap.has(q)) return liveFundMap.get(q);
    for (const [k, v] of liveFundMap) { if (k.includes(q.slice(0, 15))) return v; }
    return undefined;
  };

  const enriched = useMemo(() => PORTFOLIO_HOLDINGS.map(h => {
    const lf = getLive(h.name);
    return {
      ...h,
      // Live overrides
      sharpe: lf?.sharpe3 ?? h.sharpeRatio,
      sortino: lf?.sort3 ?? h.sortinoRatio,
      beta: lf?.beta3 ?? h.beta,
      volatility: lf?.sd3 ?? h.stdDev,
      maxDD: lf?.maxDrawdown ?? h.maxDrawdown,
      alpha: lf?.alpha ?? null as number | null,
      expense: lf?.exp ?? h.expenseRatio,
      aum: lf?.aum ?? null as number | null,
      y1: lf?.y1 ?? h.cagr1y,
      y3: lf?.y3 ?? h.cagr3y,
      y5: lf?.y5 ?? h.cagr5y,
      r3min: lf?.r3min ?? h.rolling3yMin,
      r3med: lf?.r3med ?? h.rolling3yAvg,
      r3max: lf?.r3max ?? h.rolling3yMax,
      isLive: !!lf,
    };
  }), [liveFunds]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enriched, liveFunds, ct };
}

// ─── 1. PORTFOLIO HEALTH SCORE ───────────────────────────────────────────────
const PortfolioHealthScore: React.FC<{ enriched: ReturnType<typeof useLiveEnrichedHoldings>['enriched']; ct: ReturnType<typeof useChartTheme> }> = ({ enriched, ct }) => {
  const metrics = useMemo(() => {
    const avgSharpe = enriched.reduce((s, f) => s + (f.sharpe ?? 0), 0) / enriched.length;
    const avgAlpha = enriched.filter(f => f.alpha != null).reduce((s, f) => s + (f.alpha ?? 0), 0) / enriched.filter(f => f.alpha != null).length;
    const avgDD = enriched.reduce((s, f) => s + (f.maxDD ?? 0), 0) / enriched.length;
    const avgExpense = enriched.reduce((s, f) => s + (f.expense ?? 0), 0) / enriched.length;
    const avgR3med = enriched.reduce((s, f) => s + (f.r3med ?? 0), 0) / enriched.length;
    const avgBeta = enriched.reduce((s, f) => s + (f.beta ?? 0), 0) / enriched.length;

    // Score each dimension 0–100
    const sharpeScore = Math.min(100, (avgSharpe / 2.0) * 100);
    const alphaScore = isNaN(avgAlpha) ? 60 : Math.min(100, Math.max(0, 50 + avgAlpha * 5));
    const drawdownScore = Math.min(100, Math.max(0, 100 + avgDD * 2.5)); // avgDD is negative
    const costScore = Math.min(100, Math.max(0, (1 - avgExpense / 1.5) * 100));
    const consistencyScore = Math.min(100, (avgR3med / 20) * 100);
    const betaScore = Math.min(100, Math.max(0, 100 - Math.abs(avgBeta - 0.9) * 80));
    const overallScore = (sharpeScore + alphaScore + drawdownScore + costScore + consistencyScore + betaScore) / 6;

    // Grade
    const grade = overallScore >= 80 ? 'A+' : overallScore >= 70 ? 'A' : overallScore >= 60 ? 'B+' : overallScore >= 50 ? 'B' : 'C';
    const gradeColor = overallScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : overallScore >= 55 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';

    const radarData = [
      { metric: 'Sharpe', score: +sharpeScore.toFixed(0) },
      { metric: 'Alpha', score: +alphaScore.toFixed(0) },
      { metric: 'Drawdown\nResil.', score: +drawdownScore.toFixed(0) },
      { metric: 'Cost\nEfficiency', score: +costScore.toFixed(0) },
      { metric: 'Rolling\nConsist.', score: +consistencyScore.toFixed(0) },
      { metric: 'Beta\nControl', score: +betaScore.toFixed(0) },
    ];

    return { avgSharpe, avgAlpha, avgDD, avgExpense, avgR3med, avgBeta, overallScore, grade, gradeColor, sharpeScore, alphaScore, drawdownScore, costScore, consistencyScore, betaScore, radarData };
  }, [enriched]);

  const dims = [
    { label: 'Sharpe Quality', score: metrics.sharpeScore, raw: `${metrics.avgSharpe.toFixed(2)}`, higher: true, threshold: 60 },
    { label: 'Alpha Generation', score: metrics.alphaScore, raw: `${metrics.avgAlpha.toFixed(2)}%`, higher: true, threshold: 50 },
    { label: 'Drawdown Resilience', score: metrics.drawdownScore, raw: `${metrics.avgDD.toFixed(1)}%`, higher: true, threshold: 55 },
    { label: 'Cost Efficiency', score: metrics.costScore, raw: `${metrics.avgExpense.toFixed(2)}%`, higher: true, threshold: 65 },
    { label: '3Y Rolling Consistency', score: metrics.consistencyScore, raw: `${metrics.avgR3med.toFixed(1)}%`, higher: true, threshold: 60 },
    { label: 'Beta Discipline', score: metrics.betaScore, raw: `β ${metrics.avgBeta.toFixed(2)}`, higher: false, threshold: 60 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Score Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Overall Score */}
        <div className="lg:col-span-1 p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col items-center justify-center text-center gap-3">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Portfolio Health Score</p>
          <div className={`text-6xl sm:text-7xl font-black ${metrics.gradeColor}`}>{metrics.grade}</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">{metrics.overallScore.toFixed(0)}<span className="text-xl text-neutral-400">/100</span></div>
          <p className="text-xs text-neutral-500 max-w-[200px]">Composite across 6 institutional dimensions across all {PORTFOLIO_HOLDINGS.length} holdings</p>
          <div className="w-full bg-neutral-100 dark:bg-neutral-900 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${metrics.overallScore}%` }} />
          </div>
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            6-Dimension Health Radar
          </h3>
          <div className="h-60 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={metrics.radarData}>
                <PolarGrid stroke={ct.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#888' }} />
                <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6 Dimension Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {dims.map(d => {
          const isGood = d.score >= d.threshold;
          const barColor = isGood ? 'bg-emerald-500' : d.score >= d.threshold - 15 ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <div key={d.label} className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 truncate max-w-[110px] sm:max-w-none">{d.label}</span>
                {isGood
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">{d.score.toFixed(0)}</span>
                <span className="text-[10px] sm:text-xs font-bold text-neutral-500">{d.raw}</span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-900 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(d.score, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom 5 laggards */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500" /> Weakest Funds by Composite Score (STP Candidates)
          </h4>
        </div>
        <div className="overflow-x-auto table-scroll-container">
          <table className="mono-table">
            <thead><tr className="sticky top-0 z-10">
              <th>Fund</th><th className="text-center">Sharpe</th><th className="text-center">Alpha</th>
              <th className="text-right">Max DD</th><th className="text-right">3Y CAGR</th><th className="text-right">Invested</th>
            </tr></thead>
            <tbody>
              {[...enriched]
                .sort((a, b) => (a.sharpe ?? 0) - (b.sharpe ?? 0))
                .slice(0, 8)
                .map(f => (
                  <tr key={f.id} className="hover:bg-rose-50 dark:hover:bg-rose-950/20 transition">
                    <td>
                      <p className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[220px]">{f.name.replace(' - Direct Growth', '')}</p>
                      <p className="text-[10px] text-neutral-500">{f.category}</p>
                    </td>
                    <td className="text-center font-bold text-rose-600 dark:text-rose-400">{f.sharpe?.toFixed(2) ?? '—'}</td>
                    <td className={`text-center font-bold ${(f.alpha ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {f.alpha != null ? `${f.alpha > 0 ? '+' : ''}${f.alpha.toFixed(1)}%` : '—'}
                    </td>
                    <td className="text-right text-rose-600 dark:text-rose-400">{f.maxDD != null ? `${f.maxDD.toFixed(1)}%` : '—'}</td>
                    <td className="text-right font-bold text-neutral-900 dark:text-white">{f.y3 != null ? `${f.y3.toFixed(1)}%` : '—'}</td>
                    <td className="text-right font-bold text-neutral-900 dark:text-white">₹{f.amountLakhs.toFixed(1)}L</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 2. RISK-REWARD QUADRANT ──────────────────────────────────────────────────
const RiskRewardView: React.FC<{ enriched: ReturnType<typeof useLiveEnrichedHoldings>['enriched']; onSelectFund: (f: MutualFundHolding) => void; ct: ReturnType<typeof useChartTheme> }> = ({ enriched, onSelectFund, ct }) => {
  const [filter, setFilter] = useState<'ALL' | 'STAR' | 'ALPHA' | 'DEFENSIVE' | 'EXIT'>('ALL');

  const getQuadrant = (vol: number, sharpe: number) => {
    if (sharpe >= 1.3 && vol <= 14) return { key: 'STAR', label: '⭐ Star', color: '#10b981' };
    if (sharpe >= 1.3 && vol > 14) return { key: 'ALPHA', label: '🚀 High-Alpha', color: '#3b82f6' };
    if (sharpe < 1.3 && vol <= 14) return { key: 'DEFENSIVE', label: '🛡 Defensive', color: '#f59e0b' };
    return { key: 'EXIT', label: '⚠️ Exit Zone', color: '#ef4444' };
  };

  const data = enriched.map(f => {
    const q = getQuadrant(f.volatility ?? f.stdDev, f.sharpe ?? f.sharpeRatio);
    return { ...f, ...q, x: f.volatility ?? f.stdDev, y: f.sharpe ?? f.sharpeRatio };
  });

  const filtered = filter === 'ALL' ? data : data.filter(d => d.key === filter);
  const counts = { STAR: data.filter(d => d.key === 'STAR').length, ALPHA: data.filter(d => d.key === 'ALPHA').length, DEFENSIVE: data.filter(d => d.key === 'DEFENSIVE').length, EXIT: data.filter(d => d.key === 'EXIT').length };
  const capitals = { STAR: data.filter(d => d.key === 'STAR').reduce((s, d) => s + d.amountLakhs, 0), EXIT: data.filter(d => d.key === 'EXIT').reduce((s, d) => s + d.amountLakhs, 0) };

  const quadrants = [
    { key: 'STAR', label: 'Star Quadrant', desc: 'High Sharpe + Low Volatility', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', n: counts.STAR, capital: capitals.STAR },
    { key: 'ALPHA', label: 'High-Alpha', desc: 'High Sharpe + High Volatility', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', n: counts.ALPHA, capital: 0 },
    { key: 'DEFENSIVE', label: 'Defensive', desc: 'Low Sharpe + Low Volatility', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', n: counts.DEFENSIVE, capital: 0 },
    { key: 'EXIT', label: 'Exit Zone', desc: 'Low Sharpe + High Volatility', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', n: counts.EXIT, capital: capitals.EXIT },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Quadrant summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {quadrants.map(q => (
          <button
            key={q.key}
            onClick={() => setFilter(filter === q.key as any ? 'ALL' : q.key as any)}
            className={`p-4 rounded-2xl border text-left transition ${filter === q.key ? q.bg + ' scale-[0.98]' : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800'} ${q.bg}`}
          >
            <p className={`font-extrabold text-base ${q.color}`}>{q.n} funds</p>
            <p className="font-bold text-neutral-900 dark:text-white">{q.label}</p>
            <p className="text-neutral-500">{q.desc}</p>
            {q.capital > 0 && <p className={`mt-1 font-black ${q.color}`}>₹{q.capital.toFixed(0)}L</p>}
          </button>
        ))}
      </div>

      {/* Scatter Chart */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">Volatility (X) vs Sharpe Ratio (Y) — Bubble Size = Capital Invested</h3>
        <p className="text-xs text-neutral-500 mb-4">Top-right = high alpha; Bottom-left = defensive; Bottom-right = exit candidates</p>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 15, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis type="number" dataKey="x" name="Volatility" stroke={ct.axis} fontSize={11} label={{ value: 'Volatility (σ%)', position: 'insideBottom', offset: -10, fill: ct.axis, fontSize: 11 }} domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="y" name="Sharpe" stroke={ct.axis} fontSize={11} label={{ value: 'Sharpe Ratio', angle: -90, position: 'insideLeft', fill: ct.axis, fontSize: 11 }} domain={['auto', 'auto']} />
              <ZAxis dataKey="amountLakhs" range={[40, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="p-3 rounded-xl border text-xs max-w-[220px]" style={{ background: ct.tooltipBg, borderColor: ct.tooltipBorder, color: ct.tooltipText }}>
                      <p className="font-bold truncate">{d.name?.replace(' - Direct Growth', '')}</p>
                      <p style={{ color: ct.textMuted }}>{d.category}</p>
                      <p>Sharpe: <strong>{d.y?.toFixed(2)}</strong> | Vol: <strong>{d.x?.toFixed(1)}%</strong></p>
                      <p>Capital: <strong>₹{d.amountLakhs?.toFixed(1)}L</strong></p>
                    </div>
                  );
                }}
              />
              <Scatter
                data={filtered}
                onClick={(d) => onSelectFund(d as unknown as MutualFundHolding)}
                cursor="pointer"
              >
                {filtered.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table of filtered funds */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-900 dark:text-white">
          {filtered.length} Funds — {filter === 'ALL' ? 'All Quadrants' : filter}
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="mono-table">
            <thead><tr className="sticky top-0 z-10">
              <th>Fund</th><th className="text-center">Quadrant</th><th className="text-center">Sharpe</th>
              <th className="text-center">Volatility</th><th className="text-center">Beta</th><th className="text-right">Capital</th>
            </tr></thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => onSelectFund(f as unknown as MutualFundHolding)} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer transition">
                  <td>
                    <p className="font-bold text-xs truncate max-w-[200px]">{f.name?.replace(' - Direct Growth', '')}</p>
                    <p className="text-[10px] text-neutral-500">{f.category}</p>
                  </td>
                  <td className="text-center text-xs font-bold" style={{ color: f.color }}>{f.label}</td>
                  <td className="text-center font-bold text-neutral-900 dark:text-white">{f.y?.toFixed(2)}</td>
                  <td className="text-center text-neutral-700 dark:text-neutral-300">{f.x?.toFixed(1)}%</td>
                  <td className="text-center text-neutral-700 dark:text-neutral-300">{f.beta?.toFixed(2)}</td>
                  <td className="text-right font-bold text-neutral-900 dark:text-white">₹{f.amountLakhs?.toFixed(1)}L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 3. ROLLING CONSISTENCY ENGINE ───────────────────────────────────────────
const RollingConsistency: React.FC<{ enriched: ReturnType<typeof useLiveEnrichedHoldings>['enriched']; ct: ReturnType<typeof useChartTheme> }> = ({ enriched, ct }) => {
  const [cat, setCat] = useState('ALL');
  const [sort, setSort] = useState<'spread' | 'median' | 'min'>('spread');

  const cats = ['ALL', ...Array.from(new Set(enriched.map(f => f.category))).sort()];

  const filtered = enriched
    .filter(f => cat === 'ALL' || f.category === cat)
    .map(f => ({
      ...f,
      spread: (f.r3max ?? 0) - (f.r3min ?? 0),
      shortName: f.name.replace(' - Direct Growth', '').slice(0, 28),
    }))
    .sort((a, b) => sort === 'spread' ? a.spread - b.spread : sort === 'median' ? (b.r3med ?? 0) - (a.r3med ?? 0) : (b.r3min ?? 0) - (a.r3min ?? 0));

  const chartTop10 = filtered.slice(0, 10).map(f => ({
    name: f.name.replace(' - Direct Growth', '').slice(0, 18) + '…',
    min: +(f.r3min ?? 0).toFixed(1),
    med: +(f.r3med ?? 0).toFixed(1),
    max: +(f.r3max ?? 0).toFixed(1),
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-neutral-500">Sort by:</span>
          {[{ k: 'spread', l: 'Tightest Spread (Best Consistency)' }, { k: 'median', l: 'Highest Median Return' }, { k: 'min', l: 'Highest Floor Return' }].map(s => (
            <button key={s.k} onClick={() => setSort(s.k as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${sort === s.k ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none">
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Top 10 — 3Y Rolling Return Distribution (Min / Median / Max)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartTop10} margin={{ top: 5, right: 10, left: 0, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" stroke={ct.axis} tick={{ fontSize: 9, fill: ct.tickFill }} angle={-20} textAnchor="end" />
              <YAxis stroke={ct.axis} tick={{ fontSize: 11, fill: ct.tickFill }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, borderRadius: '12px', color: ct.tooltipText, fontSize: '12px' }}
                formatter={(v: any) => [`${v}%`]} />
              <Bar dataKey="min" name="3Y Min" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="med" name="3Y Median" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" name="3Y Max" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-900 dark:text-white">
          {filtered.length} Holdings — Rolling Return Consistency Leaderboard
        </div>
        <div className="overflow-x-auto max-h-[480px]">
          <table className="mono-table">
            <thead><tr className="sticky top-0 z-10">
              <th>Fund</th><th className="text-center">Category</th>
              <th className="text-right text-rose-500">Floor (Min)</th>
              <th className="text-right text-emerald-500">Median</th>
              <th className="text-right text-blue-500">Ceiling (Max)</th>
              <th className="text-right">Spread</th>
              <th className="text-right">Capital</th>
            </tr></thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                  <td>
                    <p className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[200px]">{f.name.replace(' - Direct Growth', '')}</p>
                    {f.isLive && <span className="text-[9px] text-emerald-500 font-bold">⚡ Live</span>}
                  </td>
                  <td className="text-center"><span className="chip text-[10px] py-0 px-2">{f.category}</span></td>
                  <td className={`text-right font-bold ${(f.r3min ?? 0) >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{f.r3min != null ? `${f.r3min.toFixed(1)}%` : '—'}</td>
                  <td className="text-right font-extrabold text-emerald-600 dark:text-emerald-400">{f.r3med != null ? `${f.r3med.toFixed(1)}%` : '—'}</td>
                  <td className="text-right font-bold text-blue-600 dark:text-blue-400">{f.r3max != null ? `${f.r3max.toFixed(1)}%` : '—'}</td>
                  <td className={`text-right font-bold ${f.spread <= 10 ? 'text-emerald-600 dark:text-emerald-400' : f.spread <= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{f.spread.toFixed(1)}pp</td>
                  <td className="text-right text-neutral-900 dark:text-white font-bold">₹{f.amountLakhs.toFixed(1)}L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 4. AMC CONCENTRATION & OVERLAP ──────────────────────────────────────────
const AmcConcentration: React.FC<{ enriched: ReturnType<typeof useLiveEnrichedHoldings>['enriched']; onNavigateToStp: () => void }> = ({ enriched, onNavigateToStp }) => {
  const amcStats = useMemo(() => {
    const map: Record<string, { total: number; count: number; funds: typeof enriched }> = {};
    enriched.forEach(f => {
      const amc = f.amc.replace(' Mutual Fund', '').replace(' Asset Management', '');
      if (!map[amc]) map[amc] = { total: 0, count: 0, funds: [] };
      map[amc].total += f.amountLakhs;
      map[amc].count += 1;
      map[amc].funds.push(f);
    });
    return Object.entries(map).map(([name, d]) => ({
      name, total: d.total, count: d.count, funds: d.funds,
      pct: (d.total / TOTAL_PORTFOLIO_VALUE_LAKHS) * 100,
      avgSharpe: d.funds.reduce((s, f) => s + (f.sharpe ?? 0), 0) / d.funds.length,
    })).sort((a, b) => b.total - a.total);
  }, [enriched]);

  // Stock overlap — which stocks appear in the most funds
  const stockMap = useMemo(() => {
    const map: Record<string, { funds: string[]; capital: number }> = {};
    enriched.forEach(f => {
      f.topHoldings.forEach(stock => {
        if (!map[stock]) map[stock] = { funds: [], capital: 0 };
        map[stock].funds.push(f.name.replace(' - Direct Growth', ''));
        map[stock].capital += f.amountLakhs * 0.06;
      });
    });
    return Object.entries(map).map(([stock, d]) => ({ stock, count: d.funds.length, capital: d.capital, funds: d.funds }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
  }, [enriched]);

  const duplicates = enriched.filter(f => f.isDuplicate);
  const highConc = amcStats.filter(a => a.pct > 15);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${highConc.length > 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
          <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${highConc.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">{highConc.length} High-Concentration AMCs</p>
            <p className="text-neutral-500">Over 15% custodian exposure</p>
          </div>
        </div>
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${duplicates.length > 0 ? 'bg-rose-500/5 border-rose-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${duplicates.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">{duplicates.length} Duplicate Folios</p>
            <p className="text-neutral-500">Same scheme invested twice</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex items-start gap-3">
          <Layers className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">{stockMap[0]?.count ?? 0} Funds Share Top Stock</p>
            <p className="text-neutral-500">{stockMap[0]?.stock} — highest overlap</p>
          </div>
        </div>
      </div>

      {/* AMC Heat Bars */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> AMC Custodian Concentration ({amcStats.length} Fund Houses)
        </h3>
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {amcStats.map(amc => {
            const isHigh = amc.pct > 15;
            const isMed = amc.pct > 8;
            const barW = Math.min(amc.pct * 4, 100);
            return (
              <div key={amc.name} className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white">{amc.name}</span>
                    <span className="text-neutral-500">({amc.count} funds)</span>
                    {isHigh && <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">High</span>}
                    <span className="text-neutral-500">Avg Sharpe: <strong>{amc.avgSharpe.toFixed(2)}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-neutral-900 dark:text-white">₹{amc.total.toFixed(1)}L</span>
                    <span className="text-neutral-500 ml-2">{amc.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : isMed ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${barW}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Overlap Grid */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Most Overlapping Stocks Across {PORTFOLIO_HOLDINGS.length} Funds
          </h4>
          {duplicates.length > 0 && (
            <button onClick={onNavigateToStp} className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition self-start sm:self-auto">
              <ArrowUpRight className="w-3.5 h-3.5" /> Consolidate via STP
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-72 table-scroll-container">
          <table className="mono-table">
            <thead><tr className="sticky top-0 z-10">
              <th>Stock Name</th><th className="text-center">In # Funds</th><th className="text-right">Est. Capital</th><th className="text-right">% Wealth</th><th>Top Funds Holding</th>
            </tr></thead>
            <tbody>
              {stockMap.map(s => (
                <tr key={s.stock} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                  <td className="font-bold text-neutral-900 dark:text-white">{s.stock}</td>
                  <td className="text-center">
                    <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${s.count >= 5 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'}`}>
                      {s.count}
                    </span>
                  </td>
                  <td className="text-right font-bold text-emerald-600 dark:text-emerald-400">₹{s.capital.toFixed(1)}L</td>
                  <td className="text-right text-neutral-500">{((s.capital / TOTAL_PORTFOLIO_VALUE_LAKHS) * 100).toFixed(2)}%</td>
                  <td className="text-neutral-500 text-[10px] truncate max-w-[240px]">{s.funds.slice(0, 3).join(', ')}{s.funds.length > 3 ? ` +${s.funds.length - 3} more` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 5. DRAWDOWN & STRESS ANALYSIS ───────────────────────────────────────────
const DrawdownStress: React.FC<{ enriched: ReturnType<typeof useLiveEnrichedHoldings>['enriched']; ct: ReturnType<typeof useChartTheme> }> = ({ enriched, ct }) => {
  const withDD = enriched.filter(f => f.maxDD != null).sort((a, b) => (a.maxDD ?? 0) - (b.maxDD ?? 0));
  const avgDD = withDD.reduce((s, f) => s + (f.maxDD ?? 0), 0) / withDD.length;
  const worstDD = withDD[0]?.maxDD ?? 0;
  const capitalAtRisk = withDD.reduce((s, f) => {
    const ddFrac = Math.abs(f.maxDD ?? 0) / 100;
    return s + f.amountLakhs * ddFrac;
  }, 0);

  const chartData = withDD.slice(0, 15).map(f => ({
    name: f.name.replace(' - Direct Growth', '').slice(0, 16) + '…',
    dd: +(f.maxDD ?? 0).toFixed(1),
    capital: f.amountLakhs,
  }));

  const scenarios = [
    { label: '2008 GFC (-45%)', drop: -45, icon: '💥' },
    { label: '2020 Covid (-32.5%)', drop: -32.5, icon: '🦠' },
    { label: '2022 Rate Hike (-14.2%)', drop: -14.2, icon: '📉' },
    { label: '2021 Bull Rally (+38.5%)', drop: 38.5, icon: '🚀' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30">
          <p className="text-rose-500 font-bold uppercase tracking-wider mb-1">Portfolio Avg Max Drawdown</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{avgDD.toFixed(1)}%</p>
          <p className="text-neutral-500 mt-1">Weighted across {withDD.length} funds with data</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30">
          <p className="text-rose-500 font-bold uppercase tracking-wider mb-1">Worst Single Fund Drawdown</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{worstDD.toFixed(1)}%</p>
          <p className="text-neutral-500 mt-1 truncate">{withDD[0]?.name?.replace(' - Direct Growth', '')}</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/30 sm:col-span-1 col-span-1">
          <p className="text-amber-500 font-bold uppercase tracking-wider mb-1">Capital at Peak-to-Trough Risk</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">₹{capitalAtRisk.toFixed(0)}L</p>
          <p className="text-neutral-500 mt-1">If all funds hit historic max drawdown simultaneously</p>
        </div>
      </div>

      {/* Macro Stress Scenarios */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" /> Macro Stress Scenario Simulator
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {scenarios.map(s => {
            const impact = TOTAL_PORTFOLIO_VALUE_LAKHS * (s.drop / 100);
            const newVal = TOTAL_PORTFOLIO_VALUE_LAKHS + impact;
            const isGain = s.drop > 0;
            return (
              <div key={s.label} className={`p-3 sm:p-4 rounded-2xl border text-xs space-y-1.5 sm:space-y-2 ${isGain ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/30'}`}>
                <p className="text-base">{s.icon}</p>
                <p className="font-bold text-neutral-900 dark:text-white leading-tight line-clamp-2">{s.label}</p>
                <p className={`text-lg sm:text-2xl font-black ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isGain ? '+' : ''}₹{Math.abs(impact).toFixed(0)}L
                </p>
                <p className="text-[11px] text-neutral-500">New val: <strong className="text-neutral-900 dark:text-white">₹{newVal.toFixed(0)}L</strong></p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar chart - max drawdown per fund */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4">Worst 15 Funds by Max Historical Drawdown</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
              <XAxis type="number" stroke={ct.axis} fontSize={11} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke={ct.axis} tick={{ fontSize: 9, fill: ct.tickFill }} width={95} />
              <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, borderRadius: '12px', color: ct.tooltipText, fontSize: '12px' }}
                formatter={(v: any) => [`${v}%`, 'Max Drawdown']} />
              <Bar dataKey="dd" name="Max Drawdown" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={`hsl(${10 + i * 8}, 80%, 55%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full drawdown table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-900 dark:text-white">
          All {withDD.length} Holdings with Drawdown Data — Sorted Worst First
        </div>
        <div className="table-scroll-container max-h-72">
          <table className="mono-table min-w-[550px]">
            <thead><tr className="sticky top-0 z-10">
              <th>Fund</th><th className="text-center">Category</th><th className="text-right">Max Drawdown</th>
              <th className="text-right">Sharpe</th><th className="text-right">3Y CAGR</th><th className="text-right">Capital</th>
            </tr></thead>
            <tbody>
              {withDD.map(f => (
                <tr key={f.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                  <td><p className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[200px]">{f.name.replace(' - Direct Growth', '')}</p></td>
                  <td className="text-center"><span className="chip text-[10px] py-0 px-2">{f.category}</span></td>
                  <td className="text-right font-extrabold text-rose-600 dark:text-rose-400">{f.maxDD?.toFixed(1)}%</td>
                  <td className={`text-right font-bold ${(f.sharpe ?? 0) >= 1.3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>{f.sharpe?.toFixed(2) ?? '—'}</td>
                  <td className="text-right text-neutral-900 dark:text-white">{f.y3 != null ? `${f.y3.toFixed(1)}%` : '—'}</td>
                  <td className="text-right font-bold text-neutral-900 dark:text-white">₹{f.amountLakhs.toFixed(1)}L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN CONTAINER ───────────────────────────────────────────────────────────
export const AnalyticsContainer: React.FC<AnalyticsContainerProps> = ({ onSelectFund, onNavigateToStp }) => {
  const [tab, setTab] = useState<'health' | 'quadrant' | 'rolling' | 'amc' | 'drawdown'>('health');
  const { enriched, liveFunds, ct } = useLiveEnrichedHoldings();

  const tabs = [
    { id: 'health',   label: 'Portfolio Health',      icon: Award,       desc: 'Composite grade + radar' },
    { id: 'quadrant', label: 'Risk-Reward Matrix',    icon: Activity,    desc: 'Live Sharpe vs Volatility' },
    { id: 'rolling',  label: 'Rolling Consistency',   icon: BarChart2,   desc: 'Min/Med/Max rolling returns' },
    { id: 'amc',      label: 'AMC & Overlap',         icon: Layers,      desc: 'Concentration + stock overlap' },
    { id: 'drawdown', label: 'Drawdown & Stress',     icon: TrendingDown, desc: 'Max DD + stress scenarios' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Fund Analytics Terminal</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">Portfolio Deep-Dive Analytics</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{PORTFOLIO_HOLDINGS.length} holdings · ₹{(TOTAL_PORTFOLIO_VALUE_LAKHS / 100).toFixed(2)} Crore · Live Tickertape data</p>
        </div>
        {liveFunds.length > 0 && (
          <span className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs">
            <Zap className="w-3.5 h-3.5" /> {liveFunds.length} Tickertape Schemes Loaded
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm flex overflow-x-auto gap-1 scrollbar-none touch-pan-x">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <div>{t.label}</div>
                {!isActive && <div className="text-[10px] opacity-60 font-normal hidden sm:block">{t.desc}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'health'   && <PortfolioHealthScore enriched={enriched} ct={ct} />}
      {tab === 'quadrant' && <RiskRewardView enriched={enriched} onSelectFund={onSelectFund} ct={ct} />}
      {tab === 'rolling'  && <RollingConsistency enriched={enriched} ct={ct} />}
      {tab === 'amc'      && <AmcConcentration enriched={enriched} onNavigateToStp={onNavigateToStp} />}
      {tab === 'drawdown' && <DrawdownStress enriched={enriched} ct={ct} />}
    </div>
  );
};
