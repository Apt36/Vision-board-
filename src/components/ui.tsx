import { ReactNode, useEffect } from 'react'

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    />
  )
}

export function SwitchRow({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row">
      <div>
        <div className="row-label">{label}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, max = 20, step = 1, format }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string
}) {
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>−</button>
      <span className="val">{format ? format(value) : value}</span>
      <button type="button" aria-label="increase" disabled={value >= max} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>+</button>
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function RadarBars({ items }: { items: { name: string; score: number; color: string }[] }) {
  return (
    <div>
      {items.map(it => (
        <div key={it.name} className={`radar-row ${it.score < 35 ? 'radar-low' : ''}`}>
          <span className="radar-name">{it.name}</span>
          <div className="radar-track">
            <div className="radar-fill" style={{ width: `${Math.max(2, it.score)}%`, background: it.color }} />
          </div>
          <span className="radar-pct">{it.score}%</span>
        </div>
      ))}
    </div>
  )
}

export function Sparkline({ points, color = 'var(--accent)' }: { points: number[]; color?: string }) {
  if (points.length < 2) return <div className="faint">Not enough data yet for a trend.</div>
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const w = 300, h = 56, pad = 4
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - ((p - min) / span) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
