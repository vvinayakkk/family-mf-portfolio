import React, { useState } from 'react';
import { HISTORICAL_BENCHMARK_20Y, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { TrendingUp, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const BacktestView: React.FC = () => {
  const [initialCapitalLakhs, setInitialCapitalLakhs] = useState<number>(TOTAL_PORTFOLIO_VALUE_LAKHS);

  // Multiplier projections for future 5, 10, 15, 20 years
  const cagrRate = 0.158; // 15.8% CAGR
  const futureProjections = [
    { horizon: '5 Years', multiplier: Math.pow(1 + cagrRate, 5), value: initialCapitalLakhs * Math.pow(1 + cagrRate, 5) },
    { horizon: '10 Years', multiplier: Math.pow(1 + cagrRate, 10), value: initialCapitalLakhs * Math.pow(1 + cagrRate, 10) },
    { horizon: '15 Years', multiplier: Math.pow(1 + cagrRate, 15), value: initialCapitalLakhs * Math.pow(1 + cagrRate, 15) },
    { horizon: '20 Years', multiplier: Math.pow(1 + cagrRate, 20), value: initialCapitalLakhs * Math.pow(1 + cagrRate, 20) },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>20-Year Historical Backtest & Multi-Decade Wealth Visualizer</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Historical Returns & Benchmark Backtester</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Track how your family portfolio strategy performs across bull runs, bear crashes, interest rate cycles, and inflationary spikes compared to Nifty 50, Nifty Midcap 150, Gold, and Inflation.
        </p>
      </div>

      {/* Main Backtest Chart Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 20-Year Multi-Asset Growth Trajectory (Base 100)
            </h3>
            <p className="text-xs text-neutral-500">Indexed growth comparison from 2005 to 2026</p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-neutral-500 font-medium">Initial Base Capital:</span>
            <input
              type="number"
              value={initialCapitalLakhs}
              onChange={(e) => setInitialCapitalLakhs(Number(e.target.value))}
              className="w-28 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none"
            />
            <span className="text-neutral-500 font-medium">Lakhs</span>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={HISTORICAL_BENCHMARK_20Y} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="familyPortfolio" name="Family Portfolio Strategy (+15.8% CAGR)" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="niftyMidcap" name="Nifty Midcap 150 TRI (+14.2% CAGR)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="nifty50" name="Nifty 50 TRI (+12.5% CAGR)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gold" name="Physical Gold (+10.8% CAGR)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="inflation" name="CPI Inflation (+6.2% CAGR)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projections Matrix */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
        <h3 className="font-bold text-base text-neutral-900 dark:text-white">Future Capital Compounding Projections</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {futureProjections.map((p) => (
            <div key={p.horizon} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <p className="text-[10px] text-neutral-500 font-medium">{p.horizon} Horizon</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{(p.value / 100).toFixed(2)} Cr</p>
              <p className="text-[10px] text-neutral-400">Wealth Multiplier: {p.multiplier.toFixed(2)}x</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
