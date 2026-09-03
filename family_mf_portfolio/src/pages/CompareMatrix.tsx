import React, { useState } from 'react';
import { PORTFOLIO_HOLDINGS } from '../data/portfolioData';
import { GitCompare, Plus, X } from 'lucide-react';

export const CompareMatrix: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>(['sm-2', 'sm-3', 'mc-1', 'int-1']);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const selectedFunds = PORTFOLIO_HOLDINGS.filter(f => selectedIds.includes(f.id));

  const addFund = (id: string) => {
    if (!selectedIds.includes(id) && selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
    setPickerOpen(false);
  };

  const removeFund = (id: string) => {
    if (selectedIds.length > 2) {
      setSelectedIds(selectedIds.filter(fId => fId !== id));
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <GitCompare className="w-4 h-4" />
            <span>Side-by-Side Fund Head-to-Head</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">Fund Comparison Matrix</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Compare up to 4 funds side-by-side on Sharpe, Beta, Volatility, and CAGR returns</p>
        </div>

        {selectedIds.length < 4 && (
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fund to Compare</span>
          </button>
        )}
      </div>

      {/* Fund Picker Modal/Dropdown */}
      {pickerOpen && (
        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-xl max-h-60 overflow-y-auto space-y-2">
          <p className="text-xs font-bold text-neutral-900 dark:text-white">Select a Mutual Fund to compare:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {PORTFOLIO_HOLDINGS.filter(f => !selectedIds.includes(f.id)).map((fund) => (
              <div
                key={fund.id}
                onClick={() => addFund(fund.id)}
                className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 cursor-pointer flex justify-between text-neutral-900 dark:text-white font-medium"
              >
                <span className="truncate">{fund.name}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{fund.returnPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 4-Fund Comparison Table */}
      <div className="rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="mono-table">
            <thead>
              <tr>
                <th className="w-44">Metric</th>
                {selectedFunds.map((fund) => (
                  <th key={fund.id} className="text-center min-w-[200px] relative p-4">
                    {selectedIds.length > 2 && (
                      <button
                        onClick={() => removeFund(fund.id)}
                        className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <p className="font-black text-neutral-900 dark:text-white text-xs truncate max-w-[180px] mx-auto">{fund.name}</p>
                    <p className="text-[10px] text-neutral-500 font-normal mt-0.5">{fund.category}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Current Holding</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-bold text-neutral-900 dark:text-white">₹{f.amountLakhs.toFixed(2)}L</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Return (XIRR)</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-bold text-emerald-600 dark:text-emerald-400">+{f.returnPct}%</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">1Y CAGR</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-semibold text-neutral-900 dark:text-white">{f.cagr1y}%</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">3Y CAGR</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-bold text-emerald-600 dark:text-emerald-400">{f.cagr3y}%</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">5Y CAGR</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-semibold text-neutral-900 dark:text-white">{f.cagr5y}%</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Sharpe Ratio</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-bold text-neutral-900 dark:text-white">{f.sharpeRatio}</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Sortino Ratio</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-bold text-emerald-600 dark:text-emerald-400">{f.sortinoRatio}</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Beta (Volatility)</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center text-neutral-700 dark:text-neutral-300">{f.beta}</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Max Drawdown</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center font-semibold text-rose-600 dark:text-rose-400">{f.maxDrawdown}%</td>
                ))}
              </tr>
              <tr>
                <td className="font-bold text-neutral-900 dark:text-white">Expense Ratio</td>
                {selectedFunds.map(f => (
                  <td key={f.id} className="text-center text-neutral-700 dark:text-neutral-300">{f.expenseRatio}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
