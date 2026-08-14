import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, weekStartOf, formatShort } from '../logic/date'
import { Card, Sheet } from '../components/ui'
import type { JobApplication, JobAppStatus } from '../types'

const STATUSES: JobAppStatus[] = ['applied', 'interview', 'follow-up', 'offer', 'rejected', 'closed']

export default function Career() {
  const state = useAppState()
  const today = todayISO()
  const weekStart = weekStartOf(today)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const [isNew, setIsNew] = useState(false)

  const apps = [...state.jobApps].sort((a, b) => b.date.localeCompare(a.date))
  const thisWeek = apps.filter(a => a.date >= weekStart).length
  const interviews = apps.filter(a => a.status === 'interview').length
  const followUps = apps.filter(a => a.status === 'follow-up').length
  const realEstate = state.goals.find(g => g.id === 'g-realestate')

  const save = (a: JobApplication) => {
    setState(s => ({
      ...s,
      jobApps: isNew ? [...s.jobApps, a] : s.jobApps.map(x => (x.id === a.id ? a : x))
    }))
    if (isNew) logActivity('career', 0.8, `Applied: ${a.company}`, a.date)
    setEditing(null)
  }

  return (
    <div>
      <div className="brand">CAREER</div>
      <h1 className="screen-title">Building options</h1>
      <p className="screen-sub">The leasing job is a chapter, not the book.</p>

      <Card title="Current job">
        <div className="row-label" style={{ fontWeight: 600 }}>{state.settings.currentJob}</div>
        <p className="note-quote" style={{ marginTop: 10 }}>
          This is a contract role. Doing it well matters — and so does continuing to build options beyond it.
        </p>
      </Card>

      <Card title="Applications">
        <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
          <div><div className="big-stat">{thisWeek}</div><div className="stat-label">this week</div></div>
          <div><div className="big-stat">{interviews}</div><div className="stat-label">interviews</div></div>
          <div><div className="big-stat">{followUps}</div><div className="stat-label">follow-ups</div></div>
        </div>
        <button className="btn btn-accent btn-block" onClick={() => {
          setEditing({ id: uid(), company: '', role: '', date: today, status: 'applied', notes: '' })
          setIsNew(true)
        }}>
          + Log application
        </button>
        {apps.length === 0
          ? <p className="empty">No applications logged yet. Off days are a good time for a 60-minute block.</p>
          : apps.slice(0, 20).map(a => (
            <button key={a.id} className="row" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => { setEditing(a); setIsNew(false) }}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>{a.role || 'Role'} · {a.company || 'Company'}</div>
                <div className="row-sub">{formatShort(a.date)}{a.notes ? ` · ${a.notes}` : ''}</div>
              </div>
              <span className={`pill ${a.status === 'interview' || a.status === 'offer' ? 'pill-off' : 'pill-dim'}`}>{a.status}</span>
            </button>
          ))}
      </Card>

      <Card title="Real estate licence">
        {realEstate ? (
          <div className="row" style={{ borderTop: 'none' }}>
            <div>
              <div className="row-label" style={{ fontWeight: 600 }}>{realEstate.name}</div>
              <div className="row-sub">
                {realEstate.nextAction && `Next: ${realEstate.nextAction} · `}
                {realEstate.lastWorkedOn ? `last studied ${formatShort(realEstate.lastWorkedOn)}` : 'no sessions logged yet'}
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => {
              setState(s => ({ ...s, goals: s.goals.map(g => g.id === realEstate.id ? { ...g, lastWorkedOn: today } : g) }))
              logActivity('realestate', 0.9, 'Real estate study block')
            }}>
              {realEstate.lastWorkedOn === today ? '✓ today' : 'Studied'}
            </button>
          </div>
        ) : (
          <p className="empty">Add a real estate goal in Goals &amp; Projects.</p>
        )}
      </Card>

      {editing && (
        <Sheet onClose={() => setEditing(null)}>
          <h2>{isNew ? 'Log application' : 'Edit application'}</h2>
          <div className="section-gap" />
          <div className="field">
            <label htmlFor="a-company">Company</label>
            <input id="a-company" value={editing.company} onChange={e => setEditing({ ...editing, company: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="a-role">Role</label>
            <input id="a-role" value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="a-date">Date</label>
              <input id="a-date" type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="a-status">Status</label>
              <select id="a-status" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as JobAppStatus })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="a-notes">Notes</label>
            <input id="a-notes" value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
          </div>
          <div className="grid-2">
            <button className="btn btn-accent" disabled={!editing.company.trim() && !editing.role.trim()} onClick={() => save(editing)}>
              {isNew ? 'Add' : 'Save'}
            </button>
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          {!isNew && (
            <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={() => {
              setState(s => ({ ...s, jobApps: s.jobApps.filter(x => x.id !== editing.id) }))
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
