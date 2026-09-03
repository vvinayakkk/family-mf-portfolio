import type { ReactNode } from 'react'

type Props = {
  headers: string[]
  rows: ReactNode[][]
  aligns?: Array<'left' | 'right'>
  maxHeight?: number | string
  minWidth?: number | string
  stickyFirstColumn?: boolean
}

export function DataTable({
  headers,
  rows,
  aligns,
  maxHeight = 600,
  minWidth = '100%',
  stickyFirstColumn = false,
}: Props) {
  const al = aligns ?? headers.map(() => 'left' as const)
  const effectiveMaxHeight = maxHeight === 'none' || maxHeight === 'auto' ? 640 : maxHeight

  return (
    <div
      className="scroll"
      style={{
        maxHeight: effectiveMaxHeight,
        overflowX: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        borderRadius: 8,
      }}
    >
      <table style={{ minWidth, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={al[i] === 'right' ? 'num' : undefined}
                style={{
                  position: 'sticky',
                  top: 0,
                  left: stickyFirstColumn && i === 0 ? 0 : undefined,
                  zIndex: stickyFirstColumn && i === 0 ? 30 : 20,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 700,
                  borderBottom: '2px solid var(--line)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {r.map((c, i) => (
                <td
                  key={i}
                  className={al[i] === 'right' ? 'num' : undefined}
                  style={{
                    position: stickyFirstColumn && i === 0 ? 'sticky' : undefined,
                    left: stickyFirstColumn && i === 0 ? 0 : undefined,
                    zIndex: stickyFirstColumn && i === 0 ? 1 : undefined,
                    background: stickyFirstColumn && i === 0 ? 'var(--card)' : undefined,
                    boxShadow: stickyFirstColumn && i === 0 ? '2px 0 5px rgba(0,0,0,0.05)' : undefined,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
