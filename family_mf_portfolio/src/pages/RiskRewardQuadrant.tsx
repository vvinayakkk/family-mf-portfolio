import React, { useState, useEffect, useMemo } from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { Activity, ShieldCheck, AlertTriangle, Award, ArrowUpRight } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';

interface RiskRewardQuadrantProps {
  onSelectFund: (fund: MutualFundHolding) => void;
}

export const RiskRewardQuadrant: React.FC<RiskRewardQuadrantProps> = ({ onSelectFund }) => {
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState<'ALL' | 'STAR' | 'ALPHA' | 'DEFENSIVE' | 'EXIT'>('ALL');
  const [liveFunds, setLiveFunds] = useState<Fund[]>([]);

  useEffect(() => {
    loadMasterDataset().then(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  const liveFundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    liveFunds.forEach(f => {
      if (f.label) map.set(f.label.toLowerCase(), f);
    });
    return map;
  }, [liveFunds]);

  const getLive = (name: string) => {
    const q = name.toLowerCase();
    if (liveFundMap.has(q)) return liveFundMap.get(q);
    for (const [k, v] of liveFundMap) { if (k.includes(q.slice(0, 15))) return v; }
    return undefined;
  };

  const getQuadrantInfo = (stdDev: number, sharpe: number) => {
    if (sharpe >= 1.3 && stdDev <= 14) {
      return { key: 'STAR', label: 'Star Quadrant (High Sharpe + Low Volatility)', color: '#10b981', badgeClass: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (sharpe >= 1.3 && stdDev > 14) {
      return { key: 'ALPHA', label: 'High Beta Alpha (High Sharpe + High Volatility)', color: '#3b82f6', badgeClass: 'text-blue-600 dark:text-blue-400' };
    }
    if (sharpe < 1.3 && stdDev <= 14) {
      return { key: 'DEFENSIVE', label: 'Defensive Shield (Low Sharpe + Low Volatility)', color: '#f59e0b', badgeClass: 'text-amber-600 dark:text-amber-400' };
    }
    return { key: 'EXIT', label: 'Exit Danger Zone (Low Sharpe + High Volatility)', color: '#ef4444', badgeClass: 'text-rose-600 dark:text-rose-400' };
  };

  const enrichedData = PORTFOLIO_HOLDINGS.map(f => {
    const lf = getLive(f.name);
    const sharpe = lf?.sharpe3 ?? f.sharpeRatio;
    const stdDev  = lf?.sd3    ?? f.stdDev;
    const qInfo = getQuadrantInfo(stdDev, sharpe);
    return {
      id: f.id,
      name: f.name.replace(' - Direct Growth', ''),
      x: stdDev,
      y: sharpe,
      z: f.amountLakhs,
      beta: lf?.beta3 ?? f.beta,
      category: f.category,
      returnPct: lf?.y3 ?? f.returnPct,
      quadrantKey: qInfo.key,
      quadrantLabel: qInfo.label,
      quadrantColor: qInfo.color,
      badgeClass: qInfo.badgeClass,
      fundObj: f,
      isLive: !!lf,
    };
  });

  const filteredData = enrichedData.filter(d => 
    selectedQuadrantFilter === 'ALL' || d.quadrantKey === selectedQuadrantFilter
  );

  const counts = {
    STAR: enrichedData.filter(d => d.quadrantKey === 'STAR').length,
    ALPHA: enrichedData.filter(d => d.quadrantKey === 'ALPHA').length,
    DEFENSIVE: enrichedData.filter(d => d.quadrantKey === 'DEFENSIVE').length,
    EXIT: enrichedData.filter(d => d.quadrantKey === 'EXIT').length,
  };

  const capital = {
    STAR: enrichedData.filter(d => d.quadrantKey === 'STAR').reduce((sum, d) => sum + d.z, 0),
    ALPHA: enrichedData.filter(d => d.quadrantKey === 'ALPHA').reduce((sum, d) => sum + d.z, 0),
    DEFENSIVE: enrichedData.filter(d => d.quadrantKey === 'DEFENSIVE').reduce((sum, d) => sum + d.z, 0),
    EXIT: enrichedData.filter(d => d.quadrantKey === 'EXIT').reduce((sum, d) => sum + d.z, 0),
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4" />
          <span>Risk vs Reward Quadrant Matrix</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Sharpe Ratio vs Volatility Matrix</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Plots every fund in your ₹7.93 Cr portfolio by <strong>Volatility / Risk (X-Axis)</strong> vs <strong>Sharpe Ratio / Risk-Adjusted Return (Y-Axis)</strong> to identify star performers vs exit candidates.
        </p>
      </div>

      {/* Quadrant Legend & Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Star Quadrant */}
        <div 
          onClick={() => setSelectedQuadrantFilter(selectedQuadrantFilter === 'STAR' ? 'ALL' : 'STAR')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            selectedQuadrantFilter === 'STAR'
              ? 'bg-neutral-100 dark:bg-neutral-900 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Star Quadrant 🟢
            </span>
            <span className="chip font-bold">
              {counts.STAR} Funds
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">High Sharpe (≥1.3) + Low Volatility (≤14%)</p>
          <p className="text-sm font-black text-neutral-900 dark:text-white mt-2">₹{capital.STAR.toFixed(1)} Lakhs</p>
        </div>

        {/* High Beta Alpha */}
        <div 
          onClick={() => setSelectedQuadrantFilter(selectedQuadrantFilter === 'ALPHA' ? 'ALL' : 'ALPHA')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            selectedQuadrantFilter === 'ALPHA'
              ? 'bg-neutral-100 dark:bg-neutral-900 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> High Beta Alpha 🟦
            </span>
            <span className="chip font-bold">
              {counts.ALPHA} Funds
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">High Sharpe (≥1.3) + High Volatility (&gt;14%)</p>
          <p className="text-sm font-black text-neutral-900 dark:text-white mt-2">₹{capital.ALPHA.toFixed(1)} Lakhs</p>
        </div>

        {/* Defensive Shield */}
        <div 
          onClick={() => setSelectedQuadrantFilter(selectedQuadrantFilter === 'DEFENSIVE' ? 'ALL' : 'DEFENSIVE')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            selectedQuadrantFilter === 'DEFENSIVE'
              ? 'bg-neutral-100 dark:bg-neutral-900 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Defensive Shield 🟧
            </span>
            <span className="chip font-bold">
              {counts.DEFENSIVE} Funds
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Low Sharpe (&lt;1.3) + Low Volatility (≤14%)</p>
          <p className="text-sm font-black text-neutral-900 dark:text-white mt-2">₹{capital.DEFENSIVE.toFixed(1)} Lakhs</p>
        </div>

        {/* Exit Danger Zone */}
        <div 
          onClick={() => setSelectedQuadrantFilter(selectedQuadrantFilter === 'EXIT' ? 'ALL' : 'EXIT')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            selectedQuadrantFilter === 'EXIT'
              ? 'bg-neutral-100 dark:bg-neutral-900 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Exit Danger Zone 🔴
            </span>
            <span className="chip font-bold text-rose-600 dark:text-rose-400">
              {counts.EXIT} Funds
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Low Sharpe (&lt;1.3) + High Volatility (&gt;14%)</p>
          <p className="text-sm font-black text-neutral-900 dark:text-white mt-2">₹{capital.EXIT.toFixed(1)} Lakhs</p>
        </div>
      </div>

      {/* Main Scatter Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center justify-between mb-4 text-xs">
          <span className="font-bold text-neutral-900 dark:text-white">Scatter Plot: Volatility % (X-Axis) vs Sharpe Ratio (Y-Axis)</span>
          <span className="text-neutral-500">Bubble size = Capital Amount (₹L)</span>
        </div>

        <div className="h-96 sm:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis type="number" dataKey="x" name="Volatility (StdDev %)" unit="%" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="number" dataKey="y" name="Sharpe Ratio" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <ZAxis type="number" dataKey="z" range={[40, 400]} name="Capital (₹L)" unit="L" />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1 text-xs text-white">
                        <p className="font-bold text-sm text-white">{data.name}</p>
                        <p className="text-neutral-400">{data.category}</p>
                        <div className="pt-1 border-t border-neutral-800 space-y-0.5">
                          <p>Quadrant: <strong style={{ color: data.quadrantColor }}>{data.quadrantLabel}</strong></p>
                          <p>Sharpe Ratio: <strong>{data.y}</strong> • Beta: <strong>{data.beta}</strong></p>
                          <p>Volatility (StdDev): <strong>{data.x}%</strong></p>
                          <p>Capital Invested: <strong>₹{data.z.toFixed(2)} Lakhs</strong></p>
                          <p>Return (XIRR): <strong className="text-emerald-400">+{data.returnPct}%</strong></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={filteredData} onClick={(item: any) => item?.payload?.fundObj && onSelectFund(item.payload.fundObj)}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.quadrantColor} cursor="pointer" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Quadrant Breakdown Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
          <h4 className="font-bold text-neutral-900 dark:text-white">Quadrant Breakdown Table ({filteredData.length} Schemes)</h4>
          <span className="text-neutral-500">Click any row to view fund detail modal</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                <th>Scheme Name</th>
                <th>Category</th>
                <th className="text-center">Quadrant Classification</th>
                <th className="text-right">Invested (₹L)</th>
                <th className="text-center">Sharpe</th>
                <th className="text-center">Beta</th>
                <th className="text-right">Volatility (StdDev)</th>
                <th className="text-right">XIRR Return</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => onSelectFund(item.fundObj)}
                  className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer text-xs"
                >
                  <td className="font-bold text-neutral-900 dark:text-white">{item.name}</td>
                  <td className="text-neutral-600 dark:text-neutral-400">{item.category}</td>
                  <td className="text-center">
                    <span 
                      className="chip text-[10px] font-bold" 
                      style={{ color: item.quadrantColor, borderColor: item.quadrantColor }}
                    >
                      {item.quadrantKey === 'STAR' && '🟢 Star'}
                      {item.quadrantKey === 'ALPHA' && '🟦 High Alpha'}
                      {item.quadrantKey === 'DEFENSIVE' && '🟧 Defensive'}
                      {item.quadrantKey === 'EXIT' && '🔴 Exit Zone'}
                    </span>
                  </td>
                  <td className="text-right font-black text-neutral-900 dark:text-white">₹{item.z.toFixed(2)}L</td>
                  <td className="text-center font-bold text-neutral-900 dark:text-white">{item.y}</td>
                  <td className="text-center text-neutral-600 dark:text-neutral-400">{item.beta}</td>
                  <td className="text-right text-neutral-600 dark:text-neutral-400">{item.x}%</td>
                  <td className="text-right font-extrabold text-emerald-600 dark:text-emerald-400">+{item.returnPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
