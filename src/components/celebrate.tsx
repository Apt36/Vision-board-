import { ReactNode, useEffect } from 'react'

const CONFETTI_COLORS = ['#199e70', '#3987e5', '#d95926', '#9085e9', '#d55181', '#c98500', '#e66767', '#e8b45f']

/** Deterministic pseudo-random spread so each burst looks scattered without Math.random in render. */
function piece(i: number) {
  const left = (i * 37 + 13) % 100
  const delay = ((i * 53) % 40) / 100
  const drift = ((i * 29) % 60) - 30
  const size = 6 + ((i * 17) % 7)
  const spin = 360 + ((i * 97) % 540)
  return {
    left: `${left}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDelay: `${delay}s`,
    width: size,
    height: size * (i % 3 === 0 ? 0.5 : 1),
    borderRadius: i % 4 === 0 ? '50%' : 2,
    ['--drift' as string]: `${drift}px`,
    ['--spin' as string]: `${spin}deg`
  }
}

export function Confetti({ count = 28 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="confetti-piece" style={piece(i)} />
      ))}
    </div>
  )
}

/**
 * Full-screen celebration moment: confetti plus a short coach message.
 * Dismisses itself, or on tap.
 */
export function Celebration({ emoji, title, message, onDone }: {
  emoji: string; title: string; message: string; onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="celebrate-overlay" onClick={onDone} role="status">
      <Confetti />
      <div className="celebrate-card">
        <div className="celebrate-emoji">{emoji}</div>
        <div className="celebrate-title">{title}</div>
        <div className="celebrate-msg">{message}</div>
      </div>
    </div>
  )
}

export function ProgressRing({ percent, size = 96, color = 'var(--accent)', children }: {
  percent: number; size?: number; color?: string; children?: ReactNode
}) {
  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size, ['--pct' as string]: `${percent}%`, ['--ring' as string]: color }}
      role="img" aria-label={`${percent}% complete`}
    >
      <span className="progress-ring-inner">{children}</span>
    </div>
  )
}
