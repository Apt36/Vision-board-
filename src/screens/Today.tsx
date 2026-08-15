import { useMemo, useState } from 'react'
import { bumpCommitment, useAppState } from '../store'
import { todayISO, formatLong } from '../logic/date'
import { capacityFor, dayInfo } from '../logic/capacity'
import { computeAttention, steeringNote } from '../logic/attention'
import { todayPlan, whatShouldIDo, currentWeekPriorities, unusedFootage } from '../logic/recommend'
import { roomsForToday } from '../logic/rooms'
import { challengeState, commitmentStreak, isCommitmentDone } from '../logic/streaks'
import { Card, RadarBars, Sheet } from '../components/ui'
import type { Route } from '../App'

const SLOTS: { id: 'morning' | 'day' | 'evening'; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'day', label: 'Day' },
  { id: 'evening', label: 'Evening' }
]

export default function Today({ go, openRoom }: { go: (r: Route) => void; openRoom: (id: string) => void }) {
  const state = useAppState()
  const today = todayISO()
  const [showRec, setShowRec] = useState(false)
  const [recAt, setRecAt] = useState<Date | null>(null)

  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const attention = useMemo(() => computeAttention(state, today), [state, today])
  const note = steeringNote(attention)
  const plan = useMemo(() => todayPlan(state, today), [state, today])
  const rooms = useMemo(() => roomsForToday(state, today), [state, today])
  const cs = challengeState(state, today)
  const checkin = state.checkins[today]
  const protectedIds = currentWeekPriorities(state, today)
  const unused = unusedFootage(state)
  const rec = recAt ? whatShouldIDo(state, recAt) : null

  const capColor = cap.tier === 'low' ? 'var(--warn)' : cap.tier === 'medium' ? 'var(--accent)' : 'var(--good)'
  const roomLine = !info.isWorkDay
    ? "You have room today.\nDon't fill all of it."
    : cap.tier === 'low'
      ? 'A demanding day.\nSurvive it well — that counts.'
      : 'A work day.\nOne room is enough.'

  const anchors = state.commitments.filter(c => c.active)
  const doneCount = anchors.filter(c => isCommitmentDone(state, c, today)).length

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

      {cs.active && (
        <button className="card monk-card" onClick={() => go('monk')}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>MONK</div>
            <div className="big-stat">Day {cs.day}<span className="faint" style={{ fontSize: '1rem' }}> / {cs.targetDays}</span></div>
          </div>
          <div className="monk-ring" style={{ ['--pct' as string]: `${cs.percent}%` }}>
            <span>{cs.percent}%</span>
          </div>
        </button>
      )}

      <Card title="Capacity">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="capacity-num" style={{ color: capColor }}>{cap.score}%</span>
          <span className="pill pill-dim">{cap.tier.toUpperCase()}</span>
        </div>
        <div className="capacity-bar"><div style={{ width: `${cap.score}%`, background: capColor }} /></div>
        <p className="muted" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{roomLine}</p>
      </Card>

      <Card title={`Anchors · ${doneCount}/${anchors.length}`}>
        {SLOTS.map(slot => {
          const items = anchors.filter(c => c.slot === slot.id)
          if (items.length === 0) return null
          return (
            <div key={slot.id} style={{ marginBottom: 10 }}>
              <div className="faint" style={{ marginBottom: 4 }}>{slot.label}</div>
              {items.map(c => {
                const count = state.commitmentLog[today]?.[c.id] ?? 0
                const done = count >= c.target
                const streak = commitmentStreak(state, c, today)
                return (
                  <button key={c.id} className="anchor-row" onClick={() => bumpCommitment(c.id)}>
                    <span className={`anchor-box ${done ? 'on' : count > 0 ? 'part' : ''}`}>
                      {done ? '✓' : c.target > 1 ? `${count}/${c.target}` : ''}
                    </span>
                    <span className={`anchor-label ${done ? 'done' : ''}`}>{c.label}</span>
                    {streak > 1 && <span className="anchor-streak">{streak}d</span>}
                  </button>
                )
              })}
            </div>
          )
        })}
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
            Shaped by this week's priorities: {protectedIds.map(id => state.domains.find(d => d.id === id)?.name).filter(Boolean).join(', ')}.
          </p>
        )}
      </Card>

      <Card title="Rooms that need a turn">
        {rooms.length === 0 ? (
          <p className="empty">Every room has had its turn recently. Rest is the right move.</p>
        ) : rooms.map(c => {
          const domain = state.domains.find(d => d.id === c.room.domainId)
          return (
            <button key={c.room.id} className="row" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => openRoom(c.room.id)}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>
                  <span style={{ color: domain?.color }}>●</span> {c.room.name}
                  {c.room.urgent && <span className="faint"> · pressing</span>}
                </div>
                <div className="row-sub">{c.room.nextAction || c.reason}</div>
              </div>
              <span className="faint">›</span>
            </button>
          )
        })}
      </Card>

      {plan.avoid.length > 0 && (
        <Card title="Avoid today">
          <ul className="avoid-list">
            {plan.avoid.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>
      )}

      {unused.length >= 5 && (
        <Card title="Edit queue">
          <p className="muted">
            {unused.length} pieces of footage waiting. That's enough raw material for a real edit session — which is the reps, not a chore.
          </p>
          <button className="btn btn-accent btn-block" style={{ marginTop: 10 }} onClick={() => go('capture')}>
            Open Capture
          </button>
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
                {[checkin.breakfast, checkin.lunch, checkin.dinner].filter(Boolean).length}/3 meals
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

      <button className="big-btn" onClick={() => { setRecAt(new Date()); setShowRec(true) }}>
        WHAT SHOULD I DO?
      </button>

      {showRec && rec && (
        <Sheet onClose={() => setShowRec(false)}>
          <h2>Right now</h2>
          <p className="muted" style={{ margin: '8px 0 14px' }}>{rec.context}</p>
          <div className="card-title">Do this</div>
          <ol className="plist">
            {rec.steps.map((s, i) => <li key={i}><span className="num">{i + 1}</span><span>{s}</span></li>)}
          </ol>
          {rec.not.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 14 }}>Not tonight</div>
              <ul className="avoid-list">{rec.not.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </>
          )}
          <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => setShowRec(false)}>Got it</button>
        </Sheet>
      )}
    </div>
  )
}
