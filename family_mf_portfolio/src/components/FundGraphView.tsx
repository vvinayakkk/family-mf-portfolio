import React, { useState } from 'react';
import type { Fund } from '../lib/types';
import { X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface FundGraphViewProps {
  fund: Fund | null;
  onClose: () => void;
}

export const FundGraphView: React.FC<FundGraphViewProps> = ({ fund, onClose }) => {
  const [activeChart, setActiveChart] = useState<'nav' | 'roll' | 'sip'>('nav');

  if (!fund) return null;

  const navData = fund.history?.nav_series || [];
  const rollData = fund.history?.roll3_series || [];
  const sipData = fund.history?.sip_series || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative text-neutral-900 dark:text-neutral-100 max-h-[94vh] overflow-y-auto"
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
        <div className="mb-4 pr-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            <span className="chip">
              {fund.category || 'Equity'}
            </span>
            {fund.isin && (
              <span className="chip font-mono">
                ISIN: {fund.isin}
              </span>
            )}
            {fund.exp != null && (
              <span className="chip font-bold">
                Expense: {fund.exp.toFixed(2)}%
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white">{fund.label}</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{fund.schemeName || 'Direct Plan Growth'}</p>

          {/* Live Web Verification Links */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 text-xs">
            <span className="text-neutral-500 font-medium">Verify Live:</span>
            <a
              href={`https://groww.in/search?q=${encodeURIComponent(fund.label)}`}
              target="_blank"
              rel="noreferrer"
              className="chip hover:bg-neutral-100 dark:hover:bg-neutral-900 text-emerald-600 dark:text-emerald-400 font-bold transition"
            >
              Groww ↗
            </a>
            <a
              href={`https://www.moneycontrol.com/india/mutualfunds/mfsearch/${encodeURIComponent(fund.label)}`}
              target="_blank"
              rel="noreferrer"
              className="chip hover:bg-neutral-100 dark:hover:bg-neutral-900 text-blue-600 dark:text-blue-400 font-bold transition"
            >
              Moneycontrol ↗
            </a>
            <a
              href={`https://www.valueresearchonline.com/search/?q=${encodeURIComponent(fund.label)}`}
              target="_blank"
              rel="noreferrer"
              className="chip hover:bg-neutral-100 dark:hover:bg-neutral-900 text-indigo-600 dark:text-indigo-400 font-bold transition"
            >
              ValueResearch ↗
            </a>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-500 font-medium">Latest NAV</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
              {fund.nav != null ? `₹${fund.nav.toFixed(2)}` : '—'}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{fund.navDate || 'Latest'}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-500 font-medium">3Y CAGR</p>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {fund.y3 != null ? `${fund.y3.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">3Y XIRR: {fund.x3 != null ? `${fund.x3.toFixed(1)}%` : '—'}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-500 font-medium">Sharpe / Sortino</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
              {fund.sharpe3 != null ? fund.sharpe3.toFixed(2) : '—'} / {fund.sort3 != null ? fund.sort3.toFixed(2) : '—'}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Beta: {fund.beta3 != null ? fund.beta3.toFixed(2) : '—'}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-500 font-medium">AUM (Fund Size)</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
              {fund.aum != null ? `₹${(fund.aum).toFixed(0)} Cr` : '—'}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Rating: {fund.rating || '★ 4/5'}</p>
          </div>
        </div>

        {/* Chart View Switcher */}
        <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-none touch-pan-x border-b border-neutral-200 dark:border-neutral-800 mb-4">
          <button
            onClick={() => setActiveChart('nav')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
              activeChart === 'nav'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Historic NAV Trend ({navData.length} pts)
          </button>
          <button
            onClick={() => setActiveChart('roll')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
              activeChart === 'roll'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            3Y Rolling Return Trend ({rollData.length} pts)
          </button>
          <button
            onClick={() => setActiveChart('sip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
              activeChart === 'sip'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            ₹10k/mo SIP Wealth Curve ({sipData.length} pts)
          </button>
        </div>

        {/* Real Historic Chart Container */}
        <div className="p-2 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 mb-4 sm:mb-6">
          <div className="h-64 sm:h-80">
            {activeChart === 'nav' && navData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={navData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="nav" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#navGrad)" name="NAV (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'roll' && rollData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rollData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f8fafc' }} />
                  <Line type="monotone" dataKey="r3" stroke="#3b82f6" strokeWidth={2} dot={false} name="3Y Rolling Return %" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'sip' && sipData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sipData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f8fafc' }} />
                  <Line type="monotone" dataKey="invested" stroke="#64748b" strokeWidth={2} dot={false} name="Total Invested (₹)" />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={false} name="Portfolio Market Value (₹)" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {((activeChart === 'nav' && navData.length === 0) ||
              (activeChart === 'roll' && rollData.length === 0) ||
              (activeChart === 'sip' && sipData.length === 0)) && (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                Data series history available in real-time refresh.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">Trailing Compounding Returns</h4>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">1-Year CAGR:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{fund.y1 != null ? `${fund.y1.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">3-Year CAGR:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fund.y3 != null ? `${fund.y3.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">5-Year CAGR:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{fund.y5 != null ? `${fund.y5.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">10-Year CAGR:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{fund.y10 != null ? `${fund.y10.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Since Inception CAGR:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{fund.since != null ? `${fund.since.toFixed(1)}%` : '—'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">Rolling Return Statistics (3Y)</h4>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">3Y Minimum Rolling Return:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{fund.r3min != null ? `${fund.r3min.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">3Y Median Rolling Return:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fund.r3med != null ? `${fund.r3med.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">3Y Maximum Rolling Return:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{fund.r3max != null ? `${fund.r3max.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Standard Deviation (Volatility):</span>
              <span className="font-bold text-neutral-900 dark:text-white">{fund.sd3 != null ? `${fund.sd3.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Benchmark Index:</span>
              <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[180px]">{fund.bench || 'Nifty 50 TRI'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
