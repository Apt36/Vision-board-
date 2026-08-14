import { useMemo, useState } from 'react'
import { setState, useAppState } from '../store'
import { todayISO, weekStartOf, addDays, formatShort } from '../logic/date'
import { weekStats } from '../logic/week'
import { computeAttention, neglectedDomains } from '../logic/attention'
import { Card, Chip } from '../components/ui'

export default function Week() {
  const state = useAppState()
  const today = todayISO()
  const weekStart = weekStartOf(today)
  const stats = useMemo(() => weekStats(state, today), [state, today])
  const attention = useMemo(() => computeAttention(state, today), [state, today])
  const neglected = neglectedDomains(attention)

  const review = state.weeklyReviews.find(r => r.weekStart === weekStart)
  const [selected, setSelected] = useState<string[]>(review?.priorities ?? [])
  const [reflection, setReflection] = useState(review?.reflection ?? '')
  const [saved, setSaved] = useState(false)

  const toggle = (id: string) => {
    setSaved(false)
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
        : prev.length >= 5 ? prev
        : [...prev, id]
    )
  }

  const save = () => {
    const r = { weekStart, priorities: selected, reflection, completedAt: new Date().toISOString() }
    setState(s => ({
      ...s,
      weeklyReviews: [...s.weeklyReviews.filter(x => x.weekStart !== weekStart), r]
    }))
    setSaved(true)
  }

  const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

  return (
    <div>
      <div className="brand">WEEKLY RESET</div>
      <h1 className="screen-title">Week of {formatShort(weekStart)}</h1>
      <p className="screen-sub">{formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))}</p>

      <Card title="This week so far">
        <div className="row" style={{ borderTop: 'none' }}>
          <span className="row-label">Work days / off days</span>
          <span>{stats.workDays} / {stats.offDays}</span>
        </div>
        <div className="row"><span className="row-label">Check-ins</span><span>{stats.checkinCount} of 7</span></div>
        <div className="row"><span className="row-label">Average energy</span><span>{fmt(stats.avgEnergy, '/10')}</span></div>
        <div className="row"><span className="row-label">Average sleep</span><span>{fmt(stats.avgSleep, 'h')}</span></div>
        <div className="row"><span className="row-label">Average meals</span><span>{fmt(stats.avgMeals)}</span></div>
        <div className="row"><span className="row-label">Exercise</span><span>{stats.exerciseDays} day{stats.exerciseDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">French</span><span>{stats.frenchDays} day{stats.frenchDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Reading</span><span>{stats.readingDays} day{stats.readingDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Connection</span><span>{stats.connectionDays} day{stats.connectionDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Career work</span><span>{stats.careerDays} day{stats.careerDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Creative work</span><span>{stats.creativeDays} day{stats.creativeDays === 1 ? '' : 's'}</span></div>
        {stats.checkinCount === 0 && (
          <p className="faint" style={{ marginTop: 10 }}>No check-ins yet this week — the numbers fill in as you check in.</p>
        )}
      </Card>

      {neglected.length > 0 && (
        <Card title="Currently neglected">
          <p className="muted">
            {neglected.map(n => n.name).join(', ')} {neglected.length === 1 ? 'has' : 'have'} received little attention recently.
          </p>
        </Card>
      )}

      <Card title="What needs a turn this week?">
        <p className="muted" style={{ marginBottom: 12 }}>
          Pick 3–5 protected priorities. Daily recommendations will make room for these.
        </p>
        <div className="chip-row">
          {state.domains.map(d => (
            <Chip key={d.id} on={selected.includes(d.id)} onClick={() => toggle(d.id)}>
              {d.name}
            </Chip>
          ))}
        </div>
        <p className="faint" style={{ margin: '10px 0 12px' }}>
          {selected.length} selected {selected.length >= 5 ? '· max 5' : selected.length < 3 ? '· pick at least 3' : ''}
        </p>
        <div className="field">
          <label htmlFor="wk-note">Reflection (optional)</label>
          <textarea id="wk-note" placeholder="How did last week go? What matters now?" value={reflection}
            onChange={e => { setReflection(e.target.value); setSaved(false) }} />
        </div>
        <button className="btn btn-accent btn-block" disabled={selected.length < 3} onClick={save}>
          {saved ? '✓ Saved — shaping this week' : review ? 'Update weekly priorities' : 'Set weekly priorities'}
        </button>
        {review && !saved && (
          <p className="faint" style={{ marginTop: 8 }}>
            Current priorities: {review.priorities.map(id => state.domains.find(d => d.id === id)?.name).filter(Boolean).join(', ')}
          </p>
        )}
      </Card>
    </div>
  )
}
