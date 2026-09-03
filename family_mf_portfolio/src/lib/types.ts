export type Holding = {
  rank: number
  name?: string
  sector?: string
  weight?: number | null
  mkt?: number | null
  chg1m?: number | null
}

export type Peer = {
  name?: string
  isin?: string
  is_self?: boolean
  aum?: number | null
  y1?: number | null
  y3?: number | null
  y5?: number | null
  y10?: number | null
  exp?: number | null
  sd?: number | null
}

export type NavPoint = { date: string; nav: number }
export type RollPoint = { date: string; r3: number }
export type SipGrowthPoint = { date: string; invested: number; value: number }

export type FundHistory = {
  nav_series?: NavPoint[]
  roll3_series?: RollPoint[]
  sip_series?: SipGrowthPoint[]
}

export type Fund = {
  label: string
  category: string
  isin?: string
  scheme_code?: string | number
  schemeName?: string
  url?: string
  ak_url?: string
  fetched_at?: string
  nav?: number | null
  navDate?: string
  history?: FundHistory
  y1?: number | null
  y3?: number | null
  y5?: number | null
  y7?: number | null
  y10?: number | null
  since?: number | null
  aum?: number | null
  exp?: number | null
  rating?: string | null
  mcCategory?: string
  sharpe1?: number | null
  sharpe3?: number | null
  sharpe5?: number | null
  sd1?: number | null
  sd3?: number | null
  sd5?: number | null
  sort3?: number | null
  beta3?: number | null
  x1?: number | null
  x2?: number | null
  x3?: number | null
  x5?: number | null
  xall?: number | null
  r1min?: number | null
  r1med?: number | null
  r1max?: number | null
  r1n?: number | null
  r3min?: number | null
  r3med?: number | null
  r3max?: number | null
  r3n?: number | null
  r5min?: number | null
  r5med?: number | null
  r5max?: number | null
  r5n?: number | null
  roll_start?: string
  roll_asof?: string
  eq?: number | null
  bond?: number | null
  cash?: number | null
  large?: number | null
  mid?: number | null
  small?: number | null
  top5w?: number | null
  top10w?: number | null
  nhold?: number | null
  pe?: number | null
  pb?: number | null
  roe?: number | null
  dy?: number | null
  cat_pe?: number | null
  cat_pb?: number | null
  bench?: string
  launch?: string
  riskometer?: string
  objective?: string
  managers?: string[]
  changeNAV?: number | null
  changePercentNAV?: number | null
  kbyi?: any[]
  planOptionMap?: any
  fundamentals?: any
  risk_raw?: any
  holdings_raw?: any
  peers_raw?: any[]
  portfolio_raw?: any
  about_raw?: any
  sip_raw?: any
  rolling_raw?: any
  xirr_raw?: any
  holdings?: Holding[]
  peers?: Peer[]
  peer_rank?: number | null
  peer_n?: number | null
  style?: string | null
  gap3?: number | null
  ret_vol?: number | null
  pe_disc?: number | null
  score?: number | null
  consistency?: number | null
  pain?: number | null
  sip_ready?: number | null

  // Tickertape Live & Pro Metrics
  amc?: string
  sector?: string
  ret3m?: number | null
  ret6m?: number | null
  maxDrawdown?: number | null
  appAllTImeH?: number | null
  r3avg?: number | null
  ret1yVsCat?: number | null
  ret3yVsCat?: number | null
  ret5yVsCat?: number | null
  alpha?: number | null
  percEquity?: number | null
  percLargecap?: number | null
  percMidcap?: number | null
  percSmallcap?: number | null
  percTop3?: number | null
  percTop5?: number | null
  percTop10?: number | null
}

export type CategoryStat = {
  category: string
  n: number
  avg_y1?: number | null
  avg_y3?: number | null
  med_y3?: number | null
  avg_y5?: number | null
  avg_x3?: number | null
  avg_r3?: number | null
  avg_sharpe?: number | null
  avg_exp?: number | null
  avg_sd3?: number | null
  avg_score?: number | null
  aum_sum?: number | null
  neg1?: number
  best?: string
  best_score?: number | null
  best3v?: number | null
  worst3v?: number | null
  spread3?: number | null
}

export type SipInstrument = {
  name: string
  label?: string
  pct_of_total: number
  amount: number
  in_universe: boolean
  why?: string
  sources?: string[]
  facts?: Partial<Fund> | null
}

export type SipBucket = {
  bucket: string
  pct: number
  amount: number
  role: string
  instruments: SipInstrument[]
}

export type Dataset = {
  meta: {
    generated?: string
    nav_asof?: string
    rolling_start?: string
    rolling_asof?: string
    fund_count: number
    category_count: number
    sources: { name: string; url: string; used_for: string }[]
    disclaimer: string
  }
  analyses: { id: string; title: string; blurb: string }[]
  universe: Record<string, number>
  categories: CategoryStat[]
  funds: Fund[]
  sip_plan: {
    monthly_sip: number
    horizon: string
    risk_profile: string
    philosophy: string[]
    buckets: SipBucket[]
    rebalance_rules: string[]
    disclaimer: string
  }
}
