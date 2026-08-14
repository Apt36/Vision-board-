import { useMemo, useState } from 'react'
import { useAppState } from '../store'
import { todayISO, formatLong } from '../logic/date'
import { capacityFor, dayInfo } from '../logic/capacity'
import { computeAttention, steeringNote } from '../logic/attention'
import { todayPlan, whatShouldIDo, currentWeekPriorities } from '../logic/recommend'
import { Card, RadarBars, Sheet } from '../components/ui'
import type { Route } from '../App'

export default function Today({ go }: { go: (r: Route) => void }) {
  const state = useAppState()
  const today = todayISO()
  const [showRec, setShowRec] = useState(false)
  const [recAt, setRecAt] = useState<Date | null>(null)

  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const attention = useMemo(() => computeAttention(state, today), [state, today])
  const note = steeringNote(attention)
  const plan = useMemo(() => todayPlan(state, today), [state, today])
  const checkin = state.checkins[today]
  const protectedIds = currentWeekPriorities(state, today)
  const rec = recAt ? whatShouldIDo(state, recAt) : null

  const capColor = cap.tier === 'low' ? 'var(--warn)' : cap.tier === 'medium' ? 'var(--accent)' : 'var(--good)'
  const roomLine = !info.isWorkDay
    ? "You have room today.\nDon't fill all of it."
    : cap.tier === 'low'
      ? 'A demanding day.\nSurvive it well — that counts.'
      : 'A work day.\nOne small investment is enough.'

  return (
    <div>
      <div className="brand">MATT OS</div>
      <h1 className="screen-title">{formatLong(today)}</h1>
      <div style={{ margin: '10px 0 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`pill ${info.isWorkDay ? 'pill-work' : 'pill-off'}`}>
          {info.isWorkDay ? 'WORK DAY' : 'OFF DAY'}
        </span>
        {info.isWorkDay && <span className="pill pill-dim">{info.label}</span>}
        {info.earlyStart && <span className="pill pill-dim">early start</span>}
      </div>

      <Card title="Capacity">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="capacity-num" style={{ color: capColor }}>{cap.score}%</span>
          <span className="pill pill-dim">{cap.tier.toUpperCase()}</span>
        </div>
        <div className="capacity-bar"><div style={{ width: `${cap.score}%`, background: capColor }} /></div>
        <p className="muted" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{roomLine}</p>
        {!checkin && (
          <p className="faint" style={{ marginTop: 8 }}>
            Check in to sharpen this — sleep and energy adjust your capacity.
          </p>
        )}
      </Card>

      <Card title="Today">
        <ol className="plist">
          {plan.priorities.map((p, i) => (
            <li key={p.domainId}>
              <span className="num">{i + 1}</span>
              <span>
                <span className="dom">{p.domainName}</span>
                {p.text}
              </span>
            </li>
          ))}
        </ol>
        {protectedIds.length > 0 && (
          <p className="faint" style={{ marginTop: 10 }}>
            Shaped by this week's protected priorities: {protectedIds.map(id => state.domains.find(d => d.id === id)?.name).filter(Boolean).join(', ')}.
          </p>
        )}
      </Card>

      {plan.avoid.length > 0 && (
        <Card title="Avoid today">
          <ul className="avoid-list">
            {plan.avoid.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>
      )}

      <Card title="Life Radar">
        <RadarBars items={attention} />
        <p className="faint" style={{ marginTop: 10 }}>Recent attention, not performance.</p>
      </Card>

      {note && (
        <Card title="Steering note">
          <p className="steering">{note}</p>
        </Card>
      )}

      <Card title="Quick check-in">
        {checkin ? (
          <div className="row" style={{ borderTop: 'none' }}>
            <div>
              <div className="row-label checkin-saved">✓ Checked in today</div>
              <div className="row-sub">
                {checkin.sleepHours != null ? `${checkin.sleepHours}h sleep · ` : ''}
                {checkin.energy != null ? `energy ${checkin.energy}/10 · ` : ''}
                {checkin.meals} meal{checkin.meals === 1 ? '' : 's'}
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => go('checkin')}>Update</button>
          </div>
        ) : (
          <button className="btn btn-accent btn-block" onClick={() => go('checkin')}>
            60-second check-in
          </button>
        )}
      </Card>

      <button
        className="big-btn"
        onClick={() => { setRecAt(new Date()); setShowRec(true) }}
      >
        WHAT SHOULD I DO?
      </button>

      {showRec && rec && (
        <Sheet onClose={() => setShowRec(false)}>
          <h2>Right now</h2>
          <p className="muted" style={{ margin: '8px 0 14px' }}>{rec.context}</p>
          <div className="card-title">Do this</div>
          <ol className="plist">
            {rec.steps.map((s, i) => (
              <li key={i}><span className="num">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
          {rec.not.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 14 }}>Not tonight</div>
              <ul className="avoid-list">
                {rec.not.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </>
          )}
          <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => setShowRec(false)}>
            Got it
          </button>
        </Sheet>
      )}
    </div>
  )
}
