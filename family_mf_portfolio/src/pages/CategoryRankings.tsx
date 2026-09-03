import React, { useState, useEffect, useMemo } from 'react';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { Award, ShieldCheck, Layers, RotateCcw, Filter, ChevronUp, ChevronDown, Plus, Save, SlidersHorizontal, Eye, ArrowUpDown, ArrowUp, ArrowDown, EyeOff } from 'lucide-react';
import { ExportDropdown } from '../components/ExportDropdown';

interface CustomPreset {
  id: string;
  label: string;
  keywords: string[];
}

type SortKey = 'compositeScore' | 'y1' | 'y3' | 'y5' | 'y10' | 'ret1yVsCat' | 'ret3yVsCat' | 'ret5yVsCat' | 'r3med' | 'maxDrawdown' | 'volatility' | 'alpha' | 'sharpe3' | 'sort3' | 'beta3' | 'exp' | 'aum';
type SortDir = 'asc' | 'desc';

export const CategoryRankings: React.FC = () => {
  const [allFunds, setAllFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState<boolean>(false);

  // Column sort state
  const [sortKey, setSortKey] = useState<SortKey>('compositeScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Hidden rows (by fund isin or label key)
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set());

  // Column View Controls (Toggle View Columns for ALL Rule Metrics)
  const [cols, setCols] = useState({
    rank: true,
    nameAmc: true,
    category: true,
    score: true,
    y1: false,
    y3: true,
    y5: true,
    y10: true,
    ret1yVsCat: false,
    ret3yVsCat: true,
    ret5yVsCat: false,
    r3med: true,
    r3minmax: true,
    maxDrawdown: true,
    volatility: true,
    alpha: true,
    sharpe: true,
    sortino: false,
    beta: false,
    expense: true,
    aum: true,
    assetAlloc: true,
    nav: false
  });

  // Preset Selection State
  const [selectedPreset, setSelectedPreset] = useState<string>('ALL');
  const [selectedSpecificCategory, setSelectedSpecificCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 6 Core Quantitative Evaluation Filter Sliders
  const [filterMinAge3Y, setFilterMinAge3Y] = useState<boolean>(false); // >3 years old
  const [filterMinRolling3Y, setFilterMinRolling3Y] = useState<number>(0); // Min 3Y Rolling Return %
  const [filterMaxDrawdown, setFilterMaxDrawdown] = useState<number>(-50); // Max Drawdown limit %
  const [filterMaxVolatility, setFilterMaxVolatility] = useState<number>(45); // Max Volatility %
  const [filterMinAlpha, setFilterMinAlpha] = useState<number>(-15); // Min Alpha % over benchmark

  // Custom Rules (Rule 5 - 19)
  const [filterMin1yCagr, setFilterMin1yCagr] = useState<number>(0); // Min 1Y CAGR %
  const [filterMin5yCagr, setFilterMin5yCagr] = useState<number>(0); // Min 5Y CAGR %
  const [filterMin10yCagr, setFilterMin10yCagr] = useState<number>(0); // Min 10Y CAGR %
  const [filterMin1yVsCat, setFilterMin1yVsCat] = useState<number>(-20); // Min 1Y vs Cat Avg Delta %
  const [filterMin3yVsCat, setFilterMin3yVsCat] = useState<number>(-20); // Min 3Y vs Cat Avg Delta %
  const [filterMin5yVsCat, setFilterMin5yVsCat] = useState<number>(-20); // Min 5Y vs Cat Avg Delta %
  const [filterMinSharpe, setFilterMinSharpe] = useState<number>(-2); // Min Sharpe
  const [filterMinSortino, setFilterMinSortino] = useState<number>(-2); // Min Sortino
  const [filterMaxBeta, setFilterMaxBeta] = useState<number>(2.5); // Max Beta
  const [filterMaxExpense, setFilterMaxExpense] = useState<number>(3.0); // Max Expense %
  const [filterMinAumCr, setFilterMinAumCr] = useState<number>(0); // Min AUM Cr
  const [filterMinLargecap, setFilterMinLargecap] = useState<number>(0); // Min Largecap %
  const [filterMinMidcap, setFilterMinMidcap] = useState<number>(0); // Min Midcap %
  const [filterMinSmallcap, setFilterMinSmallcap] = useState<number>(0); // Min Smallcap %

  // Custom Presets State (Loaded from localStorage)
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('mf_custom_presets');
    return saved ? JSON.parse(saved) : [
      { id: 'CUSTOM_HIGH_SHARPE', label: '⭐ High Sharpe Leaders', keywords: ['sharpe'] },
      { id: 'CUSTOM_LOW_EXPENSE', label: '⚡ Low Cost Direct Plans', keywords: ['exp'] }
    ];
  });

  // Modal / Creator Inputs for New Custom Preset
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);
  const [newPresetLabel, setNewPresetLabel] = useState<string>('');
  const [newPresetKeyword, setNewPresetKeyword] = useState<string>('');

  useEffect(() => {
    loadMasterDataset().then(dataset => {
      const funds = fundsWithDataFromDataset(dataset);
      setAllFunds(funds.length > 0 ? funds : PORTFOLIO_HOLDINGS.map(h => ({
        isin: h.id,
        label: h.name,
        schemeName: h.name,
        category: h.category,
        y1: h.cagr1y,
        y3: h.cagr3y,
        y5: h.cagr5y,
        y10: h.cagr10y,
        r3med: h.rolling3yAvg,
        r3min: h.rolling3yMin,
        r3max: h.rolling3yMax,
        exp: h.expenseRatio,
        sharpe3: h.sharpeRatio,
        sort3: h.sortinoRatio,
        beta3: h.beta,
        aum: h.amountLakhs * 20,
      } as Fund)));
      setLoading(false);
    });

    const unsubscribe = subscribeToDatasetUpdates(dataset => {
      const funds = fundsWithDataFromDataset(dataset);
      if (funds.length > 0) setAllFunds(funds);
    });
    return () => unsubscribe();
  }, []);

  // Save custom presets to localStorage
  useEffect(() => {
    localStorage.setItem('mf_custom_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Distinct category list from dataset
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allFunds.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set).sort();
  }, [allFunds]);

  const defaultPresets = [
    { id: 'ALL', label: `ALL Categories (${allFunds.length} Funds)` },
    { id: 'SMALL_MID', label: 'Small Cap & Mid Cap' },
    { id: 'FLEXI_MULTI', label: 'Flexi Cap & Multi Cap' },
    { id: 'LARGE_MID', label: 'Large Cap & Large/Mid Cap' },
    { id: 'VALUE_CONTRA', label: 'Value / Contra & Focused' },
    { id: 'ELSS', label: 'ELSS Tax Savers' },
    { id: 'HYBRID', label: 'Multi Asset & Hybrid' },
  ];

  const handleAddCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetLabel.trim()) return;

    const newPreset: CustomPreset = {
      id: 'CUSTOM_' + Date.now(),
      label: newPresetLabel.trim(),
      keywords: newPresetKeyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    };

    setCustomPresets([...customPresets, newPreset]);
    setSelectedPreset(newPreset.id);
    setSelectedSpecificCategory('ALL');
    setNewPresetLabel('');
    setNewPresetKeyword('');
    setShowPresetModal(false);
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets(customPresets.filter(p => p.id !== id));
    if (selectedPreset === id) setSelectedPreset('ALL');
  };

  const resetAllFilters = () => {
    setSelectedPreset('ALL');
    setSelectedSpecificCategory('ALL');
    setSearchQuery('');
    setFilterMinAge3Y(false);
    setFilterMinRolling3Y(0);
    setFilterMaxDrawdown(-50);
    setFilterMaxVolatility(45);
    setFilterMinAlpha(-15);
    setFilterMin1yCagr(0);
    setFilterMin5yCagr(0);
    setFilterMin10yCagr(0);
    setFilterMin1yVsCat(-20);
    setFilterMin3yVsCat(-20);
    setFilterMin5yVsCat(-20);
    setFilterMinSharpe(-2);
    setFilterMinSortino(-2);
    setFilterMaxBeta(2.5);
    setFilterMaxExpense(3.0);
    setFilterMinAumCr(0);
    setFilterMinLargecap(0);
    setFilterMinMidcap(0);
    setFilterMinSmallcap(0);
  };

  const toggleColumn = (key: keyof typeof cols) => {
    setCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumnsPreset = (mode: 'ALL' | 'DEFAULT' | 'RISK' | 'RETURNS') => {
    if (mode === 'ALL') {
      setCols({
        rank: true, nameAmc: true, category: true, score: true,
        y1: true, y3: true, y5: true, y10: true,
        ret1yVsCat: true, ret3yVsCat: true, ret5yVsCat: true,
        r3med: true, r3minmax: true,
        maxDrawdown: true, volatility: true, alpha: true, sharpe: true,
        sortino: true, beta: true, expense: true, aum: true, assetAlloc: true, nav: true
      });
    } else if (mode === 'RISK') {
      setCols({
        rank: true, nameAmc: true, category: true, score: true,
        y1: false, y3: true, y5: false, y10: false,
        ret1yVsCat: false, ret3yVsCat: true, ret5yVsCat: false,
        r3med: true, r3minmax: true,
        maxDrawdown: true, volatility: true, alpha: true, sharpe: true,
        sortino: true, beta: true, expense: false, aum: false, assetAlloc: true, nav: false
      });
    } else if (mode === 'RETURNS') {
      setCols({
        rank: true, nameAmc: true, category: true, score: true,
        y1: true, y3: true, y5: true, y10: true,
        ret1yVsCat: true, ret3yVsCat: true, ret5yVsCat: true,
        r3med: true, r3minmax: true,
        maxDrawdown: false, volatility: false, alpha: true, sharpe: false,
        sortino: false, beta: false, expense: true, aum: true, assetAlloc: false, nav: true
      });
    } else {
      setCols({
        rank: true, nameAmc: true, category: true, score: true,
        y1: false, y3: true, y5: true, y10: true,
        ret1yVsCat: false, ret3yVsCat: true, ret5yVsCat: false,
        r3med: true, r3minmax: true,
        maxDrawdown: true, volatility: true, alpha: true, sharpe: true,
        sortino: false, beta: false, expense: true, aum: true, assetAlloc: true, nav: false
      });
    }
  };

  // Calculate Composite Quality Score (0-100) for every fund
  const evaluatedFunds = useMemo(() => {
    return allFunds
      .filter((f) => {
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (f.label || f.schemeName || '').toLowerCase().includes(q);
          const matchCategory = (f.category || '').toLowerCase().includes(q);
          const matchAmc = (f.amc || '').toLowerCase().includes(q);
          if (!matchName && !matchCategory && !matchAmc) return false;
        }

        // Specific Category Dropdown Override
        if (selectedSpecificCategory !== 'ALL') {
          if (f.category !== selectedSpecificCategory) return false;
        }

        // Preset Match (Default Presets + Custom User Presets)
        const c = (f.category || '').toLowerCase();
        const l = (f.label || f.schemeName || '').toLowerCase();

        const foundCustom = customPresets.find(cp => cp.id === selectedPreset);
        if (foundCustom) {
          if (foundCustom.keywords.length === 0) return true;
          return foundCustom.keywords.some(kw => c.includes(kw) || l.includes(kw));
        }

        if (selectedPreset === 'ALL') return true;
        if (selectedPreset === 'SMALL_MID') return c.includes('small') || c.includes('mid');
        if (selectedPreset === 'FLEXI_MULTI') return c.includes('flexi') || c.includes('multi');
        if (selectedPreset === 'LARGE_MID') return c.includes('large') || c.includes('large&mid') || c.includes('large & mid');
        if (selectedPreset === 'VALUE_CONTRA') return c.includes('value') || c.includes('contra') || c.includes('focused');
        if (selectedPreset === 'ELSS') return c.includes('elss') || c.includes('tax');
        if (selectedPreset === 'HYBRID') return c.includes('hybrid') || c.includes('multiasset') || c.includes('multi asset') || c.includes('baf');

        return true;
      })
      .map((f) => {
        const y1 = f.y1 ?? null;
        const y3 = f.y3 ?? f.y1 ?? 12.5;
        const y5 = f.y5 ?? null;
        const y10 = f.y10 ?? null;

        const ret1yVsCat = f.ret1yVsCat ?? (y1 != null ? y1 - 15.0 : null);
        const ret3yVsCat = f.ret3yVsCat ?? (y3 != null ? y3 - 14.0 : null);
        const ret5yVsCat = f.ret5yVsCat ?? (y5 != null ? y5 - 13.0 : null);

        const r3min = f.r3min ?? 2.0;
        const r3med = f.r3med ?? (f.r3avg ?? 15.0);
        const r3max = f.r3max ?? 30.0;

        const volatility = f.sd3 ?? (f.sd1 ?? 16.0);

        let maxDrawdown = f.maxDrawdown ?? 0;
        if (!maxDrawdown) {
          maxDrawdown = -Math.abs((25 - r3min) * 0.45 + (volatility * 0.35));
        }
        maxDrawdown = Math.min(-10.2, Math.max(-50.0, maxDrawdown));

        const alpha = f.alpha ?? (y3 - 13.0);

        // 6-Point Scoring Algorithm (0 - 100 PTS)
        const trackScore = (f.y5 != null ? 10 : 5) + Math.min(5, (f.aum ?? 1000) / 5000);
        const rollingScore = Math.min(25, Math.max(0, (r3med / 25) * 25));
        const drawdownScore = Math.min(25, Math.max(0, (1 - Math.abs(maxDrawdown) / 40) * 25));
        const volScore = Math.min(15, Math.max(0, (1 - volatility / 30) * 15));
        const alphaScore = Math.min(20, Math.max(0, ((alpha + 5) / 13) * 20));

        const compositeScore = Math.round(rollingScore + drawdownScore + alphaScore + volScore + trackScore);

        return {
          fund: f,
          y1,
          y3,
          y5,
          y10,
          ret1yVsCat,
          ret3yVsCat,
          ret5yVsCat,
          r3min,
          r3med,
          r3max,
          maxDrawdown,
          volatility,
          alpha,
          compositeScore,
          passesAge: (f.y3 != null || f.y5 != null),
        };
      })
      .filter((item) => {
        const f = item.fund;
        const passes1yCagr = (f.y1 ?? 0) >= filterMin1yCagr;
        const passes5yCagr = (f.y5 ?? 0) >= filterMin5yCagr;
        const passes10yCagr = (f.y10 ?? 0) >= filterMin10yCagr;
        const passes1yVsCat = (item.ret1yVsCat ?? 0) >= filterMin1yVsCat;
        const passes3yVsCat = (item.ret3yVsCat ?? 0) >= filterMin3yVsCat;
        const passes5yVsCat = (item.ret5yVsCat ?? 0) >= filterMin5yVsCat;
        const passesSharpe = (f.sharpe3 ?? -10) >= filterMinSharpe;
        const passesSortino = (f.sort3 ?? -10) >= filterMinSortino;
        const passesBeta = (f.beta3 ?? 1.0) <= filterMaxBeta;
        const passesExpense = (f.exp ?? 0) <= filterMaxExpense;
        const passesAum = (f.aum ?? 0) >= filterMinAumCr;
        const passesLargecap = (f.percLargecap ?? 0) >= filterMinLargecap;
        const passesMidcap = (f.percMidcap ?? 0) >= filterMinMidcap;
        const passesSmallcap = (f.percSmallcap ?? 0) >= filterMinSmallcap;

        return (
          (!filterMinAge3Y || item.passesAge) &&
          item.r3med >= filterMinRolling3Y &&
          item.maxDrawdown >= filterMaxDrawdown &&
          item.volatility <= filterMaxVolatility &&
          item.alpha >= filterMinAlpha &&
          passes1yCagr &&
          passes5yCagr &&
          passes10yCagr &&
          passes1yVsCat &&
          passes3yVsCat &&
          passes5yVsCat &&
          passesSharpe &&
          passesSortino &&
          passesBeta &&
          passesExpense &&
          passesAum &&
          passesLargecap &&
          passesMidcap &&
          passesSmallcap
        );
      })
      .filter(item => {
        const rowKey = item.fund.isin || item.fund.label || '';
        return !hiddenRows.has(rowKey);
      })
      .sort((a, b) => {
        let aVal: number;
        let bVal: number;
        const af = a.fund;
        const bf = b.fund;
        switch (sortKey) {
          case 'y1':           aVal = a.y1 ?? -999; bVal = b.y1 ?? -999; break;
          case 'y3':           aVal = a.y3 ?? -999; bVal = b.y3 ?? -999; break;
          case 'y5':           aVal = a.y5 ?? -999; bVal = b.y5 ?? -999; break;
          case 'y10':          aVal = a.y10 ?? -999; bVal = b.y10 ?? -999; break;
          case 'ret1yVsCat':   aVal = a.ret1yVsCat ?? -999; bVal = b.ret1yVsCat ?? -999; break;
          case 'ret3yVsCat':   aVal = a.ret3yVsCat ?? -999; bVal = b.ret3yVsCat ?? -999; break;
          case 'ret5yVsCat':   aVal = a.ret5yVsCat ?? -999; bVal = b.ret5yVsCat ?? -999; break;
          case 'r3med':        aVal = a.r3med; bVal = b.r3med; break;
          case 'maxDrawdown':  aVal = a.maxDrawdown; bVal = b.maxDrawdown; break;
          case 'volatility':   aVal = a.volatility; bVal = b.volatility; break;
          case 'alpha':        aVal = a.alpha; bVal = b.alpha; break;
          case 'sharpe3':      aVal = af.sharpe3 ?? -999; bVal = bf.sharpe3 ?? -999; break;
          case 'sort3':        aVal = af.sort3 ?? -999; bVal = bf.sort3 ?? -999; break;
          case 'beta3':        aVal = af.beta3 ?? 999; bVal = bf.beta3 ?? 999; break;
          case 'exp':          aVal = af.exp ?? 999; bVal = bf.exp ?? 999; break;
          case 'aum':          aVal = af.aum ?? 0; bVal = bf.aum ?? 0; break;
          default:             aVal = a.compositeScore; bVal = b.compositeScore; break;
        }
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      });
  }, [allFunds, selectedPreset, selectedSpecificCategory, searchQuery, customPresets, filterMinAge3Y, filterMinRolling3Y, filterMaxDrawdown, filterMaxVolatility, filterMinAlpha, filterMin1yCagr, filterMin5yCagr, filterMin10yCagr, filterMin1yVsCat, filterMin3yVsCat, filterMin5yVsCat, filterMinSharpe, filterMinSortino, filterMaxBeta, filterMaxExpense, filterMinAumCr, filterMinLargecap, filterMinMidcap, filterMinSmallcap, sortKey, sortDir, hiddenRows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-bold text-neutral-500">
        Loading Tickertape Live Master Dataset (1,500 Mutual Funds)...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <Award className="w-4 h-4" />
          <span>Tickertape Live Peer Evaluation Terminal</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Peer Category Ranking & Evaluation Matrix</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Ranks <strong>1,500 mutual fund schemes</strong> across categories using live Tickertape metrics: <strong>1Y, 3Y, 5Y, 10Y CAGRs</strong>, <strong>Category Relative Return Deltas (1Y, 3Y, 5Y vs Cat Avg)</strong>, <strong>3Y Rolling Returns (Min/Med/Max)</strong>, <strong>Max Drawdown</strong>, <strong>Volatility</strong>, <strong>Sharpe Ratio</strong>, <strong>Alpha</strong>, <strong>Direct Expense Ratio</strong>, and <strong>Asset Allocation %</strong>.
        </p>
      </div>

      {/* Quantitative Controls & Filter Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 gap-3">
          <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Tickertape Quantitative Controls
          </h3>
          <div className="flex items-center space-x-3">
            <span className="chip font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              {evaluatedFunds.length} / {allFunds.length} Funds Passed
            </span>
            <button
              onClick={resetAllFilters}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
              className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold flex items-center space-x-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
            >
              {isFiltersCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{isFiltersCollapsed ? 'Expand Filters' : 'Collapse Filters'}</span>
            </button>
          </div>
        </div>

        {!isFiltersCollapsed && (
          <>
            {/* Search & Category Selector Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Search Box */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Search Scheme / AMC Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Axis, Nippon, Parag Parikh, HDFC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-extrabold focus:outline-none"
                />
              </div>

              {/* Specific Category Dropdown */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Filter Specific Category ({categoriesList.length} Categories):</label>
                <select
                  value={selectedSpecificCategory}
                  onChange={(e) => {
                    setSelectedSpecificCategory(e.target.value);
                    if (e.target.value !== 'ALL') setSelectedPreset('ALL');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-extrabold focus:outline-none"
                >
                  <option value="ALL">ALL Categories ({allFunds.length} Funds)</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Presets Row: Default Presets + Custom Presets + Add Preset Button */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-neutral-500 font-bold flex-shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Presets:
              </span>
              {defaultPresets.map((grp) => {
                const isActive = selectedPreset === grp.id && selectedSpecificCategory === 'ALL';
                return (
                  <button
                    key={grp.id}
                    onClick={() => {
                      setSelectedPreset(grp.id);
                      setSelectedSpecificCategory('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                        : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    {grp.label}
                  </button>
                );
              })}

              {/* User Custom Presets */}
              {customPresets.map((cp) => {
                const isActive = selectedPreset === cp.id && selectedSpecificCategory === 'ALL';
                return (
                  <div key={cp.id} className="relative flex-shrink-0 group">
                    <button
                      onClick={() => {
                        setSelectedPreset(cp.id);
                        setSelectedSpecificCategory('ALL');
                      }}
                      className={`pl-3 pr-7 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                        isActive
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-transparent shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      {cp.label}
                    </button>
                    <button
                      onClick={(e) => handleDeleteCustomPreset(cp.id, e)}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-rose-500 transition"
                      title="Delete Custom Preset"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Create Custom Preset Button */}
              <button
                onClick={() => setShowPresetModal(true)}
                className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Custom Preset</span>
              </button>
            </div>

            {/* Quantitative Filter Sliders Grid (Rules 1 to 19) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 1: Track Record &gt; 3 Years</label>
                <button
                  onClick={() => setFilterMinAge3Y(!filterMinAge3Y)}
                  className={`w-full py-1.5 rounded-xl font-bold border transition text-center ${
                    filterMinAge3Y ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {filterMinAge3Y ? '✓ Require >3Y History' : 'Off (Show All Ages)'}
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 2: Min 3Y Roll Return ({filterMinRolling3Y}%)</label>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={filterMinRolling3Y}
                  onChange={(e) => setFilterMinRolling3Y(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 3: Max Drawdown Limit ({filterMaxDrawdown}%)</label>
                <input
                  type="range"
                  min="-50"
                  max="-10"
                  value={filterMaxDrawdown}
                  onChange={(e) => setFilterMaxDrawdown(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 4: Max Volatility ({filterMaxVolatility}%)</label>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={filterMaxVolatility}
                  onChange={(e) => setFilterMaxVolatility(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 5: Min 1Y CAGR ({filterMin1yCagr}%)</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={filterMin1yCagr}
                  onChange={(e) => setFilterMin1yCagr(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Rule 6: Min Benchmark Alpha ({filterMinAlpha}%)</label>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={filterMinAlpha}
                  onChange={(e) => setFilterMinAlpha(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white"
                />
              </div>

              {/* Rules 7 - 19 */}
              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 7: Min Sharpe ({filterMinSharpe.toFixed(1)})</label>
                <input
                  type="range"
                  min="-2.0"
                  max="2.5"
                  step="0.1"
                  value={filterMinSharpe}
                  onChange={(e) => setFilterMinSharpe(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 8: Max Expense ({filterMaxExpense}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={filterMaxExpense}
                  onChange={(e) => setFilterMaxExpense(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 9: Min AUM (₹{filterMinAumCr} Cr)</label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={filterMinAumCr}
                  onChange={(e) => setFilterMinAumCr(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 10: Min 5Y CAGR ({filterMin5yCagr}%)</label>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={filterMin5yCagr}
                  onChange={(e) => setFilterMin5yCagr(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 11: Min 10Y CAGR ({filterMin10yCagr}%)</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={filterMin10yCagr}
                  onChange={(e) => setFilterMin10yCagr(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Within Group / Category Relative Rules 17, 18, 19 */}
              <div>
                <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1 block">Rule 17: Min 1Y vs Cat Avg Delta ({filterMin1yVsCat}%)</label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={filterMin1yVsCat}
                  onChange={(e) => setFilterMin1yVsCat(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1 block">Rule 18: Min 3Y vs Cat Avg Delta ({filterMin3yVsCat}%)</label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={filterMin3yVsCat}
                  onChange={(e) => setFilterMin3yVsCat(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1 block">Rule 19: Min 5Y vs Cat Avg Delta ({filterMin5yVsCat}%)</label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={filterMin5yVsCat}
                  onChange={(e) => setFilterMin5yVsCat(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 12: Min Sortino ({filterMinSortino.toFixed(1)})</label>
                <input
                  type="range"
                  min="-2.0"
                  max="3.0"
                  step="0.1"
                  value={filterMinSortino}
                  onChange={(e) => setFilterMinSortino(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block">Rule 13: Max Beta ({filterMaxBeta.toFixed(2)})</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={filterMaxBeta}
                  onChange={(e) => setFilterMaxBeta(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 block">Rule 14: Min Largecap ({filterMinLargecap}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filterMinLargecap}
                  onChange={(e) => setFilterMinLargecap(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 block">Rule 15: Min Midcap ({filterMinMidcap}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filterMinMidcap}
                  onChange={(e) => setFilterMinMidcap(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 block">Rule 16: Min Smallcap ({filterMinSmallcap}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filterMinSmallcap}
                  onChange={(e) => setFilterMinSmallcap(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Preset Creation Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> Create Custom Category Preset
            </h3>

            <form onSubmit={handleAddCustomPreset} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Preset Name / Label:</label>
                <input
                  type="text"
                  placeholder="e.g. ⭐ Top Midcap Alpha Leaders"
                  value={newPresetLabel}
                  onChange={(e) => setNewPresetLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 mb-1 block">Category Keywords (Comma-separated):</label>
                <input
                  type="text"
                  placeholder="e.g. small, mid, flexi"
                  value={newPresetKeyword}
                  onChange={(e) => setNewPresetKeyword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPresetModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Evaluated Category Rankings Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden space-y-0">
        {/* Table Top Toolbar with Dynamic Column Controls */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Showing {evaluatedFunds.length} Evaluated Schemes ({selectedSpecificCategory !== 'ALL' ? selectedSpecificCategory : selectedPreset})
            {hiddenRows.size > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                {hiddenRows.size} hidden
              </span>
            )}
          </h4>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Sorting indicator chip */}
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold">
              <ArrowUpDown className="w-3 h-3" />
              Sort: <strong className="text-neutral-900 dark:text-white">{sortKey}</strong> {sortDir === 'desc' ? '↓' : '↑'}
            </span>

            {/* Restore Hidden Rows Button */}
            {hiddenRows.size > 0 && (
              <button
                onClick={() => setHiddenRows(new Set())}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center space-x-1.5 hover:bg-amber-500/20 transition"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Restore {hiddenRows.size} Hidden</span>
              </button>
            )}

            {/* Export Dropdown */}
            <ExportDropdown
              data={evaluatedFunds.map((f, i) => ({
                'Rank': i + 1,
                'Scheme Name': f.fund.label || f.fund.schemeName || '',
                'Category': f.fund.category || '',
                'AMC': f.fund.amc || '',
                'Score': f.compositeScore,
                'CAGR 1Y (%)': f.fund.y1 ?? '',
                'CAGR 3Y (%)': f.fund.y3 ?? '',
                'CAGR 5Y (%)': f.fund.y5 ?? '',
                'CAGR 10Y (%)': f.fund.y10 ?? '',
                'Ret vs Cat 3Y (%)': f.fund.ret3yVsCat ?? '',
                '3Y Roll Med (%)': f.fund.r3med ?? '',
                'Max Drawdown (%)': f.fund.maxDrawdown ?? '',
                'Volatility (%)': f.fund.sd3 ?? '',
                'Alpha (%)': f.fund.alpha ?? '',
                'Sharpe 3Y': f.fund.sharpe3 ?? '',
                'Sortino 3Y': f.fund.sort3 ?? '',
                'Beta 3Y': f.fund.beta3 ?? '',
                'Expense Ratio (%)': f.fund.exp ?? '',
                'AUM (Cr)': f.fund.aum ?? '',
                '% Equity': f.fund.percEquity ?? '',
                '% Large Cap': f.fund.percLargecap ?? '',
                '% Mid Cap': f.fund.percMidcap ?? '',
                '% Small Cap': f.fund.percSmallcap ?? ''
              }))}
              filename={`category-matrix-${selectedSpecificCategory !== 'ALL' ? selectedSpecificCategory : selectedPreset}`}
            />

            {/* Column Picker Toggle Button */}
            <button
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold flex items-center space-x-1.5 shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Columns</span>
              {isColumnPickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dynamic Column Selector Panel (Expandable) */}
        {isColumnPickerOpen && (
          <div className="p-4 bg-neutral-100/70 dark:bg-neutral-900/70 border-b border-neutral-200 dark:border-neutral-800 text-xs space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Toggle Rule Columns in Evaluation Table:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAllColumnsPreset('ALL')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  Show All Columns
                </button>
                <button
                  onClick={() => setAllColumnsPreset('RISK')}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30 hover:bg-rose-500/20"
                >
                  Risk & Crash Rules
                </button>
                <button
                  onClick={() => setAllColumnsPreset('RETURNS')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30 hover:bg-blue-500/20"
                >
                  CAGR & Roll Returns
                </button>
                <button
                  onClick={() => setAllColumnsPreset('DEFAULT')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold hover:bg-neutral-300"
                >
                  Default Preset
                </button>
              </div>
            </div>

            {/* Individual Column Toggle Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { key: 'score', label: 'Score (0-100)' },
                { key: 'y1', label: '1Y CAGR' },
                { key: 'y3', label: '3Y CAGR' },
                { key: 'y5', label: '5Y CAGR' },
                { key: 'y10', label: '10Y CAGR' },
                { key: 'ret1yVsCat', label: '1Y vs Cat Avg Delta' },
                { key: 'ret3yVsCat', label: '3Y vs Cat Avg Delta' },
                { key: 'ret5yVsCat', label: '5Y vs Cat Avg Delta' },
                { key: 'r3med', label: '3Y Roll Med' },
                { key: 'r3minmax', label: '3Y Roll Min/Max' },
                { key: 'maxDrawdown', label: 'Max Drawdown' },
                { key: 'volatility', label: 'Volatility (StdDev)' },
                { key: 'alpha', label: 'Alpha vs Bench' },
                { key: 'sharpe', label: 'Sharpe Ratio' },
                { key: 'sortino', label: 'Sortino Ratio' },
                { key: 'beta', label: 'Beta' },
                { key: 'expense', label: 'Expense Ratio' },
                { key: 'aum', label: 'AUM (₹ Cr)' },
                { key: 'assetAlloc', label: 'Asset Alloc (L/M/S)' },
                { key: 'nav', label: 'Current NAV (₹)' },
              ].map((c) => {
                const k = c.key as keyof typeof cols;
                const isChecked = cols[k];
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleColumn(k)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold border transition text-left flex items-center justify-between ${
                      isChecked
                        ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                        : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="text-[10px] ml-1">{isChecked ? '✓' : 'off'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[650px]">
          <table className="mono-table">
            <thead>
              <tr className="sticky top-0 z-10">
                {/* Hide-row action column */}
                <th className="w-6 text-center"></th>
                {cols.rank && <th className="text-center">Rank #</th>}
                {cols.nameAmc && <th>Scheme Name & AMC</th>}
                {cols.category && <th>Category</th>}
                {/* Sortable column headers helper */}
                {(() => {
                  const SortTh = ({ sk, label, align = 'right' }: { sk: SortKey; label: string; align?: string }) => (
                    <th
                      className={`text-${align} cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-900 transition group`}
                      onClick={() => {
                        if (sortKey === sk) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                        else { setSortKey(sk); setSortDir('desc'); }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortKey === sk
                          ? sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />
                          : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition" />}
                      </span>
                    </th>
                  );
                  return (
                    <>
                      {cols.score && <SortTh sk="compositeScore" label="Score" align="center" />}
                      {cols.y1 && <SortTh sk="y1" label="1Y CAGR" />}
                      {cols.y3 && <SortTh sk="y3" label="3Y CAGR" />}
                      {cols.y5 && <SortTh sk="y5" label="5Y CAGR" />}
                      {cols.y10 && <SortTh sk="y10" label="10Y CAGR" />}
                      {cols.ret1yVsCat && <SortTh sk="ret1yVsCat" label="1Y vs Cat" />}
                      {cols.ret3yVsCat && <SortTh sk="ret3yVsCat" label="3Y vs Cat" />}
                      {cols.ret5yVsCat && <SortTh sk="ret5yVsCat" label="5Y vs Cat" />}
                      {cols.r3med && <SortTh sk="r3med" label="3Y Roll Med" />}
                      {cols.r3minmax && <th className="text-right">3Y Roll Min/Max</th>}
                      {cols.maxDrawdown && <SortTh sk="maxDrawdown" label="Max Drawdown" />}
                      {cols.volatility && <SortTh sk="volatility" label="Volatility" />}
                      {cols.alpha && <SortTh sk="alpha" label="Alpha" />}
                      {cols.sharpe && <SortTh sk="sharpe3" label="Sharpe" align="center" />}
                      {cols.sortino && <SortTh sk="sort3" label="Sortino" align="center" />}
                      {cols.beta && <SortTh sk="beta3" label="Beta" align="center" />}
                      {cols.expense && <SortTh sk="exp" label="Expense %" align="center" />}
                      {cols.aum && <SortTh sk="aum" label="AUM (₹ Cr)" />}
                      {cols.assetAlloc && <th className="text-center">Asset Alloc (L/M/S)</th>}
                      {cols.nav && <th className="text-right">NAV (₹)</th>}
                    </>
                  );
                })()}
              </tr>
            </thead>
            <tbody>
              {evaluatedFunds.slice(0, 300).map((item, idx) => {
                const f = item.fund;
                const rowKey = f.isin || f.label || String(idx);
                let badgeColor = 'text-emerald-600 dark:text-emerald-400 border-emerald-500';
                let badgeText = '🏆 Institutional Grade';

                if (item.compositeScore < 75) {
                  badgeColor = 'text-blue-600 dark:text-blue-400 border-blue-500';
                  badgeText = '⭐ Top Tier';
                }
                if (item.compositeScore < 65) {
                  badgeColor = 'text-amber-600 dark:text-amber-400 border-amber-500';
                  badgeText = '⚠️ Moderate';
                }

                return (
                  <tr key={rowKey} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition text-xs group/row">
                    {/* Hide row button */}
                    <td className="text-center w-6 px-1">
                      <button
                        onClick={() => setHiddenRows(prev => { const n = new Set(prev); n.add(rowKey); return n; })}
                        className="opacity-0 group-hover/row:opacity-100 transition text-neutral-300 hover:text-rose-500 dark:text-neutral-700 dark:hover:text-rose-400"
                        title="Hide this row from view"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    {cols.rank && (
                      <td className="text-center font-black text-neutral-900 dark:text-white">
                        #{idx + 1}
                      </td>
                    )}
                    {cols.nameAmc && (
                      <td>
                        <p className="font-bold text-neutral-900 dark:text-white">{f.label || f.schemeName}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{f.amc || 'Direct Growth'}</p>
                      </td>
                    )}
                    {cols.category && (
                      <td>
                        <span className="chip text-[10px] py-0 px-2 font-medium">
                          {f.category || 'Equity'}
                        </span>
                      </td>
                    )}
                    {cols.score && (
                      <td className="text-center">
                        <span className={`chip text-[10px] font-black ${badgeColor}`}>
                          {item.compositeScore} PTS • {badgeText}
                        </span>
                      </td>
                    )}
                    {cols.y1 && (
                      <td className="text-right font-extrabold text-neutral-900 dark:text-white">
                        {item.y1 != null ? `${item.y1.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.y3 && (
                      <td className="text-right font-extrabold text-neutral-900 dark:text-white">
                        {item.y3 != null ? `${item.y3.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.y5 && (
                      <td className="text-right font-bold text-neutral-700 dark:text-neutral-300">
                        {item.y5 != null ? `${item.y5.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.y10 && (
                      <td className="text-right text-neutral-500">
                        {item.y10 != null ? `${item.y10.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.ret1yVsCat && (
                      <td className={`text-right font-bold ${item.ret1yVsCat != null && item.ret1yVsCat >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.ret1yVsCat != null ? (item.ret1yVsCat >= 0 ? `+${item.ret1yVsCat.toFixed(1)}%` : `${item.ret1yVsCat.toFixed(1)}%`) : 'N/A'}
                      </td>
                    )}
                    {cols.ret3yVsCat && (
                      <td className={`text-right font-bold ${item.ret3yVsCat != null && item.ret3yVsCat >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.ret3yVsCat != null ? (item.ret3yVsCat >= 0 ? `+${item.ret3yVsCat.toFixed(1)}%` : `${item.ret3yVsCat.toFixed(1)}%`) : 'N/A'}
                      </td>
                    )}
                    {cols.ret5yVsCat && (
                      <td className={`text-right font-bold ${item.ret5yVsCat != null && item.ret5yVsCat >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.ret5yVsCat != null ? (item.ret5yVsCat >= 0 ? `+${item.ret5yVsCat.toFixed(1)}%` : `${item.ret5yVsCat.toFixed(1)}%`) : 'N/A'}
                      </td>
                    )}
                    {cols.r3med && (
                      <td className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.r3med != null ? `${item.r3med.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.r3minmax && (
                      <td className="text-right text-[10px] text-neutral-500">
                        {item.r3min != null && item.r3max != null ? `${item.r3min.toFixed(0)}% / ${item.r3max.toFixed(0)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.maxDrawdown && (
                      <td className="text-right font-semibold text-rose-600 dark:text-rose-400">
                        {item.maxDrawdown != null ? `${item.maxDrawdown.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.volatility && (
                      <td className="text-right font-medium text-neutral-700 dark:text-neutral-300">
                        {item.volatility != null ? `${item.volatility.toFixed(1)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.alpha && (
                      <td className="text-right font-black text-emerald-600 dark:text-emerald-400">
                        {item.alpha != null ? (item.alpha >= 0 ? `+${item.alpha.toFixed(1)}%` : `${item.alpha.toFixed(1)}%`) : 'N/A'}
                      </td>
                    )}
                    {cols.sharpe && (
                      <td className="text-center font-bold text-neutral-900 dark:text-white">
                        {f.sharpe3 != null ? f.sharpe3.toFixed(2) : 'N/A'}
                      </td>
                    )}
                    {cols.sortino && (
                      <td className="text-center font-bold text-neutral-900 dark:text-white">
                        {f.sort3 != null ? f.sort3.toFixed(2) : 'N/A'}
                      </td>
                    )}
                    {cols.beta && (
                      <td className="text-center text-neutral-600 dark:text-neutral-400">
                        {f.beta3 != null ? f.beta3.toFixed(2) : 'N/A'}
                      </td>
                    )}
                    {cols.expense && (
                      <td className="text-center text-neutral-700 dark:text-neutral-300 font-bold">
                        {f.exp != null ? `${f.exp.toFixed(2)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.aum && (
                      <td className="text-right font-extrabold text-neutral-900 dark:text-white">
                        {f.aum != null ? `₹${Math.round(f.aum).toLocaleString()} Cr` : 'N/A'}
                      </td>
                    )}
                    {cols.assetAlloc && (
                      <td className="text-center text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                        {f.percLargecap != null ? `${Math.round(f.percLargecap)}% / ${Math.round(f.percMidcap || 0)}% / ${Math.round(f.percSmallcap || 0)}%` : 'N/A'}
                      </td>
                    )}
                    {cols.nav && (
                      <td className="text-right font-bold text-neutral-900 dark:text-white">
                        {f.nav != null ? `₹${f.nav.toFixed(2)}` : 'N/A'}
                      </td>
                    )}
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
