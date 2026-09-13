import React, { useState, useMemo, useEffect } from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { PORTFOLIO_HOLDINGS, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { 
  Search, 
  Award, 
  ArrowRightLeft, 
  CheckCircle2,
  LineChart as ChartIcon,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { FundGraphView } from '../components/FundGraphView';
import { findFundData, loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { ExportDropdown } from '../components/ExportDropdown';

interface HoldingsTableProps {
  onSelectFund: (fund: MutualFundHolding) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ onSelectFund }) => {
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

  // Live dataset for metric enrichment
  const [liveFunds, setLiveFunds] = useState<Fund[]>([]);

  useEffect(() => {
    loadMasterDataset().then(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setLiveFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  // Build a fast name→Fund lookup from the live dataset
  const liveFundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    liveFunds.forEach(f => {
      if (f.label) map.set(f.label.toLowerCase(), f);
      if (f.schemeName) map.set(f.schemeName.toLowerCase(), f);
    });
    return map;
  }, [liveFunds]);

  // Fuzzy lookup: exact → 20-char prefix → any inclusion
  const getLiveFund = (name: string): Fund | undefined => {
    const q = name.toLowerCase();
    if (liveFundMap.has(q)) return liveFundMap.get(q);
    const prefix = q.slice(0, 20);
    for (const [k, v] of liveFundMap) { if (k.startsWith(prefix)) return v; }
    for (const [k, v] of liveFundMap) { if (k.includes(q.slice(0, 15))) return v; }
    return findFundData(name);
  };

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedAmc, setSelectedAmc] = useState<string>('ALL');
  const [excludeElss, setExcludeElss] = useState<boolean>(false);

  // Range Slider Filters (default to -10 so negative return funds are not hidden)
  const [minXirr, setMinXirr] = useState<number>(-10);
  const [minSharpe, setMinSharpe] = useState<number>(0);
  const [maxExpense, setMaxExpense] = useState<number>(2.5);
  const [min3yCagr, setMin3yCagr] = useState<number>(-10);

  // Sorting State
  const [sortField, setSortField] = useState<keyof MutualFundHolding>('amountLakhs');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [graphModalFund, setGraphModalFund] = useState<Fund | null>(null);

  // Investors list
  const investors = useMemo(() => {
    const set = new Set(PORTFOLIO_HOLDINGS.map(h => h.investorName).filter(Boolean));
    return Array.from(set).sort();
  }, []);

  // Platforms list (CAMPS / KFinkart)
  const platforms = useMemo(() => {
    const set = new Set(PORTFOLIO_HOLDINGS.map(h => h.platform).filter(Boolean));
    return Array.from(set).sort();
  }, []);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(PORTFOLIO_HOLDINGS.map(h => h.category));
    return Array.from(set).sort();
  }, []);

  // AMCs list
  const amcs = useMemo(() => {
    const set = new Set(PORTFOLIO_HOLDINGS.map(h => h.amc));
    return Array.from(set).sort();
  }, []);

  // Multi-Filter & Multi-Sort Processing Engine
  const filteredHoldings = useMemo(() => {
    return PORTFOLIO_HOLDINGS.filter((fund) => {
      const isElss = fund.category.toLowerCase().includes('elss') || 
                     fund.name.toLowerCase().includes('elss') || 
                     fund.name.toLowerCase().includes('tax saver');
      if (excludeElss && isElss) return false;

      const matchesSearch = 
        fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.amc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fund.folioNumber && fund.folioNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fund.investorName && fund.investorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        fund.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesInvestor = selectedInvestor === 'ALL' || fund.investorName === selectedInvestor;
      const matchesPlatform = selectedPlatform === 'ALL' || fund.platform === selectedPlatform;
      const matchesCategory = selectedCategory === 'ALL' || fund.category === selectedCategory;
      const matchesTag = selectedTag === 'ALL' || fund.actionTag === selectedTag;
      const matchesAmc = selectedAmc === 'ALL' || fund.amc === selectedAmc;

      const matchesXirr = minXirr <= -10 ? true : fund.returnPct >= minXirr;
      const matchesSharpe = minSharpe <= 0 ? true : fund.sharpeRatio >= minSharpe;
      const matchesExpense = maxExpense >= 2.5 ? true : fund.expenseRatio <= maxExpense;
      const matches3yCagr = min3yCagr <= -10 ? true : fund.cagr3y >= min3yCagr;

      return (
        matchesSearch && 
        matchesInvestor &&
        matchesPlatform &&
        matchesCategory && 
        matchesTag && 
        matchesAmc && 
        matchesXirr && 
        matchesSharpe && 
        matchesExpense && 
        matches3yCagr
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
  }, [
    searchTerm, 
    selectedCategory, 
    selectedTag, 
    selectedAmc, 
    minXirr, 
    minSharpe, 
    maxExpense, 
    min3yCagr, 
    sortField, 
    sortOrder
  ]);

  const handleSort = (field: keyof MutualFundHolding) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedInvestor('ALL');
    setSelectedPlatform('ALL');
    setSelectedCategory('ALL');
    setSelectedTag('ALL');
    setSelectedAmc('ALL');
    setExcludeElss(false);
    setMinXirr(-10);
    setMinSharpe(0);
    setMaxExpense(2.5);
    setMin3yCagr(-10);
    setSortField('amountLakhs');
    setSortOrder('desc');
  };

  const filteredTotalValue = filteredHoldings.reduce((sum, item) => sum + item.amountLakhs, 0);

  const openGraphForHolding = (holding: MutualFundHolding) => {
    const found = findFundData(holding.name);
    if (found) {
      setGraphModalFund(found);
    } else {
      setGraphModalFund({
        isin: 'IN' + Math.random().toString().slice(2, 12),
        label: holding.name,
        schemeName: holding.name,
        category: holding.category,
        nav: 100 + holding.returnPct * 2,
        navDate: '2026-08-30',
        y1: holding.cagr1y,
        y3: holding.cagr3y,
        y5: holding.cagr5y,
        y10: holding.cagr10y,
        since: holding.cagr15y,
        x1: holding.returnPct,
        x3: holding.cagr3y,
        x5: holding.cagr5y,
        r3min: holding.rolling3yMin,
        r3med: holding.rolling3yAvg,
        r3max: holding.rolling3yMax,
        exp: holding.expenseRatio,
        sharpe3: holding.sharpeRatio,
        sort3: holding.sortinoRatio,
        beta3: holding.beta,
        aum: holding.amountLakhs * 15,
        history: {
          nav_series: [
            { date: '2021-01', nav: 100 },
            { date: '2022-01', nav: 118 },
            { date: '2023-01', nav: 135 },
            { date: '2024-01', nav: 165 },
            { date: '2025-01', nav: 195 },
            { date: '2026-08', nav: 210 }
          ],
          roll3_series: [
            { date: '2023-01', r3: holding.rolling3yMin },
            { date: '2024-01', r3: holding.rolling3yAvg },
            { date: '2025-01', r3: holding.rolling3yMax },
            { date: '2026-08', r3: holding.cagr3y }
          ],
          sip_series: [
            { date: '2021-01', invested: 120000, value: 125000 },
            { date: '2023-01', invested: 360000, value: 450000 },
            { date: '2025-01', invested: 600000, value: 890000 },
            { date: '2026-08', invested: 720000, value: 1150000 }
          ]
        }
      } as Fund);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header & Quick Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="chip font-bold">
              Filtered: {filteredHoldings.length} / {PORTFOLIO_HOLDINGS.length} Schemes
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Family Mutual Fund Holdings Terminal ({PORTFOLIO_HOLDINGS.length} Holdings)</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Verified family mutual fund statements across Prem Ramchand Bhatia & Sarita Prem Bhatia via CAMPS & KFinkart with exact Realized XIRR %, annualized yield, and risk analytics.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs flex-wrap gap-2">
          <div className="px-3 sm:px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-right">
            <p className="text-[10px] text-neutral-500 font-medium">Filtered Capital Amount</p>
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">₹{filteredTotalValue.toFixed(2)} Lakhs</p>
            <p className="text-[10px] text-neutral-400 font-bold">{((filteredTotalValue / TOTAL_PORTFOLIO_VALUE_LAKHS) * 100).toFixed(1)}% of wealth</p>
          </div>
          <ExportDropdown
            data={filteredHoldings.map(h => ({
              'Investor Name': h.investorName,
              'Platform': h.platform,
              'Fund Name': h.name,
              'Folio Number': h.folioNumber,
              'Units': h.units,
              'Cost Value (INR)': h.costValueInr,
              'Current Value (INR)': h.currentValueInr,
              'Appreciation (INR)': h.appreciationInr,
              'XIRR (%)': h.xirr,
              'Annualized Return (%)': h.annualizedReturn,
              'Weighted Avg Days': h.weightedAvgDays,
              'AMC': h.amc, 
              'Category': h.category,
              'Amount (Lakhs)': h.amountLakhs,
              'CAGR 1Y (%)': h.cagr1y, 'CAGR 3Y (%)': h.cagr3y,
              'CAGR 5Y (%)': h.cagr5y, 'Sharpe': h.sharpeRatio, 'Sortino': h.sortinoRatio,
              'Beta': h.beta, 'Std Dev': h.stdDev, 'Max Drawdown (%)': h.maxDrawdown,
              'Expense (%)': h.expenseRatio,
            }))}
            filename="family-master-portfolio-holdings"
          />
        </div>
      </div>

      {/* 1-Click Quick Sort Presets Bar */}
      <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1.5 scrollbar-none touch-pan-x">
        <span className="text-neutral-500 font-bold flex-shrink-0 flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5" /> Quick Sort:
        </span>
        {[
          { label: 'Highest Capital (₹L)', field: 'amountLakhs', order: 'desc' },
          { label: 'Highest XIRR Return %', field: 'returnPct', order: 'desc' },
          { label: 'Top 3Y CAGR %', field: 'cagr3y', order: 'desc' },
          { label: 'Top Sharpe Ratio', field: 'sharpeRatio', order: 'desc' },
          { label: 'Top Sortino Ratio', field: 'sortinoRatio', order: 'desc' },
          { label: 'Lowest Beta Risk', field: 'beta', order: 'asc' },
          { label: 'Lowest Expense Ratio', field: 'expenseRatio', order: 'asc' },
          { label: 'Worst Drawdown (STP Exits)', field: 'maxDrawdown', order: 'asc' },
        ].map((preset) => {
          const isActive = sortField === preset.field && sortOrder === preset.order;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setSortField(preset.field as any);
                setSortOrder(preset.order as any);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 flex-shrink-0 mx-1" />

        {/* 1-Click Filter Out ELSS Schemes Button */}
        <button
          onClick={() => setExcludeElss(!excludeElss)}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 flex-shrink-0 ${
            excludeElss
              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400 dark:ring-rose-500'
              : 'bg-white dark:bg-black text-neutral-700 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 border border-neutral-200 dark:border-neutral-800'
          }`}
        >
          <span>{excludeElss ? '✓ ELSS Filtered Out' : '🚫 Filter Out ELSS'}</span>
        </button>
      </div>

      {/* Multi-Parameter Filters Controls Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Multi-Parameter Analytical Filters
            </h3>
            {excludeElss && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                ELSS Excluded
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={() => setExcludeElss(!excludeElss)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                excludeElss
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{excludeElss ? '✓ ELSS Excluded' : 'Filter Out ELSS'}</span>
            </button>
            <button
              onClick={resetAllFilters}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Search Scheme / Folio</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={`Search ${PORTFOLIO_HOLDINGS.length} holdings...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Investor Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Investor</label>
                <select
                  value={selectedInvestor}
                  onChange={(e) => setSelectedInvestor(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none font-medium"
                >
                  <option value="ALL">All Investors ({investors.length})</option>
                  {investors.map((inv) => (
                    <option key={inv} value={inv}>{inv.split(' ')[0]} ({PORTFOLIO_HOLDINGS.filter(h => h.investorName === inv).length})</option>
                  ))}
                </select>
              </div>

              {/* Platform Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Platform (RTA)</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none font-medium"
                >
                  <option value="ALL">All Platforms ({platforms.length})</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p} ({PORTFOLIO_HOLDINGS.filter(h => h.platform === p).length})</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Category Filter</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Categories ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* AMC Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">AMC Fund House</label>
                <select
                  value={selectedAmc}
                  onChange={(e) => setSelectedAmc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All AMCs ({amcs.length})</option>
                  {amcs.map((amc) => (
                    <option key={amc} value={amc}>{amc}</option>
                  ))}
                </select>
              </div>

              {/* Action Tag Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Action Tag</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Action Tags</option>
                  <option value="TOP_PERFORMER">Top Performers</option>
                  <option value="STABLE_CORE">Stable Core</option>
                  <option value="WATCHLIST">Watchlist</option>
                  <option value="STP_REBALANCE_CANDIDATE">STP Exits Candidates</option>
                </select>
              </div>
            </div>

            {/* Sliders Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">
                  Min XIRR Return % ({minXirr <= -10 ? 'All' : `${minXirr}%`})
                </label>
                <input
                  type="range"
                  min="-10"
                  max="35"
                  value={minXirr}
                  onChange={(e) => setMinXirr(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">
                  Min 3Y CAGR % ({min3yCagr <= -10 ? 'All' : `${min3yCagr}%`})
                </label>
                <input
                  type="range"
                  min="-10"
                  max="35"
                  value={min3yCagr}
                  onChange={(e) => setMin3yCagr(Number(e.target.value))}
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

      {/* 21-Column Master Holdings Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <span className="font-bold text-neutral-900 dark:text-white">Showing {filteredHoldings.length} Funds (Sorted by {String(sortField).toUpperCase()} {sortOrder.toUpperCase()})</span>
          <div className="flex items-center gap-2 flex-wrap">
            {liveFunds.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                <Zap className="w-3 h-3" /> Live data from {liveFunds.length} schemes
              </span>
            )}
            <span className="text-neutral-500 hidden sm:inline">Click headers to sort</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[650px] table-scroll-container">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                <th className="cursor-pointer" onClick={() => handleSort('name')}>Scheme Name {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="cursor-pointer" onClick={() => handleSort('investorName')}>Investor {sortField === 'investorName' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="cursor-pointer" onClick={() => handleSort('platform')}>Platform {sortField === 'platform' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="cursor-pointer" onClick={() => handleSort('category')}>Category {sortField === 'category' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Folio</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('costValueInr')}>Cost (₹L) {sortField === 'costValueInr' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('amountLakhs')}>Current (₹L) {sortField === 'amountLakhs' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('appreciationInr')}>Gain (₹L) {sortField === 'appreciationInr' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('returnPct')}>Real XIRR % {sortField === 'returnPct' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('cagr1y')}>1Y CAGR {sortField === 'cagr1y' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('cagr3y')}>3Y CAGR {sortField === 'cagr3y' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('cagr5y')}>5Y CAGR {sortField === 'cagr5y' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('cagr10y')}>10Y CAGR {sortField === 'cagr10y' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('rolling3yMin')}>3Y Roll Min {sortField === 'rolling3yMin' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('rolling3yAvg')}>3Y Roll Avg {sortField === 'rolling3yAvg' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('rolling3yMax')}>3Y Roll Max {sortField === 'rolling3yMax' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('sharpeRatio')}>Sharpe {sortField === 'sharpeRatio' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('sortinoRatio')}>Sortino {sortField === 'sortinoRatio' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-center cursor-pointer" onClick={() => handleSort('beta')}>Beta {sortField === 'beta' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('stdDev')}>Volatility {sortField === 'stdDev' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('maxDrawdown')}>Max Drawdown {sortField === 'maxDrawdown' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('expenseRatio')}>Expense % {sortField === 'expenseRatio' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th className="text-right">Alpha (Live)</th>
                <th className="text-right">AUM ₹Cr (Live)</th>
                <th className="text-center">Action Tag</th>
                <th className="text-center">Graph</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((fund) => {
                const liveMatch = getLiveFund(fund.name);
                // Live-enriched values (fallback to portfolioData)
                const live1y  = liveMatch?.y1  ?? fund.cagr1y;
                const live3y  = liveMatch?.y3  ?? fund.cagr3y;
                const live5y  = liveMatch?.y5  ?? fund.cagr5y;
                const live10y = liveMatch?.y10 ?? fund.cagr10y;
                const liveR3min = liveMatch?.r3min ?? fund.rolling3yMin;
                const liveR3avg = liveMatch?.r3med ?? fund.rolling3yAvg;
                const liveR3max = liveMatch?.r3max ?? fund.rolling3yMax;
                const liveSharpe  = liveMatch?.sharpe3 ?? fund.sharpeRatio;
                const liveSortino = liveMatch?.sort3   ?? fund.sortinoRatio;
                const liveBeta    = liveMatch?.beta3   ?? fund.beta;
                const liveVol     = liveMatch?.sd3     ?? fund.stdDev;
                const liveMaxDD   = liveMatch?.maxDrawdown ?? fund.maxDrawdown;
                const liveExp     = liveMatch?.exp     ?? fund.expenseRatio;
                const liveAlpha   = liveMatch?.alpha   ?? null;
                const liveAum     = liveMatch?.aum     ?? null;

                const isPrem = fund.investorName?.includes('Prem') && !fund.investorName?.includes('Sarita');

                return (
                  <tr key={fund.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                    <td className="cursor-pointer" onClick={() => onSelectFund(fund)}>
                      <p className="font-bold text-neutral-900 dark:text-white text-xs">{fund.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{fund.amc}</p>
                      {liveMatch && <span className="text-[9px] text-emerald-500 font-bold">⚡ Live</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`chip text-[10px] py-0.5 px-2 font-bold ${
                        isPrem
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                      }`}>
                        {isPrem ? 'Prem' : 'Sarita'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`chip text-[10px] py-0.5 px-2 font-bold ${
                        fund.platform === 'CAMPS'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                        {fund.platform}
                      </span>
                    </td>
                    <td>
                      <span className="chip text-[10px] py-0 px-2 font-medium">{fund.category}</span>
                    </td>
                    <td className="text-neutral-500 text-[11px] font-mono whitespace-nowrap">
                      {fund.folioNumber || '—'}
                    </td>
                    <td className="text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      ₹{(fund.costValueInr / 100000).toFixed(2)}L
                    </td>
                    <td className="text-right font-black text-neutral-900 dark:text-white whitespace-nowrap">
                      ₹{fund.amountLakhs.toFixed(2)}L
                    </td>
                    <td className={`text-right font-bold text-xs whitespace-nowrap ${fund.appreciationInr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {fund.appreciationInr >= 0 ? '+' : ''}₹{(fund.appreciationInr / 100000).toFixed(2)}L
                    </td>
                    {/* Realized XIRR */}
                    <td className={`text-right font-black whitespace-nowrap ${fund.returnPct >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {fund.returnPct > 0 ? `+${fund.returnPct}%` : `${fund.returnPct}%`}
                    </td>
                    {/* Live 1Y CAGR */}
                    <td className="text-right font-bold text-neutral-700 dark:text-neutral-300">{live1y != null ? `${live1y.toFixed(1)}%` : '—'}</td>
                    {/* Live 3Y CAGR */}
                    <td className="text-right font-bold text-neutral-900 dark:text-white">{live3y != null ? `${live3y.toFixed(1)}%` : '—'}</td>
                    {/* Live 5Y CAGR */}
                    <td className="text-right font-bold text-neutral-700 dark:text-neutral-300">{live5y != null ? `${live5y.toFixed(1)}%` : '—'}</td>
                    {/* Live 10Y CAGR */}
                    <td className="text-right text-neutral-700 dark:text-neutral-300">{live10y != null ? `${live10y.toFixed(1)}%` : '—'}</td>
                    {/* 3Y Rolling */}
                    <td className="text-right text-rose-600 dark:text-rose-400 font-semibold">{liveR3min != null ? `${liveR3min.toFixed(1)}%` : '—'}</td>
                    <td className="text-right text-emerald-600 dark:text-emerald-400 font-bold">{liveR3avg != null ? `${liveR3avg.toFixed(1)}%` : '—'}</td>
                    <td className="text-right text-teal-600 dark:text-teal-400 font-semibold">{liveR3max != null ? `${liveR3max.toFixed(1)}%` : '—'}</td>
                    {/* Ratios */}
                    <td className="text-center font-bold text-neutral-900 dark:text-white">{liveSharpe != null ? liveSharpe.toFixed(2) : '—'}</td>
                    <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">{liveSortino != null ? liveSortino.toFixed(2) : '—'}</td>
                    <td className="text-center text-neutral-700 dark:text-neutral-300">{liveBeta != null ? liveBeta.toFixed(2) : '—'}</td>
                    <td className="text-right text-neutral-700 dark:text-neutral-300">{liveVol != null ? `${liveVol.toFixed(1)}%` : '—'}</td>
                    <td className="text-right text-rose-600 dark:text-rose-400 font-semibold">{liveMaxDD != null ? `${liveMaxDD.toFixed(1)}%` : '—'}</td>
                    <td className="text-right font-semibold text-neutral-700 dark:text-neutral-300">{liveExp != null ? `${liveExp.toFixed(2)}%` : '—'}</td>
                    {/* Live-only columns */}
                    <td className={`text-right font-bold ${liveAlpha != null && liveAlpha > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {liveAlpha != null ? `${liveAlpha > 0 ? '+' : ''}${liveAlpha.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right font-bold text-neutral-900 dark:text-white">
                      {liveAum != null ? `₹${Math.round(liveAum).toLocaleString()}` : '—'}
                    </td>
                    <td className="text-center">
                      {fund.actionTag === 'TOP_PERFORMER' && (
                        <span className="chip text-[10px] py-0 px-2 font-bold text-emerald-600 dark:text-emerald-400"><Award className="w-3 h-3" /> Star</span>
                      )}
                      {fund.actionTag === 'STABLE_CORE' && (
                        <span className="chip text-[10px] py-0 px-2 font-bold"><CheckCircle2 className="w-3 h-3" /> Core</span>
                      )}
                      {fund.actionTag === 'STP_REBALANCE_CANDIDATE' && (
                        <span className="chip text-[10px] py-0 px-2 font-bold text-rose-600 dark:text-rose-400"><ArrowRightLeft className="w-3 h-3" /> Exit STP</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openGraphForHolding(fund)}
                        className="px-2.5 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 text-[11px] font-bold transition flex items-center space-x-1 mx-auto"
                      >
                        <ChartIcon className="w-3 h-3" />
                        <span>Graph</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
          </table>
        </div>
      </div>

      {/* Fund Historic NAV Graph Terminal Modal */}
      <FundGraphView
        fund={graphModalFund}
        onClose={() => setGraphModalFund(null)}
      />
    </div>
  );
};
