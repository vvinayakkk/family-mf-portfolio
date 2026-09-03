#!/usr/bin/env node
/**
 * Tickertape Master Dataset Scraper & Update Engine
 * =================================================
 * Run `node scripts/update_dataset.cjs` to fetch the latest 1,500 mutual fund schemes,
 * compute daily NAV-based Pro metrics (Max Drawdowns, 3Y Rolling Returns, ATH Distances),
 * and update `public/data/dataset.json` directly.
 */

const fs = require('fs');
const path = require('path');

const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://www.tickertape.in/'
};

const PROJECT_FIELDS = [
  'aum', 'sector', 'option', 'subsector', 'amc', 
  'expRatio', 'navClose', 'stdDevAnn', 'sharpe', 'sortino', 
  'alpha', 'ret1y', 'ret3y', 'ret5y', 'ret10y', 
  'percEquityH', 'percLargecap', 'percMidcap', 'percSmallcap'
];

async function fetchScreenerPage(offset = 0, count = 50) {
  const url = 'https://api.tickertape.in/mf-screener/query';
  const payload = {
    match: {},
    sortBy: 'aum',
    sortOrder: -1,
    count: count,
    offset: offset,
    project: PROJECT_FIELDS
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
    const resData = await response.json();
    if (resData.success) {
      return resData.data?.result || [];
    }
  } catch (e) {
    console.error(`Error fetching screener page offset ${offset}:`, e.message);
  }
  return [];
}

async function fetchNavHistory(mfId) {
  const url = `https://api.tickertape.in/mutualfunds/${mfId}/charts/inter?duration=max`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.tickertape.in/'
      }
    });
    const data = await resp.json();
    return data.data?.[0]?.points || [];
  } catch (e) {
    return [];
  }
}

function computeMetricsFromNav(points) {
  if (!points || points.length === 0) return null;

  points.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const currentNav = points[points.length - 1].lp;
  const currentDate = new Date(points[points.length - 1].ts).getTime();

  let maxNav = points[0].lp;
  let maxDrawdown = 0;

  for (const pt of points) {
    if (pt.lp > maxNav) maxNav = pt.lp;
    const drop = ((pt.lp - maxNav) / maxNav) * 100;
    if (drop < maxDrawdown) maxDrawdown = drop;
  }

  const athNav = maxNav;
  const appAllTImeH = ((currentNav - athNav) / athNav) * 100;

  const MS_3M = 90 * 24 * 60 * 60 * 1000;
  const MS_6M = 180 * 24 * 60 * 60 * 1000;

  let nav3m = null;
  let nav6m = null;

  for (let i = points.length - 1; i >= 0; i--) {
    const timeDiff = currentDate - new Date(points[i].ts).getTime();
    if (!nav3m && timeDiff >= MS_3M) nav3m = points[i].lp;
    if (!nav6m && timeDiff >= MS_6M) nav6m = points[i].lp;
    if (nav3m && nav6m) break;
  }

  const ret3m = nav3m ? ((currentNav - nav3m) / nav3m) * 100 : null;
  const ret6m = nav6m ? ((currentNav - nav6m) / nav6m) * 100 : null;

  const rolling3y = [];
  const THREE_YEARS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < points.length; i++) {
    const startTime = new Date(points[i].ts).getTime();
    const targetTime = startTime + THREE_YEARS_MS;

    for (let j = i + 1; j < points.length; j++) {
      const curTime = new Date(points[j].ts).getTime();
      if (curTime >= targetTime) {
        const startNav = points[i].lp;
        const endNav = points[j].lp;
        const cagr3y = (Math.pow(endNav / startNav, 1 / 3) - 1) * 100;
        rolling3y.push(cagr3y);
        break;
      }
    }
  }

  let min3y = null, med3y = null, max3y = null, avg3y = null;

  if (rolling3y.length > 0) {
    rolling3y.sort((a, b) => a - b);
    min3y = rolling3y[0];
    med3y = rolling3y[Math.floor(rolling3y.length / 2)];
    max3y = rolling3y[rolling3y.length - 1];
    avg3y = rolling3y.reduce((a, b) => a + b, 0) / rolling3y.length;
  }

  return {
    maxDrawdown,
    appAllTImeH,
    ret3m,
    ret6m,
    avg3yRollingRet: avg3y,
    min3yRollingRet: min3y,
    med3yRollingRet: med3y,
    max3yRollingRet: max3y,
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('       TICKERTAPE MASTER DATASET SCRAPER & UPDATE ENGINE');
  console.log('='.repeat(70));
  console.log('1. Scraping 1,500 schemes from Tickertape Screener API...');

  const rawFunds = [];
  let offset = 0;
  const count = 50;
  const maxPages = 30;

  for (let page = 0; page < maxPages; page++) {
    process.stdout.write(` -> Page ${page + 1}/${maxPages} (offset ${offset})... `);
    const results = await fetchScreenerPage(offset, count);
    if (!results || results.length === 0) {
      console.log('Done.');
      break;
    }

    for (const raw of results) {
      const metrics = {};
      for (const item of (raw.values || [])) {
        if (!item.filter) continue;
        let val = null;
        if (item.doubleVal !== undefined) val = item.doubleVal;
        else if (item.strVal !== undefined) val = item.strVal;
        else if (item.intVal !== undefined) val = item.intVal;
        metrics[item.filter] = val;
      }

      rawFunds.push({
        mfId: raw.mfId,
        slug: raw.slug,
        name: raw.name,
        sector: raw.sector,
        metrics
      });
    }

    console.log(`Fetched ${results.length} schemes. Cumulative: ${rawFunds.length}`);
    if (results.length < count) break;
    offset += count;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n2. Scraped ${rawFunds.length} total schemes. Computing Category Averages...`);

  // Category Averages
  const catSums = {};
  rawFunds.forEach(f => {
    const m = f.metrics || {};
    const cat = m.subsector || 'Equity';
    if (!catSums[cat]) catSums[cat] = { y1: [], y3: [], y5: [] };

    if (m.ret1y != null) catSums[cat].y1.push(m.ret1y);
    if (m.ret3y != null) catSums[cat].y3.push(m.ret3y);
    if (m.ret5y != null) catSums[cat].y5.push(m.ret5y);
  });

  const catAvgs = {};
  Object.keys(catSums).forEach(cat => {
    const s = catSums[cat];
    catAvgs[cat] = {
      y1: s.y1.length ? s.y1.reduce((a, b) => a + b, 0) / s.y1.length : 0,
      y3: s.y3.length ? s.y3.reduce((a, b) => a + b, 0) / s.y3.length : 0,
      y5: s.y5.length ? s.y5.reduce((a, b) => a + b, 0) / s.y5.length : 0,
    };
  });

  console.log(`\n3. Fetching daily NAV histories & calculating Pro Metrics for all ${rawFunds.length} schemes...`);
  const formattedDataset = [];

  for (let i = 0; i < rawFunds.length; i++) {
    const f = rawFunds[i];
    const m = f.metrics || {};
    const cat = m.subsector || 'Equity';
    const cAvg = catAvgs[cat] || { y1: 0, y3: 0, y5: 0 };

    if ((i + 1) % 100 === 0 || i === rawFunds.length - 1) {
      console.log(` -> Processed ${i + 1}/${rawFunds.length} schemes...`);
    }

    const points = await fetchNavHistory(f.mfId);
    const navComputed = computeMetricsFromNav(points);

    // Formatted Scheme Object matching App Data Schema
    formattedDataset.push({
      isin: f.mfId,
      label: f.name,
      schemeName: f.name,
      category: m.subsector || f.sector || 'Equity',
      sector: f.sector || 'Equity',
      amc: m.amc || '',
      nav: m.navClose || null,
      exp: m.expRatio || null,
      aum: m.aum || null,
      
      // CAGR Returns %
      y1: m.ret1y != null ? m.ret1y : null,
      y3: m.ret3y != null ? m.ret3y : null,
      y5: m.ret5y != null ? m.ret5y : null,
      y10: m.ret10y != null ? m.ret10y : null,

      // Short term returns %
      ret3m: navComputed?.ret3m ?? null,
      ret6m: navComputed?.ret6m ?? null,

      // 3Y Rolling Returns %
      r3med: navComputed?.med3yRollingRet ?? m.ret3y ?? null,
      r3min: navComputed?.min3yRollingRet ?? null,
      r3max: navComputed?.max3yRollingRet ?? null,
      r3avg: navComputed?.avg3yRollingRet ?? null,

      // Risk & Drawdown Metrics
      maxDrawdown: navComputed?.maxDrawdown ?? null,
      appAllTImeH: navComputed?.appAllTImeH ?? null,
      sd3: m.stdDevAnn || null,
      sharpe3: m.sharpe || null,
      sort3: m.sortino || null,
      alpha: m.alpha || null,

      // Category Relative Performance Deltas
      ret1yVsCat: m.ret1y != null ? m.ret1y - cAvg.y1 : null,
      ret3yVsCat: m.ret3y != null ? m.ret3y - cAvg.y3 : null,
      ret5yVsCat: m.ret5y != null ? m.ret5y - cAvg.y5 : null,

      // Portfolio Asset Allocation %
      percEquity: m.percEquityH || null,
      percLargecap: m.percLargecap || null,
      percMidcap: m.percMidcap || null,
      percSmallcap: m.percSmallcap || null,
    });

    await new Promise(r => setTimeout(r, 35));
  }

  const targetPath = path.join(__dirname, '../public/data/dataset.json');
  console.log(`\n4. Writing ${formattedDataset.length} schemes directly to: ${targetPath}`);

  fs.writeFileSync(targetPath, JSON.stringify(formattedDataset, null, 2), 'utf-8');
  const sizeMb = (fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2);
  console.log('='.repeat(70));
  console.log(`✓ SUCCESS! Updated public/data/dataset.json (${sizeMb} MB) with ${formattedDataset.length} live Tickertape schemes.`);
  console.log('='.repeat(70));
}

main();
