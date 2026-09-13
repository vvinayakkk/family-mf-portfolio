import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Plus, X,
  SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  BarChart2, Shield, Zap, TrendingUp,
  Target, Award, Droplets, Lock, Coins, Table
} from 'lucide-react';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { fundsToExportRows } from '../lib/exportUtils';
import { ExportDropdown } from '../components/ExportDropdown';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { CategoryRankings } from './CategoryRankings';

// ─── PRE-BUILT SCREENS ────────────────────────────────────────────────────────
interface Screen {
  id: string;
  title: string;
  description: string;
  tags: string[];
  users: string;
  isPro?: boolean;
  icon: React.ElementType;
  filters: Partial<FilterState>;
}

const POPULAR_SCREENS: Screen[] = [
  {
    id: 'tax-savers',
    title: 'Top Tax Savers',
    description: 'Funds that help you save tax under 80C and build wealth at the same time.',
    tags: ['ELSS', 'Alpha > 0', '3Y CAGR ≥ 10%'],
    users: '362k+',
    isPro: false,
    icon: Shield,
    filters: {
      categories: ['ELSS'],
      minCagr3y: 10,
      minAlpha: 0,
    },
  },
  {
    id: 'long-term-compounders',
    title: 'Long Term Compounders',
    description: 'Funds with a long history of outperformance and a large cap bias.',
    tags: ['CAGR 5Y ≥ 12%', 'CAGR 10Y ≥ 10%', 'Large Cap ≥ 50%'],
    users: '566k+',
    isPro: false,
    icon: TrendingUp,
    filters: {
      minCagr5y: 12,
      minCagr10y: 10,
      minPercLarge: 50,
    },
  },
  {
    id: 'bolder-bets',
    title: 'Bolder Bets',
    description: 'Funds with bold multicap strategies giving better returns than their peers.',
    tags: ['Flexi / Multi / Large & Mid', '3Y Rolling Med ≥ 14%'],
    users: '91k+',
    isPro: true,
    icon: Zap,
    filters: {
      categories: ['Flexi Cap Fund', 'Multi Cap Fund', 'Large & Mid Cap Fund'],
      minR3med: 14,
      minRetVsCat3y: 1.5,
    },
  },
  {
    id: 'efficient-equity',
    title: 'Efficient Equity Picks',
    description: 'Low expense, high risk-adjusted return funds that consistently deliver alpha.',
    tags: ['Sharpe ≥ 1.2', 'Expense ≤ 1.0%', 'CAGR 3Y ≥ 11%'],
    users: '203k+',
    isPro: false,
    icon: Target,
    filters: {
      minSharpe: 1.2,
      maxExpense: 1.0,
      minCagr3y: 11,
    },
  },
  {
    id: 'value-picks',
    title: 'Value Picks',
    description: 'Funds available at better valuations vs category average with strong quality.',
    tags: ['P/E Disc < -5%', 'Sortino ≥ 1.0'],
    users: '147k+',
    isPro: true,
    icon: Coins,
    filters: {
      maxPeDisc: -5,
      minSortino: 1.0,
      minCagr3y: 10,
    },
  },
  {
    id: 'consistent-outperformers',
    title: 'Consistent Outperformers',
    description: 'Long-term outperformers with low volatility across all market cycles.',
    tags: ['3Y Roll Min ≥ 7%', 'Spread ≤ 20pp', 'CAGR 3Y ≥ 12%'],
    users: '289k+',
    isPro: false,
    icon: Award,
    filters: {
      minR3min: 7,
      maxRollSpread: 20,
      minCagr3y: 12,
    },
  },
  {
    id: 'liquid-overnight',
    title: 'Liquid & Overnight Funds',
    description: 'High liquidity, minimal credit risk — perfect for emergency corpus.',
    tags: ['Liquid / Overnight', 'Expense ≤ 0.25%'],
    users: '412k+',
    isPro: false,
    icon: Droplets,
    filters: {
      categories: ['Liquid Fund', 'Overnight Fund'],
      maxExpense: 0.25,
    },
  },
  {
    id: 'high-quality-debt',
    title: 'High Quality Debt Portfolio',
    description: 'High credit quality debt with medium duration — ideal for 3–5 year horizon.',
    tags: ['Debt Category', 'Expense ≤ 0.6%'],
    users: '178k+',
    isPro: false,
    icon: Lock,
    filters: {
      categories: ['Corporate Bond Fund', 'Banking and PSU Fund', 'Short Duration Fund'],
      maxExpense: 0.6,
    },
  },
];

// ─── FILTER STATE ─────────────────────────────────────────────────────────────
interface FilterState {
  search: string;
  universe: 'all' | 'holdings';
  categories: string[];
  subcategories: string[];
  plan: string;
  minAum: number;
  maxAum: number;
  minCagr1y: number;
  maxCagr1y: number;
  minCagr3y: number;
  maxCagr3y: number;
  minCagr5y: number;
  maxCagr5y: number;
  minCagr10y: number;
  maxCagr10y: number;
  maxExpense: number;
  minExpense: number;
  minSharpe: number;
  minSortino: number;
  maxBeta: number;
  minBeta: number;
  minAlpha: number;
  maxVol: number;
  maxDrawdown: number;
  minR3min: number;
  minR3med: number;
  maxRollSpread: number;
  minRetVsCat3y: number;
  maxPeDisc: number;
  minPercLarge: number;
  maxPercSmall: number;
  minPercEquity: number;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  universe: 'all',
  categories: [],
  subcategories: [],
  plan: 'all',
  minAum: 0, maxAum: 200000,
  minCagr1y: -50, maxCagr1y: 100,
  minCagr3y: 0, maxCagr3y: 60,
  minCagr5y: 0, maxCagr5y: 50,
  minCagr10y: 0, maxCagr10y: 40,
  minExpense: 0, maxExpense: 2.5,
  minSharpe: 0,
  minSortino: 0,
  maxBeta: 2, minBeta: 0,
  minAlpha: -20,
  maxVol: 35,
  maxDrawdown: 0,
  minR3min: -30,
  minR3med: -30,
  maxRollSpread: 80,
  minRetVsCat3y: -20,
  maxPeDisc: 0,
  minPercLarge: 0,
  maxPercSmall: 100,
  minPercEquity: 0,
};

type SortField = keyof Fund;

// ─── CATEGORY GROUPS ──────────────────────────────────────────────────────────
const CATEGORY_GROUPS: Record<string, string[]> = {
  'Equity': [
    'Large Cap Fund', 'Mid Cap Fund', 'Small Cap Fund', 'Large & Mid Cap Fund',
    'Flexi Cap Fund', 'Multi Cap Fund', 'ELSS', 'Value Fund', 'Contra Fund',
    'Dividend Yield Fund', 'Sectoral/Thematic', 'Focused Fund',
  ],
  'Hybrid': [
    'Aggressive Hybrid Fund', 'Conservative Hybrid Fund', 'Balanced Advantage Fund',
    'Arbitrage Fund', 'Multi Asset Allocation Fund', 'Equity Savings Fund',
  ],
  'Debt': [
    'Overnight Fund', 'Liquid Fund', 'Ultra Short Duration Fund', 'Low Duration Fund',
    'Short Duration Fund', 'Medium Duration Fund', 'Corporate Bond Fund',
    'Banking and PSU Fund', 'Gilt Fund', 'Credit Risk Fund', 'Dynamic Bond Fund',
    'Money Market Fund', 'Floater Fund',
  ],
  'Index / ETF': ['Index Fund', 'ETF', 'Fund of Funds'],
  'Commodity': ['Gold Fund', 'Silver Fund'],
};

// ─── FILTER SECTION COMPONENT ─────────────────────────────────────────────────
const FilterSection: React.FC<{
  label: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}> = ({ label, defaultOpen = false, badge, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tt-filter-section">
      <button
        onClick={() => setOpen(!open)}
        className="tt-filter-section-header w-full"
      >
        <span className="flex items-center gap-2">
          {label}
          {badge && (
            <span className="chip-accent text-[10px] px-1.5 py-0">{badge}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
};

// ─── RANGE FILTER COMPONENT ───────────────────────────────────────────────────
const RangeFilter: React.FC<{
  label: string;
  min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void;
  unit?: string; side?: 'min' | 'max';
  color?: string;
}> = ({ label, min, max, step = 1, value, onChange, unit = '', side = 'min', color }) => (
  <div>
    <div className="flex justify-between items-center mb-1 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-bold" style={{ color: color ?? 'var(--accent)' }}>
        {side === 'min' ? '≥' : '≤'} {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full"
    />
    <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-sub)' }}>
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

// ─── MAIN SCREENER COMPONENT ──────────────────────────────────────────────────
export const MFScreener: React.FC = () => {
  const [allFunds, setAllFunds] = useState<Fund[]>([]);
  const [viewMode, setViewMode] = useState<'screener' | 'matrix'>('screener');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('aum');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [showScreens, setShowScreens] = useState(false); // Hidden by default
  const [expandedCatGroups, setExpandedCatGroups] = useState<Record<string, boolean>>({});
  const [addedFilters, setAddedFilters] = useState<string[]>([]);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadMasterDataset().then(ds => setAllFunds(fundsWithDataFromDataset(ds)));
    const unsub = subscribeToDatasetUpdates(ds => setAllFunds(fundsWithDataFromDataset(ds)));
    return () => unsub();
  }, []);

  // ─── Set of normalized holding names for instant lookup ────────────────────
  const holdingNamesSet = useMemo(() => {
    const set = new Set<string>();
    PORTFOLIO_HOLDINGS.forEach(h => {
      set.add(h.name.toLowerCase().trim());
      set.add(h.name.toLowerCase().replace(' - direct growth', '').trim());
    });
    return set;
  }, []);

  // ─── Apply all filters ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allFunds.filter(f => {
      // Universe filter: My 91 Holdings
      if (filters.universe === 'holdings') {
        const name = (f.label ?? f.schemeName ?? '').toLowerCase().trim();
        const cleanName = name.replace(' - direct growth', '').trim();
        const isHolding = holdingNamesSet.has(name) ||
          holdingNamesSet.has(cleanName) ||
          PORTFOLIO_HOLDINGS.some(h => {
            const hn = h.name.toLowerCase().replace(' - direct growth', '').trim();
            return name.includes(hn) || hn.includes(cleanName);
          });
        if (!isHolding) return false;
      }

      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (f.label ?? f.schemeName ?? '').toLowerCase();
        if (!name.includes(q)) return false;
      }

      // Category multi-select
      if (filters.categories.length > 0) {
        const cat = (f.category ?? '').toLowerCase();
        const matchesCat = filters.categories.some(c => cat.includes(c.toLowerCase()) || c.toLowerCase().includes(cat));
        if (!matchesCat) return false;
      }

      // AUM
      if (f.aum != null) {
        if (f.aum < filters.minAum || f.aum > filters.maxAum) return false;
      }

      // CAGR filters
      if (filters.minCagr3y > 0 && (f.y3 == null || f.y3 < filters.minCagr3y)) return false;
      if (filters.minCagr5y > 0 && (f.y5 == null || f.y5 < filters.minCagr5y)) return false;
      if (filters.minCagr10y > 0 && (f.y10 == null || f.y10 < filters.minCagr10y)) return false;
      if (filters.minCagr1y > -50 && (f.y1 == null || f.y1 < filters.minCagr1y)) return false;

      // Expense
      if (filters.maxExpense < 2.5 && (f.exp == null || f.exp > filters.maxExpense)) return false;

      // Risk metrics
      if (filters.minSharpe > 0 && (f.sharpe3 == null || f.sharpe3 < filters.minSharpe)) return false;
      if (filters.minSortino > 0 && (f.sort3 == null || f.sort3 < filters.minSortino)) return false;
      if (filters.minAlpha > -20 && (f.alpha == null || f.alpha < filters.minAlpha)) return false;
      if (filters.maxVol < 35 && (f.sd3 == null || f.sd3 > filters.maxVol)) return false;
      if (filters.maxDrawdown < 0 && (f.maxDrawdown == null || f.maxDrawdown < filters.maxDrawdown)) return false;

      // Rolling returns
      if (filters.minR3min > -30 && (f.r3min == null || f.r3min < filters.minR3min)) return false;
      if (filters.minR3med > -30 && (f.r3med == null || f.r3med < filters.minR3med)) return false;
      if (filters.maxRollSpread < 80) {
        const spread = (f.r3max ?? 0) - (f.r3min ?? 0);
        if (spread > filters.maxRollSpread) return false;
      }

      // Return vs category
      if (filters.minRetVsCat3y > -20 && (f.ret3yVsCat == null || f.ret3yVsCat < filters.minRetVsCat3y)) return false;

      // PE discount
      if (filters.maxPeDisc < 0 && f.pe_disc != null && f.pe_disc > filters.maxPeDisc) return false;

      // Portfolio composition
      if (filters.minPercLarge > 0 && (f.percLargecap == null || f.percLargecap < filters.minPercLarge)) return false;
      if (filters.minPercEquity > 0 && (f.percEquity == null || f.percEquity < filters.minPercEquity)) return false;

      return true;
    });
  }, [allFunds, filters]);

  // ─── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortField] as number | null) ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const bv = (b[sortField] as number | null) ?? (sortDir === 'desc' ? -Infinity : Infinity);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
    });
  }, [filtered, sortField, sortDir]);

  const paged = sorted.slice(0, (page + 1) * PAGE_SIZE);

  const applyScreen = useCallback((screen: Screen) => {
    setFilters({ ...DEFAULT_FILTERS, ...screen.filters });
    setActiveScreen(screen.id);
    setShowScreens(false);
    setPage(0);
  }, []);

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveScreen(null);
    setPage(0);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />;
  };

  const TH = ({ label, field, right }: { label: string; field: SortField; right?: boolean }) => (
    <th
      onClick={() => handleSort(field)}
      className={`cursor-pointer hover:opacity-80 transition ${right ? 'text-right' : ''}`}
    >
      <span className="flex items-center gap-1 justify-end">
        {right && <SortIcon field={field} />}
        {label}
        {!right && <SortIcon field={field} />}
      </span>
    </th>
  );

  // ─── Category checkbox logic ────────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setFilters(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat],
    }));
    setPage(0);
  };

  const updateFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters(f => ({ ...f, [key]: val }));
    setActiveScreen(null);
    setPage(0);
  };

  // ─── OPTIONAL ADDITIONAL FILTERS ────────────────────────────────────────────
  const optionalFilters = [
    { key: 'beta', label: 'Beta (3Y)' },
    { key: 'vol', label: 'Volatility / Std Dev' },
    { key: 'maxdd', label: 'Max Drawdown' },
    { key: 'r3min', label: '3Y Rolling Min' },
    { key: 'r3med', label: '3Y Rolling Median' },
    { key: 'spread', label: 'Rolling Spread' },
    { key: 'alpha', label: 'Alpha (%)' },
    { key: 'sortino', label: 'Sortino Ratio' },
    { key: 'retvscat', label: 'Return vs Category 3Y' },
    { key: 'percLarge', label: '% Large Cap' },
    { key: 'percEquity', label: '% Equity' },
  ];

  const activeFilterCount = filters.categories.length
    + (filters.minCagr3y > 0 ? 1 : 0)
    + (filters.minCagr5y > 0 ? 1 : 0)
    + (filters.maxExpense < 2.5 ? 1 : 0)
    + (filters.minSharpe > 0 ? 1 : 0)
    + (filters.minAlpha > -20 ? 1 : 0)
    + addedFilters.length;

  const renderFilterContent = () => (
    <>
      {/* Filter Header */}
      <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
        <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="chip-accent text-[10px] px-1.5">{activeFilterCount} applied</span>
          )}
        </span>
        {activeFilterCount > 0 && (
          <button onClick={resetAll} className="text-[11px] font-semibold" style={{ color: '#00B386' }}>
            Reset all
          </button>
        )}
      </div>

      {/* Universe Toggle */}
      <FilterSection label="MF Universe" defaultOpen>
        <div className="flex flex-col gap-1.5">
          {[{ v: 'all', l: `All Funds (${allFunds.length.toLocaleString()})` }, { v: 'holdings', l: `My Portfolio (${PORTFOLIO_HOLDINGS.length})` }].map(opt => (
            <label key={opt.v} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-main)' }}>
              <input type="radio" name="universe" value={opt.v}
                checked={filters.universe === opt.v}
                onChange={() => updateFilter('universe', opt.v as any)}
                className="accent-emerald-500"
              />
              {opt.l}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection label="Category" defaultOpen badge={filters.categories.length || undefined}>
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search by category name"
            className="tt-input text-xs py-1"
          />
        </div>
        {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
          <div key={group} className="mb-1">
            <button
              onClick={() => setExpandedCatGroups(s => ({ ...s, [group]: !s[group] }))}
              className="flex items-center justify-between w-full text-xs py-1 font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cats.every(c => filters.categories.includes(c))}
                  onChange={e => {
                    if (e.target.checked) {
                      setFilters(f => ({ ...f, categories: [...new Set([...f.categories, ...cats])] }));
                    } else {
                      setFilters(f => ({ ...f, categories: f.categories.filter(c => !cats.includes(c)) }));
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                />
                {group} ({cats.length})
              </span>
              {expandedCatGroups[group] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedCatGroups[group] && (
              <div className="ml-4 space-y-1 mt-1">
                {cats.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-main)' }}>
                    <input type="checkbox"
                      checked={filters.categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </FilterSection>

      {/* AUM */}
      <FilterSection label="AUM (Cr)">
        <RangeFilter label="Min AUM" min={0} max={200000} step={1000} value={filters.minAum}
          onChange={v => updateFilter('minAum', v)} unit=" Cr" />
        <RangeFilter label="Max AUM" min={0} max={200000} step={1000} value={filters.maxAum}
          onChange={v => updateFilter('maxAum', v)} unit=" Cr" side="max" />
      </FilterSection>

      {/* Returns */}
      <FilterSection label="Returns">
        <RangeFilter label="Min 1Y CAGR" min={-50} max={100} value={filters.minCagr1y}
          onChange={v => updateFilter('minCagr1y', v)} unit="%" />
        <RangeFilter label="Min 3Y CAGR" min={0} max={60} value={filters.minCagr3y}
          onChange={v => updateFilter('minCagr3y', v)} unit="%" />
        <RangeFilter label="Min 5Y CAGR" min={0} max={50} value={filters.minCagr5y}
          onChange={v => updateFilter('minCagr5y', v)} unit="%" />
        <RangeFilter label="Min 10Y CAGR" min={0} max={40} value={filters.minCagr10y}
          onChange={v => updateFilter('minCagr10y', v)} unit="%" />
      </FilterSection>

      {/* Expense Ratio */}
      <FilterSection label="Expense Ratio (%)">
        <RangeFilter label="Max Expense Ratio" min={0} max={2.5} step={0.05} value={filters.maxExpense}
          onChange={v => updateFilter('maxExpense', v)} unit="%" side="max" />
      </FilterSection>

      {/* Risk Metrics */}
      <FilterSection label="Risk Metrics">
        <RangeFilter label="Min Sharpe Ratio (3Y)" min={0} max={4} step={0.1} value={filters.minSharpe}
          onChange={v => updateFilter('minSharpe', v)} />
        <RangeFilter label="Min Sortino Ratio (3Y)" min={0} max={5} step={0.1} value={filters.minSortino}
          onChange={v => updateFilter('minSortino', v)} />
        <RangeFilter label="Min Alpha (%)" min={-20} max={30} value={filters.minAlpha}
          onChange={v => updateFilter('minAlpha', v)} unit="%" />
      </FilterSection>

      {/* Rolling Returns */}
      <FilterSection label="3Y Rolling Returns">
        <RangeFilter label="Min 3Y Rolling Floor" min={-30} max={50} value={filters.minR3min}
          onChange={v => updateFilter('minR3min', v)} unit="%" />
        <RangeFilter label="Min 3Y Rolling Median" min={-30} max={50} value={filters.minR3med}
          onChange={v => updateFilter('minR3med', v)} unit="%" />
        <RangeFilter label="Max Rolling Spread" min={0} max={80} value={filters.maxRollSpread}
          onChange={v => updateFilter('maxRollSpread', v)} unit="pp" side="max" />
      </FilterSection>

      {/* Extra added filters */}
      {addedFilters.includes('vol') && (
        <FilterSection label="Volatility (Std Dev)">
          <RangeFilter label="Max Volatility" min={0} max={35} value={filters.maxVol}
            onChange={v => updateFilter('maxVol', v)} unit="%" side="max" />
        </FilterSection>
      )}
      {addedFilters.includes('maxdd') && (
        <FilterSection label="Max Drawdown (%)">
          <RangeFilter label="Max Drawdown Floor" min={-80} max={0} value={filters.maxDrawdown}
            onChange={v => updateFilter('maxDrawdown', v)} unit="%" />
        </FilterSection>
      )}
      {addedFilters.includes('percLarge') && (
        <FilterSection label="% Large Cap">
          <RangeFilter label="Min Large Cap Allocation" min={0} max={100} value={filters.minPercLarge}
            onChange={v => updateFilter('minPercLarge', v)} unit="%" />
        </FilterSection>
      )}
      {addedFilters.includes('percEquity') && (
        <FilterSection label="% Equity">
          <RangeFilter label="Min Equity Allocation" min={0} max={100} value={filters.minPercEquity}
            onChange={v => updateFilter('minPercEquity', v)} unit="%" />
        </FilterSection>
      )}
      {addedFilters.includes('retvscat') && (
        <FilterSection label="Return vs Category 3Y">
          <RangeFilter label="Min Outperformance" min={-20} max={30} value={filters.minRetVsCat3y}
            onChange={v => updateFilter('minRetVsCat3y', v)} unit="%" />
        </FilterSection>
      )}

      {/* + Add Filter */}
      <div className="p-3">
        <button
          onClick={() => setShowAddFilter(s => !s)}
          className="flex items-center gap-2 w-full text-xs font-semibold py-2 px-3 rounded-lg transition"
          style={{ border: '1.5px dashed var(--border-color)', color: 'var(--accent)', background: 'var(--accent-light)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Filter
        </button>
        {showAddFilter && (
          <div className="mt-2 space-y-1">
            {optionalFilters.filter(f => !addedFilters.includes(f.key)).map(f => (
              <button
                key={f.key}
                onClick={() => { setAddedFilters(s => [...s, f.key]); setShowAddFilter(false); }}
                className="flex items-center gap-1.5 w-full text-xs px-2 py-1.5 rounded-lg text-left transition"
                style={{ color: 'var(--text-main)', background: 'var(--hover-bg)' }}
              >
                <Plus className="w-3 h-3" /> {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex flex-col animate-fadeIn" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
              Mutual Funds Screener
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Screen from {allFunds.length.toLocaleString()} funds using 30+ institutional filters
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Filter Toggle */}
            {viewMode === 'screener' && (
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  background: activeFilterCount > 0 ? 'var(--accent-light)' : 'transparent',
                  border: `1px solid ${activeFilterCount > 0 ? 'var(--accent)' : 'var(--border-color)'}`,
                  color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-main)',
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="chip-accent text-[10px] px-1.5 py-0">{activeFilterCount}</span>
                )}
              </button>
            )}

            {/* View Mode Toggle: Tickertape Screener vs Evaluated Matrix */}
            <div className="flex items-center p-0.5 rounded-lg border" style={{ borderColor: 'var(--border-color)', background: 'transparent' }}>
              <button
                onClick={() => setViewMode('screener')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition"
                style={{
                  background: viewMode === 'screener' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'screener' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Screener</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition"
                style={{
                  background: viewMode === 'matrix' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'matrix' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Category Matrix</span>
              </button>
            </div>

            {viewMode === 'screener' && (
              <button
                onClick={() => setShowScreens(s => !s)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: showScreens ? 'var(--accent)' : 'var(--text-muted)'
                }}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showScreens ? 'Hide Presets' : 'Preset Screens'}</span>
                <span className="sm:hidden">Presets</span>
              </button>
            )}

            {viewMode === 'screener' && (
              <ExportDropdown data={fundsToExportRows(sorted)} filename={`mf-screener-${activeScreen ?? 'export'}`} />
            )}
          </div>
        </div>

        {/* ── Category Matrix View ───────────────────────────────────────────── */}
        {viewMode === 'matrix' && (
          <div className="mt-4 animate-fadeIn">
            <CategoryRankings />
          </div>
        )}

        {/* ── Popular Screens Minimalist Chip Bar ────────────────────────────── */}
        {viewMode === 'screener' && showScreens && (
          <div className="mb-4 animate-fadeIn p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>PRESET SCREENS</span>
              <button onClick={() => setShowScreens(false)} className="text-[11px] hover:underline" style={{ color: 'var(--text-sub)' }}>Hide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SCREENS.map(screen => {
                const Icon = screen.icon;
                const isSelected = activeScreen === screen.id;
                return (
                  <button
                    key={screen.id}
                    onClick={() => applyScreen(screen)}
                    className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                      color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{screen.title}</span>
                    {screen.isPro && <span className="pro-badge text-[9px] py-0 px-1">Pro</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Filter Drawer ────────────────────────────────────────── */}
      {mobileFilterOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex justify-end animate-fadeIn"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div 
            className="w-[85vw] max-w-sm h-full flex flex-col shadow-2xl animate-slideInRight"
            style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
              <span className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                Filter Schemes ({activeFilterCount} applied)
              </span>
              <button 
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-lg transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {renderFilterContent()}
            </div>

            <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-sub)' }}>
              <button
                onClick={resetAll}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-lg transition"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'transparent' }}
              >
                Reset All
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-lg transition"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                View {sorted.length} Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout: Sidebar + Results ───────────────────────────────────── */}
      {viewMode === 'screener' && (
        <div className="flex flex-1 overflow-hidden px-2.5 sm:px-6 pb-6 gap-4 animate-fadeIn">
        {/* ── Left Sidebar (Desktop Only) ─────────────────────────────────── */}
        <div className="hidden lg:block w-64 flex-shrink-0 tt-sidebar rounded-xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {renderFilterContent()}
        </div>

        {/* ── Right: Results Panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Results header bar */}
          <div className="tt-card flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 text-xs gap-2" style={{ background: 'var(--card-bg)' }}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {activeFilterCount > 0 && (
                <span className="chip-accent">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied</span>
              )}
              {activeScreen && (
                <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--text-main)' }}>
                  {POPULAR_SCREENS.find(s => s.id === activeScreen)?.title}
                  <button onClick={resetAll}><X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /></button>
                </span>
              )}
              {activeFilterCount > 0 && (
                <button onClick={resetAll} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Reset all
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <span style={{ color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{Math.min(paged.length, sorted.length)}</strong> of{' '}
                <strong style={{ color: 'var(--text-main)' }}>{sorted.length}</strong> results
              </span>
              <span className="text-[10px] hidden md:inline" style={{ color: 'var(--text-sub)' }}>
                last updated at 8:00 AM IST
              </span>
              <ExportDropdown data={fundsToExportRows(sorted)} filename={`mf-screener-${activeScreen ?? 'results'}`} />
            </div>
          </div>

          {/* Results Table */}
          <div className="tt-card overflow-hidden flex-1 border" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <table className="mono-table w-full">
                <thead>
                  <tr style={{ background: 'var(--table-head-bg)' }}>
                    <th style={{ width: 40 }} className="text-center">
                      <input
                        type="checkbox"
                        checked={paged.length > 0 && paged.every(f => selectedRows.has(f.isin || f.label || ''))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSet = new Set(selectedRows);
                            paged.forEach(f => newSet.add(f.isin || f.label || ''));
                            setSelectedRows(newSet);
                          } else {
                            const newSet = new Set(selectedRows);
                            paged.forEach(f => newSet.delete(f.isin || f.label || ''));
                            setSelectedRows(newSet);
                          }
                        }}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <TH label="Name" field="label" />
                    <th>Sub Category</th>
                    <th>Plan</th>
                    <TH label="AUM (Cr)" field="aum" right />
                    <TH label="CAGR 3Y" field="y3" right />
                    <TH label="CAGR 5Y" field="y5" right />
                    <TH label="CAGR 1Y" field="y1" right />
                    <TH label="Sharpe" field="sharpe3" right />
                    <TH label="Alpha" field="alpha" right />
                    <TH label="Expense" field="exp" right />
                    <TH label="3Y Roll Avg" field="r3med" right />
                    <TH label="Max DD" field="maxDrawdown" right />
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                        No funds match the current filters. <button onClick={resetAll} style={{ color: 'var(--accent)', fontWeight: 700 }}>Reset all filters</button>
                      </td>
                    </tr>
                  )}
                  {paged.map((f, i) => {
                    const id = f.isin || f.label || `${i}`;
                    const isChecked = selectedRows.has(id);
                    const name = f.label ?? f.schemeName ?? '';
                    const cat = f.category ?? '';
                    return (
                      <tr 
                        key={f.isin ?? i} 
                        className={`transition hover:bg-[var(--hover-bg)] ${isChecked ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}`}
                      >
                        <td className="text-center py-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const newSet = new Set(selectedRows);
                              if (newSet.has(id)) newSet.delete(id);
                              else newSet.add(id);
                              setSelectedRows(newSet);
                            }}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td style={{ minWidth: 220, maxWidth: 280 }}>
                          <div className="font-semibold text-xs leading-tight" style={{ color: 'var(--text-main)' }}>
                            {name.replace(' - Direct Growth', '')}
                          </div>
                          {f.amc && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-sub)' }}>{f.amc}</div>}
                        </td>
                        <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="chip">{cat}</span>
                        </td>
                        <td className="text-xs" style={{ color: 'var(--text-muted)' }}>Growth</td>
                        <td className="text-right text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                          {f.aum != null ? f.aum.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className={`text-right text-xs font-bold ${f.y3 != null && f.y3 >= 12 ? 'text-emerald-600' : ''}`}>
                          {f.y3 != null ? f.y3.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right text-xs ${f.y5 != null && f.y5 >= 12 ? 'text-emerald-600 font-semibold' : ''}`} style={{ color: f.y5 != null && f.y5 >= 12 ? '' : 'var(--text-muted)' }}>
                          {f.y5 != null ? f.y5.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right text-xs ${f.y1 != null && f.y1 >= 15 ? 'text-emerald-600 font-semibold' : f.y1 != null && f.y1 < 0 ? 'text-rose-500' : ''}`} style={{ color: f.y1 == null || (f.y1 >= 0 && f.y1 < 15) ? 'var(--text-muted)' : '' }}>
                          {f.y1 != null ? f.y1.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right text-xs font-semibold ${f.sharpe3 != null && f.sharpe3 >= 1.2 ? 'text-emerald-600' : ''}`} style={{ color: f.sharpe3 != null && f.sharpe3 >= 1.2 ? '' : 'var(--text-muted)' }}>
                          {f.sharpe3 != null ? f.sharpe3.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right text-xs font-semibold ${f.alpha != null ? (f.alpha >= 0 ? 'text-emerald-600' : 'text-rose-500') : ''}`}>
                          {f.alpha != null ? `${f.alpha > 0 ? '+' : ''}${f.alpha.toFixed(2)}` : '—'}
                        </td>
                        <td className={`text-right text-xs ${f.exp != null && f.exp > 1.5 ? 'text-rose-500' : ''}`} style={{ color: f.exp != null && f.exp <= 1.5 ? 'var(--text-muted)' : '' }}>
                          {f.exp != null ? f.exp.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right text-xs font-semibold ${f.r3med != null && f.r3med >= 12 ? 'text-emerald-600' : ''}`} style={{ color: f.r3med != null && f.r3med >= 12 ? '' : 'var(--text-muted)' }}>
                          {f.r3med != null ? f.r3med.toFixed(1) : '—'}
                        </td>
                        <td className={`text-right text-xs ${f.maxDrawdown != null ? 'text-rose-500 font-semibold' : ''}`}>
                          {f.maxDrawdown != null ? f.maxDrawdown.toFixed(1) + '%' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Exact Tickertape Style Load More Button */}
            {paged.length < sorted.length ? (
              <div className="py-4 px-6 border-t flex flex-col items-center justify-center gap-1.5" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full max-w-[280px] py-2 px-6 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    border: '1.5px solid var(--border-color)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-main)';
                  }}
                >
                  Load More
                </button>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Showing {paged.length} of {sorted.length} schemes
                </span>
              </div>
            ) : sorted.length > 0 ? (
              <div className="p-3 text-center border-t text-[11px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                ✓ All {sorted.length} mutual fund schemes loaded
              </div>
            ) : null}
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
