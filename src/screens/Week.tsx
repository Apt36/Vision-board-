import { useMemo, useState } from 'react'
import { setState, useAppState } from '../store'
import { todayISO, weekStartOf, addDays, formatShort } from '../logic/date'
import { weekStats } from '../logic/week'
import { computeAttention, neglectedDomains } from '../logic/attention'
import { unusedFootage } from '../logic/recommend'
import { challengeState } from '../logic/streaks'
import { rankRooms } from '../logic/rooms'
import { Card, Chip } from '../components/ui'

export default function Week() {
  const state = useAppState()
  const today = todayISO()
  const weekStart = weekStartOf(today)
  const stats = useMemo(() => weekStats(state, today), [state, today])
  const attention = useMemo(() => computeAttention(state, today), [state, today])
  const neglected = neglectedDomains(attention)
  const ranked = useMemo(() => rankRooms(state, today), [state, today])
  const cs = challengeState(state, today)
  const unused = unusedFootage(state)

  const review = state.weeklyReviews.find(r => r.weekStart === weekStart)
  const [selected, setSelected] = useState<string[]>(review?.priorities ?? [])
  const [reflection, setReflection] = useState(review?.reflection ?? '')
  const [saved, setSaved] = useState(false)

  const toggle = (id: string) => {
    setSaved(false)
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    )
  }

  const save = () => {
    setState(s => ({
      ...s,
      weeklyReviews: [
        ...s.weeklyReviews.filter(x => x.weekStart !== weekStart),
        { weekStart, priorities: selected, reflection, completedAt: new Date().toISOString() }
      ]
    }))
    setSaved(true)
  }

  const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`)
  const untouched = ranked.filter(c => c.room.lastEntered == null || c.room.lastEntered < weekStart)

  return (
    <div>
      <div className="brand">WEEKLY RESET</div>
      <h1 className="screen-title">Week of {formatShort(weekStart)}</h1>
      <p className="screen-sub">{formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))}</p>

      <Card title="The dump">
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 12 }}>
          <div><div className="big-stat">{stats.roomsEntered}</div><div className="stat-label">rooms entered</div></div>
          <div><div className="big-stat">{Math.round(stats.sessionMinutes / 60 * 10) / 10}</div><div className="stat-label">hours invested</div></div>
          <div><div className="big-stat">{stats.filmedSessions}</div><div className="stat-label">filmed</div></div>
          <div><div className="big-stat">{unused.length}</div><div className="stat-label">unedited</div></div>
        </div>
        {unused.length > 0 ? (
          <p className="note-quote">
            {unused.length} piece{unused.length === 1 ? '' : 's'} of footage is sitting there. This is the moment to cut it —
            the week is what the edit is about, and the edit is how the craft gets built.
          </p>
        ) : (
          <p className="muted">Nothing waiting to edit. Film more this week and this becomes your reps.</p>
        )}
        <button className="btn btn-accent btn-block" style={{ marginTop: 10 }}
          onClick={() => { window.location.hash = '/capture' }}>
          Open Capture
        </button>
      </Card>

      <Card title="This week so far">
        <div className="row" style={{ borderTop: 'none' }}>
          <span className="row-label">Work / off days</span><span>{stats.workDays} / {stats.offDays}</span>
        </div>
        <div className="row"><span className="row-label">Check-ins</span><span>{stats.checkinCount} of 7</span></div>
        <div className="row"><span className="row-label">Average energy</span><span>{fmt(stats.avgEnergy, '/10')}</span></div>
        <div className="row"><span className="row-label">Average sleep</span><span>{fmt(stats.avgSleep, 'h')}</span></div>
        <div className="row"><span className="row-label">Average meals</span><span>{fmt(stats.avgMeals)}</span></div>
        <div className="row"><span className="row-label">Lunch / dinner</span><span>{stats.lunchDays} / {stats.dinnerDays}</span></div>
        <div className="row"><span className="row-label">Pushups</span><span>{stats.pushupDays} day{stats.pushupDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">French</span><span>{stats.frenchDays} day{stats.frenchDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Reading</span><span>{stats.readingDays} day{stats.readingDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Connection</span><span>{stats.connectionDays} day{stats.connectionDays === 1 ? '' : 's'}</span></div>
        {cs.active && (
          <div className="row"><span className="row-label">Monk</span><span>Day {cs.day} of {cs.targetDays}</span></div>
        )}
      </Card>

      {untouched.length > 0 && (
        <Card title="Rooms you didn't enter">
          <p className="muted" style={{ marginBottom: 10 }}>
            Not a scolding — just what's true. Some of these should stay closed next week too.
          </p>
          <div className="chip-row">
            {untouched.slice(0, 10).map(c => (
              <span key={c.room.id} className="chip">{c.room.name}</span>
            ))}
          </div>
        </Card>
      )}

      {neglected.length > 0 && (
        <Card title="Currently neglected">
          <p className="muted">
            {neglected.map(n => n.name).join(', ')} {neglected.length === 1 ? 'has' : 'have'} received little attention recently.
          </p>
        </Card>
      )}

      <Card title="What needs a turn this week?">
        <p className="muted" style={{ marginBottom: 12 }}>
          Pick 3–5 protected priorities. Daily recommendations and room ranking will make room for these.
        </p>
        <div className="chip-row">
          {state.domains.map(d => (
            <Chip key={d.id} on={selected.includes(d.id)} onClick={() => toggle(d.id)}>{d.name}</Chip>
          ))}
        </div>
        <p className="faint" style={{ margin: '10px 0 12px' }}>
          {selected.length} selected {selected.length >= 5 ? '· max 5' : selected.length < 3 ? '· pick at least 3' : ''}
        </p>
        <div className="field">
          <label htmlFor="wk-note">Reflection</label>
          <textarea id="wk-note" placeholder="What moved? What did you learn? What are you carrying into next week?"
            value={reflection} onChange={e => { setReflection(e.target.value); setSaved(false) }} />
        </div>
        <button className="btn btn-accent btn-block" disabled={selected.length < 3} onClick={save}>
          {saved ? '✓ Saved — shaping this week' : review ? 'Update weekly priorities' : 'Set weekly priorities'}
        </button>
        {review && !saved && (
          <p className="faint" style={{ marginTop: 8 }}>
            Current: {review.priorities.map(id => state.domains.find(d => d.id === id)?.name).filter(Boolean).join(', ')}
          </p>
        )}
      </Card>
    </div>
  )
}
