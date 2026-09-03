import React, { useState } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';

export const Calculator: React.FC = () => {
  const [monthlySip, setMonthlySip] = useState<number>(50000);
  const [years, setYears] = useState<number>(15);
  const [expectedRate, setExpectedRate] = useState<number>(14);
  const [stepUpPct, setStepUpPct] = useState<number>(10);

  // Standard SIP formula calculation
  const months = years * 12;
  const monthlyRate = expectedRate / 100 / 12;

  // Standard Flat SIP
  const totalInvestedFlat = monthlySip * months;
  const futureValueFlat =
    monthlySip *
    (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
  const totalWealthFlat = Math.round(futureValueFlat);
  const totalGainsFlat = totalWealthFlat - totalInvestedFlat;

  // Step-up SIP Calculation
  let totalInvestedStepUp = 0;
  let futureValueStepUp = 0;
  let currentMonthly = monthlySip;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      totalInvestedStepUp += currentMonthly;
      const monthsRemaining = (years - y) * 12 + (12 - m) + 1;
      futureValueStepUp += currentMonthly * Math.pow(1 + monthlyRate, monthsRemaining);
    }
    currentMonthly = Math.round(currentMonthly * (1 + stepUpPct / 100));
  }
  const totalWealthStepUp = Math.round(futureValueStepUp);
  const totalGainsStepUp = totalWealthStepUp - totalInvestedStepUp;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <CalcIcon className="w-4 h-4" />
          <span>Wealth Compounding Simulator</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Step-Up SIP & Wealth Compounding Calculator</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Compare standard flat monthly SIP compounding vs annual step-up (+10%, +15%) wealth acceleration over 5Y to 20Y horizons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calculator Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4 text-xs">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Calculator Inputs</h3>

            <div>
              <label className="font-bold text-neutral-500 mb-1 block">Monthly SIP Amount (₹{monthlySip.toLocaleString('en-IN')})</label>
              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={monthlySip}
                onChange={(e) => setMonthlySip(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-500 mb-1 block">Investment Horizon ({years} Years)</label>
              <input
                type="range"
                min="1"
                max="30"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-500 mb-1 block">Expected Annual CAGR ({expectedRate}%)</label>
              <input
                type="range"
                min="8"
                max="25"
                value={expectedRate}
                onChange={(e) => setExpectedRate(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-500 mb-1 block">Annual Step-Up Increase ({stepUpPct}%)</label>
              <input
                type="range"
                min="0"
                max="25"
                value={stepUpPct}
                onChange={(e) => setStepUpPct(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Flat vs Step-Up Comparison */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Compounding Results (Flat vs Step-Up)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 dark:text-white text-xs">Flat SIP (₹{monthlySip.toLocaleString('en-IN')}/mo)</h4>
                  <span className="chip text-[10px] font-bold">Standard</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                  <p className="text-neutral-500">Total Invested: <strong className="text-neutral-900 dark:text-white">₹{(totalInvestedFlat / 100000).toFixed(2)}L</strong></p>
                  <p className="text-neutral-500">Est. Gains: <strong className="text-emerald-600 dark:text-emerald-400">₹{(totalGainsFlat / 100000).toFixed(2)}L</strong></p>
                  <p className="text-neutral-500 text-sm mt-1 font-extrabold text-neutral-900 dark:text-white">Total Corpus: ₹{(totalWealthFlat / 100000).toFixed(2)}L</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 dark:text-white text-xs">Step-Up SIP (+{stepUpPct}% / year)</h4>
                  <span className="chip text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Accelerated</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                  <p className="text-neutral-500">Total Invested: <strong className="text-neutral-900 dark:text-white">₹{(totalInvestedStepUp / 100000).toFixed(2)}L</strong></p>
                  <p className="text-neutral-500">Est. Gains: <strong className="text-emerald-600 dark:text-emerald-400">₹{(totalGainsStepUp / 100000).toFixed(2)}L</strong></p>
                  <p className="text-neutral-500 text-sm mt-1 font-extrabold text-emerald-600 dark:text-emerald-400">Total Corpus: ₹{(totalWealthStepUp / 100000).toFixed(2)}L</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
