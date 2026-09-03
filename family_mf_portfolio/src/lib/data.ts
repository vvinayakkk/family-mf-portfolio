import type { Dataset, Fund } from './types'
import { slug } from './format'
import { getCachedSyncedDataset } from './syncEngine'

let cachedData: Dataset | null = null;
let fetchPromise: Promise<Dataset> | null = null;

// Fallback dataset metadata
export const data = {
  meta: {
    nav_asof: '2026-08-30',
    rolling_start: '2019-01-01',
    rolling_asof: '2026-08-30',
    generated: '2026-08-30',
    disclaimer: 'Data for research purposes only.',
    fund_count: 1500,
    category_count: 42,
    sources: [
      { name: 'Tickertape Screener API', used_for: 'CAGRs, NAV & Ratios', url: 'https://www.tickertape.in' }
    ]
  },
  funds: [],
  analyses: {},
  universe: {},
  categories: [],
  sip_plan: {}
} as unknown as Dataset;

export async function loadMasterDataset(): Promise<Dataset> {
  // Check if live synced dataset is in browser cache first
  const syncedFunds = getCachedSyncedDataset();
  if (syncedFunds && syncedFunds.length > 0) {
    const datasetObj = {
      meta: {
        ...data.meta,
        fund_count: syncedFunds.length,
        disclaimer: 'Live Tickertape Synced Dataset'
      },
      funds: syncedFunds,
      categories: [],
      sip_plan: {}
    } as unknown as Dataset;

    cachedData = datasetObj;
    return datasetObj;
  }

  if (cachedData && cachedData.funds && cachedData.funds.length > 0) return cachedData;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/data/dataset.json')
    .catch(() => fetch('/dataset.json'))
    .then(res => res.json())
    .then(d => {
      const fundsList = Array.isArray(d) ? d : (d.funds || []);
      const datasetObj = {
        meta: d.meta || { ...data.meta, fund_count: fundsList.length },
        funds: fundsList,
        categories: d.categories || [],
        sip_plan: d.sip_plan || {}
      } as unknown as Dataset;

      if (datasetObj.funds && datasetObj.funds.length > 0) {
        cachedData = datasetObj;
      }
      return datasetObj;
    })
    .catch(err => {
      console.error('Dataset fetch error:', err);
      return data;
    });

  return fetchPromise;
}

export function reloadMasterDatasetWithFunds(newFunds: Fund[]) {
  if (!newFunds || newFunds.length === 0) return;
  const datasetObj = {
    meta: {
      ...data.meta,
      fund_count: newFunds.length,
      disclaimer: 'Live Tickertape Synced Dataset'
    },
    funds: newFunds,
    categories: [],
    sip_plan: {}
  } as unknown as Dataset;

  cachedData = datasetObj;

  // Emit global custom event so every component re-renders instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dataset-updated', { detail: datasetObj }));
  }
}

export function subscribeToDatasetUpdates(callback: (dataset: Dataset) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvt = event as CustomEvent<Dataset>;
    if (customEvt.detail) callback(customEvt.detail);
  };
  window.addEventListener('dataset-updated', handler);
  return () => window.removeEventListener('dataset-updated', handler);
}

export function hasUsableData(f: Fund): boolean {
  return (
    f.y1 != null ||
    f.y3 != null ||
    f.y5 != null ||
    f.r3med != null ||
    f.nav != null
  )
}

export function fundsWithDataFromDataset(dataObj: Dataset): Fund[] {
  return (dataObj.funds || []).filter(hasUsableData)
}

export function fundsWithData(): Fund[] {
  return (cachedData ? cachedData.funds : []).filter(hasUsableData);
}

export function fundBySlug(s: string, dataObj?: Dataset): Fund | undefined {
  const d = dataObj || cachedData || data;
  return d.funds.find((f) => slug(f.label) === s)
}

export function findFundData(query: string, dataObj?: Dataset): Fund | undefined {
  if (!query) return undefined
  const d = dataObj || cachedData || data;
  const q = query.trim().toLowerCase()
  return d.funds.find((f) => (f.label || '').toLowerCase().includes(q) || (f.schemeName || '').toLowerCase().includes(q));
}
