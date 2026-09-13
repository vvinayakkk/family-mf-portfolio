import React, { useState } from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { 
  X, 
  Award, 
  ArrowRightLeft, 
  Activity, 
  BarChart2, 
  PieChart,
  Layers,
  CheckCircle2,
  LineChart as ChartIcon
} from 'lucide-react';

interface FundModalProps {
  fund: MutualFundHolding | null;
  onClose: () => void;
  onSelectStp?: (fund: MutualFundHolding) => void;
  onOpenGraph?: (fundName: string) => void;
}

export const FundModal: React.FC<FundModalProps> = ({ fund, onClose, onSelectStp, onOpenGraph }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'rolling' | 'holdings' | 'tax'>('overview');

  if (!fund) return null;

  const isStpCandidate = fund.actionTag === 'STP_REBALANCE_CANDIDATE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl relative text-neutral-900 dark:text-neutral-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="mb-4 pr-10 sm:pr-8">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            {fund.investorName && (
              <span className={`chip font-bold ${
                fund.investorName.includes('Prem') && !fund.investorName.includes('Sarita')
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
              }`}>
                👤 {fund.investorName}
              </span>
            )}
            {fund.platform && (
              <span className={`chip font-bold ${
                fund.platform === 'CAMPS'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              }`}>
                🏛️ {fund.platform}
              </span>
            )}
            <span className="chip">
              {fund.category}
            </span>
            <span className="chip">
              {fund.amc}
            </span>
            {fund.folioNumber && (
              <span className="chip font-mono text-[11px]">
                Folio: {fund.folioNumber}
              </span>
            )}
            <span className="chip font-bold">
              Direct Growth Plan
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white">{fund.name}</h2>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {fund.actionTag === 'TOP_PERFORMER' && (
              <span className="chip font-bold text-emerald-600 dark:text-emerald-400">
                <Award className="w-3 h-3" /> Star Performer
              </span>
            )}
            {fund.actionTag === 'STABLE_CORE' && (
              <span className="chip font-bold">
                <CheckCircle2 className="w-3 h-3" /> Core Asset
              </span>
            )}
            {isStpCandidate && (
              <span className="chip font-bold text-rose-600 dark:text-rose-400">
                <ArrowRightLeft className="w-3 h-3" /> STP Exit Candidate
              </span>
            )}
          </div>
        </div>

        {/* 5 Tabs Navigation Bar */}
        <div className="flex overflow-x-auto space-x-1 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-5 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'risk', label: 'Downside & Risk', icon: Activity },
            { id: 'rolling', label: 'Rolling Returns', icon: BarChart2 },
            { id: 'holdings', label: 'Stock Look-Through', icon: Layers },
            { id: 'tax', label: 'Tax & STP Action', icon: ArrowRightLeft },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 font-medium">Current Value</p>
                <p className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white mt-0.5">₹{fund.amountLakhs.toFixed(2)} Lakhs</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{((fund.amountLakhs / 793.44) * 100).toFixed(2)}% of wealth</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 font-medium">Return (XIRR)</p>
                <p className={`text-lg sm:text-xl font-extrabold mt-0.5 ${fund.returnPct >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                  {fund.returnPct > 0 ? `+${fund.returnPct}%` : `${fund.returnPct}%`}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Direct Growth</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 col-span-2 sm:col-span-1">
                <p className="text-xs text-neutral-500 font-medium">Expense Ratio</p>
                <p className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white mt-0.5">{fund.expenseRatio}%</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Turnover: {fund.turnoverRatio}%</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Historical CAGRs</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 text-center text-xs">
                {[
                  { label: '1Y', val: fund.cagr1y },
                  { label: '3Y', val: fund.cagr3y },
                  { label: '5Y', val: fund.cagr5y },
                  { label: '10Y', val: fund.cagr10y },
                  { label: '15Y', val: fund.cagr15y },
                  { label: '20Y', val: fund.cagr20y },
                ].map((item) => (
                  <div key={item.label} className="p-2 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <p className="text-[10px] text-neutral-400 font-medium">{item.label}</p>
                    <p className={`font-bold mt-0.5 ${item.val >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                      {item.val}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Downside & Risk */}
        {activeTab === 'risk' && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Downside Risk Protection Ratios</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Sharpe Ratio</p>
                <p className="text-base font-bold text-neutral-900 dark:text-white mt-1">{fund.sharpeRatio}</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Sortino Ratio</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fund.sortinoRatio}</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Treynor Ratio</p>
                <p className="text-base font-bold text-neutral-900 dark:text-white mt-1">{fund.treynorRatio}</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Max Drawdown</p>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1">{fund.maxDrawdown}%</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Upside Capture</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fund.upsideCapture}%</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] text-neutral-500 font-medium">Downside Capture</p>
                <p className="text-base font-bold text-neutral-900 dark:text-white mt-1">{fund.downsideCapture}%</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Rolling Returns */}
        {activeTab === 'rolling' && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">3-Year Rolling Return Statistics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3Y Min Return</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{fund.rolling3yMin}%</p>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3Y Avg Return</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fund.rolling3yAvg}%</p>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">3Y Max Return</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{fund.rolling3yMax}%</p>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-medium">Prob &gt;15% CAGR</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{fund.probOver15Pct}%</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Stock Look-Through */}
        {activeTab === 'holdings' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Equity: <strong className="text-neutral-900 dark:text-white">{fund.assetEquity}%</strong> • Debt: <strong className="text-neutral-900 dark:text-white">{fund.assetDebt}%</strong> • Cash: <strong className="text-neutral-900 dark:text-white">{fund.assetCash}%</strong></span>
              <span>Turnover: <strong className="text-neutral-900 dark:text-white">{fund.turnoverRatio}%</strong></span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Top 5 Stock Holdings</h4>
              <div className="space-y-1.5">
                {fund.topHoldings.map((stock, i) => (
                  <div key={stock} className="p-2 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white">
                    <span>#{i + 1} {stock}</span>
                    <span className="chip text-[10px]">Core Stock</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Tax & STP Action */}
        {activeTab === 'tax' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Budget 2024 Tax Treatment</h4>
              <p className="text-neutral-700 dark:text-neutral-300">
                Holding Value: <strong className="text-neutral-900 dark:text-white">₹{fund.amountLakhs.toFixed(2)} Lakhs</strong>
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">
                Tax Treatment: <strong className="text-emerald-600 dark:text-emerald-400">LTCG 12.5% (above ₹1.25L annual exemption)</strong> / <strong className="text-rose-600 dark:text-rose-400">STCG 20.0%</strong>.
              </p>
              {fund.stpRecommendation && (
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 mt-2">
                  <p className="font-bold">Rebalance Recommendation:</p>
                  <p className="mt-1">{fund.stpRecommendation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800">
          {onOpenGraph && (
            <button
              onClick={() => {
                onClose();
                onOpenGraph(fund.name);
              }}
              className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 transition flex items-center space-x-1.5"
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>View Time-Series NAV Graph</span>
            </button>
          )}

          <div className="flex items-center justify-end space-x-2 sm:space-x-3 w-full sm:w-auto">
            {onSelectStp && isStpCandidate && (
              <button
                onClick={() => {
                  onClose();
                  onSelectStp(fund);
                }}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-black dark:bg-white text-white dark:text-black shadow-sm transition"
              >
                Simulate STP
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
