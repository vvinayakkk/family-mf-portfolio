import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HoldingsTable } from './pages/HoldingsTable';
import { MasterRanking } from './pages/MasterRanking';
import { AnalyticsContainer } from './pages/AnalyticsContainer';
import { StpTaxContainer } from './pages/StpTaxContainer';
import { FundGraphExplorer } from './pages/FundGraphExplorer';
import { MFScreener } from './pages/MFScreener';
import { GoldSilverEtfExplorer } from './pages/GoldSilverEtfExplorer';
import { FundModal } from './components/FundModal';
import { TOTAL_PORTFOLIO_VALUE_LAKHS, PORTFOLIO_HOLDINGS, type MutualFundHolding } from './data/portfolioData';
import { Minimize2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('screener');
  const [selectedFund, setSelectedFund] = useState<MutualFundHolding | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mf_theme');
    return saved ? saved === 'dark' : false; // Default to light mode (Tickertape style)
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mf_theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-150 print-page"
      style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Navbar */}
      {!isFullScreen && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isFullScreen={isFullScreen}
          setIsFullScreen={setIsFullScreen}
        />
      )}

      {/* Full-screen exit button */}
      {isFullScreen && (
        <div className="fixed top-4 right-4 z-50 no-print">
          <button
            onClick={() => setIsFullScreen(false)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 transition"
            style={{ background: 'var(--text-main)', color: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            <Minimize2 className="w-4 h-4" />
            Exit Full Screen
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto transition-all ${isFullScreen ? 'p-2 sm:p-4 max-w-full' : 'max-w-screen-2xl px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8 sm:pb-12'}`}>
        {activeTab === 'screener' && <MFScreener />}

        {activeTab === 'etf-hub' && <GoldSilverEtfExplorer />}

        {activeTab === 'holdings' && (
          <HoldingsTable onSelectFund={setSelectedFund} />
        )}

        {activeTab === 'graphs' && <FundGraphExplorer />}

        {activeTab === 'master-ranking' && <MasterRanking />}

        {activeTab === 'analytics' && (
          <AnalyticsContainer
            onSelectFund={setSelectedFund}
            onNavigateToStp={() => setActiveTab('stp-tax')}
          />
        )}

        {activeTab === 'stp-tax' && <StpTaxContainer />}
      </main>

      {/* Fund Detail Modal */}
      <FundModal
        fund={selectedFund}
        onClose={() => setSelectedFund(null)}
        onSelectStp={() => { setSelectedFund(null); setActiveTab('stp-tax'); }}
      />

      {/* Footer */}
      {!isFullScreen && (
        <footer
          className="py-4 mt-8 text-center text-xs no-print"
          style={{ borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-muted)' }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Family Mutual Fund Suite · {PORTFOLIO_HOLDINGS.length} Holdings · 1,500 Master DB · ₹{(TOTAL_PORTFOLIO_VALUE_LAKHS / 100).toFixed(2)} Cr</p>
            <p style={{ color: 'var(--accent)', fontWeight: 700 }}>Live Tickertape Sync Enabled</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
