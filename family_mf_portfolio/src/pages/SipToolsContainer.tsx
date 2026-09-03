import React, { useState } from 'react';
import { SipPlan } from './SipPlan';
import { Calculator } from './Calculator';
import { Calculator as CalcIcon, Coins } from 'lucide-react';

export const SipToolsContainer: React.FC = () => {
  const [subTab, setSubTab] = useState<'sip-plan' | 'calculator'>('sip-plan');

  const subTabs = [
    { id: 'sip-plan', label: 'SIP Portfolios (₹40k–₹90k/mo Tranches)', icon: Coins },
    { id: 'calculator', label: 'SIP & Lumpsum Wealth Calculator', icon: CalcIcon },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub Nav Switcher Bar */}
      <div className="p-2 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-xl flex overflow-x-auto space-x-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Sub Tab */}
      {subTab === 'sip-plan' && <SipPlan />}
      {subTab === 'calculator' && <Calculator />}
    </div>
  );
};
