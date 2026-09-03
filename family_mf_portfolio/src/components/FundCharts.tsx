import { useState, useRef } from 'react'
import type { FundHistory } from '../lib/types'

interface FundChartsProps {
  history?: FundHistory
  fundLabel: string
}

export function FundCharts({ history }: FundChartsProps) {
  const [activeTab, setActiveTab] = useState<'sip' | 'rolling' | 'nav'>('sip')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  if (!history || (!history.nav_series?.length && !history.sip_series?.length && !history.roll3_series?.length)) {
    return (
      <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '32px' }}>
        <p className="muted">Historical performance chart series not available for this scheme.</p>
      </div>
    )
  }

  const navData = history.nav_series || []
  const sipData = history.sip_series || []
  const rollData = history.roll3_series || []

  // SVG Chart Layout
  const svgWidth = 800
  const svgHeight = 340
  const padL = 70
  const padR = 30
  const padT = 30
  const padB = 45

  const chartW = svgWidth - padL - padR
  const chartH = svgHeight - padT - padB

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>, totalLen: number) {
    if (!svgRef.current || totalLen <= 1) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const chartX = mouseX * (svgWidth / rect.width) - padL
    const ratio = Math.max(0, Math.min(1, chartX / chartW))
    const idx = Math.round(ratio * (totalLen - 1))
    setHoverIndex(idx)
  }

  function handleMouseLeave() {
    setHoverIndex(null)
  }

  let chartTitle = ''
  let chartSubtitle = ''
  let svgContent = null
  let hoverTooltip = null

  if (activeTab === 'sip' && sipData.length > 1) {
    chartTitle = 'Monthly SIP Growth Timeline (₹1,000 / month)'
    chartSubtitle = 'Compare total invested capital vs accumulated portfolio value over time'

    const maxVal = Math.max(...sipData.map((d) => d.value)) * 1.05
    const pointsInvested = sipData.map((d, i) => ({
      x: padL + (i / (sipData.length - 1)) * chartW,
      y: padT + (1 - d.invested / maxVal) * chartH,
    }))
    const pointsVal = sipData.map((d, i) => ({
      x: padL + (i / (sipData.length - 1)) * chartW,
      y: padT + (1 - d.value / maxVal) * chartH,
    }))

    const pathInv = pointsInvested.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '')
    const pathVal = pointsVal.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '')
    const areaPath = `${pathVal} L ${padL + chartW},${padT + chartH} L ${padL},${padT + chartH} Z`

    const hoverItem = hoverIndex !== null && hoverIndex < sipData.length ? sipData[hoverIndex] : null
    const hoverPointVal = hoverIndex !== null && hoverIndex < pointsVal.length ? pointsVal[hoverIndex] : null

    svgContent = (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={(e) => handleMouseMove(e, sipData.length)}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="sipGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Outer Border Axis Line */}
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" stroke="var(--border)" strokeWidth="1" />

        {/* Y-Axis Ticks and Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padT + (1 - r) * chartH
          const valLabel = Math.round((maxVal * r) / 1000)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" />
              <text x={padL - 10} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="12" fontWeight="600">
                ₹{valLabel}k
              </text>
            </g>
          )
        })}

        {/* Area & Line */}
        <path d={areaPath} fill="url(#sipGrad)" />
        <path d={pathInv} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
        <path d={pathVal} fill="none" stroke="#3b82f6" strokeWidth="3" />

        {/* X-Axis Dates */}
        {sipData.length > 3 &&
          [0, Math.floor((sipData.length - 1) * 0.33), Math.floor((sipData.length - 1) * 0.66), sipData.length - 1].map((idx) => {
            const p = sipData[idx]
            const x = padL + (idx / (sipData.length - 1)) * chartW
            return (
              <g key={idx}>
                <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 5} stroke="var(--border)" strokeWidth="1" />
                <text x={x} y={svgHeight - 12} textAnchor="middle" fill="var(--muted)" fontSize="11" fontWeight="600">
                  {p.date}
                </text>
              </g>
            )
          })}

        {/* Hover Crosshair & Pointer Indicator */}
        {hoverPointVal && (
          <g>
            <line x1={hoverPointVal.x} y1={padT} x2={hoverPointVal.x} y2={padT + chartH} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={hoverPointVal.x} cy={hoverPointVal.y} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>
    )

    if (hoverItem) {
      hoverTooltip = (
        <div style={{ display: 'flex', gap: 16, background: 'var(--card)', border: '1px solid var(--accent)', padding: '8px 14px', borderRadius: 6, fontSize: '0.88rem', fontWeight: 600 }}>
          <span>📅 Date: <span style={{ color: 'var(--hero)' }}>{hoverItem.date}</span></span>
          <span>💰 Invested: <span style={{ color: 'var(--muted)' }}>₹{hoverItem.invested.toLocaleString('en-IN')}</span></span>
          <span>📈 Current Value: <span style={{ color: 'var(--accent)', fontWeight: 800 }}>₹{hoverItem.value.toLocaleString('en-IN')}</span></span>
        </div>
      )
    }
  } else if (activeTab === 'nav' && navData.length > 1) {
    chartTitle = 'Historical Daily NAV Path'
    chartSubtitle = 'Historical Net Asset Value growth trajectory'

    const minNav = Math.min(...navData.map((d) => d.nav)) * 0.95
    const maxNav = Math.max(...navData.map((d) => d.nav)) * 1.05
    const range = maxNav - minNav

    const points = navData.map((d, i) => ({
      x: padL + (i / (navData.length - 1)) * chartW,
      y: padT + (1 - (d.nav - minNav) / range) * chartH,
    }))

    const pathNav = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '')
    const areaPath = `${pathNav} L ${padL + chartW},${padT + chartH} L ${padL},${padT + chartH} Z`

    const hoverItem = hoverIndex !== null && hoverIndex < navData.length ? navData[hoverIndex] : null
    const hoverPoint = hoverIndex !== null && hoverIndex < points.length ? points[hoverIndex] : null

    svgContent = (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={(e) => handleMouseMove(e, navData.length)}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" stroke="var(--border)" strokeWidth="1" />

        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padT + (1 - r) * chartH
          const valLabel = (minNav + r * range).toFixed(1)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" />
              <text x={padL - 10} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="12" fontWeight="600">
                ₹{valLabel}
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill="url(#navGrad)" />
        <path d={pathNav} fill="none" stroke="#10b981" strokeWidth="3" />

        {navData.length > 3 &&
          [0, Math.floor((navData.length - 1) * 0.33), Math.floor((navData.length - 1) * 0.66), navData.length - 1].map((idx) => {
            const p = navData[idx]
            const x = padL + (idx / (navData.length - 1)) * chartW
            return (
              <g key={idx}>
                <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 5} stroke="var(--border)" strokeWidth="1" />
                <text x={x} y={svgHeight - 12} textAnchor="middle" fill="var(--muted)" fontSize="11" fontWeight="600">
                  {p.date}
                </text>
              </g>
            )
          })}

        {hoverPoint && (
          <g>
            <line x1={hoverPoint.x} y1={padT} x2={hoverPoint.x} y2={padT + chartH} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>
    )

    if (hoverItem) {
      hoverTooltip = (
        <div style={{ display: 'flex', gap: 16, background: 'var(--card)', border: '1px solid #10b981', padding: '8px 14px', borderRadius: 6, fontSize: '0.88rem', fontWeight: 600 }}>
          <span>📅 Date: <span style={{ color: 'var(--hero)' }}>{hoverItem.date}</span></span>
          <span>📈 Net Asset Value (NAV): <span style={{ color: '#10b981', fontWeight: 800 }}>₹{hoverItem.nav}</span></span>
        </div>
      )
    }
  } else if (activeTab === 'rolling' && rollData.length > 1) {
    chartTitle = '3-Year Rolling CAGR Consistency Path'
    chartSubtitle = 'Historical 3-Year annualized rolling returns across every single day'

    const minR = Math.min(...rollData.map((d) => d.r3)) * 0.9
    const maxR = Math.max(...rollData.map((d) => d.r3)) * 1.1
    const range = maxR - minR

    const points = rollData.map((d, i) => ({
      x: padL + (i / (rollData.length - 1)) * chartW,
      y: padT + (1 - (d.r3 - minR) / (range || 1)) * chartH,
    }))

    const pathRoll = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '')

    const hoverItem = hoverIndex !== null && hoverIndex < rollData.length ? rollData[hoverIndex] : null
    const hoverPoint = hoverIndex !== null && hoverIndex < points.length ? points[hoverIndex] : null

    svgContent = (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={(e) => handleMouseMove(e, rollData.length)}
        onMouseLeave={handleMouseLeave}
      >
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" stroke="var(--border)" strokeWidth="1" />

        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padT + (1 - r) * chartH
          const valLabel = (minR + r * range).toFixed(1)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" />
              <text x={padL - 10} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="12" fontWeight="600">
                {valLabel}%
              </text>
            </g>
          )
        })}

        <path d={pathRoll} fill="none" stroke="#f59e0b" strokeWidth="3" />

        {rollData.length > 3 &&
          [0, Math.floor((rollData.length - 1) * 0.33), Math.floor((rollData.length - 1) * 0.66), rollData.length - 1].map((idx) => {
            const p = rollData[idx]
            const x = padL + (idx / (rollData.length - 1)) * chartW
            return (
              <g key={idx}>
                <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 5} stroke="var(--border)" strokeWidth="1" />
                <text x={x} y={svgHeight - 12} textAnchor="middle" fill="var(--muted)" fontSize="11" fontWeight="600">
                  {p.date}
                </text>
              </g>
            )
          })}

        {hoverPoint && (
          <g>
            <line x1={hoverPoint.x} y1={padT} x2={hoverPoint.x} y2={padT + chartH} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>
    )

    if (hoverItem) {
      hoverTooltip = (
        <div style={{ display: 'flex', gap: 16, background: 'var(--card)', border: '1px solid #f59e0b', padding: '8px 14px', borderRadius: 6, fontSize: '0.88rem', fontWeight: 600 }}>
          <span>📅 End Date: <span style={{ color: 'var(--hero)' }}>{hoverItem.date}</span></span>
          <span>📊 3Y Annualized CAGR: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{hoverItem.r3}%</span></span>
        </div>
      )
    }
  }

  return (
    <div className="card" style={{ marginTop: 24, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{chartTitle}</h2>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            {chartSubtitle}
          </p>
        </div>

        {/* Clean Tab Selector without Emojis */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`tab ${activeTab === 'sip' ? 'on' : ''}`}
            onClick={() => { setActiveTab('sip'); setHoverIndex(null); }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 600 }}
          >
            Monthly SIP Growth
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'rolling' ? 'on' : ''}`}
            onClick={() => { setActiveTab('rolling'); setHoverIndex(null); }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 600 }}
          >
            3Y Rolling Return
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'nav' ? 'on' : ''}`}
            onClick={() => { setActiveTab('nav'); setHoverIndex(null); }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 600 }}
          >
            Historical NAV Path
          </button>
        </div>
      </div>

      {/* Dynamic Hover Tooltip Bar */}
      <div style={{ minHeight: 38, marginBottom: 12 }}>
        {hoverTooltip ? hoverTooltip : (
          <p className="muted" style={{ margin: 0, fontSize: '0.82rem', fontStyle: 'italic' }}>
            Hover or move cursor over the chart area to inspect exact values and dates.
          </p>
        )}
      </div>

      {/* SVG Canvas Box */}
      <div style={{ width: '100%', background: 'var(--card-hover)', borderRadius: 8, padding: '12px', border: '1px solid var(--border)' }}>
        {svgContent}
      </div>
    </div>
  )
}
