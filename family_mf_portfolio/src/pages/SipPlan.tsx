import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarList } from '../components/BarList'
import { Callout } from '../components/Callout'
import { DataTable } from '../components/DataTable'
import { Stat } from '../components/Stat'
import { TermGuide } from '../components/TermGuide'
import { data, findFundData } from '../lib/data'
import { buildDynamicSipPlan } from '../lib/dynamicSipPlan'
import type { DynamicInstAlloc } from '../lib/dynamicSipPlan'
import type { Fund } from '../lib/types'
import { fmt, inr, slug } from '../lib/format'

type PlanTier = 40000 | 45000 | 50000 | 55000 | 60000 | 65000 | 70000 | 75000 | 80000 | 85000 | 90000

const PLAN_TIERS: PlanTier[] = [40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000]

export function SipPlan() {
  const [selectedTier, setSelectedTier] = useState<PlanTier>(85000)
  const [selectedPlanIdx, setSelectedPlanIdx] = useState<number>(0)
  const defaultPlan = buildDynamicSipPlan(selectedTier, selectedPlanIdx)
  const defaultInstruments = defaultPlan.buckets.flatMap((b) => b.instruments)

  // Interactive Custom Plan State
  const [customList, setCustomList] = useState<DynamicInstAlloc[]>(() => defaultInstruments)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [addFundSearch, setAddFundSearch] = useState<string>('')
  const allFunds = data.funds

  // Reset custom list whenever Archetype or Tier changes
  const activeList = isEditing ? customList : defaultInstruments

  const totalMonthly = selectedTier
  const totalAllocated = activeList.reduce((acc, curr) => acc + curr.pct, 0)
  const remainingPct = 100 - totalAllocated
  const totalFundsInPlan = activeList.length

  const t1Insts = activeList.filter((i) => i.tranche.startsWith('Tranche 1'))
  const t2Insts = activeList.filter((i) => i.tranche.startsWith('Tranche 2'))
  const t3Insts = activeList.filter((i) => i.tranche.startsWith('Tranche 3'))

  const t1Pct = t1Insts.reduce((acc, curr) => acc + curr.pct, 0)
  const t2Pct = t2Insts.reduce((acc, curr) => acc + curr.pct, 0)
  const t3Pct = t3Insts.reduce((acc, curr) => acc + curr.pct, 0)

  const t1Amount = Math.round(totalMonthly * (t1Pct / 100))
  const t2Amount = Math.round(totalMonthly * (t2Pct / 100))
  const t3Amount = totalMonthly - t1Amount - t2Amount

  // Handlers for Custom Plan Editor
  const handleUpdatePct = (index: number, newPct: number) => {
    setCustomList((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], pct: Math.max(0, Math.min(100, newPct)) }
      return next
    })
  }

  const handleUpdateTranche = (index: number, tranche: DynamicInstAlloc['tranche']) => {
    setCustomList((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], tranche }
      return next
    })
  }

  const handleRemoveFund = (index: number) => {
    setCustomList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddCustomFund = (fund: any) => {
    setCustomList((prev) => [
      ...prev,
      {
        name: fund.schemeName || fund.label,
        label: fund.label,
        pct: remainingPct > 0 ? remainingPct : 5,
        tranche: 'Tranche 1 (Days 1–10)',
        why: `Custom Selected Fund (${fund.y3 ? fund.y3 + '% 3Y CAGR' : 'Custom Sleeve'}).`,
        category: fund.category || 'Equity',
        x3: fund.x3 ?? null,
        y3: fund.y3 ?? null,
        r3med: fund.r3med ?? null,
        score: fund.score ?? null,
        in_universe: true,
      },
    ])
    setAddFundSearch('')
  }

  const handleAutoBalanceRemaining = useCallback(() => {
    setCustomList((prev) => {
      const total = prev.reduce((acc, cur) => acc + cur.pct, 0)
      const rem = 100 - total
      if (rem <= 0 || prev.length === 0) return prev
      // Distribute remaining proportionally across all funds
      const perFund = parseFloat((rem / prev.length).toFixed(2))
      return prev.map((item, i) =>
        i === prev.length - 1
          ? { ...item, pct: parseFloat((item.pct + rem - perFund * (prev.length - 1)).toFixed(2)) }
          : { ...item, pct: parseFloat((item.pct + perFund).toFixed(2)) }
      )
    })
  }, [])

  const sortedAllFunds = useMemo(() => {
    return [...data.funds].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  }, [])

  const handleReplaceFund = (index: number, newLabel: string) => {
    const newFund = data.funds.find((f: Fund) => f.label === newLabel)
    if (!newFund) return

    setCustomList((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        name: newFund.schemeName || newFund.label,
        label: newFund.label,
        category: newFund.category || 'Equity',
        why: `Replaced with ${newFund.label} (${newFund.y3 ? newFund.y3 + '% 3Y CAGR' : 'Custom Sleeve'}).`,
        x3: newFund.x3 ?? null,
        y3: newFund.y3 ?? null,
        r3med: newFund.r3med ?? null,
        score: newFund.score ?? null,
        in_universe: true,
      }
      return next
    })
  }

  const bars = [
    { label: 'Tranche 1: Days 1–10', value: t1Pct, sub: `₹${inr(t1Amount)} / mo (${t1Insts.length} funds)` },
    { label: 'Tranche 2: Days 10–20', value: t2Pct, sub: `₹${inr(t2Amount)} / mo (${t2Insts.length} funds)` },
    { label: 'Tranche 3: Days 20–30', value: t3Pct, sub: `₹${inr(t3Amount)} / mo (${t3Insts.length} funds)` },
  ]

  return (
    <>
      <h1 className="title">Institutional Family SIP Plans (₹40,000 – ₹90,000 / month)</h1>
      <p className="subtitle">
        Multi-fund diversification models with 3-tranche execution across salary credit dates. Includes Custom Plan Editor to add/edit funds and reallocate weights.
      </p>

      {/* Tier Selector Bar */}
      <div className="card">
        <p className="muted" style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>
          <strong>Select Monthly SIP Budget Tier:</strong>
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLAN_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`tab ${tier === selectedTier ? 'on' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setSelectedTier(tier)}
            >
              ₹{inr(tier)} / mo
            </button>
          ))}
        </div>
      </div>

      {/* Plan Archetype Selector */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {['Plan 1: Maximum Compounder Matrix (14 Funds)', 'Plan 2: Capex & Smallcap Alpha Engine (14 Funds)', 'Plan 3: Low Volatility Defensive Shield (14 Funds)'].map((pName, idx) => (
          <button
            key={pName}
            type="button"
            className={`tab ${!isEditing && idx === selectedPlanIdx ? 'on' : ''}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px', fontWeight: 600 }}
            onClick={() => {
              setSelectedPlanIdx(idx)
              setIsEditing(false)
              setCustomList(buildDynamicSipPlan(selectedTier, idx).buckets.flatMap((b) => b.instruments))
            }}
          >
            {pName}
          </button>
        ))}
      </div>

      {/* Stat Cards - Compact Responsive Flex Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginTop: 16,
        }}
      >
        <Stat label="Monthly SIP" value={`₹${inr(totalMonthly)}`} />
        <Stat label="Fund Count" value={`${totalFundsInPlan} Funds`} />
        <Stat label="Tranche 1 (1–10)" value={`₹${inr(t1Amount)}`} />
        <Stat label="Tranche 2 (10–20)" value={`₹${inr(t2Amount)}`} />
        <Stat label="Tranche 3 (20–30)" value={`₹${inr(t3Amount)}`} />
        <Stat label="Target XIRR" value={defaultPlan.targetXirr} />
        <Stat label="15Y Goal" value={defaultPlan.horizonAim.split('@')[0]} />
        <Stat label="Allocated %" value={`${totalAllocated}%`} />
      </div>

      {/* Yellow Active Plan Mode Callout Box */}
      <Callout tone="warn" title={`Active Plan Mode: ${isEditing ? 'Custom User Plan' : defaultPlan.title}`}>
        <p style={{ margin: '4px 0 6px', fontWeight: 600, color: 'var(--hero)' }}>
          Portfolio Archetype: {isEditing ? 'Custom User Portfolio Allocations' : defaultPlan.archetype}
        </p>
        <p style={{ margin: '4px 0', fontSize: '0.92rem' }}>
          <strong>CA Diversification Thesis:</strong> {defaultPlan.thesis}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--warn)' }}>
          <strong>3-Tranche Staggering Schedule:</strong> Tranche 1: ₹{inr(t1Amount)} ({t1Pct}%) · Tranche 2: ₹{inr(t2Amount)} ({t2Pct}%) · Tranche 3: ₹{inr(t3Amount)} ({t3Pct}%)
        </p>
      </Callout>

      {/* CUSTOM PLAN EDITOR BUTTON (Positioned directly below Yellow Callout Box) */}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn"
          style={{
            fontSize: '0.88rem',
            padding: '9px 18px',
            background: isEditing ? 'var(--hero)' : 'var(--accent)',
            border: '1px solid var(--line)',
            color: '#fff',
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
          }}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Close Custom Plan Editor' : 'Custom Plan Editor'}
        </button>
      </div>

      {/* CUSTOM PLAN EDITOR PANEL (Matching standard design system) */}
      {isEditing && (
        <div className="card" style={{ marginTop: 14, border: '1px solid var(--line)', padding: 18, background: 'var(--card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--hero)' }}>Custom Portfolio Builder</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--muted)' }}>
                Add funds from all 866 funds, modify percentage weights, or reassign execution tranches.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: Math.abs(remainingPct) < 0.01 ? 'var(--accent)' : 'var(--bad)' }}>
                Allocated: {totalAllocated}% {Math.abs(remainingPct) >= 0.01 && `(Remaining: ${remainingPct.toFixed(1)}%)`}
              </div>
              {remainingPct > 0 && (
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: 6, fontSize: '0.78rem' }}
                  onClick={handleAutoBalanceRemaining}
                >
                  Auto-Allocate Remaining {remainingPct.toFixed(1)}%
                </button>
              )}
            </div>
          </div>

          {/* Search to Add Custom Fund */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Add Mutual Fund to Plan:
            </label>
            <input
              type="text"
              placeholder="Search 866 funds to add..."
              value={addFundSearch}
              onChange={(e) => setAddFundSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)' }}
            />

            {addFundSearch.trim() && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                {allFunds
                  .filter((f: Fund) => (f.label || '').toLowerCase().includes(addFundSearch.toLowerCase()))
                  .slice(0, 6)
                  .map((fund: Fund) => (
                    <div
                      key={fund.label}
                      style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => handleAddCustomFund(fund)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{fund.label} ({fund.category})</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700 }}>
                        + Add Fund
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="section" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        Complete Plan Overview & Quantitative Allocation Grid
      </h2>
      <div className="card" style={{ border: '2px solid var(--accent)', padding: '16px' }}>
        <p className="muted" style={{ marginBottom: 14, fontSize: '0.88rem', lineHeight: 1.5 }}>
          Executive breakdown of all <strong>{totalFundsInPlan} mutual funds</strong> in this plan:
        </p>
        <DataTable
          maxHeight="none"
          minWidth="1900px"
          headers={[
            'Actions',
            'Tranche',
            'Scheme Name',
            'Category',
            'Wt %',
            'SIP (₹)',
            'Score',
            '1Y CAGR',
            '3Y CAGR',
            '5Y CAGR',
            '7Y CAGR',
            '10Y CAGR',
            'XIRR 1Y',
            'XIRR 3Y',
            'XIRR 5Y',
            'XIRR ALL',
            'Sharpe 3Y',
            'StdDev 3Y',
            'Roll3 Min',
            'Roll3 Med',
            'Roll5 Med',
            'Expense %',
            'AUM (Cr)',
            'PE',
            'PB',
            'ROE %',
            'Rationale',
          ]}
          aligns={['left', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'left']}
          rows={activeList.map((inst, idx) => {
            const amt = Math.round((totalMonthly * inst.pct) / 100)
            const fundObj = findFundData(inst.label || inst.name)
            
            const isT1 = inst.tranche.startsWith('Tranche 1')
            const isT2 = inst.tranche.startsWith('Tranche 2')
            const trColor = isT1 ? '#3b82f6' : isT2 ? '#ec4899' : '#10b981'

            return [
              isEditing ? (
                <div key="act" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => handleRemoveFund(idx)}
                  >
                    Remove ✕
                  </button>
                </div>
              ) : '—',
              isEditing ? (
                <select
                  key="tr_sel"
                  value={inst.tranche}
                  style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--line)' }}
                  onChange={(e) => handleUpdateTranche(idx, e.target.value as any)}
                >
                  <option value="Tranche 1 (Days 1–10)">T1 (1–10)</option>
                  <option value="Tranche 2 (Days 10–20)">T2 (10–20)</option>
                  <option value="Tranche 3 (Days 20–30)">T3 (20–30)</option>
                </select>
              ) : (
                <span
                  key="tr"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '3px 6px',
                    borderRadius: 4,
                    background: `${trColor}18`,
                    color: trColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isT1 ? 'T1 (1–10)' : isT2 ? 'T2 (10–20)' : 'T3 (20–30)'}
                </span>
              ),
              isEditing ? (
                <select
                  key="fund_repl"
                  value={inst.label || inst.name}
                  style={{ fontSize: '0.82rem', padding: '3px 6px', fontWeight: 700, color: 'var(--hero)', maxWidth: 260, borderRadius: 4, border: '1px solid var(--line)' }}
                  onChange={(e) => handleReplaceFund(idx, e.target.value)}
                >
                  {sortedAllFunds.map((f) => (
                    <option key={f.label} value={f.label}>
                      {f.label} ({f.category || 'Equity'})
                    </option>
                  ))}
                </select>
              ) : fundObj ? (
                <Link key="link" to={`/fund/${slug(fundObj.label)}`} style={{ fontWeight: 700, color: 'var(--hero)' }}>
                  {inst.name}
                </Link>
              ) : (
                <span key="name" style={{ fontWeight: 600 }}>{inst.name}</span>
              ),
              <span key="cat" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                {fundObj?.category || inst.category || 'Equity'}
              </span>,
              isEditing ? (
                <input
                  key="pct_in"
                  type="number"
                  min="0"
                  max="100"
                  value={inst.pct}
                  style={{ width: 55, padding: '2px 4px', fontWeight: 700, textAlign: 'right' }}
                  onChange={(e) => handleUpdatePct(idx, Number(e.target.value))}
                />
              ) : (
                <span key="pct" style={{ fontWeight: 700 }}>{inst.pct}%</span>
              ),
              <span key="amt" style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{inr(amt)}</span>,
              fundObj?.score ? (
                <span
                  key="sc"
                  style={{
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.78rem',
                    background: fundObj.score >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: fundObj.score >= 70 ? '#10b981' : '#3b82f6',
                  }}
                >
                  {fmt(fundObj.score, 1)}
                </span>
              ) : (
                '—'
              ),
              fmt(fundObj?.y1),
              <strong key="y3" style={{ color: fundObj?.y3 && fundObj.y3 >= 20 ? '#10b981' : 'inherit' }}>{fmt(fundObj?.y3)}%</strong>,
              fmt(fundObj?.y5),
              fmt(fundObj?.y7),
              fmt(fundObj?.y10),
              fmt(fundObj?.x1),
              <strong key="x3" style={{ color: '#2563eb' }}>{fmt(fundObj?.x3)}%</strong>,
              fmt(fundObj?.x5),
              fmt(fundObj?.xall),
              fmt(fundObj?.sharpe3, 2),
              fmt(fundObj?.sd3, 2),
              fmt(fundObj?.r3min),
              <span key="r3m" style={{ color: '#f59e0b', fontWeight: 600 }}>{fmt(fundObj?.r3med)}%</span>,
              fmt(fundObj?.r5med),
              fmt(fundObj?.exp, 2),
              inr(fundObj?.aum),
              fmt(fundObj?.pe),
              fmt(fundObj?.pb),
              fmt(fundObj?.roe),
              <span key="why" style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{inst.why}</span>,
            ]
          })}
        />
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.88rem', border: '1px solid var(--line)' }}>
          <span><strong>Total Monthly Outlay:</strong> <span style={{ color: 'var(--accent)', fontWeight: 800 }}>₹{inr(totalMonthly)} / month</span> ({totalFundsInPlan} funds)</span>
          <span><strong>Annual Outlay:</strong> ₹{inr(totalMonthly * 12)} / year</span>
          <span><strong>Total Allocation:</strong> 100%</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILED BREAKDOWN & IN-DEPTH QUANTITATIVE ANALYSIS                       */}
      {/* ========================================================================= */}
      <h2 className="section" style={{ marginTop: 32 }}>
        In-Depth Quantitative Analysis & Detailed Breakdown
      </h2>

      {/* Deep Institutional Analysis Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--hero)', marginTop: 0 }}>Strategic Portfolio Rationale</h3>
        <p style={{ fontSize: '0.93rem', lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>
          {defaultPlan.deepAnalysis}
        </p>
      </div>

      <h3 className="section">Allocation Mix Across Tranches (%)</h3>
      <div className="card">
        <BarList items={bars} />
      </div>

      <h3 className="section">Tranche-by-Tranche Deep Dive Cards</h3>
      <div className="stack">
        {defaultPlan.buckets.map((b) => {
          const bucketAmount = Math.round((totalMonthly * b.pct) / 100)
          return (
            <div className="card" key={b.bucket}>
              <div className="bucket-head">
                <div>
                  <h2>{b.bucket}</h2>
                  <p className="muted">{b.role}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amount">{b.pct}%</div>
                  <div className="muted">₹{inr(bucketAmount)} / month</div>
                </div>
              </div>

              <div className="stack">
                {b.instruments.map((inst) => {
                  const instAmount = Math.round((totalMonthly * inst.pct) / 100)
                  const fundObj = findFundData(inst.label || inst.name)

                  return (
                    <div
                      key={inst.name}
                      style={{
                        borderTop: '1px solid var(--line)',
                        paddingTop: 12,
                      }}
                    >
                      <div className="bucket-head">
                        <div>
                          <h3 style={{ margin: 0 }}>
                            {fundObj ? (
                              <Link to={`/fund/${slug(fundObj.label)}`}>{inst.name}</Link>
                            ) : (
                              inst.name
                            )}
                          </h3>
                          <p className="muted" style={{ margin: '4px 0 0' }}>
                            {inst.tranche} · {inst.in_universe ? `Score: ${fundObj?.score ? fmt(fundObj.score, 1) : 'n/a'}` : 'STP Debt Source'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="pill">
                            {inst.pct}% of total · ₹{inr(instAmount)} / mo
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: '8px 0', fontSize: '0.92rem' }}>{inst.why}</p>

                      {fundObj && (
                        <>
                          <p className="muted" style={{ marginBottom: 6, fontSize: '0.8rem' }}>
                            <strong>Workbook Quantitative Metrics</strong>
                          </p>
                          <DataTable
                            headers={[
                              'Score', '3Y CAGR', '5Y CAGR', 'XIRR3', 'Sharpe', 'R3 Floor', 'R3 Med', 'Exp %', 'Peer'
                            ]}
                            aligns={[
                              'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'
                            ]}
                            rows={[
                              [
                                fmt(fundObj.score, 1),
                                fmt(fundObj.y3),
                                fmt(fundObj.y5),
                                fmt(fundObj.x3),
                                fmt(fundObj.sharpe3, 2),
                                fmt(fundObj.r3min),
                                fmt(fundObj.r3med),
                                fmt(fundObj.exp, 2),
                                fundObj.peer_rank != null ? `${fundObj.peer_rank}/${fundObj.peer_n}` : '—',
                              ]
                            ]}
                            maxHeight={95}
                          />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="section">Execution & Annual Rebalancing Protocol</h2>
      <div className="card">
        <ul className="interp">
          <li><strong>Day 1 Salary Credit (Tranche 1):</strong> Execute Tranche 1 (₹{inr(t1Amount)}) into Core Funds directly from savings account. Park remaining ₹{inr(t2Amount + t3Amount)} into Liquid/Arbitrage fund.</li>
          <li><strong>Day 10 Tranche 2:</strong> Transfer ₹{inr(t2Amount)} from Liquid/Arbitrage back to Savings account and execute Tranche 2 into Mutual Funds.</li>
          <li><strong>Day 20 Tranche 3:</strong> Transfer ₹{inr(t3Amount)} from Liquid/Arbitrage back to Savings account and execute Tranche 3 into Mutual Funds.</li>
          <li><strong>Annual Rebalancing:</strong> Rebalance once a year if category drift exceeds +/- 10% from target weights.</li>
        </ul>
      </div>

      <TermGuide pageTerms={['Staggered Tranche', 'CA Multi-Fund Diversification', 'STP', 'Debt Yield', 'XIRR', 'CAGR', 'Rolling Return', 'Sharpe', 'Expense', 'AUM']} />
    </>
  )
}
