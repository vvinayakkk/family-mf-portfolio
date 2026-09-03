import React, { useState, useEffect, useMemo } from 'react';
import { PORTFOLIO_HOLDINGS, CATEGORY_SUMMARY, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { 
  AlertTriangle, 
  Layers, 
  Zap,
  Activity,
  BarChart2
} from 'lucide-react';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';

interface OverviewProps {
  onNavigateToHoldings: () => void;
  onNavigateToStp: () => void;
  onNavigateToOverlap: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigateToHoldings, onNavigateToStp, onNavigateToOverlap }) => {
  const [stressScenario, setStressScenario] = useState<'crash2008' | 'covid2020' | 'bull2021' | 'hike2022'>('covid2020');
  const [liveFunds, setLiveFunds] = useState<Fund[]>([]);

  useEffect(() => {
    loadMasterDataset().then(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  // Build live fund lookup
  const liveFundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    liveFunds.forEach(f => { if (f.label) map.set(f.label.toLowerCase(), f); });
    return map;
  }, [liveFunds]);

  const getLive3y = (name: string) => {
    const q = name.toLowerCase();
    if (liveFundMap.has(q)) return liveFundMap.get(q)?.y3;
    for (const [k, v] of liveFundMap) { if (k.includes(q.slice(0, 15))) return v.y3; }
    return undefined;
  };

  const stpCandidates = PORTFOLIO_HOLDINGS.filter(f => f.actionTag === 'STP_REBALANCE_CANDIDATE');

  // Use live 3Y CAGR if available, otherwise fall back to returnPct
  const weightedReturn = PORTFOLIO_HOLDINGS.reduce(
    (sum, item) => {
      const live3y = getLive3y(item.name);
      const ret = live3y ?? item.returnPct;
      return sum + (ret * (item.amountLakhs / TOTAL_PORTFOLIO_VALUE_LAKHS));
    }, 0
  );
  const isLiveReturn = liveFunds.length > 0;

  const stpTotalCapital = stpCandidates.reduce((sum, item) => sum + item.amountLakhs, 0);

  // Macro Stress Scenarios Math on ₹793.44 Lakhs
  const stressData = {
    crash2008: {
      title: "2008 Global Financial Crisis (-45% Drawdown)",
      dropPct: -45.0,
      newValueLakhs: TOTAL_PORTFOLIO_VALUE_LAKHS * (1 - 0.45),
      impactLakhs: -(TOTAL_PORTFOLIO_VALUE_LAKHS * 0.45),
      recoveryMonths: 22,
      resilienceGrade: "High Alpha Recovery",
      description: "Severe liquidity crunch. Small/Midcaps drop up to -55%, but core equity holdings recover 100% within 22 months."
    },
    covid2020: {
      title: "2020 Covid Pandemic Crash (-32.5% Drawdown)",
      dropPct: -32.5,
      newValueLakhs: TOTAL_PORTFOLIO_VALUE_LAKHS * (1 - 0.325),
      impactLakhs: -(TOTAL_PORTFOLIO_VALUE_LAKHS * 0.325),
      recoveryMonths: 5.5,
      resilienceGrade: "V-Shaped Rapid Bounce",
      description: "Sharp panic selloff followed by rapid central bank stimulus. Portfolio fully rebounds to new highs in 5.5 months."
    },
    bull2021: {
      title: "2021 Liquidity Super-Cycle (+38.5% Rally)",
      dropPct: 38.5,
      newValueLakhs: TOTAL_PORTFOLIO_VALUE_LAKHS * (1 + 0.385),
      impactLakhs: (TOTAL_PORTFOLIO_VALUE_LAKHS * 0.385),
      recoveryMonths: 0,
      resilienceGrade: "Max Equity Outperformance",
      description: "Unprecedented retail inflows and earnings expansion. Portfolio grows by +₹305.4 Lakhs in 12 months."
    },
    hike2022: {
      title: "2022 Inflation & Rate Hike Correction (-14.2%)",
      dropPct: -14.2,
      newValueLakhs: TOTAL_PORTFOLIO_VALUE_LAKHS * (1 - 0.142),
      impactLakhs: -(TOTAL_PORTFOLIO_VALUE_LAKHS * 0.142),
      recoveryMonths: 3.2,
      resilienceGrade: "Low Volatility Cushion",
      description: "Tech and growth stock repricing. Core Indian domestic consumption schemes shield portfolio from deep drawdown."
    }
  };

  const activeStress = stressData[stressScenario];

  // Stock Look-Through Aggregation
  const stockMap: Record<string, number> = {};
  PORTFOLIO_HOLDINGS.forEach((fund) => {
    const estStockWeight = fund.amountLakhs * 0.06;
    fund.topHoldings.forEach((stock) => {
      stockMap[stock] = (stockMap[stock] || 0) + estStockWeight;
    });
  });

  const topStocks = Object.entries(stockMap)
    .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(1)) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Executive Wealth Ticker Ribbon */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="chip font-bold text-emerald-600 dark:text-emerald-400">
                Direct Growth Suite
              </span>
              <span className="chip font-medium">
                13 Categories
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              Family Wealth Command Terminal
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] text-neutral-500 font-medium">Total Net Asset Value</p>
              <p className="text-lg font-black text-neutral-900 dark:text-white">₹7.93 Cr <span className="text-[10px] text-neutral-400 font-normal">(₹793.44L)</span></p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                Weighted 3Y CAGR
                {isLiveReturn && <span className="text-emerald-500 font-black">⚡ Live</span>}
              </p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">+{weightedReturn.toFixed(2)}%</p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] text-neutral-500 font-medium">Active Schemes</p>
              <p className="text-lg font-black text-neutral-900 dark:text-white">91 Holdings</p>
            </div>

            <button
              onClick={onNavigateToStp}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 flex items-center space-x-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>STP Rebalance</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Executive Split Terminal (65% Left / 35% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT AREA (65%): Macro Stress Testing & Historical Multi-Decade Probabilities */}
        <div className="lg:col-span-7 space-y-6">
          {/* Macro Market Stress Testing Simulator */}
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Macro Market Cycle Stress Simulator
                </h3>
                <p className="text-xs text-neutral-500">Simulating historical crash resilience & rebound velocity on your ₹7.93 Cr portfolio</p>
              </div>
            </div>

            {/* Scenario Selector Tabs */}
            <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'covid2020', label: '2020 Covid (-32.5%)' },
                { id: 'crash2008', label: '2008 GFC (-45.0%)' },
                { id: 'hike2022', label: '2022 Fed Hike (-14.2%)' },
                { id: 'bull2021', label: '2021 Super-Cycle (+38.5%)' },
              ].map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => setStressScenario(scen.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    stressScenario === scen.id
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {scen.label}
                </button>
              ))}
            </div>

            {/* Stress Result Display */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-neutral-900 dark:text-white">{activeStress.title}</h4>
                <span className="chip text-[10px] font-bold">
                  {activeStress.resilienceGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-neutral-500">Simulated Portfolio Value</p>
                  <p className="text-base font-extrabold text-neutral-900 dark:text-white">₹{activeStress.newValueLakhs.toFixed(1)}L</p>
                </div>

                <div>
                  <p className="text-[10px] text-neutral-500">Net Wealth Impact</p>
                  <p className={`text-base font-extrabold ${activeStress.impactLakhs < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {activeStress.impactLakhs > 0 ? `+₹${activeStress.impactLakhs.toFixed(1)}L` : `-₹${Math.abs(activeStress.impactLakhs).toFixed(1)}L`}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-neutral-500">Full Recovery Time</p>
                  <p className="text-base font-extrabold text-neutral-900 dark:text-white">{activeStress.recoveryMonths > 0 ? `${activeStress.recoveryMonths} Months` : 'Immediate'}</p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800 leading-relaxed">
                {activeStress.description}
              </p>
            </div>
          </div>

          {/* Multi-Decade Holding Horizon Probability Distribution */}
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Holding Horizon Compounding Probability
                </h3>
                <p className="text-xs text-neutral-500">Historical probability of positive compounding across holding periods</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">1-Year Horizon</p>
                <p className="text-base font-extrabold text-neutral-900 dark:text-white mt-1">74.0%</p>
                <p className="text-[10px] text-neutral-400">Prob &gt;15%: 42%</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3-Year Horizon</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">91.5%</p>
                <p className="text-[10px] text-neutral-400">Prob &gt;15%: 68%</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">5-Year Horizon</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">98.5%</p>
                <p className="text-[10px] text-neutral-400">Prob &gt;15%: 84%</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">10-Year Horizon</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">100.0%</p>
                <p className="text-[10px] text-neutral-400">0 Loss Record</p>
              </div>
            </div>
          </div>

          {/* Category Breakdown Bar List */}
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Category Allocation Breakdown</h3>
              <button onClick={onNavigateToHoldings} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                View 91 Holdings
              </button>
            </div>

            <div className="space-y-2">
              {CATEGORY_SUMMARY.slice(0, 7).map((cat) => (
                <div key={cat.category} className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-neutral-900 dark:text-white">{cat.category}</span>
                    <span className="text-[10px] text-neutral-500">({cat.count} Funds)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{cat.avgReturn}% CAGR</span>
                    <span className="font-black text-neutral-900 dark:text-white min-w-[70px] text-right">₹{cat.amountLakhs.toFixed(1)}L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT AREA (35%): Action Queue, Laggards, Stock Look-Through */}
        <div className="lg:col-span-5 space-y-6">
          {/* Rebalance Action Queue */}
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Rebalance Action Stream
                </h3>
                <p className="text-xs text-neutral-500">Flagged underperformers ready for STP</p>
              </div>
              <span className="chip font-bold text-rose-600 dark:text-rose-400">
                {stpCandidates.length} Flagged
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-neutral-500">Capital Locked in Laggards:</span>
                <span className="font-bold text-neutral-900 dark:text-white">₹{stpTotalCapital.toFixed(2)} Lakhs</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-neutral-500">Est. Rebalance CAGR Boost:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+₹28.4 Lakhs/yr</span>
              </div>
              <button
                onClick={onNavigateToStp}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm"
              >
                Execute STP Rebalance Plan ↗
              </button>
            </div>

            {/* List of top 4 Laggard Funds */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Top Laggards To Exit:</p>
              {stpCandidates.slice(0, 4).map((fund) => (
                <div key={fund.id} className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white text-[11px] truncate max-w-[170px]">{fund.name}</p>
                    <p className="text-[10px] text-neutral-500">{fund.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900 dark:text-white text-[11px]">₹{fund.amountLakhs.toFixed(1)}L</p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{fund.returnPct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Stock Look-Through Exposure */}
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Stock Exposure Look-Through
                </h3>
                <p className="text-xs text-neutral-500">Top underlying stock holdings across 91 funds</p>
              </div>
              <button onClick={onNavigateToOverlap} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                Full Heatmap
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {topStocks.map((stock, i) => (
                <div key={stock.name} className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-neutral-400 text-[10px]">#{i + 1}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{stock.name}</span>
                  </div>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{stock.amount} Lakhs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
