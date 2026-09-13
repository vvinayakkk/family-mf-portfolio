import React, { useState, useEffect, useMemo } from 'react';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { Trophy, Search, LineChart as ChartIcon, Loader2, SlidersHorizontal, RotateCcw, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { FundGraphView } from '../components/FundGraphView';
import { fundsToExportRows } from '../lib/exportUtils';
import { ExportDropdown } from '../components/ExportDropdown';

export const MasterRanking: React.FC = () => {
  const [allFunds, setAllFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFundForGraph, setSelectedFundForGraph] = useState<Fund | null>(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Multi-Range Sliders
  const [minCagr3y, setMinCagr3y] = useState<number>(0);
  const [minCagr5y, setMinCagr5y] = useState<number>(0);
  const [minSharpe, setMinSharpe] = useState<number>(0);
  const [maxExpense, setMaxExpense] = useState<number>(2.5);

  // Sorting
  const [sortField, setSortField] = useState<keyof Fund>('y3');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadMasterDataset().then(dataset => {
      setAllFunds(fundsWithDataFromDataset(dataset));
      setLoading(false);
    });

    const unsubscribe = subscribeToDatasetUpdates(dataset => {
      setAllFunds(fundsWithDataFromDataset(dataset));
    });
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(allFunds.map(f => f.category || 'Other').filter(Boolean));
    return Array.from(set).sort();
  }, [allFunds]);

  const filteredFunds = useMemo(() => {
    return allFunds.filter((fund) => {
      const matchesSearch = 
        (fund.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fund.schemeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fund.isin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fund.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'ALL' || fund.category === selectedCategory;
      const matchesCagr3y = (fund.y3 ?? 0) >= minCagr3y;
      const matchesCagr5y = (fund.y5 ?? 0) >= minCagr5y;
      const matchesSharpe = (fund.sharpe3 ?? 0) >= minSharpe;
      const matchesExp = (fund.exp ?? 0) <= maxExpense;

      return (
        matchesSearch && 
        matchesCategory && 
        matchesCagr3y && 
        matchesCagr5y && 
        matchesSharpe && 
        matchesExp
      );
    }).sort((a, b) => {
      let aVal = a[sortField] ?? -999;
      let bVal = b[sortField] ?? -999;
      if (typeof aVal === 'string') aVal = (aVal as string).toLowerCase();
      if (typeof bVal === 'string') bVal = (bVal as string).toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allFunds, searchTerm, selectedCategory, minCagr3y, minCagr5y, minSharpe, maxExpense, sortField, sortOrder]);

  const handleSort = (field: keyof Fund) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setMinCagr3y(0);
    setMinCagr5y(0);
    setMinSharpe(0);
    setMaxExpense(2.5);
    setSortField('y3');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-fadeIn">
        <Loader2 className="w-8 h-8 text-neutral-900 dark:text-white animate-spin" />
        <p className="text-sm font-semibold text-neutral-500">Loading 1,500 Master Mutual Funds Complete Dataset...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="chip font-bold">
              <Trophy className="w-3.5 h-3.5" /> {allFunds.length} Direct Schemes Indexed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Master Indian Mutual Fund Database</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Complete data table featuring 21 metrics: CAGRs, XIRRs, 3Y Rolling Return Min/Med/Max, Sharpe, Sortino, Beta, Expense Ratio, and Historic NAV Graphs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <ExportDropdown data={fundsToExportRows(filteredFunds)} filename="master-database-1500" />
        </div>
      </div>

      {/* 1-Click Quick Sort Presets Bar */}
      <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1.5 scrollbar-none touch-pan-x">
        <span className="text-neutral-500 font-bold flex-shrink-0 flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5" /> Quick Sort:
        </span>
        {[
          { label: 'Top 3Y CAGR %', field: 'y3', order: 'desc' },
          { label: 'Top 1Y CAGR %', field: 'y1', order: 'desc' },
          { label: 'Top 5Y CAGR %', field: 'y5', order: 'desc' },
          { label: 'Top 3Y XIRR %', field: 'x3', order: 'desc' },
          { label: 'Top Sharpe Ratio', field: 'sharpe3', order: 'desc' },
          { label: 'Top Sortino Ratio', field: 'sort3', order: 'desc' },
          { label: 'Lowest Expense Ratio', field: 'exp', order: 'asc' },
          { label: 'Largest AUM (₹ Cr)', field: 'aum', order: 'desc' },
        ].map((preset) => {
          const isActive = sortField === preset.field && sortOrder === preset.order;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setSortField(preset.field as any);
                setSortOrder(preset.order as any);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex-shrink-0 ${
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Multi-Parameter Filters Controls Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 gap-2">
          <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Master Database Multi-Filters
          </h3>
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={resetAllFilters}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
              className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold flex items-center space-x-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
            >
              {isFiltersCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{isFiltersCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          </div>
        </div>

        {!isFiltersCollapsed && (
          <>
            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Search Scheme / ISIN</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search 866 funds or ISIN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Category Filter</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Categories ({allFunds.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sliders Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Min 3Y CAGR % ({minCagr3y}%)</label>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={minCagr3y}
                  onChange={(e) => setMinCagr3y(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Min 5Y CAGR % ({minCagr5y}%)</label>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={minCagr5y}
                  onChange={(e) => setMinCagr5y(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Min Sharpe Ratio ({minSharpe.toFixed(1)})</label>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={minSharpe}
                  onChange={(e) => setMinSharpe(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Max Expense Ratio % ({maxExpense}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.1"
                  value={maxExpense}
                  onChange={(e) => setMaxExpense(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main 21-Column Master Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <span className="font-bold text-neutral-900 dark:text-white">Showing {filteredFunds.length} Funds (Sorted by {String(sortField).toUpperCase()} {sortOrder.toUpperCase()})</span>
          <span className="text-neutral-500 hidden sm:inline">Click any column header to sort</span>
        </div>

        <div className="overflow-x-auto max-h-[650px] table-scroll-container">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                <th className="cursor-pointer" onClick={() => handleSort('label')}>Scheme Name {sortField === 'label' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="cursor-pointer" onClick={() => handleSort('category')}>Category {sortField === 'category' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('nav')}>NAV (₹) {sortField === 'nav' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('y1')}>1Y CAGR {sortField === 'y1' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('y3')}>3Y CAGR {sortField === 'y3' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('y5')}>5Y CAGR {sortField === 'y5' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('y10')}>10Y CAGR {sortField === 'y10' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('since')}>Inception {sortField === 'since' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('x1')}>1Y XIRR {sortField === 'x1' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('x3')}>3Y XIRR {sortField === 'x3' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('x5')}>5Y XIRR {sortField === 'x5' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('r3min')}>3Y Roll Min {sortField === 'r3min' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('r3med')}>3Y Roll Med {sortField === 'r3med' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('r3max')}>3Y Roll Max {sortField === 'r3max' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('exp')}>Expense % {sortField === 'exp' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('sharpe3')}>Sharpe {sortField === 'sharpe3' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('sort3')}>Sortino {sortField === 'sort3' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('beta3')}>Beta {sortField === 'beta3' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('aum')}>AUM (Cr) {sortField === 'aum' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center">Historic Graph</th>
              </tr>
            </thead>
            <tbody>
              {filteredFunds.slice(0, 200).map((fund, idx) => (
                <tr key={fund.isin || fund.label + idx} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                  <td>
                    <p className="font-bold text-neutral-900 dark:text-white text-xs">{fund.label}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{fund.schemeName || 'Direct Growth'}</p>
                  </td>
                  <td>
                    <span className="chip text-[10px] py-0 px-2 font-medium">
                      {fund.category || 'Equity'}
                    </span>
                  </td>
                  <td className="text-right font-bold text-neutral-900 dark:text-white">
                    {fund.nav != null ? `₹${fund.nav.toFixed(1)}` : '—'}
                  </td>
                  <td className={`text-right font-bold ${fund.y1 && fund.y1 >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {fund.y1 != null ? `${fund.y1.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`text-right font-extrabold ${fund.y3 && fund.y3 >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {fund.y3 != null ? `${fund.y3.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right font-bold text-neutral-700 dark:text-neutral-300">
                    {fund.y5 != null ? `${fund.y5.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right font-bold text-neutral-700 dark:text-neutral-300">
                    {fund.y10 != null ? `${fund.y10.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right text-neutral-700 dark:text-neutral-300">
                    {fund.since != null ? `${fund.since.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right font-semibold text-neutral-700 dark:text-neutral-300">
                    {fund.x1 != null ? `${fund.x1.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {fund.x3 != null ? `${fund.x3.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right font-semibold text-neutral-700 dark:text-neutral-300">
                    {fund.x5 != null ? `${fund.x5.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right text-rose-600 dark:text-rose-400 font-semibold">
                    {fund.r3min != null ? `${fund.r3min.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    {fund.r3med != null ? `${fund.r3med.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right text-teal-600 dark:text-teal-400 font-semibold">
                    {fund.r3max != null ? `${fund.r3max.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-right text-neutral-700 dark:text-neutral-300 font-semibold">
                    {fund.exp != null ? `${fund.exp.toFixed(2)}%` : '—'}
                  </td>
                  <td className="text-center font-bold text-neutral-900 dark:text-white">
                    {fund.sharpe3 != null ? fund.sharpe3.toFixed(2) : '—'}
                  </td>
                  <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {fund.sort3 != null ? fund.sort3.toFixed(2) : '—'}
                  </td>
                  <td className="text-center text-neutral-700 dark:text-neutral-300">
                    {fund.beta3 != null ? fund.beta3.toFixed(2) : '—'}
                  </td>
                  <td className="text-right text-neutral-700 dark:text-neutral-300 font-bold">
                    {fund.aum != null ? `₹${(fund.aum).toFixed(0)}` : '—'}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => setSelectedFundForGraph(fund)}
                      className="px-2.5 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 text-[11px] font-bold transition flex items-center space-x-1 mx-auto"
                    >
                      <ChartIcon className="w-3 h-3" />
                      <span>Graph</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fund Graph Terminal Modal */}
      <FundGraphView
        fund={selectedFundForGraph}
        onClose={() => setSelectedFundForGraph(null)}
      />
    </div>
  );
};
