import type { Fund } from './types'
import { fmt } from './format'

export function interpretFund(f: Fund): string[] {
  const lines: string[] = []
  if (f.score != null) {
    lines.push(
      f.score >= 75
        ? `Composite ${fmt(f.score, 1)} puts this in the top tier of the family book — multi-factor strength across CAGR, risk-adjusted return, and rolling consistency.`
        : f.score >= 45
          ? `Composite ${fmt(f.score, 1)} is mid-pack: usable if it fills a sleeve, but not an automatic core pick versus category leaders.`
          : `Composite ${fmt(f.score, 1)} is soft versus peers in this workbook — justify the hold with thesis, tax, or diversification, not recent glory.`,
    )
  }
  if (f.y3 != null && f.x3 != null) {
    const gap = f.y3 - f.x3
    lines.push(
      gap > 5
        ? `3Y CAGR ${fmt(f.y3)}% vs SIP XIRR ${fmt(f.x3)}% (gap ${fmt(gap)} pp): lump-sum path beat staggered SIPs — typical when markets rose early in the window.`
        : `3Y CAGR ${fmt(f.y3)}% and SIP XIRR ${fmt(f.x3)}% are relatively close — path dependency was milder; SIPs captured most of the trailing experience.`,
    )
  } else if (f.y3 != null) {
    lines.push(
      `Trailing 3Y CAGR ${fmt(f.y3)}% is published on Moneycontrol; SIP XIRR is incomplete for this Direct plan in the refresh — do not invent a SIP number.`,
    )
  }
  if (f.r3min != null && f.r3med != null) {
    lines.push(
      f.r3min > 12
        ? `Rolling 3Y floor ${fmt(f.r3min)}% with median ${fmt(f.r3med)}% is a high-quality consistency signature.`
        : f.r3min > 0
          ? `Rolling 3Y floor ${fmt(f.r3min)}% stayed positive (median ${fmt(f.r3med)}%) — survivable drawdowns inside the lookback.`
          : `Rolling 3Y floor ${fmt(f.r3min)}% went negative while median sits at ${fmt(f.r3med)}% — size the position for gut-check volatility.`,
    )
  }
  if (f.r1min != null) {
    lines.push(
      `Worst 1Y rolling window hit ${fmt(f.r1min)}% — that is the emotional drawdown SIPs are designed to average through.`,
    )
  }
  if (f.sharpe3 != null && f.sd3 != null) {
    lines.push(
      f.sharpe3 >= 1
        ? `Sharpe 3Y ${fmt(f.sharpe3, 2)} with StdDev ${fmt(f.sd3)}% is efficient risk-taking versus the book average.`
        : `Sharpe 3Y ${fmt(f.sharpe3, 2)} with StdDev ${fmt(f.sd3)}% — return came with meaningful volatility; pair with ballast sleeves.`,
    )
  }
  if (f.peer_rank != null && f.peer_n) {
    lines.push(
      f.peer_rank <= 3
        ? `Moneycontrol peer rank ${f.peer_rank}/${f.peer_n} on 3Y — upper quartile inside its published peer set.`
        : f.peer_rank > f.peer_n * 0.6
          ? `Moneycontrol peer rank ${f.peer_rank}/${f.peer_n} — lagging the peer table; brand loyalty alone is not a thesis.`
          : `Moneycontrol peer rank ${f.peer_rank}/${f.peer_n} — middle of the published peer pack.`,
    )
  }
  if (f.exp != null) {
    lines.push(
      `Direct expense ${fmt(f.exp, 2)}% — cost matters less than sleeve choice here, but every 10 bps compounds against you over a decade of SIPs.`,
    )
  }
  if (f.top5w != null && f.top5w > 35) {
    lines.push(
      `Top-5 holdings weight ~${fmt(f.top5w)}% — concentrated; overlaps with other funds can silently raise single-stock risk.`,
    )
  }
  if (f.y1 != null && f.y1 < 2 && f.y3 != null && f.y3 > 15) {
    lines.push(
      `Regime note: soft 1Y (${fmt(f.y1)}%) against solid 3Y (${fmt(f.y3)}%) — either a buy-the-dip sleeve or a broken momentum story; check category peers before adding.`,
    )
  }
  if (f.style) lines.push(`Portfolio style tilt: ${f.style} (from published large/mid/small mix).`)
  return lines
}

export function interpretAnalysis(id: string, universe: Record<string, number>): string {
  switch (id) {
    case 'composite':
      return 'We score every fund on 3Y CAGR (25%), Sharpe 3Y (20%), rolling 3Y median (20%), rolling 3Y floor (15%), XIRR 3Y (10%), and low expense (10%). This ranks YOUR curated Direct Growth book — not the whole industry. Top names win on several axes at once.'
    case 'cagr_xirr':
      return `CAGR is lump-sum trailing; XIRR is SIP cashflow annualized. Book avg 3Y CAGR ${fmt(universe.avg_y3)}% vs avg XIRR 3Y ${fmt(universe.avg_x3)}%. Large positive gaps mean the market path favored early capital — SIP investors should weight XIRR + rolling floor over headline CAGR.`
    case 'rolling_floor':
      return 'Advisorkhoj Direct Growth rolling uses a dynamic ~5Y start. The MIN of 3Y rolling windows is your “worst reasonable outcome” in that history. High floors = compounding machines; negative floors need smaller sizes.'
    case 'pain_index':
      return 'Pain index = depth of the worst 1Y rolling return. High pain is acceptable in small satellites if core ballast is solid — not as 40% of a monthly SIP.'
    case 'risk_efficiency':
      return 'Sharpe and CAGR/StdDev answer: return per unit of volatility. Prefer upper-quartile Sharpe inside the sleeve you want, not the single highest CAGR in the whole book.'
    case 'peer_quartile':
      return 'Moneycontrol’s peer table is a live relative ranking. A famous AMC can still sit 7/10 — use peer rank as a humility check when brand love runs hot.'
    case 'category_spread':
      return 'Spread = best 3Y − worst 3Y inside a category. Wide spreads (Smallcap/Midcap) mean fund selection dominates category selection.'
    case 'style_tilt':
      return 'Buckets by published large/mid/small weights. Small/Mid tilts outran Large recently — which is why a long SIP plan still keeps large/BAF ballast: last cycle’s winners are not a permanent law.'
    case 'concentration':
      return 'Top-5 weight and repeated stocks across funds create hidden single-name risk. Stacking three midcaps that love the same financials is not diversification.'
    case 'valuation':
      return 'PE vs category PE shows rich/cheap versus the sleeve. Cheap ≠ automatically good; rich ≠ automatically bad. Use beside rolling returns.'
    case 'expense_drag':
      return 'All funds here are Direct. Index/value cheap-beta and liquid debt should still win on cost. Paying >1% Direct for mediocre composite is optional pain.'
    case 'aum_scale':
      return 'Giant AUMs can slow smallcap agility; tiny AUMs can look great until capacity arrives. Read AUM next to score.'
    case 'sip_readiness':
      return 'SIP-readiness blends XIRR, rolling 3Y floor, Sharpe, and expense — optimized for monthly investing. Prefer high SIP-ready scores for the bulk of an ₹85k plan.'
    case 'regime':
      return 'Soft 1Y + strong 3Y flags a mean-reversion watchlist. Always compare to category average 1Y before averaging down.'
    default:
      return 'Interpretation for the current analytical lens.'
  }
}
