import type { ReactNode } from 'react'

type Props = {
  tone?: 'info' | 'warn' | 'bad'
  title: string
  children: ReactNode
}

export function Callout({ tone = 'info', title, children }: Props) {
  return (
    <div className={`callout ${tone}`}>
      <strong>{title}</strong>
      {children}
    </div>
  )
}
