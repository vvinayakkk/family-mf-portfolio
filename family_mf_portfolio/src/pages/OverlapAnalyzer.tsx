import React from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { PORTFOLIO_HOLDINGS, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { Layers, Copy, ShieldAlert, ArrowRight, AlertTriangle } from 'lucide-react';

interface OverlapAnalyzerProps {
  onSelectFund: (fund: MutualFundHolding) => void;
  onNavigateToStp: () => void;
}

export const OverlapAnalyzer: React.FC<OverlapAnalyzerProps> = ({ onSelectFund, onNavigateToStp }) => {
  // Find duplicate entries
  const duplicates = PORTFOLIO_HOLDINGS.filter(f => f.isDuplicate);

  // Aggregate by AMC
  const amcStats: Record<string, { totalAmount: number; count: number; funds: MutualFundHolding[] }> = {};
  PORTFOLIO_HOLDINGS.forEach(item => {
    const amcName = item.amc.replace(' Mutual Fund', '');
    if (!amcStats[amcName]) {
      amcStats[amcName] = { totalAmount: 0, count: 0, funds: [] };
    }
    amcStats[amcName].totalAmount += item.amountLakhs;
    amcStats[amcName].count += 1;
    amcStats[amcName].funds.push(item);
  });

  const sortedAmcs = Object.entries(amcStats)
    .map(([name, data]) => ({
      name,
      totalAmount: data.totalAmount,
      pct: (data.totalAmount / TOTAL_PORTFOLIO_VALUE_LAKHS) * 100,
      count: data.count,
      funds: data.funds
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          <span>Portfolio Overlap & AMC Exposure Diagnostic</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Smart Overlap & AMC Risk Analyzer</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Managing {PORTFOLIO_HOLDINGS.length} separate fund schemes leads to stock overlap and AMC folio duplication. Here is your institutional consolidation roadmap.
        </p>
      </div>

      {/* Duplicate Holdings Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Duplicate Folios ({duplicates.length} Schemes)
            </h3>
            <p className="text-xs text-neutral-500">Multiple investments in the exact same fund or AMC scheme</p>
          </div>
          <button
            onClick={onNavigateToStp}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm flex items-center space-x-1"
          >
            <span>Consolidate via STP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {duplicates.map(fund => (
            <div
              key={fund.id}
              onClick={() => onSelectFund(fund)}
              className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition cursor-pointer space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="chip text-[10px] font-bold">
                  {fund.category}
                </span>
                <span className="font-extrabold text-neutral-900 dark:text-white">₹{fund.amountLakhs.toFixed(2)}L</span>
              </div>
              <p className="font-bold text-neutral-900 dark:text-white truncate">{fund.name}</p>
              <p className="text-[10px] text-neutral-500">{fund.amc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AMC Concentration Risk Grid */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
        <div>
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> AMC Custodian Capital Concentration
          </h3>
          <p className="text-xs text-neutral-500">Fund house breakdown across family capital</p>
        </div>

        <div className="space-y-3">
          {sortedAmcs.map(amc => {
            const isHighConcentration = amc.pct > 15;
            return (
              <div key={amc.name} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-neutral-900 dark:text-white">{amc.name}</span>
                    <span className="text-[10px] text-neutral-500">({amc.count} Schemes)</span>
                    {isHighConcentration && (
                      <span className="chip text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> High Custodian Concentration ({amc.pct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <span className="font-black text-neutral-900 dark:text-white text-sm">₹{amc.totalAmount.toFixed(2)} Lakhs</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isHighConcentration ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(amc.pct * 3.5, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
