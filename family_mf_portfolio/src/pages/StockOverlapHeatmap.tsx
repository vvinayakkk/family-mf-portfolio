import React from 'react';
import type { MutualFundHolding } from '../data/portfolioData';
import { PORTFOLIO_HOLDINGS, TOTAL_PORTFOLIO_VALUE_LAKHS } from '../data/portfolioData';
import { Layers } from 'lucide-react';

interface StockOverlapHeatmapProps {
  onSelectFund: (fund: MutualFundHolding) => void;
}

export const StockOverlapHeatmap: React.FC<StockOverlapHeatmapProps> = ({ onSelectFund }) => {
  // Aggregate stock holdings across all 91 funds
  const stockMap: Record<string, { totalAmountLakhs: number; fundCount: number; funds: MutualFundHolding[] }> = {};

  PORTFOLIO_HOLDINGS.forEach((fund) => {
    // Top 5 holdings each get ~6% of fund capital for estimate
    const estStockWeight = fund.amountLakhs * 0.06;

    fund.topHoldings.forEach((stock) => {
      if (!stockMap[stock]) {
        stockMap[stock] = { totalAmountLakhs: 0, fundCount: 0, funds: [] };
      }
      stockMap[stock].totalAmountLakhs += estStockWeight;
      stockMap[stock].fundCount += 1;
      stockMap[stock].funds.push(fund);
    });
  });

  const sortedStocks = Object.entries(stockMap)
    .map(([stockName, data]) => ({
      stockName,
      totalAmountLakhs: parseFloat(data.totalAmountLakhs.toFixed(2)),
      pctOfWealth: parseFloat(((data.totalAmountLakhs / TOTAL_PORTFOLIO_VALUE_LAKHS) * 100).toFixed(2)),
      fundCount: data.fundCount,
      funds: data.funds
    }))
    .sort((a, b) => b.totalAmountLakhs - a.totalAmountLakhs);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          <span>Underlying Equity Stock Look-Through Matrix</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Portfolio-Wide Stock Overlap Heatmap</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl">
          Look through all 91 mutual fund schemes to see total capital exposure held in individual stocks across your family wealth.
        </p>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedStocks.map((stock) => (
          <div 
            key={stock.stockName} 
            className="p-5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 shadow-md space-y-3 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-neutral-900 dark:text-white text-base">{stock.stockName}</h3>
                <span className="text-xs text-neutral-500">Held in {stock.fundCount} Funds</span>
              </div>
              <span className="chip font-bold">
                {stock.pctOfWealth}% Wealth
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-[11px] text-neutral-500">Estimated Capital Exposure</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{stock.totalAmountLakhs} Lakhs</p>
            </div>

            {/* List of top holdings schemes */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Top Schemes Holding Stock:</p>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {stock.funds.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onSelectFund(f)}
                    className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex justify-between text-[11px]"
                  >
                    <span className="truncate text-neutral-900 dark:text-white font-medium max-w-[170px]">{f.name}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">₹{f.amountLakhs}L</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
