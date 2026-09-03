import React, { useState, useEffect, useMemo } from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { BarChart2, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';

interface RollingReturnsProps {
  onSelectFund: (fund: MutualFundHolding) => void;
}

export const RollingReturns: React.FC<RollingReturnsProps> = ({ onSelectFund }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [liveFunds, setLiveFunds] = useState<Fund[]>([]);

  useEffect(() => {
    loadMasterDataset().then(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  const liveFundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    liveFunds.forEach(f => { if (f.label) map.set(f.label.toLowerCase(), f); });
    return map;
  }, [liveFunds]);

  const getLiveRolling = (name: string) => {
    const q = name.toLowerCase();
    if (liveFundMap.has(q)) return liveFundMap.get(q);
    for (const [k, v] of liveFundMap) { if (k.includes(q.slice(0, 15))) return v; }
    return undefined;
  };

  const filteredHoldings = PORTFOLIO_HOLDINGS.filter(f =>
    selectedCategory === 'ALL' || f.category === selectedCategory
  ).map(f => {
    const lf = getLiveRolling(f.name);
    return {
      ...f,
      rolling3yMin: lf?.r3min ?? f.rolling3yMin,
      rolling3yAvg: lf?.r3med ?? f.rolling3yAvg,
      rolling3yMax: lf?.r3max ?? f.rolling3yMax,
      probOver15Pct: f.probOver15Pct,
      isLive: !!lf,
    };
  }).sort((a, b) => b.rolling3yAvg - a.rolling3yAvg);

  // Consistency distribution chart data
  const chartData = filteredHoldings.slice(0, 10).map(f => ({
    name: f.name.replace(' - Direct Growth', '').slice(0, 20) + '...',
    avg: +(f.rolling3yAvg ?? 0).toFixed(1),
    min: +(f.rolling3yMin ?? 0).toFixed(1),
    max: +(f.rolling3yMax ?? 0).toFixed(1),
    prob: f.probOver15Pct
  }));

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <BarChart2 className="w-4 h-4" />
          <span>Rolling Returns & Consistency</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Rolling Returns Consistency</h2>
      </div>

      {/* Category Filter */}
      <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-2 scrollbar-none">
        <span className="text-neutral-500 font-semibold flex-shrink-0">Category:</span>
        {['ALL', 'Small Cap', 'Mid Cap', 'Large Cap', 'Large & Mid Cap', 'Flexi Cap', 'Sectoral / Thematic'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Top 10 Consistency Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <h3 className="font-bold text-base text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Top 10 Consistent Compounding Funds (3Y Rolling)
        </h3>

        <div className="h-72 sm:h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f8fafc' }}
                formatter={(val: any) => [`${val}%`, 'CAGR Return']}
              />
              <Bar dataKey="min" name="3Y Min Return" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg" name="3Y Avg Return" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" name="3Y Max Return" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <h4 className="font-bold text-neutral-900 dark:text-white text-xs">Rolling Return Leaderboard ({filteredHoldings.length} Funds)</h4>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                <th>Scheme Name</th>
                <th className="text-center">Category</th>
                <th className="text-center">3Y Min</th>
                <th className="text-center">3Y Average</th>
                <th className="text-center">3Y Max</th>
                <th className="text-center">% Prob &gt;15% CAGR</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((fund) => (
                <tr 
                  key={fund.id}
                  onClick={() => onSelectFund(fund)}
                  className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
                >
                  <td className="font-bold text-neutral-900 dark:text-white">{fund.name}</td>
                  <td className="text-center text-neutral-600 dark:text-neutral-400">{fund.category}</td>
                  <td className={`text-center font-semibold ${fund.rolling3yMin >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {fund.rolling3yMin}%
                  </td>
                  <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">{fund.rolling3yAvg}%</td>
                  <td className="text-center font-semibold text-teal-600 dark:text-teal-400">{fund.rolling3yMax}%</td>
                  <td className="text-center font-extrabold text-neutral-900 dark:text-white">{fund.probOver15Pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
