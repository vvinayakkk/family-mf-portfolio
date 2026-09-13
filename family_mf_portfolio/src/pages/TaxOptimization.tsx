import React, { useState } from 'react';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { Percent } from 'lucide-react';

export const TaxOptimization: React.FC = () => {
  const stpCandidates = PORTFOLIO_HOLDINGS.filter(f => f.actionTag === 'STP_REBALANCE_CANDIDATE');
  const totalStpCapital = stpCandidates.reduce((sum, item) => sum + item.amountLakhs, 0);

  const [estProfitPct, setEstProfitPct] = useState<number>(35); // 35% estimated gain
  const [holdingYears, setHoldingYears] = useState<number>(2); // >1 year = LTCG

  const totalGainLakhs = (totalStpCapital * (estProfitPct / 100));
  const ltcgExemptionLakhs = 1.25; // ₹1.25 Lakhs per financial year
  const taxableGainLakhs = Math.max(0, totalGainLakhs - ltcgExemptionLakhs);

  const ltcgTaxLakhs = taxableGainLakhs * 0.125; // 12.5%
  const stcgTaxLakhs = totalGainLakhs * 0.20; // 20.0%

  const activeTaxLakhs = holdingYears >= 1 ? ltcgTaxLakhs : stcgTaxLakhs;
  const netCapitalRetained = totalStpCapital - activeTaxLakhs;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <Percent className="w-4 h-4" />
          <span>Capital Gains Tax Optimization & Harvesting Engine</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Tax Optimizer & Harvesting Engine</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Plan tax-efficient redemptions under Indian Income Tax Budget 2024 rules (LTCG 12.5% with ₹1.25L exemption vs STCG 20%).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tax Inputs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Rebalance Tax Parameters</h3>

            <div>
              <label className="text-xs font-bold text-neutral-500 mb-1 block">Total Rebalance Capital</label>
              <input
                type="text"
                disabled
                value={`₹${totalStpCapital.toFixed(2)} Lakhs (${stpCandidates.length} Laggard Schemes)`}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 mb-1 block">Holding Period</label>
              <select
                value={holdingYears}
                onChange={(e) => setHoldingYears(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
              >
                <option value={2}>Long Term (&gt;12 Months - LTCG Tax @ 12.5%)</option>
                <option value={0}>Short Term (&lt;12 Months - STCG Tax @ 20.0%)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 mb-1 block">Est. Capital Gains % ({estProfitPct}%)</label>
              <input
                type="range"
                min="5"
                max="80"
                value={estProfitPct}
                onChange={(e) => setEstProfitPct(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Tax Breakdown Results */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Tax Calculation Results</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">Estimated Capital Gains</p>
                <p className="text-base font-extrabold text-neutral-900 dark:text-white mt-1">₹{totalGainLakhs.toFixed(2)}L</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">LTCG Tax Exemption</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">₹1.25L/yr</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">Net Tax Liability</p>
                <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1">₹{activeTaxLakhs.toFixed(2)}L</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500">Net Capital Retained</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">₹{netCapitalRetained.toFixed(2)}L</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
