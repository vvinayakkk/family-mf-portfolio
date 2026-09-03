import { Callout } from '../components/Callout'
import { DataTable } from '../components/DataTable'
import { data } from '../lib/data'

export function Sources() {
  return (
    <>
      <h2 className="section" style={{ marginTop: 18 }}>
        Sources & methodology
      </h2>
      <Callout tone="info" title="No invented numbers">
        Blank cells mean the publisher did not provide a Direct Growth figure in this
        refresh. CAGR (lump-sum) is never swapped with XIRR (SIP).
      </Callout>

      <div className="card">
        <DataTable
          headers={['Source', 'Used for', 'Link']}
          rows={(data.meta.sources || []).map((s: any) => [
            s.name,
            s.used_for,
            s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : (
              '—'
            ),
          ])}
        />
      </div>

      <h2 className="section">Composite weights</h2>
      <div className="card">
        <DataTable
          headers={['Factor', 'Weight']}
          aligns={['left', 'right']}
          rows={[
            ['3Y CAGR', '25%'],
            ['Sharpe 3Y', '20%'],
            ['Rolling 3Y median', '20%'],
            ['Rolling 3Y floor (min)', '15%'],
            ['XIRR 3Y', '10%'],
            ['Low expense', '10%'],
          ]}
        />
      </div>

      <h2 className="section">Rolling window</h2>
      <div className="card">
        <p className="muted">
          Advisorkhoj Direct Growth rolling start = {data.meta.rolling_start} → as-of{' '}
          {data.meta.rolling_asof} (dynamic: today−7d −5 calendar years). Never a hardcoded
          calendar year like 2015.
        </p>
      </div>

      <h2 className="section">Disclaimer</h2>
      <div className="card">
        <p className="muted">{data.meta.disclaimer}</p>
      </div>
    </>
  )
}
