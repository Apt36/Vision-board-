import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { weekStats } from '../logic/week'
import { Card, Sheet } from '../components/ui'
import type { TherapySession } from '../types'

export default function Mind() {
  const state = useAppState()
  const today = todayISO()
  const stats = weekStats(state, today)
  const [editing, setEditing] = useState<TherapySession | null>(null)
  const [isNew, setIsNew] = useState(false)

  const sessions = [...state.therapy].sort((a, b) => b.date.localeCompare(a.date))
  const nextSession = sessions.map(s => s.nextSession).filter((d): d is string => !!d && d >= today).sort()[0] ?? null

  const save = (s: TherapySession) => {
    setState(st => ({
      ...st,
      therapy: isNew ? [...st.therapy, s] : st.therapy.map(x => (x.id === s.id ? s : x))
    }))
    if (isNew) logActivity('mind', 1, 'Therapy session', s.date)
    setEditing(null)
  }

  return (
    <div>
      <div className="brand">MIND</div>
      <h1 className="screen-title">Reading, reflection, therapy</h1>
      <p className="screen-sub">The quiet work that keeps everything else standing.</p>

      <Card title="This week">
        <div style={{ display: 'flex', gap: 24 }}>
          <div><div className="big-stat">{stats.readingDays}</div><div className="stat-label">reading days</div></div>
          <div><div className="big-stat">{stats.mindDays}</div><div className="stat-label">reflection days</div></div>
        </div>
        <p className="faint" style={{ marginTop: 10 }}>Logged through the daily check-in.</p>
      </Card>

      <Card title="Therapy">
        {nextSession && (
          <p className="note-quote" style={{ marginBottom: 12 }}>Next session: {formatShort(nextSession)}</p>
        )}
        <button className="btn btn-accent btn-block" onClick={() => {
          setEditing({ id: uid(), date: today, reflection: '', nextSession: null, topics: '' })
          setIsNew(true)
        }}>
          + Log session
        </button>
        {sessions.length === 0
          ? <p className="empty">No sessions logged. When you have one, capture a short reflection and what to discuss next.</p>
          : sessions.slice(0, 10).map(s => (
            <button key={s.id} className="row" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => { setEditing(s); setIsNew(false) }}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>{formatShort(s.date)}</div>
                {s.reflection && <div className="row-sub">{s.reflection.slice(0, 80)}{s.reflection.length > 80 ? '…' : ''}</div>}
              </div>
              <span className="faint">›</span>
            </button>
          ))}
      </Card>

      {editing && (
        <Sheet onClose={() => setEditing(null)}>
          <h2>{isNew ? 'Log therapy session' : 'Edit session'}</h2>
          <div className="section-gap" />
          <div className="grid-2">
            <div className="field">
              <label htmlFor="t-date">Session date</label>
              <input id="t-date" type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="t-next">Next session</label>
              <input id="t-next" type="date" value={editing.nextSession ?? ''} onChange={e => setEditing({ ...editing, nextSession: e.target.value || null })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="t-refl">Short reflection</label>
            <textarea id="t-refl" value={editing.reflection} onChange={e => setEditing({ ...editing, reflection: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-topics">Things to discuss next time</label>
            <textarea id="t-topics" value={editing.topics} onChange={e => setEditing({ ...editing, topics: e.target.value })} />
          </div>
          <div className="grid-2">
            <button className="btn btn-accent" onClick={() => save(editing)}>{isNew ? 'Add' : 'Save'}</button>
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          {!isNew && (
            <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={() => {
              setState(s => ({ ...s, therapy: s.therapy.filter(x => x.id !== editing.id) }))
              setEditing(null)
            }}>
              Delete
            </button>
          )}
        </Sheet>
      )}
    </div>
  )
}
