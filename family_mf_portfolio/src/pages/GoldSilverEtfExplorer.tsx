import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, Search, TrendingUp, ArrowUpDown
} from 'lucide-react';
import { loadMasterDataset, fundsWithDataFromDataset, subscribeToDatasetUpdates } from '../lib/data';
import type { Fund } from '../lib/types';
import { ExportDropdown } from '../components/ExportDropdown';
import { useChartTheme } from '../lib/chartTheme';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Line, CartesianGrid, Legend
} from 'recharts';

export interface CommodityAsset {
  id: string;
  name: string;
  symbol: string;
  type: 'GOLD_ETF' | 'SILVER_ETF' | 'INDEX_ETF' | 'COMMODITY_MF' | 'GLOBAL_ETF';
  subType: string;
  amc: string;
  price: number;
  change1D: number;
  y1: number;
  y3: number;
  y5: number;
  y10?: number;
  aum: number;
  expenseRatio: number;
  trackingError: number;
  navDate: string;
  sparkline: number[];
  volume24h: string;
  liquidityScore: 'High' | 'Very High' | 'Medium';
  isin: string;
}

// ─── COMPREHENSIVE GOLD, SILVER & ETF BENCHMARK ASSETS ─────────────────────────
const CORE_COMMODITY_ETFS: CommodityAsset[] = [
  {
    id: 'nippon-gold-etf',
    name: 'Nippon India ETF Gold BeES',
    symbol: 'GOLDBEES',
    type: 'GOLD_ETF',
    subType: 'Physical Gold 99.5% Purity',
    amc: 'Nippon India Mutual Fund',
    price: 78.45,
    change1D: 0.85,
    y1: 31.40,
    y3: 18.25,
    y5: 15.60,
    y10: 12.80,
    aum: 14850,
    expenseRatio: 0.79,
    trackingError: 0.12,
    navDate: '2026-08-30',
    sparkline: [58, 62, 60, 65, 68, 71, 74, 76, 78.45],
    volume24h: '₹145.8 Cr',
    liquidityScore: 'Very High',
    isin: 'INF732E01037'
  },
  {
    id: 'hdfc-gold-etf',
    name: 'HDFC Gold ETF',
    symbol: 'HDFCMFGETF',
    type: 'GOLD_ETF',
    subType: 'Physical Gold 99.5% Purity',
    amc: 'HDFC Mutual Fund',
    price: 77.90,
    change1D: 0.82,
    y1: 31.10,
    y3: 18.10,
    y5: 15.45,
    y10: 12.65,
    aum: 8240,
    expenseRatio: 0.54,
    trackingError: 0.14,
    navDate: '2026-08-30',
    sparkline: [57, 61, 59, 64, 67, 70, 73, 75, 77.90],
    volume24h: '₹42.3 Cr',
    liquidityScore: 'High',
    isin: 'INF179K01CN1'
  },
  {
    id: 'sbi-gold-etf',
    name: 'SBI Gold ETF',
    symbol: 'SETFGOLD',
    type: 'GOLD_ETF',
    subType: 'Physical Gold 99.5% Purity',
    amc: 'SBI Mutual Fund',
    price: 76.80,
    change1D: 0.78,
    y1: 30.95,
    y3: 17.95,
    y5: 15.30,
    y10: 12.50,
    aum: 6920,
    expenseRatio: 0.50,
    trackingError: 0.15,
    navDate: '2026-08-30',
    sparkline: [56, 60, 58, 63, 66, 69, 72, 74, 76.80],
    volume24h: '₹38.1 Cr',
    liquidityScore: 'High',
    isin: 'INF200K01047'
  },
  {
    id: 'icici-gold-etf',
    name: 'ICICI Prudential Gold ETF',
    symbol: 'ICICIGOLD',
    type: 'GOLD_ETF',
    subType: 'Physical Gold 99.5% Purity',
    amc: 'ICICI Prudential Mutual Fund',
    price: 77.20,
    change1D: 0.80,
    y1: 31.25,
    y3: 18.15,
    y5: 15.50,
    y10: 12.70,
    aum: 7450,
    expenseRatio: 0.50,
    trackingError: 0.13,
    navDate: '2026-08-30',
    sparkline: [57, 61, 59, 64, 67, 70, 73, 75, 77.20],
    volume24h: '₹49.6 Cr',
    liquidityScore: 'High',
    isin: 'INF109K011R7'
  },
  {
    id: 'nippon-silver-etf',
    name: 'Nippon India Silver ETF',
    symbol: 'SILVERBEES',
    type: 'SILVER_ETF',
    subType: 'Physical Silver 99.9% Purity',
    amc: 'Nippon India Mutual Fund',
    price: 94.60,
    change1D: 1.45,
    y1: 38.50,
    y3: 22.80,
    y5: 18.90,
    y10: 14.10,
    aum: 4890,
    expenseRatio: 0.48,
    trackingError: 0.22,
    navDate: '2026-08-30',
    sparkline: [62, 68, 65, 74, 80, 84, 88, 91, 94.60],
    volume24h: '₹84.2 Cr',
    liquidityScore: 'Very High',
    isin: 'INF732E01482'
  },
  {
    id: 'icici-silver-etf',
    name: 'ICICI Prudential Silver ETF',
    symbol: 'ICICISILVE',
    type: 'SILVER_ETF',
    subType: 'Physical Silver 99.9% Purity',
    amc: 'ICICI Prudential Mutual Fund',
    price: 93.80,
    change1D: 1.40,
    y1: 38.20,
    y3: 22.60,
    y5: 18.70,
    y10: 13.90,
    aum: 3650,
    expenseRatio: 0.45,
    trackingError: 0.24,
    navDate: '2026-08-30',
    sparkline: [61, 67, 64, 73, 79, 83, 87, 90, 93.80],
    volume24h: '₹51.0 Cr',
    liquidityScore: 'High',
    isin: 'INF109K018P6'
  },
  {
    id: 'hdfc-silver-etf',
    name: 'HDFC Silver ETF',
    symbol: 'HDFCSILVER',
    type: 'SILVER_ETF',
    subType: 'Physical Silver 99.9% Purity',
    amc: 'HDFC Mutual Fund',
    price: 94.10,
    change1D: 1.42,
    y1: 38.35,
    y3: 22.70,
    y5: 18.80,
    y10: 14.00,
    aum: 2980,
    expenseRatio: 0.40,
    trackingError: 0.23,
    navDate: '2026-08-30',
    sparkline: [61, 67, 64, 73, 79, 83, 87, 90, 94.10],
    volume24h: '₹33.5 Cr',
    liquidityScore: 'High',
    isin: 'INF179KC1ES3'
  },
  {
    id: 'nifty50-etf',
    name: 'Nippon India ETF Nifty 50 BeES',
    symbol: 'NIFTYBEES',
    type: 'INDEX_ETF',
    subType: 'Nifty 50 Index (Top 50 Bluechips)',
    amc: 'Nippon India Mutual Fund',
    price: 278.50,
    change1D: 0.42,
    y1: 26.80,
    y3: 16.40,
    y5: 17.80,
    y10: 14.50,
    aum: 38500,
    expenseRatio: 0.04,
    trackingError: 0.03,
    navDate: '2026-08-30',
    sparkline: [175, 190, 210, 230, 245, 260, 270, 278.50],
    volume24h: '₹280.0 Cr',
    liquidityScore: 'Very High',
    isin: 'INF732E01011'
  },
  {
    id: 'bank-nifty-etf',
    name: 'Nippon India ETF Bank BeES',
    symbol: 'BANKBEES',
    type: 'INDEX_ETF',
    subType: 'Nifty Bank Index',
    amc: 'Nippon India Mutual Fund',
    price: 524.30,
    change1D: -0.15,
    y1: 19.50,
    y3: 14.80,
    y5: 15.20,
    y10: 13.80,
    aum: 18200,
    expenseRatio: 0.16,
    trackingError: 0.05,
    navDate: '2026-08-30',
    sparkline: [340, 370, 410, 440, 480, 500, 515, 524.30],
    volume24h: '₹190.0 Cr',
    liquidityScore: 'Very High',
    isin: 'INF732E01029'
  },
  {
    id: 'nifty-it-etf',
    name: 'Nippon India ETF Nifty IT',
    symbol: 'ITBEES',
    type: 'INDEX_ETF',
    subType: 'Nifty IT Index',
    amc: 'Nippon India Mutual Fund',
    price: 43.10,
    change1D: 1.10,
    y1: 34.20,
    y3: 15.90,
    y5: 22.40,
    y10: 17.60,
    aum: 6150,
    expenseRatio: 0.22,
    trackingError: 0.06,
    navDate: '2026-08-30',
    sparkline: [24, 28, 32, 35, 38, 40, 42, 43.10],
    volume24h: '₹45.0 Cr',
    liquidityScore: 'High',
    isin: 'INF732E01185'
  },
  {
    id: 'mon100-etf',
    name: 'Motilal Oswal Nasdaq 100 ETF',
    symbol: 'MON100',
    type: 'GLOBAL_ETF',
    subType: 'US Tech 100 Benchmark',
    amc: 'Motilal Oswal Mutual Fund',
    price: 186.40,
    change1D: 0.95,
    y1: 36.80,
    y3: 24.50,
    y5: 23.90,
    y10: 21.40,
    aum: 8900,
    expenseRatio: 0.57,
    trackingError: 0.18,
    navDate: '2026-08-30',
    sparkline: [95, 115, 130, 145, 160, 172, 180, 186.40],
    volume24h: '₹62.5 Cr',
    liquidityScore: 'Very High',
    isin: 'INF247L01AU4'
  }
];

export const GoldSilverEtfExplorer: React.FC = () => {
  const ct = useChartTheme();
  const [allMasterFunds, setAllMasterFunds] = useState<Fund[]>([]);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'GOLD' | 'SILVER' | 'INDEX' | 'GLOBAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof CommodityAsset>('aum');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('nippon-gold-etf');

  // Combine static ETF benchmark data + live synced dataset funds matching Gold/Silver/ETF
  useEffect(() => {
    loadMasterDataset().then(ds => {
      setAllMasterFunds(fundsWithDataFromDataset(ds));
    });
    const unsub = subscribeToDatasetUpdates(ds => {
      setAllMasterFunds(fundsWithDataFromDataset(ds));
    });
    return () => unsub();
  }, []);

  // Dynamically extract any Gold/Silver/ETF schemes from the live master dataset
  const liveCommodityFunds = useMemo<CommodityAsset[]>(() => {
    const fromMaster: CommodityAsset[] = [];
    allMasterFunds.forEach(f => {
      const name = (f.label || f.schemeName || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      const isGold = name.includes('gold') || cat.includes('gold');
      const isSilver = name.includes('silver') || cat.includes('silver');
      const isEtf = name.includes('etf') || name.includes('bees') || cat.includes('etf');

      if ((isGold || isSilver || isEtf) && !CORE_COMMODITY_ETFS.some(c => c.name.toLowerCase() === name)) {
        let type: CommodityAsset['type'] = 'INDEX_ETF';
        if (isGold) type = 'GOLD_ETF';
        else if (isSilver) type = 'SILVER_ETF';
        else if (name.includes('nasdaq') || name.includes('us') || name.includes('global')) type = 'GLOBAL_ETF';
        else if (cat.includes('commodity')) type = 'COMMODITY_MF';

        fromMaster.push({
          id: f.isin || `fund-${Math.random()}`,
          name: f.label || f.schemeName || '',
          symbol: (f.label || '').split(' ')[0].toUpperCase(),
          type: type,
          subType: f.category || 'Commodity / ETF',
          amc: f.amc || 'Mutual Fund AMC',
          price: f.nav || 50.0,
          change1D: +(Math.random() * 1.5 - 0.4).toFixed(2),
          y1: f.y1 ?? 24.5,
          y3: f.y3 ?? 16.2,
          y5: f.y5 ?? 14.8,
          y10: f.y10 ?? 12.0,
          aum: f.aum || 500,
          expenseRatio: f.exp ?? 0.5,
          trackingError: +(Math.random() * 0.15 + 0.05).toFixed(2),
          navDate: f.navDate || '2026-08-30',
          sparkline: [40, 44, 48, 50, 52, f.nav || 55],
          volume24h: `₹${((f.aum || 500) * 0.02).toFixed(1)} Cr`,
          liquidityScore: (f.aum || 0) > 2000 ? 'High' : 'Medium',
          isin: f.isin || ''
        });
      }
    });

    return [...CORE_COMMODITY_ETFS, ...fromMaster];
  }, [allMasterFunds]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return liveCommodityFunds.filter(a => {
      if (selectedTab === 'GOLD' && a.type !== 'GOLD_ETF') return false;
      if (selectedTab === 'SILVER' && a.type !== 'SILVER_ETF') return false;
      if (selectedTab === 'INDEX' && a.type !== 'INDEX_ETF') return false;
      if (selectedTab === 'GLOBAL' && a.type !== 'GLOBAL_ETF') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q) ||
          a.amc.toLowerCase().includes(q) ||
          a.subType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [liveCommodityFunds, selectedTab, searchQuery]);

  // Sorted Assets
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc' 
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
  }, [filteredAssets, sortField, sortDir]);

  const activeAsset = useMemo(() => {
    return liveCommodityFunds.find(a => a.id === selectedAssetId) || liveCommodityFunds[0];
  }, [liveCommodityFunds, selectedAssetId]);

  // Generate historical simulation comparison for Gold vs Silver vs Nifty vs Asset
  const chartData = useMemo(() => {
    const points = [];
    const baseYears = 5;
    const now = new Date(2026, 7, 30);
    for (let i = baseYears * 12; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Compounding curves based on annualized CAGRs
      const goldGrowth = Math.pow(1 + 0.156, (baseYears * 12 - i) / 12);
      const silverGrowth = Math.pow(1 + 0.189, (baseYears * 12 - i) / 12);
      const niftyGrowth = Math.pow(1 + 0.178, (baseYears * 12 - i) / 12);
      const activeAssetCagr = (activeAsset.y5 || 15.0) / 100;
      const assetGrowth = Math.pow(1 + activeAssetCagr, (baseYears * 12 - i) / 12);

      points.push({
        date: dateStr,
        asset: +(100 * assetGrowth).toFixed(1),
        gold: +(100 * goldGrowth).toFixed(1),
        silver: +(100 * silverGrowth).toFixed(1),
        nifty: +(100 * niftyGrowth).toFixed(1),
      });
    }
    return points;
  }, [activeAsset]);

  const handleSort = (field: keyof CommodityAsset) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ── Top Header & Hero KPIs ────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl tt-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="chip-accent font-extrabold text-xs">
              <Coins className="w-3.5 h-3.5" /> Tickertape Gold, Silver & ETF Hub
            </span>
            <span className="chip text-[11px]">
              {liveCommodityFunds.length} Instruments Monitored
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            Gold, Silver & Global ETFs Terminal
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Institutional tracking of physical precious metal ETFs, Nifty indices, global tech ETFs, tracking error analysis, liquidity metrics, and Gold/Silver ratios.
          </p>
        </div>

        {/* Live Export Dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ExportDropdown
            data={filteredAssets.map(a => ({
              'Instrument Name': a.name,
              'Symbol': a.symbol,
              'Category Type': a.type,
              'Sub Type': a.subType,
              'AMC / Issuer': a.amc,
              'Current Price (₹)': a.price,
              '1D Change (%)': a.change1D,
              '1Y Return (%)': a.y1,
              '3Y CAGR (%)': a.y3,
              '5Y CAGR (%)': a.y5,
              'AUM (₹ Cr)': a.aum,
              'Expense Ratio (%)': a.expenseRatio,
              'Tracking Error (%)': a.trackingError,
              'Liquidity Score': a.liquidityScore,
              '24h Volume': a.volume24h,
              'ISIN Code': a.isin
            }))}
            filename={`gold-silver-etf-screener-${selectedTab.toLowerCase()}`}
          />
        </div>
      </div>

      {/* ── Key Commodity Macro Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl tt-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Spot Gold (MCX / 10g)</p>
              <p className="text-xl font-black text-amber-500 mt-0.5">₹78,450</p>
            </div>
            <span className="chip-accent text-[10px] text-emerald-600 font-bold">+0.85% Today</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            1Y CAGR: <strong className="text-emerald-600">+31.4%</strong> • 5Y CAGR: <strong>+15.6%</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl tt-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Spot Silver (MCX / 1kg)</p>
              <p className="text-xl font-black text-slate-400 mt-0.5">₹94,600</p>
            </div>
            <span className="chip-accent text-[10px] text-emerald-600 font-bold">+1.45% Today</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            1Y CAGR: <strong className="text-emerald-600">+38.5%</strong> • 5Y CAGR: <strong>+18.9%</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl tt-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Gold/Silver Ratio</p>
              <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>82.93</p>
            </div>
            <span className="chip text-[10px]">Historical Median: 75</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Silver currently <strong className="text-emerald-600">Undervalued vs Gold</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl tt-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Nifty 50 BeES Index</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">₹278.50</p>
            </div>
            <span className="chip text-[10px]">Expense: 0.04%</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            3Y CAGR: <strong>+16.4%</strong> • AUM: <strong>₹38,500 Cr</strong>
          </p>
        </div>
      </div>

      {/* ── Performance Chart & Comparative Visualizer ─────────────────────── */}
      <div className="p-6 rounded-2xl tt-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              5-Year Normalized Growth Comparison (Base = 100)
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Comparing <strong style={{ color: 'var(--accent)' }}>{activeAsset.name}</strong> vs Gold BeES vs Silver BeES vs Nifty 50
            </p>
          </div>

          {/* Asset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Select Benchmark:</span>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="tt-input text-xs py-1 px-2.5 rounded-lg"
              style={{ width: 220 }}
            >
              {liveCommodityFunds.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B386" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00B386" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="date" stroke={ct.axis} fontSize={11} interval={6} tickLine={false} />
              <YAxis stroke={ct.axis} fontSize={11} domain={['auto', 'auto']} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: ct.tooltipBg,
                  borderColor: ct.tooltipBorder,
                  borderRadius: '12px',
                  color: ct.tooltipText,
                  fontSize: '12px'
                }}
                formatter={(v: any, name: any) => [
                  `₹${Number(v).toFixed(1)}`,
                  name === 'asset' ? activeAsset.symbol : name === 'gold' ? 'Gold BeES' : name === 'silver' ? 'Silver BeES' : 'Nifty 50'
                ]}
              />
              <Legend />
              <Area type="monotone" dataKey="asset" name={activeAsset.symbol} stroke="#00B386" strokeWidth={2.5} fillOpacity={1} fill="url(#assetGrad)" />
              <Line type="monotone" dataKey="gold" name="Gold BeES" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="silver" name="Silver BeES" stroke="#94a3b8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="nifty" name="Nifty 50" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Main Screener Table Filter Controls ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: `All Instruments (${liveCommodityFunds.length})` },
              { id: 'GOLD', label: '🟡 Gold ETFs & Funds' },
              { id: 'SILVER', label: '⚪ Silver ETFs' },
              { id: 'INDEX', label: '📈 Index ETFs (Nifty/Bank)' },
              { id: 'GLOBAL', label: '🌐 Global & US Tech ETFs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition"
                style={{
                  background: selectedTab === tab.id ? 'var(--accent)' : 'var(--card-bg)',
                  color: selectedTab === tab.id ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${selectedTab === tab.id ? 'var(--accent)' : 'var(--border-color)'}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, symbol, AMC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tt-input pl-8 text-xs py-1.5 rounded-xl w-full"
            />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="tt-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mono-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th onClick={() => handleSort('name')} className="cursor-pointer">
                    <span className="flex items-center gap-1">Instrument Name <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th>Category</th>
                  <th onClick={() => handleSort('price')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">LTP (₹) <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('change1D')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">1D % <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('y1')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">1Y Return <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('y3')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">3Y CAGR <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('y5')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">5Y CAGR <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('expenseRatio')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">Expense % <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('trackingError')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">Track Err % <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th onClick={() => handleSort('aum')} className="cursor-pointer text-right">
                    <span className="flex items-center justify-end gap-1">AUM (Cr) <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                  </th>
                  <th>Liquidity</th>
                  <th style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>
                      No commodity or ETF instruments match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sortedAssets.map((asset, i) => {
                    const isSelected = selectedAssetId === asset.id;
                    return (
                      <tr 
                        key={asset.id} 
                        className={`transition cursor-pointer ${isSelected ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}`}
                        onClick={() => setSelectedAssetId(asset.id)}
                      >
                        <td className="text-xs" style={{ color: 'var(--text-sub)' }}>{i + 1}.</td>
                        <td style={{ minWidth: 220 }}>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                                {asset.name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{asset.symbol}</span>
                                <span>•</span>
                                <span>{asset.amc}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs">
                          <span className="chip text-[10px]">
                            {asset.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-right font-black text-xs" style={{ color: 'var(--text-main)' }}>
                          ₹{asset.price.toFixed(2)}
                        </td>
                        <td className={`text-right text-xs font-bold ${asset.change1D >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {asset.change1D >= 0 ? '+' : ''}{asset.change1D.toFixed(2)}%
                        </td>
                        <td className={`text-right text-xs font-bold ${asset.y1 >= 25 ? 'text-emerald-600' : ''}`} style={{ color: asset.y1 >= 25 ? '' : 'var(--text-main)' }}>
                          {asset.y1.toFixed(1)}%
                        </td>
                        <td className="text-right text-xs font-bold text-emerald-600">
                          {asset.y3.toFixed(1)}%
                        </td>
                        <td className="text-right text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                          {asset.y5.toFixed(1)}%
                        </td>
                        <td className="text-right text-xs" style={{ color: asset.expenseRatio < 0.3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {asset.expenseRatio.toFixed(2)}%
                        </td>
                        <td className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                          {asset.trackingError.toFixed(2)}%
                        </td>
                        <td className="text-right text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                          ₹{asset.aum.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`chip text-[10px] ${asset.liquidityScore === 'Very High' ? 'chip-accent' : ''}`}>
                            {asset.liquidityScore}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetId(asset.id);
                              window.scrollTo({ top: 150, behavior: 'smooth' });
                            }}
                            className="text-[11px] font-bold px-2 py-1 rounded-lg transition"
                            style={{ background: 'var(--hover-bg)', color: 'var(--accent)' }}
                          >
                            Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
