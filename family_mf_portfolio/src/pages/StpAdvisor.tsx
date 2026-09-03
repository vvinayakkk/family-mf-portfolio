import React, { useState, useEffect } from 'react';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { ArrowRightLeft, Printer, Search, CheckCircle2 } from 'lucide-react';

export const StpAdvisor: React.FC = () => {
  const [masterFunds, setMasterFunds] = useState<Fund[]>([]);
  const stpCandidates = PORTFOLIO_HOLDINGS.filter(f => f.actionTag === 'STP_REBALANCE_CANDIDATE');

  // Selected Source Laggards
  const [selectedHoldings, setSelectedHoldings] = useState<string[]>(
    stpCandidates.map(f => f.id)
  );

  // Dynamic Destination Target Mode
  const [destinationMode, setDestinationMode] = useState<'STRATEGY' | 'CUSTOM_FUND'>('STRATEGY');
  const [selectedStrategyId, setSelectedStrategyId] = useState<number>(1);
  const [customDestinationSearch, setCustomDestinationSearch] = useState<string>('');
  const [selectedDestinationFund, setSelectedDestinationFund] = useState<Fund | null>(null);

  // Holding Period & Tax Rules
  const [stpMonths] = useState<number>(12);
  const [isLtcg, setIsLtcg] = useState<boolean>(true); // >12 months holding

  useEffect(() => {
    loadMasterDataset().then(dataset => {
      setMasterFunds(fundsWithDataFromDataset(dataset));
    });
    const unsub = subscribeToDatasetUpdates(dataset => {
      setMasterFunds(fundsWithDataFromDataset(dataset));
    });
    return () => unsub();
  }, []);

  const dynamicStrategies = [
    {
      id: 1,
      name: "Strategy 1: High-Alpha Equity Compounding",
      destinationAsset: "Top-Quartile Small & Mid Cap Alpha Leaders",
      targetCagr: 19.5,
      riskGrade: "High Alpha Compounding",
      taxRating: "Max Capital Growth",
      justification: "Systematically redirects underperforming capital into top-quartile Small & Mid Cap compounding engines with 19.5% 3Y CAGR trajectory."
    },
    {
      id: 2,
      name: "Strategy 2: Core Quality Multicap & Flexi Cap",
      destinationAsset: "50% Multicap Leaders + 50% Flexi Cap Core",
      targetCagr: 17.2,
      riskGrade: "Moderate Risk (Beta 0.88)",
      taxRating: "High LTCG Efficiency",
      justification: "Redirects capital into broad-market Quality Multicap & Flexi Cap funds for consistent long-term wealth creation with low drawdown risk."
    },
    {
      id: 3,
      name: "Strategy 3: Balanced Capital Preservation Shield",
      destinationAsset: "60% Large Cap Core + 40% Large & Mid Cap Leaders",
      targetCagr: 15.0,
      riskGrade: "Low Drawdown Shield",
      taxRating: "Conservative Growth",
      justification: "Consolidates fragmented minor holdings into institutional Large Cap bluechips for low-volatility capital protection."
    },
    {
      id: 4,
      name: "Strategy 4: Aggressive Small Cap Alpha Focus",
      destinationAsset: "100% Direct Top-Quartile Small Cap Fund",
      targetCagr: 22.4,
      riskGrade: "High Growth / High Volatility",
      taxRating: "Maximum Alpha Expansion",
      justification: "Focuses all rebalance tranches directly into direct small-cap alpha compounding engines to maximize multi-year wealth accumulation."
    }
  ];

  const activeStrategy = dynamicStrategies.find(s => s.id === selectedStrategyId) || dynamicStrategies[0];

  // Dynamic Target Fund Selection from Search
  const searchResults = masterFunds.filter(f => 
    (f.label || '').toLowerCase().includes(customDestinationSearch.toLowerCase()) ||
    (f.schemeName || '').toLowerCase().includes(customDestinationSearch.toLowerCase()) ||
    (f.category || '').toLowerCase().includes(customDestinationSearch.toLowerCase())
  ).slice(0, 5);

  // Effective Target CAGR %
  const effectiveTargetCagr = destinationMode === 'CUSTOM_FUND' && selectedDestinationFund
    ? (selectedDestinationFund.y3 ?? selectedDestinationFund.y1 ?? 18.0)
    : activeStrategy.targetCagr;

  const effectiveDestinationName = destinationMode === 'CUSTOM_FUND' && selectedDestinationFund
    ? selectedDestinationFund.label || selectedDestinationFund.schemeName
    : activeStrategy.destinationAsset;

  const selectedFundsList = stpCandidates.filter(f => selectedHoldings.includes(f.id));
  const totalCapitalSelected = selectedFundsList.reduce((sum, item) => sum + item.amountLakhs, 0);

  // Budget 2024 Tax Harvesting Calculation Math
  const estGainPct = 0.30; // 30% average gains on laggards
  const totalCapitalGains = totalCapitalSelected * estGainPct;
  const ltcgExemption = isLtcg ? 1.25 : 0; // ₹1.25 Lakhs annual LTCG exemption
  const taxableGains = Math.max(0, totalCapitalGains - ltcgExemption);
  const taxRate = isLtcg ? 0.125 : 0.20; // 12.5% LTCG vs 20.0% STCG
  const totalTaxPayable = taxableGains * taxRate;
  const netCapitalRetained = totalCapitalSelected - totalTaxPayable;

  const monthlyTranche = stpMonths > 0 ? (netCapitalRetained / stpMonths) : 0;
  const currentLaggardCagr = 5.2; // Average CAGR of laggards
  const annualReturnBumpLakhs = netCapitalRetained * ((effectiveTargetCagr - currentLaggardCagr) / 100);

  const toggleSelectAll = () => {
    if (selectedHoldings.length === stpCandidates.length) {
      setSelectedHoldings([]);
    } else {
      setSelectedHoldings(stpCandidates.map(f => f.id));
    }
  };

  const toggleHolding = (id: string) => {
    if (selectedHoldings.includes(id)) {
      setSelectedHoldings(selectedHoldings.filter(h => h !== id));
    } else {
      setSelectedHoldings([...selectedHoldings, id]);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Dynamic STP & Tax Rebalancing Terminal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Systemic Transfer Plan & Budget 2024 Tax Optimizer</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
            Systematically transfer capital out of underperforming schemes into your choice of top compounding equity leaders or custom target funds under Budget 2024 Tax Harvesting rules (LTCG 12.5% vs STCG 20%).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm flex items-center space-x-1.5 flex-shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Print STP Order Sheet</span>
        </button>
      </div>

      {/* Quick Stat KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
          <p className="text-[10px] text-neutral-500 font-medium">Rebalance Redemption Capital</p>
          <p className="text-lg font-black text-neutral-900 dark:text-white mt-1">₹{totalCapitalSelected.toFixed(2)}L</p>
          <p className="text-[10px] text-neutral-400">{selectedFundsList.length} Laggard Schemes</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
          <p className="text-[10px] text-neutral-500 font-medium">Net Capital Gains Tax Payable</p>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalTaxPayable.toFixed(2)}L</p>
          <p className="text-[10px] text-neutral-400">{isLtcg ? 'LTCG @ 12.5% (₹1.25L Exempt)' : 'STCG @ 20.0%'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
          <p className="text-[10px] text-neutral-500 font-medium">Monthly STP Tranche ({stpMonths}m)</p>
          <p className="text-lg font-black text-neutral-900 dark:text-white mt-1">₹{monthlyTranche.toFixed(2)}L/mo</p>
          <p className="text-[10px] text-neutral-400">Net Retained: ₹{netCapitalRetained.toFixed(2)}L</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
          <p className="text-[10px] text-neutral-500 font-medium">Est. Annual Return Boost</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">+₹{annualReturnBumpLakhs.toFixed(2)}L/yr</p>
          <p className="text-[10px] text-neutral-400">Target CAGR: {effectiveTargetCagr.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main 2-Column Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Select Laggard Source Funds */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Source Funds ({selectedHoldings.length}/{stpCandidates.length} Selected)</h3>
                <p className="text-[11px] text-neutral-500">Select underperforming schemes to redeem</p>
              </div>
              <button 
                onClick={toggleSelectAll} 
                className="text-xs font-bold text-neutral-900 dark:text-white hover:underline"
              >
                {selectedHoldings.length === stpCandidates.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Holding Period Switcher */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">Holding Period:</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setIsLtcg(true)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    isLtcg ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-neutral-500'
                  }`}
                >
                  LTCG (&gt;12m @ 12.5%)
                </button>
                <button
                  onClick={() => setIsLtcg(false)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    !isLtcg ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-neutral-500'
                  }`}
                >
                  STCG (&lt;12m @ 20%)
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {stpCandidates.map((fund) => {
                const isSelected = selectedHoldings.includes(fund.id);
                return (
                  <div
                    key={fund.id}
                    onClick={() => toggleHolding(fund.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-400 dark:border-neutral-600'
                        : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-neutral-900 dark:accent-white"
                      />
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white">{fund.name}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{fund.category} • {fund.amc}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-neutral-900 dark:text-white">₹{fund.amountLakhs.toFixed(2)}L</p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{fund.returnPct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Destination Rebalance Target */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Dynamic Destination Rebalance Target</h3>
                <p className="text-xs text-neutral-500">Choose a high-compounding strategy or search any target fund from 866 schemes</p>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="flex space-x-1 text-xs">
                <button
                  onClick={() => setDestinationMode('STRATEGY')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    destinationMode === 'STRATEGY' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-neutral-500'
                  }`}
                >
                  Strategies
                </button>
                <button
                  onClick={() => setDestinationMode('CUSTOM_FUND')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    destinationMode === 'CUSTOM_FUND' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-neutral-500'
                  }`}
                >
                  Pick Target Scheme
                </button>
              </div>
            </div>

            {/* Mode A: Preset Dynamic Strategies */}
            {destinationMode === 'STRATEGY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dynamicStrategies.map((strat) => {
                  const isSelected = selectedStrategyId === strat.id;
                  return (
                    <div
                      key={strat.id}
                      onClick={() => setSelectedStrategyId(strat.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                          : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-xs">{strat.name}</h4>
                        <span className="chip text-[10px] py-0 px-2 font-bold">
                          {strat.targetCagr}% CAGR
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">{strat.destinationAsset}</p>
                      
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 flex justify-between">
                        <span>{strat.riskGrade}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{strat.taxRating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode B: Custom Target Scheme Search from 866 Master DB */}
            {destinationMode === 'CUSTOM_FUND' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Search Target Destination Mutual Fund (866 Master Schemes):</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search Nippon, Motilal, Parag Parikh, HDFC, SBI..."
                      value={customDestinationSearch}
                      onChange={(e) => setCustomDestinationSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Search Results Dropdown */}
                {customDestinationSearch.trim() && searchResults.length > 0 && (
                  <div className="space-y-1.5 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50 dark:bg-neutral-900">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">Click to Select Destination Fund:</p>
                    {searchResults.map((f) => (
                      <div
                        key={f.isin || f.label}
                        onClick={() => {
                          setSelectedDestinationFund(f);
                          setCustomDestinationSearch('');
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{f.label || f.schemeName}</p>
                          <p className="text-[10px] text-neutral-500">{f.category}</p>
                        </div>
                        <span className="chip font-black text-emerald-600 dark:text-emerald-400">
                          {(f.y3 ?? 18).toFixed(1)}% 3Y CAGR
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Custom Target Card */}
                {selectedDestinationFund && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Selected Target Destination Scheme
                      </span>
                      <button
                        onClick={() => setSelectedDestinationFund(null)}
                        className="text-[10px] font-bold text-rose-500 hover:underline"
                      >
                        Change Fund
                      </button>
                    </div>
                    <p className="text-sm font-black text-neutral-900 dark:text-white">{selectedDestinationFund.label || selectedDestinationFund.schemeName}</p>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Category: <strong>{selectedDestinationFund.category}</strong> • 3Y CAGR: <strong className="text-emerald-600 dark:text-emerald-400">{(selectedDestinationFund.y3 ?? 18).toFixed(1)}%</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Target Summary */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">Rebalance Destination Target Summary</h4>
              <p className="text-neutral-700 dark:text-neutral-300">
                All redeemed capital (<strong>₹{netCapitalRetained.toFixed(2)} Lakhs</strong> net of taxes) will be systematically transferred into <strong>{effectiveDestinationName}</strong> over <strong>12 monthly tranches of ₹{monthlyTranche.toFixed(2)} Lakhs/mo</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Fund Transfer & Tax Breakdown Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
          <h4 className="font-bold text-neutral-900 dark:text-white">Per-Fund Redemption & Tax Rebalance Transfer Breakdown ({selectedFundsList.length} Funds)</h4>
          <span className="text-neutral-500 font-semibold">Destination Target: {effectiveDestinationName}</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                <th>Source Scheme Name</th>
                <th>Category</th>
                <th className="text-right">Redemption Capital</th>
                <th className="text-right">Est. Capital Gain</th>
                <th className="text-center">Tax Rate</th>
                <th className="text-right">Net Tax Payable</th>
                <th className="text-right">Net Rebalance Capital</th>
                <th className="text-right">Projected CAGR Bump</th>
              </tr>
            </thead>
            <tbody>
              {selectedFundsList.map((fund) => {
                const fundCapital = fund.amountLakhs;
                const fundGain = fundCapital * estGainPct;
                const fundTaxable = Math.max(0, fundGain - (ltcgExemption / selectedFundsList.length));
                const fundTax = fundTaxable * taxRate;
                const fundNet = fundCapital - fundTax;
                const fundBump = fundNet * ((effectiveTargetCagr - fund.returnPct) / 100);

                return (
                  <tr key={fund.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition text-xs">
                    <td>
                      <p className="font-bold text-neutral-900 dark:text-white">{fund.name}</p>
                      <p className="text-[10px] text-neutral-500">{fund.amc}</p>
                    </td>
                    <td>
                      <span className="chip text-[10px] py-0 px-2 font-medium">
                        {fund.category}
                      </span>
                    </td>
                    <td className="text-right font-bold text-neutral-900 dark:text-white">₹{fundCapital.toFixed(2)}L</td>
                    <td className="text-right text-neutral-700 dark:text-neutral-300">₹{fundGain.toFixed(2)}L</td>
                    <td className="text-center font-bold text-rose-600 dark:text-rose-400">
                      {isLtcg ? 'LTCG 12.5%' : 'STCG 20%'}
                    </td>
                    <td className="text-right font-bold text-rose-600 dark:text-rose-400">₹{fundTax.toFixed(2)}L</td>
                    <td className="text-right font-black text-neutral-900 dark:text-white">₹{fundNet.toFixed(2)}L</td>
                    <td className="text-right font-extrabold text-emerald-600 dark:text-emerald-400">+₹{fundBump.toFixed(2)}L/yr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
