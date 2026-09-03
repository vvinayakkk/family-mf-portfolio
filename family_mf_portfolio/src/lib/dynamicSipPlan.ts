import { data } from '../lib/data'
import type { Fund } from '../lib/types'

export interface DynamicInstAlloc {
  name: string
  label: string
  pct: number
  tranche: 'Tranche 1 (Days 1–10)' | 'Tranche 2 (Days 10–20)' | 'Tranche 3 (Days 20–30)'
  why: string
  category: string
  x3: number | null
  y3: number | null
  r3med: number | null
  score: number | null
  in_universe: boolean
}

export interface DynamicBucketAlloc {
  bucket: string
  role: string
  pct: number
  instruments: DynamicInstAlloc[]
}

export interface DynamicSubStrategy {
  id: string
  title: string
  archetype: string
  targetXirr: string
  horizonAim: string
  trancheBreakdown: string
  thesis: string
  deepAnalysis: string
  buckets: DynamicBucketAlloc[]
}

/** Compute composite SIP ranking score for selecting top funds per sleeve across all 866 funds */
function computeSipScore(f: Fund): number {
  const x3 = f.x3 ?? f.x5 ?? f.x1 ?? f.y3 ?? f.y5 ?? f.y1 ?? 0
  const r3 = f.r3med ?? f.r5med ?? f.r1med ?? f.y3 ?? 0
  const y3 = f.y3 ?? f.y5 ?? f.y1 ?? 0
  const sh = f.sharpe3 ?? 0
  const exp = f.exp ?? 1.0
  const sc = f.score ?? 0

  return (x3 * 2.5) + (r3 * 2.0) + (y3 * 1.5) + (sh * 5.0) + (sc * 0.8) - (exp * 2.0)
}

/** Returns top N funds for a given category query, sorted by SIP score across all 866 funds */
function getTopFundsForCategory(categoryKeywords: string[], topN: number = 5, excludeIsins: Set<string> = new Set()): Fund[] {
  const matching = data.funds.filter((f: Fund) => {
    if (f.isin && excludeIsins.has(f.isin)) return false
    const cat = (f.category || '').toLowerCase()
    const lbl = (f.label || '').toLowerCase()
    const sName = (f.schemeName || '').toLowerCase()
    return categoryKeywords.some((kw) => {
      const k = kw.toLowerCase()
      return cat.includes(k) || lbl.includes(k) || sName.includes(k)
    })
  })

  matching.sort((a: Fund, b: Fund) => {
    const aHas3Y = a.x3 != null || a.y3 != null || a.r3med != null
    const bHas3Y = b.x3 != null || b.y3 != null || b.r3med != null
    if (aHas3Y !== bHas3Y) {
      return aHas3Y ? -1 : 1
    }
    return computeSipScore(b) - computeSipScore(a)
  })
  return matching.slice(0, topN)
}

/** Dynamically builds monthly SIP basket based on real-time best performing funds */
export function buildDynamicSipPlan(tier: number, planIndex: number): DynamicSubStrategy {
  const usedIsins = new Set<string>()

  // Best Funds dynamically pulled from current dataset
  const topSmallcaps = getTopFundsForCategory(['Smallcap'], 4, usedIsins)
  topSmallcaps.forEach((f) => f.isin && usedIsins.add(f.isin))

  const topMidcaps = getTopFundsForCategory(['Midcap'], 3, usedIsins)
  topMidcaps.forEach((f) => f.isin && usedIsins.add(f.isin))

  const topValues = getTopFundsForCategory(['Value'], 3, usedIsins)
  topValues.forEach((f) => f.isin && usedIsins.add(f.isin))

  const topLargeMid = getTopFundsForCategory(['Large&Mid', 'Multicap', 'Flexicap', 'Largecap'], 4, usedIsins)
  topLargeMid.forEach((f) => f.isin && usedIsins.add(f.isin))

  const topThematic = getTopFundsForCategory(['Defence', 'Thematic-Infra', 'Sectoral-Financial', 'PSU', 'Healthcare'], 4, usedIsins)
  topThematic.forEach((f) => f.isin && usedIsins.add(f.isin))

  const topMultiAsset = getTopFundsForCategory(['Hybrid-MultiAsset', 'Index'], 2, usedIsins)
  topMultiAsset.forEach((f) => f.isin && usedIsins.add(f.isin))

  // Pick specific funds per Plan Archetype dynamically
  let instList: DynamicInstAlloc[] = []
  let planTitle = ''
  let archetype = ''
  let deepAnalysis = ''

  if (planIndex === 0) {
    // Plan 1: Maximum Compounder Matrix (Balanced Factor Alpha)
    planTitle = 'Plan 1: Maximum Compounder Apex Matrix (Dynamically Ranked Best 14 Funds)'
    archetype = 'Balanced High Alpha + Multi-Factor Stability (Dynamic Real-Time Ranks)'
    deepAnalysis = `Dynamic Analysis: Plan 1 automatically evaluates all ${data.funds.length} mutual funds and selects the highest-ranking funds based on 3Y SIP XIRR, 3Y Rolling Return Median, Sharpe ratio, and Expense efficiency. Tranche 1 captures high-conviction Value & Mid/Smallcap leaders. Tranche 2 injects thematic credit & infra momentum. Tranche 3 incorporates defense alpha and multi-asset gold/debt shock absorbers.`

    instList = [
      // Tranche 1 (35%)
      {
        name: topValues[0]?.schemeName || topValues[0]?.label || 'UTI Nifty 500 Value 50 Index',
        label: topValues[0]?.label || '',
        pct: 10,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Dynamic Value Leader (Rank #1 Value: ${topValues[0]?.x3 ? topValues[0].x3 + '% 3Y XIRR' : topValues[0]?.y3 + '% 3Y CAGR'}).`,
        category: topValues[0]?.category || 'Value',
        x3: topValues[0]?.x3 ?? null,
        y3: topValues[0]?.y3 ?? null,
        r3med: topValues[0]?.r3med ?? null,
        score: topValues[0]?.score ?? null, in_universe: true,
      },
      {
        name: topSmallcaps[0]?.schemeName || topSmallcaps[0]?.label || 'Bandhan Small Cap',
        label: topSmallcaps[0]?.label || '',
        pct: 9,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Dynamic #1 Smallcap Alpha Engine (${topSmallcaps[0]?.x3 ? topSmallcaps[0].x3 + '% 3Y XIRR' : topSmallcaps[0]?.y3 + '% 3Y CAGR'}, Score: ${topSmallcaps[0]?.score}).`,
        category: topSmallcaps[0]?.category || 'Smallcap',
        x3: topSmallcaps[0]?.x3 ?? null,
        y3: topSmallcaps[0]?.y3 ?? null,
        r3med: topSmallcaps[0]?.r3med ?? null,
        score: topSmallcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topMidcaps[0]?.schemeName || topMidcaps[0]?.label || 'Invesco India Midcap',
        label: topMidcaps[0]?.label || '',
        pct: 8,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Dynamic #1 Midcap Compounder (${topMidcaps[0]?.x3 ? topMidcaps[0].x3 + '% 3Y XIRR' : topMidcaps[0]?.y3 + '% 3Y CAGR'}).`,
        category: topMidcaps[0]?.category || 'Midcap',
        x3: topMidcaps[0]?.x3 ?? null,
        y3: topMidcaps[0]?.y3 ?? null,
        r3med: topMidcaps[0]?.r3med ?? null,
        score: topMidcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topLargeMid[0]?.schemeName || topLargeMid[0]?.label || 'Invesco India Large & Mid Cap',
        label: topLargeMid[0]?.label || '',
        pct: 8,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Dynamic Large & Mid Core Anchor (${topLargeMid[0]?.x3 ? topLargeMid[0].x3 + '% 3Y XIRR' : topLargeMid[0]?.y3 + '% 3Y CAGR'}).`,
        category: topLargeMid[0]?.category || 'Large&Mid',
        x3: topLargeMid[0]?.x3 ?? null,
        y3: topLargeMid[0]?.y3 ?? null,
        r3med: topLargeMid[0]?.r3med ?? null,
        score: topLargeMid[0]?.score ?? null, in_universe: true,
      },

      // Tranche 2 (35%)
      {
        name: topSmallcaps[1]?.schemeName || topSmallcaps[1]?.label || 'ITI Small Cap',
        label: topSmallcaps[1]?.label || '',
        pct: 8,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dynamic Secondary Smallcap Kicker (${topSmallcaps[1]?.x3 ? topSmallcaps[1].x3 + '% 3Y XIRR' : topSmallcaps[1]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[1]?.category || 'Smallcap',
        x3: topSmallcaps[1]?.x3 ?? null,
        y3: topSmallcaps[1]?.y3 ?? null,
        r3med: topSmallcaps[1]?.r3med ?? null,
        score: topSmallcaps[1]?.score ?? null, in_universe: true,
      },
      {
        name: topMidcaps[1]?.schemeName || topMidcaps[1]?.label || 'WhiteOak Capital Mid Cap',
        label: topMidcaps[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dynamic Secondary Midcap Alpha (${topMidcaps[1]?.x3 ? topMidcaps[1].x3 + '% 3Y XIRR' : topMidcaps[1]?.y3 + '% 3Y CAGR'}).`,
        category: topMidcaps[1]?.category || 'Midcap',
        x3: topMidcaps[1]?.x3 ?? null,
        y3: topMidcaps[1]?.y3 ?? null,
        r3med: topMidcaps[1]?.r3med ?? null,
        score: topMidcaps[1]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[0]?.schemeName || topThematic[0]?.label || 'quant BFSI',
        label: topThematic[0]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dynamic Sectoral Credit Growth Theme (${topThematic[0]?.y3}% 3Y CAGR).`,
        category: topThematic[0]?.category || 'Sectoral',
        x3: topThematic[0]?.x3 ?? null,
        y3: topThematic[0]?.y3 ?? null,
        r3med: topThematic[0]?.r3med ?? null,
        score: topThematic[0]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[1]?.schemeName || topThematic[1]?.label || 'Bank of India Mfg & Infra',
        label: topThematic[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dynamic Manufacturing & Infra Capex Proxy (${topThematic[1]?.x3 ? topThematic[1].x3 + '% 3Y XIRR' : topThematic[1]?.y3 + '% 3Y CAGR'}).`,
        category: topThematic[1]?.category || 'Infra',
        x3: topThematic[1]?.x3 ?? null,
        y3: topThematic[1]?.y3 ?? null,
        r3med: topThematic[1]?.r3med ?? null,
        score: topThematic[1]?.score ?? null, in_universe: true,
      },
      {
        name: topLargeMid[1]?.schemeName || topLargeMid[1]?.label || 'Motilal Oswal Large & Midcap',
        label: topLargeMid[1]?.label || '',
        pct: 6,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dynamic Flexicap/Multicap Diversity (${topLargeMid[1]?.x3 ? topLargeMid[1].x3 + '% 3Y XIRR' : topLargeMid[1]?.y3 + '% 3Y CAGR'}).`,
        category: topLargeMid[1]?.category || 'Flexicap',
        x3: topLargeMid[1]?.x3 ?? null,
        y3: topLargeMid[1]?.y3 ?? null,
        r3med: topLargeMid[1]?.r3med ?? null,
        score: topLargeMid[1]?.score ?? null, in_universe: true,
      },

      // Tranche 3 (30%)
      {
        name: topThematic[2]?.schemeName || topThematic[2]?.label || 'HDFC Defence',
        label: topThematic[2]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic High Alpha Defense Theme (${topThematic[2]?.x3 ? topThematic[2].x3 + '% 3Y XIRR' : topThematic[2]?.y3 + '% 3Y CAGR'}, Score: ${topThematic[2]?.score}).`,
        category: topThematic[2]?.category || 'Defence',
        x3: topThematic[2]?.x3 ?? null,
        y3: topThematic[2]?.y3 ?? null,
        r3med: topThematic[2]?.r3med ?? null,
        score: topThematic[2]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[3]?.schemeName || topThematic[3]?.label || 'Aditya Birla SL PSU Equity',
        label: topThematic[3]?.label || '',
        pct: 6,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic PSU Capex & High Dividend Engine (${topThematic[3]?.y3}% 3Y CAGR).`,
        category: topThematic[3]?.category || 'PSU',
        x3: topThematic[3]?.x3 ?? null,
        y3: topThematic[3]?.y3 ?? null,
        r3med: topThematic[3]?.r3med ?? null,
        score: topThematic[3]?.score ?? null, in_universe: true,
      },
      {
        name: topMultiAsset[0]?.schemeName || topMultiAsset[0]?.label || 'DSP Multi Asset Allocation',
        label: topMultiAsset[0]?.label || '',
        pct: 6,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic Multi Asset Shock Absorber (${topMultiAsset[0]?.y3}% 3Y CAGR).`,
        category: topMultiAsset[0]?.category || 'Hybrid',
        x3: topMultiAsset[0]?.x3 ?? null,
        y3: topMultiAsset[0]?.y3 ?? null,
        r3med: topMultiAsset[0]?.r3med ?? null,
        score: topMultiAsset[0]?.score ?? null, in_universe: true,
      },
      {
        name: topValues[1]?.schemeName || topValues[1]?.label || 'Quant Value',
        label: topValues[1]?.label || '',
        pct: 6,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic Value Alpha Booster (${topValues[1]?.x3 ? topValues[1].x3 + '% 3Y XIRR' : topValues[1]?.y3 + '% 3Y CAGR'}).`,
        category: topValues[1]?.category || 'Value',
        x3: topValues[1]?.x3 ?? null,
        y3: topValues[1]?.y3 ?? null,
        r3med: topValues[1]?.r3med ?? null,
        score: topValues[1]?.score ?? null, in_universe: true,
      },
      {
        name: topSmallcaps[2]?.schemeName || topSmallcaps[2]?.label || 'Invesco India Smallcap',
        label: topSmallcaps[2]?.label || '',
        pct: 5,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic Tertiary Smallcap Growth Sleeve (${topSmallcaps[2]?.x3 ? topSmallcaps[2].x3 + '% 3Y XIRR' : topSmallcaps[2]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[2]?.category || 'Smallcap',
        x3: topSmallcaps[2]?.x3 ?? null,
        y3: topSmallcaps[2]?.y3 ?? null,
        r3med: topSmallcaps[2]?.r3med ?? null,
        score: topSmallcaps[2]?.score ?? null, in_universe: true,
      },
    ]
  } else if (planIndex === 1) {
    // Plan 2: Aggressive Capex & Smallcap Engine
    planTitle = 'Plan 2: Heavyweight Capex & Smallcap Alpha Engine (Aggressive Best Funds)'
    archetype = 'Aggressive Smallcap & Cyclical Capex Focus (Dynamic Real-Time Ranks)'
    deepAnalysis = `Dynamic Analysis: Plan 2 maximizes compounding rate by placing higher weights (30%) on top-ranked Smallcap funds, Defense, and Infra capex proxies dynamically selected from the workbook.`

    instList = [
      // Tranche 1
      {
        name: topSmallcaps[0]?.schemeName || topSmallcaps[0]?.label || 'Bandhan Small Cap',
        label: topSmallcaps[0]?.label || '',
        pct: 12,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Rank #1 Dynamic Smallcap Alpha Engine (${topSmallcaps[0]?.x3 ? topSmallcaps[0].x3 + '% 3Y XIRR' : topSmallcaps[0]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[0]?.category || 'Smallcap',
        x3: topSmallcaps[0]?.x3 ?? null,
        y3: topSmallcaps[0]?.y3 ?? null,
        r3med: topSmallcaps[0]?.r3med ?? null,
        score: topSmallcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topMidcaps[0]?.schemeName || topMidcaps[0]?.label || 'Invesco India Midcap',
        label: topMidcaps[0]?.label || '',
        pct: 10,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Rank #1 Dynamic Midcap Driver (${topMidcaps[0]?.x3 ? topMidcaps[0].x3 + '% 3Y XIRR' : topMidcaps[0]?.y3 + '% 3Y CAGR'}).`,
        category: topMidcaps[0]?.category || 'Midcap',
        x3: topMidcaps[0]?.x3 ?? null,
        y3: topMidcaps[0]?.y3 ?? null,
        r3med: topMidcaps[0]?.r3med ?? null,
        score: topMidcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[2]?.schemeName || topThematic[2]?.label || 'HDFC Defence',
        label: topThematic[2]?.label || '',
        pct: 8,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `High-conviction Defense Capex Momentum (${topThematic[2]?.x3 ? topThematic[2].x3 + '% 3Y XIRR' : topThematic[2]?.y3 + '% 3Y CAGR'}).`,
        category: topThematic[2]?.category || 'Defence',
        x3: topThematic[2]?.x3 ?? null,
        y3: topThematic[2]?.y3 ?? null,
        r3med: topThematic[2]?.r3med ?? null,
        score: topThematic[2]?.score ?? null, in_universe: true,
      },
      {
        name: topValues[0]?.schemeName || topValues[0]?.label || 'UTI Nifty 500 Value 50 Index',
        label: topValues[0]?.label || '',
        pct: 8,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Value Factor Ballast (${topValues[0]?.y3}% 3Y CAGR).`,
        category: topValues[0]?.category || 'Value',
        x3: topValues[0]?.x3 ?? null,
        y3: topValues[0]?.y3 ?? null,
        r3med: topValues[0]?.r3med ?? null,
        score: topValues[0]?.score ?? null, in_universe: true,
      },

      // Tranche 2
      {
        name: topSmallcaps[1]?.schemeName || topSmallcaps[1]?.label || 'ITI Small Cap',
        label: topSmallcaps[1]?.label || '',
        pct: 10,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Dual Smallcap Conviction Booster (${topSmallcaps[1]?.x3 ? topSmallcaps[1].x3 + '% 3Y XIRR' : topSmallcaps[1]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[1]?.category || 'Smallcap',
        x3: topSmallcaps[1]?.x3 ?? null,
        y3: topSmallcaps[1]?.y3 ?? null,
        r3med: topSmallcaps[1]?.r3med ?? null,
        score: topSmallcaps[1]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[1]?.schemeName || topThematic[1]?.label || 'Bank of India Mfg & Infra',
        label: topThematic[1]?.label || '',
        pct: 8,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Infra & Capex Growth Engine (${topThematic[1]?.x3 ? topThematic[1].x3 + '% 3Y XIRR' : topThematic[1]?.y3 + '% 3Y CAGR'}).`,
        category: topThematic[1]?.category || 'Infra',
        x3: topThematic[1]?.x3 ?? null,
        y3: topThematic[1]?.y3 ?? null,
        r3med: topThematic[1]?.r3med ?? null,
        score: topThematic[1]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[0]?.schemeName || topThematic[0]?.label || 'quant BFSI',
        label: topThematic[0]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Credit & Banking Capex Proxy (${topThematic[0]?.y3}% 3Y CAGR).`,
        category: topThematic[0]?.category || 'Sectoral',
        x3: topThematic[0]?.x3 ?? null,
        y3: topThematic[0]?.y3 ?? null,
        r3med: topThematic[0]?.r3med ?? null,
        score: topThematic[0]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[3]?.schemeName || topThematic[3]?.label || 'Aditya Birla SL PSU Equity',
        label: topThematic[3]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `PSU Equity Compounder (${topThematic[3]?.y3}% 3Y CAGR).`,
        category: topThematic[3]?.category || 'PSU',
        x3: topThematic[3]?.x3 ?? null,
        y3: topThematic[3]?.y3 ?? null,
        r3med: topThematic[3]?.r3med ?? null,
        score: topThematic[3]?.score ?? null, in_universe: true,
      },

      // Tranche 3
      {
        name: topSmallcaps[2]?.schemeName || topSmallcaps[2]?.label || 'Invesco India Smallcap',
        label: topSmallcaps[2]?.label || '',
        pct: 8,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Triple Smallcap Diversifier (${topSmallcaps[2]?.x3 ? topSmallcaps[2].x3 + '% 3Y XIRR' : topSmallcaps[2]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[2]?.category || 'Smallcap',
        x3: topSmallcaps[2]?.x3 ?? null,
        y3: topSmallcaps[2]?.y3 ?? null,
        r3med: topSmallcaps[2]?.r3med ?? null,
        score: topSmallcaps[2]?.score ?? null, in_universe: true,
      },
      {
        name: topMidcaps[1]?.schemeName || topMidcaps[1]?.label || 'WhiteOak Capital Mid Cap',
        label: topMidcaps[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Secondary Midcap Quality Anchor (${topMidcaps[1]?.x3 ? topMidcaps[1].x3 + '% 3Y XIRR' : topMidcaps[1]?.y3 + '% 3Y CAGR'}).`,
        category: topMidcaps[1]?.category || 'Midcap',
        x3: topMidcaps[1]?.x3 ?? null,
        y3: topMidcaps[1]?.y3 ?? null,
        r3med: topMidcaps[1]?.r3med ?? null,
        score: topMidcaps[1]?.score ?? null, in_universe: true,
      },
      {
        name: topLargeMid[0]?.schemeName || topLargeMid[0]?.label || 'Invesco India Large & Mid Cap',
        label: topLargeMid[0]?.label || '',
        pct: 5,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Large Cap Stability Anchor (${topLargeMid[0]?.x3 ? topLargeMid[0].x3 + '% 3Y XIRR' : topLargeMid[0]?.y3 + '% 3Y CAGR'}).`,
        category: topLargeMid[0]?.category || 'Large&Mid',
        x3: topLargeMid[0]?.x3 ?? null,
        y3: topLargeMid[0]?.y3 ?? null,
        r3med: topLargeMid[0]?.r3med ?? null,
        score: topLargeMid[0]?.score ?? null, in_universe: true,
      },
      {
        name: topValues[1]?.schemeName || topValues[1]?.label || 'Quant Value',
        label: topValues[1]?.label || '',
        pct: 5,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Dynamic Value Booster (${topValues[1]?.x3 ? topValues[1].x3 + '% 3Y XIRR' : topValues[1]?.y3 + '% 3Y CAGR'}).`,
        category: topValues[1]?.category || 'Value',
        x3: topValues[1]?.x3 ?? null,
        y3: topValues[1]?.y3 ?? null,
        r3med: topValues[1]?.r3med ?? null,
        score: topValues[1]?.score ?? null, in_universe: true,
      },
    ]
  } else {
    // Plan 3: Low Volatility Defensive Shield
    planTitle = 'Plan 3: Low Volatility Defensive Shield (Defensive Best Funds)'
    archetype = 'Defensive Value + Multi Asset Shock Absorber (Dynamic Real-Time Ranks)'
    deepAnalysis = `Dynamic Analysis: Designed to minimize drawdowns while maintaining consistent compound growth. Dynamically allocates to top-ranked Value, Multi-Asset, and Large&Mid funds.`

    instList = [
      // Tranche 1
      {
        name: topValues[0]?.schemeName || topValues[0]?.label || 'UTI Nifty 500 Value 50 Index',
        label: topValues[0]?.label || '',
        pct: 12,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Heavyweight Dynamic Value Ballast (${topValues[0]?.y3}% 3Y CAGR).`,
        category: topValues[0]?.category || 'Value',
        x3: topValues[0]?.x3 ?? null,
        y3: topValues[0]?.y3 ?? null,
        r3med: topValues[0]?.r3med ?? null,
        score: topValues[0]?.score ?? null, in_universe: true,
      },
      {
        name: topLargeMid[0]?.schemeName || topLargeMid[0]?.label || 'Invesco India Large & Mid Cap',
        label: topLargeMid[0]?.label || '',
        pct: 10,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Large Cap Defensive Core (${topLargeMid[0]?.x3 ? topLargeMid[0].x3 + '% 3Y XIRR' : topLargeMid[0]?.y3 + '% 3Y CAGR'}).`,
        category: topLargeMid[0]?.category || 'Large&Mid',
        x3: topLargeMid[0]?.x3 ?? null,
        y3: topLargeMid[0]?.y3 ?? null,
        r3med: topLargeMid[0]?.r3med ?? null,
        score: topLargeMid[0]?.score ?? null, in_universe: true,
      },
      {
        name: topMultiAsset[0]?.schemeName || topMultiAsset[0]?.label || 'DSP Multi Asset Allocation',
        label: topMultiAsset[0]?.label || '',
        pct: 10,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Gold, Debt & Equity Shock Absorber (${topMultiAsset[0]?.y3}% 3Y CAGR).`,
        category: topMultiAsset[0]?.category || 'Hybrid',
        x3: topMultiAsset[0]?.x3 ?? null,
        y3: topMultiAsset[0]?.y3 ?? null,
        r3med: topMultiAsset[0]?.r3med ?? null,
        score: topMultiAsset[0]?.score ?? null, in_universe: true,
      },

      // Tranche 2
      {
        name: topMidcaps[0]?.schemeName || topMidcaps[0]?.label || 'Invesco India Midcap',
        label: topMidcaps[0]?.label || '',
        pct: 8,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Quality Midcap Growth Upside (${topMidcaps[0]?.x3 ? topMidcaps[0].x3 + '% 3Y XIRR' : topMidcaps[0]?.y3 + '% 3Y CAGR'}).`,
        category: topMidcaps[0]?.category || 'Midcap',
        x3: topMidcaps[0]?.x3 ?? null,
        y3: topMidcaps[0]?.y3 ?? null,
        r3med: topMidcaps[0]?.r3med ?? null,
        score: topMidcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topLargeMid[1]?.schemeName || topLargeMid[1]?.label || 'Motilal Oswal Large and Midcap',
        label: topLargeMid[1]?.label || '',
        pct: 8,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Multicap Stability (${topLargeMid[1]?.x3 ? topLargeMid[1].x3 + '% 3Y XIRR' : topLargeMid[1]?.y3 + '% 3Y CAGR'}).`,
        category: topLargeMid[1]?.category || 'Large&Mid',
        x3: topLargeMid[1]?.x3 ?? null,
        y3: topLargeMid[1]?.y3 ?? null,
        r3med: topLargeMid[1]?.r3med ?? null,
        score: topLargeMid[1]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[0]?.schemeName || topThematic[0]?.label || 'quant BFSI',
        label: topThematic[0]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Financial Sector Defensive Banking (${topThematic[0]?.y3}% 3Y CAGR).`,
        category: topThematic[0]?.category || 'Sectoral',
        x3: topThematic[0]?.x3 ?? null,
        y3: topThematic[0]?.y3 ?? null,
        r3med: topThematic[0]?.r3med ?? null,
        score: topThematic[0]?.score ?? null, in_universe: true,
      },
      {
        name: topValues[1]?.schemeName || topValues[1]?.label || 'Quant Value',
        label: topValues[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 2 (Days 10–20)',
        why: `Secondary Value Anchor (${topValues[1]?.x3 ? topValues[1].x3 + '% 3Y XIRR' : topValues[1]?.y3 + '% 3Y CAGR'}).`,
        category: topValues[1]?.category || 'Value',
        x3: topValues[1]?.x3 ?? null,
        y3: topValues[1]?.y3 ?? null,
        r3med: topValues[1]?.r3med ?? null,
        score: topValues[1]?.score ?? null, in_universe: true,
      },

      // Tranche 3
      {
        name: topSmallcaps[0]?.schemeName || topSmallcaps[0]?.label || 'Bandhan Small Cap',
        label: topSmallcaps[0]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Measured Smallcap Alpha (${topSmallcaps[0]?.x3 ? topSmallcaps[0].x3 + '% 3Y XIRR' : topSmallcaps[0]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[0]?.category || 'Smallcap',
        x3: topSmallcaps[0]?.x3 ?? null,
        y3: topSmallcaps[0]?.y3 ?? null,
        r3med: topSmallcaps[0]?.r3med ?? null,
        score: topSmallcaps[0]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[1]?.schemeName || topThematic[1]?.label || 'Bank of India Mfg & Infra',
        label: topThematic[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Infra Growth Sleeve (${topThematic[1]?.x3 ? topThematic[1].x3 + '% 3Y XIRR' : topThematic[1]?.y3 + '% 3Y CAGR'}).`,
        category: topThematic[1]?.category || 'Infra',
        x3: topThematic[1]?.x3 ?? null,
        y3: topThematic[1]?.y3 ?? null,
        r3med: topThematic[1]?.r3med ?? null,
        score: topThematic[1]?.score ?? null, in_universe: true,
      },
      {
        name: topThematic[2]?.schemeName || topThematic[2]?.label || 'HDFC Defence',
        label: topThematic[2]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Tactical Defense Alpha (${topThematic[2]?.x3 ? topThematic[2].x3 + '% 3Y XIRR' : topThematic[2]?.y3 + '% 3Y CAGR'}).`,
        category: topThematic[2]?.category || 'Defence',
        x3: topThematic[2]?.x3 ?? null,
        y3: topThematic[2]?.y3 ?? null,
        r3med: topThematic[2]?.r3med ?? null,
        score: topThematic[2]?.score ?? null, in_universe: true,
      },
      {
        name: topSmallcaps[1]?.schemeName || topSmallcaps[1]?.label || 'ITI Small Cap',
        label: topSmallcaps[1]?.label || '',
        pct: 7,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Secondary Smallcap Diversifier (${topSmallcaps[1]?.x3 ? topSmallcaps[1].x3 + '% 3Y XIRR' : topSmallcaps[1]?.y3 + '% 3Y CAGR'}).`,
        category: topSmallcaps[1]?.category || 'Smallcap',
        x3: topSmallcaps[1]?.x3 ?? null,
        y3: topSmallcaps[1]?.y3 ?? null,
        r3med: topSmallcaps[1]?.r3med ?? null,
        score: topSmallcaps[1]?.score ?? null, in_universe: true,
      },
      {
        name: topMultiAsset[1]?.schemeName || topMultiAsset[1]?.label || 'Nippon India Multi Asset Allocation',
        label: topMultiAsset[1]?.label || '',
        pct: 10,
        tranche: 'Tranche 3 (Days 20–30)',
        why: `Secondary Multi Asset Ballast (${topMultiAsset[1]?.x3 ? topMultiAsset[1].x3 + '% 3Y XIRR' : topMultiAsset[1]?.y3 + '% 3Y CAGR'}).`,
        category: topMultiAsset[1]?.category || 'Hybrid',
        x3: topMultiAsset[1]?.x3 ?? null,
        y3: topMultiAsset[1]?.y3 ?? null,
        r3med: topMultiAsset[1]?.r3med ?? null,
        score: topMultiAsset[1]?.score ?? null, in_universe: true,
      },
    ]
  }

  // Ensure total percentages equal 100% exactly
  const totPct = instList.reduce((sum, i) => sum + i.pct, 0)
  if (totPct !== 100 && instList.length > 0) {
    const diff = 100 - totPct
    instList[0].pct += diff
  }

  const t1Insts = instList.filter((i) => i.tranche.startsWith('Tranche 1'))
  const t2Insts = instList.filter((i) => i.tranche.startsWith('Tranche 2'))
  const t3Insts = instList.filter((i) => i.tranche.startsWith('Tranche 3'))

  const t1Pct = t1Insts.reduce((acc, curr) => acc + curr.pct, 0)
  const t2Pct = t2Insts.reduce((acc, curr) => acc + curr.pct, 0)
  const t3Pct = t3Insts.reduce((acc, curr) => acc + curr.pct, 0)

  const t1Amt = Math.round((tier * t1Pct) / 100)
  const t2Amt = Math.round((tier * t2Pct) / 100)
  const t3Amt = tier - t1Amt - t2Amt

  const buckets: DynamicBucketAlloc[] = [
    {
      bucket: 'Tranche 1: Day 1–10 Immediate Execution (Post-Salary Credit)',
      role: 'Executed on Day 1 salary credit into core value, largecap & high-conviction mid/smallcap anchors.',
      pct: t1Pct,
      instruments: t1Insts,
    },
    {
      bucket: 'Tranche 2: Day 10–20 Mid-Month Capital Injection',
      role: 'Executed mid-month into credit growth, manufacturing capex & dual smallcap alpha engines.',
      pct: t2Pct,
      instruments: t2Insts,
    },
    {
      bucket: 'Tranche 3: Day 20–30 Month-End Stabilization & Defense Sleeve',
      role: 'Executed end-of-month into defense alpha, defensive healthcare & multi-asset gold/debt shock absorbers.',
      pct: t3Pct,
      instruments: t3Insts,
    },
  ]

  // Calculate projected weighted average XIRR based on real fund data
  const validXirrs = instList.map((i) => ({ pct: i.pct, val: i.x3 || i.y3 || 16.0 }))
  const weightedXirr = validXirrs.reduce((acc, curr) => acc + (curr.pct / 100) * curr.val, 0)
  const estLow = Math.max(14.0, Math.round((weightedXirr - 1.0) * 10) / 10)
  const estHigh = Math.round((weightedXirr + 1.5) * 10) / 10

  const yrs15 = Math.round(((tier * 12 * ((Math.pow(1 + weightedXirr / 100, 15) - 1) / (weightedXirr / 100)) * (1 + weightedXirr / 100)) / 10000000) * 100) / 100

  return {
    id: `plan-${tier}-${planIndex + 1}`,
    title: planTitle,
    archetype,
    targetXirr: `${estLow}% – ${estHigh}% Realized XIRR`,
    horizonAim: `15-Year SIP Goal: ₹${yrs15} Cr @ ${Math.round(weightedXirr * 10) / 10}% Est. XIRR`,
    trancheBreakdown: `Tranche 1: ₹${t1Amt.toLocaleString('en-IN')} (${t1Pct}%) · Tranche 2: ₹${t2Amt.toLocaleString('en-IN')} (${t2Pct}%) · Tranche 3: ₹${t3Amt.toLocaleString('en-IN')} (${t3Pct}%)`,
    thesis: `Dynamically selects top-performing funds across all ${data.funds.length} dataset schemes, spreading monthly investment across 3 calendar windows to neutralize volatility.`,
    deepAnalysis,
    buckets,
  }
}
