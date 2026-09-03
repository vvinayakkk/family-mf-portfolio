import { fmt } from '../lib/format'

type Item = { label: string; value: number; short?: string }

export function BarList({ items }: { items: Item[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div>
      {items.map((i) => (
        <div className="bar-row" key={i.label}>
          <div title={i.label}>{i.short ?? i.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(100 * i.value) / max}%` }} />
          </div>
          <div className="num">{fmt(i.value)}</div>
        </div>
      ))}
    </div>
  )
}
