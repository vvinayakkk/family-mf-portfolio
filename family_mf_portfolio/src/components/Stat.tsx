type Props = { label: string; value: string | number }

export function Stat({ label, value }: Props) {
  return (
    <div className="kpi">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  )
}
