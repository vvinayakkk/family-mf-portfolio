import { useState } from 'react'

export interface Term {
  short: string
  full: string
  meaning: string
  example: string
  howToInterpret: string
}

export const METRIC_TERMS: Record<string, Term> = {
  CAGR: {
    short: 'CAGR',
    full: 'Compound Annual Growth Rate',
    meaning: 'The annualized rate of return for a lump-sum investment over a fixed period (e.g. 3Y, 5Y), assuming smooth geometric compounding.',
    example: 'A ₹100,000 lump-sum investment growing to ₹172,800 over 3 years has a 3Y CAGR of 20% per year.',
    howToInterpret: 'Compare CAGR with category peers to evaluate lump-sum performance. High CAGR over 3-5 years indicates strong historical growth, but for monthly SIPs, check XIRR instead as CAGR assumes all capital entered on day 1.',
  },
  XIRR: {
    short: 'XIRR',
    full: 'Extended Internal Rate of Return',
    meaning: 'The true annualized rate of return for periodic cashflows (like monthly SIPs) taking exact installment dates and amounts into account.',
    example: 'Investing ₹10,000/month via SIP for 3 years (₹3.6L total) that grows to ₹4.8L yields a 3Y SIP XIRR of ~19.5%.',
    howToInterpret: 'Compare 3Y CAGR vs 3Y XIRR. If CAGR is significantly higher than XIRR (e.g., 25% CAGR vs 18% XIRR), it means market gains happened early in the period. XIRR is your actual real-world SIP return metric.',
  },
  'Rolling Return': {
    short: 'Rolling Returns (R1/R3/R5)',
    full: 'Rolling Period Returns (Floor, Median, Max)',
    meaning: 'Returns calculated for every overlapping window (e.g. every 3-year period starting daily or monthly) across historical data, showing consistency across different market cycles.',
    example: 'A 3Y Rolling Floor of 12% means in the worst 3-year market holding window since inception, you still made at least 12% annualized return.',
    howToInterpret: 'Look at the Rolling Floor (R3 min) to see the worst case scenario and Rolling Median (R3 med) for expected performance. High minimum floors (>10%) show high resilience and low probability of negative returns over 3+ year horizons.',
  },
  Sharpe: {
    short: 'Sharpe Ratio',
    full: 'Sharpe Risk-Adjusted Return Ratio',
    meaning: 'Measures excess return earned per unit of total risk (volatility/standard deviation). Higher numbers indicate better return generated for the risk taken.',
    example: 'Fund A with 18% CAGR and 12% StdDev has Sharpe ~1.16, while Fund B with 18% CAGR and 18% StdDev has Sharpe ~0.78 (Fund A is more risk-efficient).',
    howToInterpret: 'A Sharpe Ratio > 1.0 is excellent, while < 0.6 indicates high volatility relative to return. Prefer funds with higher Sharpe ratios inside the same category.',
  },
  StdDev: {
    short: 'StdDev (SD)',
    full: 'Standard Deviation (Volatility)',
    meaning: 'Quantifies how widely a fund\'s return fluctuates around its average return over a given timeframe.',
    example: 'An annual StdDev of 14% means fund returns typically swing within +/-14% of the mean during market cycles.',
    howToInterpret: 'Lower StdDev means a smoother journey. High StdDev (>18-20%) is typical for Smallcap/Midcap funds, requiring high investor risk tolerance.',
  },
  Expense: {
    short: 'Exp / TER',
    full: 'Total Expense Ratio (Direct Plan)',
    meaning: 'The annual percentage fee deducted daily by the AMC to manage the fund.',
    example: 'An expense ratio of 0.45% on a ₹10,000 investment deducts ₹45 per year in management fees.',
    howToInterpret: 'In Direct plans, lower TER saves compounding costs over 10+ years. For index and debt funds, seek TER < 0.3%. For active funds, a higher expense is acceptable only if composite score and Sharpe justify it.',
  },
  AUM: {
    short: 'AUM',
    full: 'Assets Under Management',
    meaning: 'Total market value of assets managed by the mutual fund scheme.',
    example: 'Parag Parikh Flexi Cap managing ₹75,000 Crore has a massive AUM scale.',
    howToInterpret: 'Very large AUM in Smallcap funds can make execution difficult, while small AUM (<₹500 Cr) in debt/hybrid funds carries liquidity risk. Large AUM in Large Cap/Flexi Cap provides stability.',
  },
  'Pain Index': {
    short: 'Pain Index',
    full: 'Drawdown Volatility & Worst 1Y Rolling Drop',
    meaning: 'Measures the depth and duration of maximum drawdowns (worst 1-year rolling performance) to estimate emotional investor pain.',
    example: 'A fund with a Pain Index hitting -25% suffered a 25% single-year dip during market corrections.',
    howToInterpret: 'Use Pain Index to test your drawdown tolerance. Keep high pain funds (Smallcap satellites) capped at 10-20% of your portfolio.',
  },
  'PE Ratio': {
    short: 'PE / PB',
    full: 'Price-to-Earnings & Price-to-Book Ratios',
    meaning: 'Valuation metrics comparing portfolio stock prices to underlying company earnings and book value relative to category averages.',
    example: 'Fund PE of 22.5 vs Category PE of 26.0 means the fund is trading at a ~13.5% discount to its peer group.',
    howToInterpret: 'A lower PE relative to category (PE Discount) signifies a value bias or cheaper holdings; a higher PE indicates a high-growth momentum tilt.',
  },
  'Staggered Tranche': {
    short: 'Staggered 3-Tranche SIP (1st / 10th / 20th)',
    full: 'Tri-Monthly Cashflow Staggering',
    meaning: 'Executing SIP installments in 3 distinct monthly windows (Days 1–10, 10–20, 20–30) instead of a single date. Tranche 1 executes on salary credit; Tranches 2 & 3 are parked in low-risk Debt/Arbitrage funds earning 6.5–7.5% interest before being redeemed back to savings for SIP execution.',
    example: 'For an ₹85,000 monthly SIP: Tranche 1 (₹30,000) executes on Day 1 directly. Remaining ₹55,000 is parked in Debt. Day 10 redemptions move ₹30,000 back to savings for Tranche 2 SIPs; Day 20 redemptions move ₹25,000 back for Tranche 3 SIPs.',
    howToInterpret: 'Staggering reduces rupee-cost averaging volatility by capturing 3 market entry points per month, while debt parking earns risk-free yield during the 10-day and 20-day waiting periods.',
  },
  'CA Multi-Fund Diversification': {
    short: '13-15 Fund Multi-Sleeve Basket',
    full: 'Institutional Multi-Fund Risk Spreading',
    meaning: 'Allocating a total monthly SIP budget across 13–15 high-conviction mutual funds in smaller ticket sizes (₹3,000–₹8,000/mo) across Large, Mid, Small, Factor Value, Healthcare, Defense, PSU, BFSI, and Multi-Asset categories.',
    example: 'Spreading ₹85,000/month across 14 top-ranked schemes prevents over-concentration in any single fund manager or stock, ensuring safe multi-vector compounding.',
    howToInterpret: 'Recommended by financial advisors for portfolio safety. Combining 13–15 distinct schemes guarantees market cap coverage, style diversification (Growth + Value), and sector rotation resilience.',
  },
  STP: {
    short: 'STP & Debt Parking Engine',
    full: 'Systematic Transfer & Debt Yield Parking',
    meaning: 'Automated mechanism where upcoming SIP tranches are parked in Liquid/Arbitrage funds earning interest until the next SIP installment date arrives.',
    example: 'Parking ₹55,000 in Arbitrage Fund for 10–20 days generates ~₹200–₹350/mo extra yield compared to zero-interest idle cash.',
    howToInterpret: 'Ensures maximum capital efficiency by monetizing every day your money waits for its SIP execution date.',
  },
  'Debt Yield': {
    short: 'Arbitrage & Liquid Yield',
    full: 'Yield on Debt & Arbitrage Parking Sleeves',
    meaning: 'The annualized return generated on idle capital parked in low-risk Liquid/Arbitrage mutual funds prior to or alongside equity SIP execution.',
    example: 'Quant Arbitrage / Liquid Fund delivering ~7.1% annualized risk-free return with equity-tax treatment for holding periods > 1 year.',
    howToInterpret: 'Use Debt & Arbitrage sleeves as cash-generators. The interest earned in debt offsets market volatility and acts as dry powder for market corrections.',
  },
}

export function TermGuide({ pageTerms }: { pageTerms?: string[] }) {
  const [open, setOpen] = useState(false)
  const keysToDisplay = pageTerms || Object.keys(METRIC_TERMS)

  return (
    <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📖 Terminology, Shortforms & Interpretation Guide
          </h3>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Shortforms, definitions, concrete examples, and self-interpretation rules for metrics on this page.
          </p>
        </div>
        <button
          type="button"
          className="btn sm ghost"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide Guide ▲' : 'Show Guide ▼'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {keysToDisplay.map((key) => {
            const t = METRIC_TERMS[key]
            if (!t) return null
            return (
              <div
                key={key}
                style={{
                  background: 'var(--good-bg)',
                  borderRadius: 10,
                  padding: 14,
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="pill">{t.short}</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--hero)' }}>{t.full}</strong>
                </div>
                <p style={{ margin: '8px 0 4px', fontSize: '0.88rem' }}>
                  <strong>Meaning:</strong> {t.meaning}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--accent)' }}>
                  <strong>Example:</strong> {t.example}
                </p>
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px dashed var(--line)',
                    fontSize: '0.85rem',
                    color: 'var(--ink)',
                  }}
                >
                  <strong>💡 How to interpret on your own:</strong> {t.howToInterpret}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
